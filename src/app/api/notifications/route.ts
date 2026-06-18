import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/api/middleware'
import redisClient from '@/lib/database/redis-client'

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

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread') === 'true'
    const type = searchParams.get('type')

    const userAddress = authResult.user?.address
    const notificationKey = `notifications:${userAddress}`
    
    // Get all notifications for the user
    const notificationIds = await redisClient.lrange(notificationKey, 0, -1)
    const notifications: Notification[] = []

    for (const notificationId of notificationIds) {
      const notificationData = await redisClient.hgetall(`notification:${notificationId}`)
      if (notificationData && Object.keys(notificationData).length > 0) {
        const notification: Notification = {
          id: notificationId,
          userId: notificationData.userId,
          type: notificationData.type as Notification['type'],
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data ? JSON.parse(notificationData.data) : undefined,
          read: notificationData.read === 'true',
          createdAt: notificationData.createdAt,
          expiresAt: notificationData.expiresAt
        }

        // Apply filters
        if (unreadOnly && notification.read) continue
        if (type && notification.type !== type) continue

        // Check if expired
        if (notification.expiresAt && new Date(notification.expiresAt) < new Date()) {
          // Remove expired notification
          await redisClient.lrem(notificationKey, 0, notificationId)
          await redisClient.del(`notification:${notificationId}`)
          continue
        }

        notifications.push(notification)
      }
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Apply pagination
    const paginatedNotifications = notifications.slice(offset, offset + limit)

    // Get unread count
    const unreadCount = notifications.filter(n => !n.read).length

    return NextResponse.json({
      notifications: paginatedNotifications,
      total: notifications.length,
      unreadCount,
      hasMore: offset + limit < notifications.length
    })

  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, title, message, data, targetUserId, expiresIn } = body

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      )
    }

    // Create notification
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const userId = targetUserId || authResult.user?.address
    const createdAt = new Date().toISOString()
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined

    const notification: Notification = {
      id: notificationId,
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt,
      expiresAt
    }

    // Store notification
    const notificationData = {
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data ? JSON.stringify(notification.data) : '',
      read: 'false',
      createdAt: notification.createdAt,
      expiresAt: notification.expiresAt || ''
    }

    await redisClient.hmset(`notification:${notificationId}`, notificationData)
    
    // Add to user's notification list
    const userNotificationKey = `notifications:${userId}`
    await redisClient.lpush(userNotificationKey, notificationId)
    
    // Keep only last 1000 notifications per user
    await redisClient.ltrim(userNotificationKey, 0, 999)

    // Set expiration if specified
    if (expiresAt) {
      const expirationTime = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      await redisClient.expire(`notification:${notificationId}`, expirationTime)
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: notificationId,
        ...notification
      }
    })

  } catch (error) {
    console.error('POST /api/notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationId, action } = body

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: 'Notification ID and action are required' },
        { status: 400 }
      )
    }

    const userAddress = authResult.user?.address
    const notificationData = await redisClient.hgetall(`notification:${notificationId}`)

    if (!notificationData || Object.keys(notificationData).length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Verify notification belongs to user
    if (notificationData.userId !== userAddress) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    switch (action) {
      case 'mark_read':
        await redisClient.hset(`notification:${notificationId}`, 'read', 'true')
        break
      
      case 'mark_unread':
        await redisClient.hset(`notification:${notificationId}`, 'read', 'false')
        break
      
      case 'delete':
        await redisClient.del(`notification:${notificationId}`)
        await redisClient.lrem(`notifications:${userAddress}`, 0, notificationId)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('PUT /api/notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'clear_read'

    const userAddress = authResult.user?.address
    const notificationKey = `notifications:${userAddress}`
    
    // Get all notification IDs for the user
    const notificationIds = await redisClient.lrange(notificationKey, 0, -1)
    
    let deletedCount = 0
    const updatedNotificationIds = []

    for (const notificationId of notificationIds) {
      const notificationData = await redisClient.hgetall(`notification:${notificationId}`)
      
      if (notificationData && Object.keys(notificationData).length > 0) {
        const shouldDelete = 
          action === 'clear_all' ||
          (action === 'clear_read' && notificationData.read === 'true') ||
          (action === 'clear_expired' && notificationData.expiresAt && new Date(notificationData.expiresAt) < new Date())

        if (shouldDelete) {
          await redisClient.del(`notification:${notificationId}`)
          deletedCount++
        } else {
          updatedNotificationIds.push(notificationId)
        }
      }
    }

    // Update the user's notification list
    await redisClient.del(notificationKey)
    if (updatedNotificationIds.length > 0) {
      await redisClient.lpush(notificationKey, ...updatedNotificationIds)
    }

    return NextResponse.json({
      success: true,
      deletedCount
    })

  } catch (error) {
    console.error('DELETE /api/notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}