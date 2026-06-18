'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Info, 
  DollarSign, 
  Database,
  Activity,
  Filter
} from 'lucide-react'
import { useAccount } from 'wagmi'

export interface Notification {
  id: string
  userId: string
  type: 'algorithm_approved' | 'algorithm_rejected' | 'computation_completed' | 'computation_failed' | 'system_alert' | 'payment_received' | 'data_request'
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  createdAt: string
  expiresAt?: string
}

interface NotificationResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
  hasMore: boolean
}

export default function NotificationCenter() {
  const { address, isConnected } = useAccount()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'unread' | Notification['type']>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchNotifications = async (filter?: string) => {
    if (!isConnected) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter === 'unread') params.append('unread', 'true')
      if (filter && filter !== 'all' && filter !== 'unread') params.append('type', filter)
      
      const response = await fetch(`/api/notifications?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      
      const data: NotificationResponse = await response.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
        body: JSON.stringify({
          notificationId,
          action: 'mark_read'
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read)
      
      for (const notification of unreadNotifications) {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${address}`,
          },
          body: JSON.stringify({
            notificationId: notification.id,
            action: 'mark_read'
          })
        })
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
        body: JSON.stringify({
          notificationId,
          action: 'delete'
        })
      })

      if (response.ok) {
        const deletedNotification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const clearReadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?action=clear_read', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        }
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.read))
      }
    } catch (error) {
      console.error('Error clearing read notifications:', error)
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchNotifications(filterType === 'all' ? undefined : filterType)
    }
  }, [filterType, isConnected])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh && isConnected) {
      interval = setInterval(() => {
        fetchNotifications(filterType === 'all' ? undefined : filterType)
      }, 30000) // Refresh every 30 seconds
    }
    return () => clearInterval(interval)
  }, [filterType, autoRefresh, isConnected])

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'algorithm_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'algorithm_rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'computation_completed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case 'computation_failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'system_alert':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-green-500" />
      case 'data_request':
        return <Database className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'algorithm_approved':
        return 'Algorithm Approved'
      case 'algorithm_rejected':
        return 'Algorithm Rejected'
      case 'computation_completed':
        return 'Computation Completed'
      case 'computation_failed':
        return 'Computation Failed'
      case 'system_alert':
        return 'System Alert'
      case 'payment_received':
        return 'Payment Received'
      case 'data_request':
        return 'Data Request'
      default:
        return 'Notification'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filterType === 'all') return true
    if (filterType === 'unread') return !notification.read
    return notification.type === filterType
  })

  const notificationTypes: Array<{ value: typeof filterType; label: string; count: number }> = [
    { value: 'all', label: 'All', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'algorithm_approved', label: 'Approved', count: notifications.filter(n => n.type === 'algorithm_approved').length },
    { value: 'algorithm_rejected', label: 'Rejected', count: notifications.filter(n => n.type === 'algorithm_rejected').length },
    { value: 'computation_completed', label: 'Completed', count: notifications.filter(n => n.type === 'computation_completed').length },
    { value: 'computation_failed', label: 'Failed', count: notifications.filter(n => n.type === 'computation_failed').length },
    { value: 'system_alert', label: 'Alerts', count: notifications.filter(n => n.type === 'system_alert').length },
    { value: 'payment_received', label: 'Payments', count: notifications.filter(n => n.type === 'payment_received').length },
    { value: 'data_request', label: 'Data Requests', count: notifications.filter(n => n.type === 'data_request').length },
  ]

  if (!isConnected) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BellOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
              <p className="text-muted-foreground">
                Please connect your wallet to access notifications.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearReadNotifications}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filter Notifications</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {notificationTypes.map((type) => (
              <Button
                key={type.value}
                variant={filterType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type.value)}
                className="flex items-center space-x-1"
              >
                <span>{type.label}</span>
                {type.count > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">
                    {type.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {filterType === 'all' && 'All Notifications'}
            {filterType === 'unread' && 'Unread Notifications'}
            {filterType !== 'all' && filterType !== 'unread' && getNotificationTypeLabel(filterType as Notification['type'])}
            {filteredNotifications.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {filteredNotifications.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="text-center py-8">
                <Activity className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <BellOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {filterType === 'unread' 
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications yet."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      !notification.read 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-background border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <Badge variant="destructive" className="h-4 px-1 text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{getNotificationTypeLabel(notification.type)}</span>
                            <span>{formatTimeAgo(notification.createdAt)}</span>
                          </div>
                          {notification.data && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(notification.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}