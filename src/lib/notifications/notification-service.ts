import redisClient from '@/lib/database/redis-client'

export type NotificationType = 
  | 'algorithm_approved' 
  | 'algorithm_rejected' 
  | 'computation_completed' 
  | 'computation_failed' 
  | 'system_alert' 
  | 'payment_received' 
  | 'data_request'

export interface NotificationData {
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  targetUserId: string
  expiresIn?: number // seconds
}

export interface SystemNotificationTemplates {
  algorithmApproved: (algorithmId: string, algorithmName: string) => NotificationData
  algorithmRejected: (algorithmId: string, algorithmName: string, reason: string) => NotificationData
  computationCompleted: (computationId: string, algorithmName: string, executionTime: number) => NotificationData
  computationFailed: (computationId: string, algorithmName: string, error: string) => NotificationData
  systemAlert: (severity: 'low' | 'medium' | 'high' | 'critical', message: string) => NotificationData
  paymentReceived: (amount: number, currency: string, source: string) => NotificationData
  dataRequest: (requesterId: string, dataType: string, purpose: string) => NotificationData
}

class NotificationService {
  
  async createNotification(notificationData: NotificationData): Promise<string> {
    try {
      // Generate unique notification ID
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const createdAt = new Date().toISOString()
      const expiresAt = notificationData.expiresIn 
        ? new Date(Date.now() + notificationData.expiresIn * 1000).toISOString() 
        : undefined

      // Store notification data
      const storedData = {
        userId: notificationData.targetUserId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data ? JSON.stringify(notificationData.data) : '',
        read: 'false',
        createdAt,
        expiresAt: expiresAt || ''
      }

      await redisClient.hmset(`notification:${notificationId}`, storedData)
      
      // Add to user's notification list
      const userNotificationKey = `notifications:${notificationData.targetUserId}`
      await redisClient.lpush(userNotificationKey, notificationId)
      
      // Keep only last 1000 notifications per user
      await redisClient.ltrim(userNotificationKey, 0, 999)

      // Set expiration if specified
      if (expiresAt) {
        const expirationTime = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
        await redisClient.expire(`notification:${notificationId}`, expirationTime)
      }

      console.log(`Notification created: ${notificationId} for user: ${notificationData.targetUserId}`)
      return notificationId

    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  async createBulkNotifications(notifications: NotificationData[]): Promise<string[]> {
    const notificationIds = []
    
    for (const notificationData of notifications) {
      try {
        const id = await this.createNotification(notificationData)
        notificationIds.push(id)
      } catch (error) {
        console.error('Error creating bulk notification:', error)
      }
    }
    
    return notificationIds
  }

  async broadcastToAllUsers(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    expiresIn?: number
  ): Promise<void> {
    try {
      // Get all user addresses from algorithm schemas or other user tracking
      const userKeys = await redisClient.keys('notifications:*')
      const userAddresses = userKeys.map(key => key.replace('notifications:', ''))

      const notifications = userAddresses.map(userId => ({
        type,
        title,
        message,
        data,
        targetUserId: userId,
        expiresIn
      }))

      await this.createBulkNotifications(notifications)
      console.log(`Broadcast notification sent to ${userAddresses.length} users`)

    } catch (error) {
      console.error('Error broadcasting notification:', error)
      throw error
    }
  }

  // Notification template generators
  templates: SystemNotificationTemplates = {
    algorithmApproved: (algorithmId: string, algorithmName: string) => ({
      type: 'algorithm_approved',
      title: 'Algorithm Approved',
      message: `Your algorithm "${algorithmName}" has been approved and is now available for execution.`,
      data: { algorithmId, algorithmName },
      targetUserId: '', // Will be set by caller
      expiresIn: 7 * 24 * 60 * 60 // 7 days
    }),

    algorithmRejected: (algorithmId: string, algorithmName: string, reason: string) => ({
      type: 'algorithm_rejected',
      title: 'Algorithm Rejected',
      message: `Your algorithm "${algorithmName}" has been rejected. Reason: ${reason}`,
      data: { algorithmId, algorithmName, reason },
      targetUserId: '', // Will be set by caller
      expiresIn: 30 * 24 * 60 * 60 // 30 days
    }),

    computationCompleted: (computationId: string, algorithmName: string, executionTime: number) => ({
      type: 'computation_completed',
      title: 'Computation Completed',
      message: `Your computation using "${algorithmName}" has completed successfully in ${executionTime}ms.`,
      data: { computationId, algorithmName, executionTime },
      targetUserId: '', // Will be set by caller
      expiresIn: 14 * 24 * 60 * 60 // 14 days
    }),

    computationFailed: (computationId: string, algorithmName: string, error: string) => ({
      type: 'computation_failed',
      title: 'Computation Failed',
      message: `Your computation using "${algorithmName}" has failed. Error: ${error}`,
      data: { computationId, algorithmName, error },
      targetUserId: '', // Will be set by caller
      expiresIn: 30 * 24 * 60 * 60 // 30 days
    }),

    systemAlert: (severity: 'low' | 'medium' | 'high' | 'critical', message: string) => ({
      type: 'system_alert',
      title: `System Alert - ${severity.toUpperCase()}`,
      message,
      data: { severity },
      targetUserId: '', // Will be set by caller or broadcast
      expiresIn: severity === 'critical' ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60
    }),

    paymentReceived: (amount: number, currency: string, source: string) => ({
      type: 'payment_received',
      title: 'Payment Received',
      message: `You have received ${amount} ${currency} from ${source}.`,
      data: { amount, currency, source },
      targetUserId: '', // Will be set by caller
      expiresIn: 90 * 24 * 60 * 60 // 90 days
    }),

    dataRequest: (requesterId: string, dataType: string, purpose: string) => ({
      type: 'data_request',
      title: 'Data Access Request',
      message: `User ${requesterId} has requested access to your ${dataType} data for: ${purpose}`,
      data: { requesterId, dataType, purpose },
      targetUserId: '', // Will be set by caller
      expiresIn: 30 * 24 * 60 * 60 // 30 days
    })
  }

  // Helper methods for common notification scenarios
  async notifyAlgorithmApproval(algorithmId: string, algorithmName: string, userId: string): Promise<void> {
    const notification = this.templates.algorithmApproved(algorithmId, algorithmName)
    notification.targetUserId = userId
    await this.createNotification(notification)
  }

  async notifyAlgorithmRejection(algorithmId: string, algorithmName: string, reason: string, userId: string): Promise<void> {
    const notification = this.templates.algorithmRejected(algorithmId, algorithmName, reason)
    notification.targetUserId = userId
    await this.createNotification(notification)
  }

  async notifyComputationCompleted(computationId: string, algorithmName: string, executionTime: number, userId: string): Promise<void> {
    const notification = this.templates.computationCompleted(computationId, algorithmName, executionTime)
    notification.targetUserId = userId
    await this.createNotification(notification)
  }

  async notifyComputationFailed(computationId: string, algorithmName: string, error: string, userId: string): Promise<void> {
    const notification = this.templates.computationFailed(computationId, algorithmName, error)
    notification.targetUserId = userId
    await this.createNotification(notification)
  }

  async broadcastSystemAlert(severity: 'low' | 'medium' | 'high' | 'critical', message: string): Promise<void> {
    const notification = this.templates.systemAlert(severity, message)
    await this.broadcastToAllUsers(
      notification.type,
      notification.title,
      notification.message,
      notification.data,
      notification.expiresIn
    )
  }

  async notifyPaymentReceived(amount: number, currency: string, source: string, userId: string): Promise<void> {
    const notification = this.templates.paymentReceived(amount, currency, source)
    notification.targetUserId = userId
    await this.createNotification(notification)
  }

  async notifyDataRequest(requesterId: string, dataType: string, purpose: string, dataOwnerId: string): Promise<void> {
    const notification = this.templates.dataRequest(requesterId, dataType, purpose)
    notification.targetUserId = dataOwnerId
    await this.createNotification(notification)
  }

  // Cleanup expired notifications
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      let cleanedCount = 0
      const userKeys = await redisClient.keys('notifications:*')
      
      for (const userKey of userKeys) {
        const notificationIds = await redisClient.lrange(userKey, 0, -1)
        const validNotificationIds = []
        
        for (const notificationId of notificationIds) {
          const notificationData = await redisClient.hgetall(`notification:${notificationId}`)
          
          if (notificationData && Object.keys(notificationData).length > 0) {
            const expiresAt = notificationData.expiresAt
            
            if (expiresAt && new Date(expiresAt) < new Date()) {
              // Expired notification
              await redisClient.del(`notification:${notificationId}`)
              cleanedCount++
            } else {
              validNotificationIds.push(notificationId)
            }
          } else {
            // Invalid notification data
            cleanedCount++
          }
        }
        
        // Update user's notification list with valid notifications only
        await redisClient.del(userKey)
        if (validNotificationIds.length > 0) {
          await redisClient.lpush(userKey, ...validNotificationIds)
        }
      }
      
      console.log(`Cleaned up ${cleanedCount} expired notifications`)
      return cleanedCount

    } catch (error) {
      console.error('Error cleaning up expired notifications:', error)
      throw error
    }
  }

