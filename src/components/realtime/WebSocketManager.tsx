'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface WebSocketMessage {
  id: string
  type: string
  payload: any
  timestamp: Date
  source: string
  target?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface ConnectionStatus {
  connected: boolean
  connecting: boolean
  disconnected: boolean
  error: boolean
  lastConnected?: Date
  lastDisconnected?: Date
  reconnectAttempts: number
  latency?: number
}

interface WebSocketConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  messageTimeout: number
  enableCompression: boolean
  protocols?: string[]
}

interface WebSocketContextValue {
  connectionStatus: ConnectionStatus
  sendMessage: (type: string, payload: any, target?: string, priority?: WebSocketMessage['priority']) => void
  subscribe: (messageType: string, callback: (message: WebSocketMessage) => void) => () => void
  unsubscribe: (messageType: string, callback: (message: WebSocketMessage) => void) => void
  connect: () => void
  disconnect: () => void
  getConnectionMetrics: () => ConnectionMetrics
}

interface ConnectionMetrics {
  totalMessages: number
  messagesSent: number
  messagesReceived: number
  averageLatency: number
  connectionUptime: number
  reconnectCount: number
  lastActivity: Date
}

interface WebSocketManagerProps {
  children: React.ReactNode
  config?: Partial<WebSocketConfig>
}

