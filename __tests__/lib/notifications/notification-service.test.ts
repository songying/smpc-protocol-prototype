import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { 
  notificationService,
  NotificationData,
  NotificationType
} from '../../../src/lib/notifications/notification-service'

// Mock Redis client
const mockRedisClient = {
  hmset: jest.fn(),
  hgetall: jest.fn(),
  hset: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  lrange: jest.fn(),
  lpush: jest.fn(),
  lrem: jest.fn(),
  ltrim: jest.fn(),
  expire: jest.fn(),
}

jest.mock('../../../src/lib/database/redis-client', () => mockRedisClient)

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData: NotificationData = {
        type: 'algorithm_approved',
        title: 'Algorithm Approved',
        message: 'Your algorithm has been approved',
        targetUserId: '0x123456789',
        expiresIn: 7 * 24 * 60 * 60 // 7 days
      }

      mockRedisClient.hmset.mockResolvedValue('OK')
      mockRedisClient.lpush.mockResolvedValue(1)
      mockRedisClient.ltrim.mockResolvedValue('OK')
      mockRedisClient.expire.mockResolvedValue(1)

      const notificationId = await notificationService.createNotification(notificationData)

      expect(notificationId).toMatch(/^notif_\d+_[a-z0-9]+$/)
      expect(mockRedisClient.hmset).toHaveBeenCalledWith(
        `notification:${notificationId}`,
        expect.objectContaining({
          userId: notificationData.targetUserId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          read: 'false'
        })
      )
      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        `notifications:${notificationData.targetUserId}`,
        notificationId
      )
      expect(mockRedisClient.ltrim).toHaveBeenCalledWith(
        `notifications:${notificationData.targetUserId}`,
        0,
        999
      )
      expect(mockRedisClient.expire).toHaveBeenCalled()
    })

    it('should create notification without expiration', async () => {
      const notificationData: NotificationData = {
        type: 'system_alert',
        title: 'System Alert',
        message: 'System maintenance scheduled',
        targetUserId: '0x123456789'
      }

      mockRedisClient.hmset.mockResolvedValue('OK')
      mockRedisClient.lpush.mockResolvedValue(1)
      mockRedisClient.ltrim.mockResolvedValue('OK')

      const notificationId = await notificationService.createNotification(notificationData)

      expect(notificationId).toBeDefined()
      expect(mockRedisClient.expire).not.toHaveBeenCalled()
    })

    it('should handle creation errors', async () => {
      const notificationData: NotificationData = {
        type: 'algorithm_approved',
        title: 'Algorithm Approved',
        message: 'Your algorithm has been approved',
        targetUserId: '0x123456789'
      }

      mockRedisClient.hmset.mockRejectedValue(new Error('Redis error'))

      await expect(notificationService.createNotification(notificationData)).rejects.toThrow('Redis error')
    })
  })

  describe('createBulkNotifications', () => {
    it('should create multiple notifications', async () => {
      const notifications: NotificationData[] = [
        {
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Algorithm 1 approved',
          targetUserId: '0x111'
        },
        {
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Algorithm 2 approved',
          targetUserId: '0x222'
        }
      ]

      mockRedisClient.hmset.mockResolvedValue('OK')
      mockRedisClient.lpush.mockResolvedValue(1)
      mockRedisClient.ltrim.mockResolvedValue('OK')

      const notificationIds = await notificationService.createBulkNotifications(notifications)

      expect(notificationIds).toHaveLength(2)
      expect(mockRedisClient.hmset).toHaveBeenCalledTimes(2)
      expect(mockRedisClient.lpush).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in bulk creation', async () => {
      const notifications: NotificationData[] = [
        {
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Algorithm 1 approved',
          targetUserId: '0x111'
        },
        {
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Algorithm 2 approved',
          targetUserId: '0x222'
        }
      ]

      mockRedisClient.hmset
        .mockResolvedValueOnce('OK')
        .mockRejectedValueOnce(new Error('Redis error'))
      mockRedisClient.lpush.mockResolvedValue(1)
      mockRedisClient.ltrim.mockResolvedValue('OK')

      const notificationIds = await notificationService.createBulkNotifications(notifications)

      expect(notificationIds).toHaveLength(1)
    })
  })

  describe('broadcastToAllUsers', () => {
    it('should broadcast notification to all users', async () => {
      const userKeys = ['notifications:0x111', 'notifications:0x222', 'notifications:0x333']
      
      mockRedisClient.keys.mockResolvedValue(userKeys)
      mockRedisClient.hmset.mockResolvedValue('OK')
      mockRedisClient.lpush.mockResolvedValue(1)
      mockRedisClient.ltrim.mockResolvedValue('OK')

      await notificationService.broadcastToAllUsers(
        'system_alert',
        'System Maintenance',
        'System will be down for maintenance',
        { severity: 'medium' },
        24 * 60 * 60 // 1 day
      )

      expect(mockRedisClient.keys).toHaveBeenCalledWith('notifications:*')
      expect(mockRedisClient.hmset).toHaveBeenCalledTimes(3)
      expect(mockRedisClient.lpush).toHaveBeenCalledTimes(3)
    })
  })

  describe('notification templates', () => {
    it('should generate algorithm approval notification', () => {
      const notification = notificationService.templates.algorithmApproved('algo123', 'Test Algorithm')
      
      expect(notification.type).toBe('algorithm_approved')
      expect(notification.title).toBe('Algorithm Approved')
      expect(notification.message).toContain('Test Algorithm')
      expect(notification.data).toEqual({
        algorithmId: 'algo123',
        algorithmName: 'Test Algorithm'
      })
      expect(notification.expiresIn).toBe(7 * 24 * 60 * 60)
    })

    it('should generate algorithm rejection notification', () => {
      const notification = notificationService.templates.algorithmRejected(
        'algo123', 
        'Test Algorithm', 
        'Security issues found'
      )
      
      expect(notification.type).toBe('algorithm_rejected')
      expect(notification.title).toBe('Algorithm Rejected')
      expect(notification.message).toContain('Security issues found')
      expect(notification.data).toEqual({
        algorithmId: 'algo123',
        algorithmName: 'Test Algorithm',
        reason: 'Security issues found'
      })
    })

    it('should generate computation completed notification', () => {
      const notification = notificationService.templates.computationCompleted(
        'comp123',
        'Test Algorithm',
        5000
      )
      
      expect(notification.type).toBe('computation_completed')
      expect(notification.title).toBe('Computation Completed')
      expect(notification.message).toContain('5000ms')
      expect(notification.data).toEqual({
        computationId: 'comp123',
        algorithmName: 'Test Algorithm',
        executionTime: 5000
      })
    })

    it('should generate system alert notification', () => {
      const notification = notificationService.templates.systemAlert('critical', 'System under attack')
      
      expect(notification.type).toBe('system_alert')
      expect(notification.title).toBe('System Alert - CRITICAL')
      expect(notification.message).toBe('System under attack')
      expect(notification.data).toEqual({ severity: 'critical' })
      expect(notification.expiresIn).toBe(30 * 24 * 60 * 60)
    })

    it('should generate payment received notification', () => {
      const notification = notificationService.templates.paymentReceived(100, 'ETH', 'Algorithm execution')
      
      expect(notification.type).toBe('payment_received')
      expect(notification.title).toBe('Payment Received')
      expect(notification.message).toContain('100 ETH')
      expect(notification.data).toEqual({
        amount: 100,
        currency: 'ETH',
        source: 'Algorithm execution'
      })
    })
  })

  describe('helper methods', () => {
    beforeEach(() => {
      mockRedisClient.hmset.mockResolvedValue('OK')
      mockRedisClient.lpush.mockResolvedValue(1)
      mockRedisClient.ltrim.mockResolvedValue('OK')
    })

    it('should notify algorithm approval', async () => {
      await notificationService.notifyAlgorithmApproval('algo123', 'Test Algorithm', '0x123')

      expect(mockRedisClient.hmset).toHaveBeenCalledWith(
        expect.stringMatching(/^notification:notif_\d+_[a-z0-9]+$/),
        expect.objectContaining({
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          userId: '0x123'
        })
      )
    })

    it('should notify computation completion', async () => {
      await notificationService.notifyComputationCompleted('comp123', 'Test Algorithm', 5000, '0x123')

      expect(mockRedisClient.hmset).toHaveBeenCalledWith(
        expect.stringMatching(/^notification:notif_\d+_[a-z0-9]+$/),
        expect.objectContaining({
          type: 'computation_completed',
          userId: '0x123'
        })
      )
    })

    it('should broadcast system alert', async () => {
      mockRedisClient.keys.mockResolvedValue(['notifications:0x111', 'notifications:0x222'])

      await notificationService.broadcastSystemAlert('high', 'Server maintenance')

      expect(mockRedisClient.keys).toHaveBeenCalledWith('notifications:*')
      expect(mockRedisClient.hmset).toHaveBeenCalledTimes(2)
    })
  })

  describe('cleanupExpiredNotifications', () => {
    it('should clean up expired notifications', async () => {
      const userKeys = ['notifications:0x111', 'notifications:0x222']
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      const validDate = new Date().toISOString()

      mockRedisClient.keys.mockResolvedValue(userKeys)
      mockRedisClient.lrange.mockResolvedValue(['notif1', 'notif2', 'notif3'])
      mockRedisClient.hgetall
        .mockResolvedValueOnce({ expiresAt: expiredDate }) // expired
        .mockResolvedValueOnce({ expiresAt: validDate })   // valid
        .mockResolvedValueOnce({})                         // invalid data
      mockRedisClient.del.mockResolvedValue(1)
      mockRedisClient.lpush.mockResolvedValue(1)

      const cleanedCount = await notificationService.cleanupExpiredNotifications()

      expect(cleanedCount).toBe(2) // 1 expired + 1 invalid
      expect(mockRedisClient.del).toHaveBeenCalledTimes(4) // 2 notifications + 2 user keys
      expect(mockRedisClient.lpush).toHaveBeenCalledTimes(2) // 2 users with valid notifications
    })
  })

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const userKeys = ['notifications:0x111', 'notifications:0x222']
      
      mockRedisClient.keys.mockResolvedValue(userKeys)
      mockRedisClient.lrange.mockResolvedValue(['notif1', 'notif2'])
      mockRedisClient.hgetall
        .mockResolvedValueOnce({ 
          read: 'false', 
          type: 'algorithm_approved' 
        })
        .mockResolvedValueOnce({ 
          read: 'true', 
          type: 'computation_completed' 
        })

      const stats = await notificationService.getNotificationStats()

      expect(stats).toEqual({
        totalNotifications: 2,
        unreadNotifications: 1,
        notificationsByType: expect.objectContaining({
          algorithm_approved: 1,
          computation_completed: 1
        }),
        activeUsers: 2
      })
    })
  })
})