  // Get notification statistics
  async getNotificationStats(): Promise<{
    totalNotifications: number
    unreadNotifications: number
    notificationsByType: Record<NotificationType, number>
    activeUsers: number
  }> {
    try {
      const userKeys = await redisClient.keys('notifications:*')
      let totalNotifications = 0
      let unreadNotifications = 0
      const notificationsByType: Record<NotificationType, number> = {
        algorithm_approved: 0,
        algorithm_rejected: 0,
        computation_completed: 0,
        computation_failed: 0,
        system_alert: 0,
        payment_received: 0,
        data_request: 0
      }

      for (const userKey of userKeys) {
        const notificationIds = await redisClient.lrange(userKey, 0, -1)
        
        for (const notificationId of notificationIds) {
          const notificationData = await redisClient.hgetall(`notification:${notificationId}`)
          
          if (notificationData && Object.keys(notificationData).length > 0) {
            totalNotifications++
            
            if (notificationData.read === 'false') {
              unreadNotifications++
            }
            
            const type = notificationData.type as NotificationType
            if (type in notificationsByType) {
              notificationsByType[type]++
            }
          }
        }
      }

      return {
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        activeUsers: userKeys.length
      }

    } catch (error) {
      console.error('Error getting notification stats:', error)
      throw error
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService