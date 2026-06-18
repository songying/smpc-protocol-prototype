'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, BellRing } from 'lucide-react'
import { useAccount } from 'wagmi'
import Link from 'next/link'

interface NotificationBadgeProps {
  className?: string
  showIcon?: boolean
  showCount?: boolean
}

export default function NotificationBadge({ 
  className = '', 
  showIcon = true, 
  showCount = true 
}: NotificationBadgeProps) {
  const { address, isConnected } = useAccount()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchUnreadCount = async () => {
    if (!isConnected) {
      setUnreadCount(0)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/notifications?unread=true&limit=1', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
  }, [isConnected, address])

  useEffect(() => {
    if (!isConnected) return

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [isConnected])

  if (!isConnected) {
    return null
  }

  return (
    <Link href="/notifications" className={`relative inline-block ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        disabled={loading}
      >
        {showIcon && (
          unreadCount > 0 ? 
            <BellRing className="h-5 w-5" /> : 
            <Bell className="h-5 w-5" />
        )}
        
        {showCount && unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </Link>
  )
}