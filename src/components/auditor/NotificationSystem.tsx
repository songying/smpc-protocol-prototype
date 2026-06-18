'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'

interface NotificationAlert {
  id: string
  type: 'request_submitted' | 'approval_required' | 'compliance_issue' | 'deadline_approaching' | 'system_alert' | 'security_warning'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionable: boolean
  actions?: NotificationAction[]
  relatedEntity: {
    type: 'request' | 'dataset' | 'user' | 'system'
    id: string
    name: string
  }
  metadata: {
    source: string
    category: string
    tags: string[]
  }
  expiresAt?: Date
  persistent: boolean
}

interface NotificationAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'danger'
  action: () => void
}

interface NotificationSettings {
  enabled: boolean
  soundEnabled: boolean
  desktopEnabled: boolean
  emailEnabled: boolean
  categories: {
    [key: string]: {
      enabled: boolean
      priority: NotificationAlert['priority'][]
    }
  }
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

interface NotificationSystemProps {
  onNotificationClick?: (notification: NotificationAlert) => void
  onActionTaken?: (notificationId: string, actionId: string) => void
  maxVisibleNotifications?: number
}

export function NotificationSystem({
  onNotificationClick,
  onActionTaken,
  maxVisibleNotifications = 5
}: NotificationSystemProps) {
  const { address } = useAccount()
  
  // Mock notifications - in real app this would come from WebSocket/SSE
  const [notifications, setNotifications] = useState<NotificationAlert[]>([
    {
      id: 'notif_001',
      type: 'approval_required',
      priority: 'high',
      title: 'New Request Requires Approval',
      message: 'Medical AI Training Dataset Request submitted by Dr. Sarah Chen requires your approval.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      read: false,
      actionable: true,
      actions: [
        {
          id: 'approve',
          label: 'Approve',
          type: 'primary',
          action: () => handleQuickAction('notif_001', 'approve')
        },
        {
          id: 'review',
          label: 'Review',
          type: 'secondary',
          action: () => handleQuickAction('notif_001', 'review')
        }
      ],
      relatedEntity: {
        type: 'request',
        id: 'req_audit_001',
        name: 'Medical AI Training Dataset Request'
      },
      metadata: {
        source: 'audit_system',
        category: 'approval',
        tags: ['medical', 'high-priority', 'ai-training']
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      persistent: true
    },
    {
      id: 'notif_002',
      type: 'compliance_issue',
      priority: 'critical',
      title: 'Critical Compliance Issue Detected',
      message: 'Financial Trading Algorithm requires immediate security audit before execution.',
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      read: false,
      actionable: true,
      actions: [
        {
          id: 'escalate',
          label: 'Escalate',
          type: 'danger',
          action: () => handleQuickAction('notif_002', 'escalate')
        },
        {
          id: 'investigate',
          label: 'Investigate',
          type: 'primary',
          action: () => handleQuickAction('notif_002', 'investigate')
        }
      ],
      relatedEntity: {
        type: 'request',
        id: 'req_audit_003',
        name: 'Financial Trading Algorithm Validation'
      },
      metadata: {
        source: 'compliance_engine',
        category: 'security',
        tags: ['financial', 'critical', 'security-audit']
      },
      persistent: true
    },
    {
      id: 'notif_003',
      type: 'deadline_approaching',
      priority: 'medium',
      title: 'Review Deadline Approaching',
      message: 'E-commerce Customer Analytics Request deadline is in 2 hours.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      read: true,
      actionable: false,
      relatedEntity: {
        type: 'request',
        id: 'req_audit_002',
        name: 'E-commerce Customer Analytics Request'
      },
      metadata: {
        source: 'scheduler',
        category: 'deadline',
        tags: ['ecommerce', 'analytics']
      },
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      persistent: false
    },
    {
      id: 'notif_004',
      type: 'system_alert',
      priority: 'low',
      title: 'System Maintenance Scheduled',
      message: 'Scheduled maintenance will begin at 2:00 AM UTC tomorrow.',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      read: false,
      actionable: false,
      relatedEntity: {
        type: 'system',
        id: 'maintenance_001',
        name: 'System Maintenance'
      },
      metadata: {
        source: 'system',
        category: 'maintenance',
        tags: ['scheduled', 'maintenance']
      },
      persistent: false
    }
  ])

  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    soundEnabled: true,
    desktopEnabled: true,
    emailEnabled: false,
    categories: {
      approval: { enabled: true, priority: ['high', 'critical'] },
      compliance: { enabled: true, priority: ['medium', 'high', 'critical'] },
      deadline: { enabled: true, priority: ['medium', 'high'] },
      system: { enabled: false, priority: ['low', 'medium'] },
      security: { enabled: true, priority: ['high', 'critical'] }
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  })

  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length

  // Get visible notifications (sorted by priority and timestamp)
  const visibleNotifications = notifications
    .filter(n => {
      // Filter by settings
      if (!settings.enabled) return false
      
      const category = n.metadata.category
      const categorySettings = settings.categories[category]
      
      if (!categorySettings?.enabled) return false
      if (!categorySettings.priority.includes(n.priority)) return false
      
      // Check quiet hours
      if (settings.quietHours.enabled) {
        const now = new Date()
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        
        if (currentTime >= settings.quietHours.start || currentTime <= settings.quietHours.end) {
          // Only show critical notifications during quiet hours
          if (n.priority !== 'critical') return false
        }
      }
      
      return true
    })
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by timestamp (newest first)
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
    .slice(0, maxVisibleNotifications)

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate receiving new notifications
      if (Math.random() < 0.1) { // 10% chance every 10 seconds
        const newNotification: NotificationAlert = {
          id: `notif_${Date.now()}`,
          type: 'request_submitted',
          priority: 'medium',
          title: 'New Computation Request',
          message: `New request submitted: ${['Data Analysis', 'ML Training', 'Statistical Study'][Math.floor(Math.random() * 3)]}`,
          timestamp: new Date(),
          read: false,
          actionable: true,
          actions: [
            {
              id: 'review',
              label: 'Review',
              type: 'primary',
              action: () => handleQuickAction(`notif_${Date.now()}`, 'review')
            }
          ],
          relatedEntity: {
            type: 'request',
            id: `req_${Date.now()}`,
            name: 'New Request'
          },
          metadata: {
            source: 'request_system',
            category: 'approval',
            tags: ['new-request']
          },
          persistent: false
        }
        
        setNotifications(prev => [newNotification, ...prev])
        
        // Play notification sound
        if (settings.soundEnabled && soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {
            // Handle audio play failure silently
          })
        }
        
        // Show desktop notification
        if (settings.desktopEnabled && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/favicon.ico'
          })
        }
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [settings.soundEnabled, settings.desktopEnabled, soundEnabled])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Handle click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleQuickAction = (notificationId: string, actionId: string) => {
    onActionTaken?.(notificationId, actionId)
    
    // Mark as read when action is taken
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    )
  }

  const getPriorityColor = (priority: NotificationAlert['priority']) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
    }
  }

  const getPriorityIcon = (priority: NotificationAlert['priority']) => {
    switch (priority) {
      case 'critical':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'high':
        return (
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'medium':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V17z" />
          </svg>
        )
      case 'low':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getTypeIcon = (type: NotificationAlert['type']) => {
    switch (type) {
      case 'approval_required':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'compliance_issue':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'deadline_approaching':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'system_alert':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'security_warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V17z" />
          </svg>
        )
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return timestamp.toLocaleDateString()
  }

  return (
    <div className="relative" ref={notificationRef}>
      {/* Notification Button */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V17zm0 0l-5-5H5l5 5v-5z" />
        </svg>
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V17zm0 0l-5-5H5l5 5v-5z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {visibleNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-l-4 ${getPriorityColor(notification.priority)} ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    onClick={() => {
                      markAsRead(notification.id)
                      onNotificationClick?.(notification)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-2">
                            {getPriorityIcon(notification.priority)}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                dismissNotification(notification.id)
                              }}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        {notification.actionable && notification.actions && notification.actions.length > 0 && (
                          <div className="flex items-center space-x-2 mt-3">
                            {notification.actions.map(action => (
                              <button
                                key={action.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  action.action()
                                }}
                                className={`px-3 py-1 text-xs font-medium rounded ${
                                  action.type === 'primary' 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : action.type === 'danger'
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Notification Settings</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Sound notifications</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      soundEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        soundEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Desktop notifications</span>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, desktopEnabled: !prev.desktopEnabled }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      settings.desktopEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        settings.desktopEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio element for notification sounds */}
      <audio ref={audioRef} preload="auto">
        <source src="/notification-sound.mp3" type="audio/mpeg" />
        <source src="/notification-sound.wav" type="audio/wav" />
      </audio>
    </div>
  )
}