const defaultConfig: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  messageTimeout: 10000,
  enableCompression: true,
  protocols: ['smpc-protocol']
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export function WebSocketManager({ children, config }: WebSocketManagerProps) {
  const { address } = useAccount()
  const wsConfig = { ...defaultConfig, ...config }
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false,
    disconnected: true,
    error: false,
    reconnectAttempts: 0
  })
  
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    totalMessages: 0,
    messagesSent: 0,
    messagesReceived: 0,
    averageLatency: 0,
    connectionUptime: 0,
    reconnectCount: 0,
    lastActivity: new Date()
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const messageQueueRef = useRef<WebSocketMessage[]>([])
  const subscribersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map())
  const pendingMessagesRef = useRef<Map<string, { timestamp: Date; resolve: (value: any) => void; reject: (reason: any) => void }>>(new Map())
  const latencyMeasurementsRef = useRef<number[]>([])
  const connectionStartTimeRef = useRef<Date | null>(null)

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Calculate average latency
  const updateLatencyMetrics = useCallback((latency: number) => {
    latencyMeasurementsRef.current.push(latency)
    
    // Keep only last 100 measurements
    if (latencyMeasurementsRef.current.length > 100) {
      latencyMeasurementsRef.current = latencyMeasurementsRef.current.slice(-100)
    }
    
    const averageLatency = latencyMeasurementsRef.current.reduce((sum, l) => sum + l, 0) / latencyMeasurementsRef.current.length
    
    setMetrics(prev => ({ ...prev, averageLatency }))
    setConnectionStatus(prev => ({ ...prev, latency: averageLatency }))
  }, [])

  // Send heartbeat ping
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const pingTime = Date.now()
      const heartbeatMessage: WebSocketMessage = {
        id: generateMessageId(),
        type: 'heartbeat',
        payload: { timestamp: pingTime },
        timestamp: new Date(),
        source: 'client',
        priority: 'low'
      }
      
      wsRef.current.send(JSON.stringify(heartbeatMessage))
      
      // Track heartbeat for latency measurement
      pendingMessagesRef.current.set(heartbeatMessage.id, {
        timestamp: new Date(),
        resolve: () => {},
        reject: () => {}
      })
    }
  }, [generateMessageId])

  // Process message queue
  const processMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const messages = [...messageQueueRef.current]
      messageQueueRef.current = []
      
      messages.forEach(message => {
        wsRef.current!.send(JSON.stringify(message))
        setMetrics(prev => ({ 
          ...prev, 
          messagesSent: prev.messagesSent + 1,
          totalMessages: prev.totalMessages + 1,
          lastActivity: new Date()
        }))
      })
    }
  }, [])

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      
      setMetrics(prev => ({ 
        ...prev, 
        messagesReceived: prev.messagesReceived + 1,
        totalMessages: prev.totalMessages + 1,
        lastActivity: new Date()
      }))

      // Handle heartbeat response
      if (message.type === 'heartbeat_response' || message.type === 'pong') {
        const pending = pendingMessagesRef.current.get(message.id)
        if (pending) {
          const latency = Date.now() - pending.timestamp.getTime()
          updateLatencyMetrics(latency)
          pendingMessagesRef.current.delete(message.id)
        }
        return
      }

      // Handle connection acknowledgment
      if (message.type === 'connection_ack') {
        console.log('WebSocket connection acknowledged:', message.payload)
        return
      }

      // Notify subscribers
      const typeSubscribers = subscribersRef.current.get(message.type)
      const allSubscribers = subscribersRef.current.get('*') // Universal subscribers
      
      if (typeSubscribers) {
        typeSubscribers.forEach(callback => {
          try {
            callback(message)
          } catch (error) {
            console.error('Error in message callback:', error)
          }
        })
      }

      if (allSubscribers) {
        allSubscribers.forEach(callback => {
          try {
            callback(message)
          } catch (error) {
            console.error('Error in universal message callback:', error)
          }
        })
      }

    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }, [updateLatencyMetrics])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    setConnectionStatus(prev => ({ 
      ...prev, 
      connecting: true, 
      disconnected: false, 
      error: false 
    }))

    try {
      const wsUrl = new URL(wsConfig.url)
      if (address) {
        wsUrl.searchParams.set('address', address)
      }

      wsRef.current = new WebSocket(wsUrl.toString(), wsConfig.protocols)

      if (wsConfig.enableCompression && wsRef.current.extensions) {
        // Enable compression if supported
        wsRef.current.binaryType = 'arraybuffer'
      }

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        connectionStartTimeRef.current = new Date()
        
        setConnectionStatus(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          disconnected: false,
          error: false,
          lastConnected: new Date(),
          reconnectAttempts: 0
        }))

        setMetrics(prev => ({ ...prev, reconnectCount: prev.reconnectCount + 1 }))

        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, wsConfig.heartbeatInterval)

        // Process queued messages
        processMessageQueue()

        // Send connection info
        const connectMessage: WebSocketMessage = {
          id: generateMessageId(),
          type: 'client_connect',
          payload: {
            userAddress: address,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            protocols: wsConfig.protocols
          },
          timestamp: new Date(),
          source: 'client',
          priority: 'medium'
        }
        
        wsRef.current.send(JSON.stringify(connectMessage))
      }

      wsRef.current.onmessage = handleMessage

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          disconnected: true,
          error: event.code !== 1000, // 1000 is normal closure
          lastDisconnected: new Date()
        }))

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && connectionStatus.reconnectAttempts < wsConfig.maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${connectionStatus.reconnectAttempts + 1}/${wsConfig.maxReconnectAttempts})`)
          
          setConnectionStatus(prev => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1
          }))

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, wsConfig.reconnectInterval)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus(prev => ({ ...prev, error: true, connecting: false }))
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionStatus(prev => ({ 
        ...prev, 
        error: true, 
        connecting: false, 
        disconnected: true 
      }))
    }
  }, [address, wsConfig, connectionStatus.reconnectAttempts, sendHeartbeat, processMessageQueue, handleMessage, generateMessageId])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect')
      wsRef.current = null
    }

    setConnectionStatus({
      connected: false,
      connecting: false,
      disconnected: true,
      error: false,
      reconnectAttempts: 0
    })
  }, [])

  // Send message
  const sendMessage = useCallback((
    type: string, 
    payload: any, 
    target?: string, 
    priority: WebSocketMessage['priority'] = 'medium'
  ) => {
    const message: WebSocketMessage = {
      id: generateMessageId(),
      type,
      payload,
      timestamp: new Date(),
      source: 'client',
      target,
      priority
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      setMetrics(prev => ({ 
        ...prev, 
        messagesSent: prev.messagesSent + 1,
        totalMessages: prev.totalMessages + 1,
        lastActivity: new Date()
      }))
    } else {
      // Queue message for later
      messageQueueRef.current.push(message)
    }
  }, [generateMessageId])

  // Subscribe to message type
  const subscribe = useCallback((
    messageType: string, 
    callback: (message: WebSocketMessage) => void
  ) => {
    if (!subscribersRef.current.has(messageType)) {
      subscribersRef.current.set(messageType, new Set())
    }
    
    subscribersRef.current.get(messageType)!.add(callback)

    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(messageType)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          subscribersRef.current.delete(messageType)
        }
      }
    }
  }, [])

  // Unsubscribe from message type
  const unsubscribe = useCallback((
    messageType: string, 
    callback: (message: WebSocketMessage) => void
  ) => {
    const subscribers = subscribersRef.current.get(messageType)
    if (subscribers) {
      subscribers.delete(callback)
      if (subscribers.size === 0) {
        subscribersRef.current.delete(messageType)
      }
    }
  }, [])

  // Get connection metrics
  const getConnectionMetrics = useCallback((): ConnectionMetrics => {
    const uptime = connectionStartTimeRef.current 
      ? Date.now() - connectionStartTimeRef.current.getTime() 
      : 0

    return {
      ...metrics,
      connectionUptime: uptime
    }
  }, [metrics])

  // Auto-connect on mount and when address changes
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [address])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const contextValue: WebSocketContextValue = {
    connectionStatus,
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    getConnectionMetrics
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

// Connection Status Indicator Component
export function ConnectionStatusIndicator() {
  const { connectionStatus, getConnectionMetrics } = useWebSocket()
  const [showDetails, setShowDetails] = useState(false)
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null)

  useEffect(() => {
    if (showDetails) {
      const interval = setInterval(() => {
        setMetrics(getConnectionMetrics())
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [showDetails, getConnectionMetrics])

  const getStatusColor = () => {
    if (connectionStatus.connected) return 'text-green-500'
    if (connectionStatus.connecting) return 'text-yellow-500'
    if (connectionStatus.error) return 'text-red-500'
    return 'text-gray-500'
  }

  const getStatusText = () => {
    if (connectionStatus.connected) return 'Connected'
    if (connectionStatus.connecting) return 'Connecting...'
    if (connectionStatus.error) return 'Connection Error'
    return 'Disconnected'
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}
      >
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus.connected ? 'bg-green-500' :
          connectionStatus.connecting ? 'bg-yellow-500 animate-pulse' :
          connectionStatus.error ? 'bg-red-500' : 'bg-gray-500'
        }`} />
        <span>{getStatusText()}</span>
        {connectionStatus.latency && (
          <span className="text-xs text-gray-500">({Math.round(connectionStatus.latency)}ms)</span>
        )}
      </button>

      {showDetails && metrics && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-64">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Connection Details</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${getStatusColor()}`}>{getStatusText()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatUptime(metrics.connectionUptime)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Latency:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.round(metrics.averageLatency)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Messages:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {metrics.totalMessages} ({metrics.messagesSent}↑ {metrics.messagesReceived}↓)
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Reconnects:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {metrics.reconnectCount}
              </span>
            </div>
            
            {connectionStatus.lastConnected && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Last Connected:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {connectionStatus.lastConnected.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}