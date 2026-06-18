'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

// Mobile device detection
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Touch gesture hook
export const useTouchGestures = (elementRef: React.RefObject<HTMLElement>) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }, [])

  const onTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return
    
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isUpSwipe = distanceY > minSwipeDistance
    const isDownSwipe = distanceY < -minSwipeDistance

    return {
      isLeftSwipe,
      isRightSwipe,
      isUpSwipe,
      isDownSwipe,
      distanceX,
      distanceY
    }
  }, [touchStart, touchEnd, minSwipeDistance])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', onTouchStart)
    element.addEventListener('touchmove', onTouchMove)
    element.addEventListener('touchend', onTouchEnd)

    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
    }
  }, [elementRef, onTouchStart, onTouchMove, onTouchEnd])

  return { onTouchEnd }
}

// Mobile viewport hook
export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    orientation: 'portrait' as 'portrait' | 'landscape'
  })

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const orientation = width > height ? 'landscape' : 'portrait'
      
      setViewport({ width, height, orientation })
      
      // Set CSS custom properties for mobile layouts
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`)
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  return viewport
}

// Touch-friendly button component
interface TouchButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  hapticFeedback?: boolean
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  hapticFeedback = true
}) => {
  const handleClick = useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }
    onClick()
  }, [onClick, hapticFeedback])

  const baseClasses = 'touch-manipulation select-none font-medium rounded-lg transition-all duration-200 flex items-center justify-center'
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg hover:shadow-xl'
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-3 text-base min-h-[48px]',
    lg: 'px-6 py-4 text-lg min-h-[56px]'
  }

  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed pointer-events-none' 
    : 'cursor-pointer active:scale-95'

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  )
}

// Mobile-optimized card component
interface MobileCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  shadow?: boolean
  border?: boolean
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = true,
  border = true
}) => {
  const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg'
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const shadowClass = shadow ? 'shadow-sm hover:shadow-md transition-shadow duration-200' : ''
  const borderClass = border ? 'border border-gray-200 dark:border-gray-700' : ''

  return (
    <div className={`${baseClasses} ${paddingClasses[padding]} ${shadowClass} ${borderClass} ${className}`}>
      {children}
    </div>
  )
}

// Mobile bottom sheet component
interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  height?: 'auto' | 'half' | 'full'
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto'
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const { onTouchEnd } = useTouchGestures(sheetRef)

  const heightClasses = {
    auto: 'max-h-[90vh]',
    half: 'h-1/2',
    full: 'h-full'
  }

  const handleTouchEnd = useCallback(() => {
    const gesture = onTouchEnd()
    if (gesture?.isDownSwipe && gesture.distanceY > 50) {
      onClose()
    }
  }, [onTouchEnd, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl shadow-xl transform transition-transform duration-300 ${heightClasses[height]}`}
        style={{ transform: isOpen ? 'translateY(0)' : 'translateY(100%)' }}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// Mobile navigation drawer
interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  side?: 'left' | 'right'
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  children,
  side = 'left'
}) => {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`absolute top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300`}
        style={{
          transform: isOpen 
            ? 'translateX(0)' 
            : side === 'left' 
              ? 'translateX(-100%)' 
              : 'translateX(100%)'
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Pull-to-refresh component
interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  disabled?: boolean
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  disabled = false
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useRef<{ y: number }>({ y: 0 })
  const threshold = 80

  const onTouchStartHandler = (e: React.TouchEvent) => {
    handleTouchStart.current.y = e.touches[0].clientY
  }

  const onTouchMoveHandler = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return

    const currentY = e.touches[0].clientY
    const scrollTop = containerRef.current?.scrollTop || 0

    if (scrollTop === 0) {
      const pullDistance = Math.max(0, currentY - handleTouchStart.current.y)
      setPullDistance(Math.min(pullDistance, threshold * 1.5))
    }
  }

  const onTouchEndHandler = async () => {
    if (disabled || isRefreshing) return

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto h-full"
      onTouchStart={onTouchStartHandler}
      onTouchMove={onTouchMoveHandler}
      onTouchEnd={onTouchEndHandler}
    >
      {/* Pull indicator */}
      <div
        className={`flex items-center justify-center transition-all duration-200 ${
          pullDistance > 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: `${pullDistance}px`,
          transform: `translateY(-${Math.max(0, threshold - pullDistance)}px)`
        }}
      >
        <div className={`transition-transform ${pullDistance >= threshold ? 'rotate-180' : ''}`}>
          <svg
            className={`w-6 h-6 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>

      {children}
    </div>
  )
}

// Mobile tab bar component
interface Tab {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number
}

interface MobileTabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe z-40 lg:hidden ${className}`}>
      <div className="flex justify-around">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 relative ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <div className="relative">
              <div className={`transition-colors ${activeTab === tab.id ? 'scale-110' : ''}`}>
                {tab.icon}
              </div>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 truncate">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}