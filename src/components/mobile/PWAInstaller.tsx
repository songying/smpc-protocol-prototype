'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TouchButton, MobileCard, useIsMobile } from './MobileUtils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallerProps {
  onInstall?: () => void
  onDismiss?: () => void
  className?: string
}

export function PWAInstaller({ onInstall, onDismiss, className = '' }: PWAInstallerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const isMobile = useIsMobile()

  // Detect if app is already installed
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running as PWA
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true)
        return
      }

      // Check for related applications API (experimental)
      if ('getInstalledRelatedApps' in navigator) {
        (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
          if (apps.length > 0) {
            setIsInstalled(true)
          }
        }).catch(() => {
          // API not supported or failed
        })
      }
    }

    checkInstalled()
  }, [])

  // Detect iOS devices
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)
  }, [])

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setIsVisible(false)
      onInstall?.()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [onInstall])

  // Show install prompt after user interaction
  useEffect(() => {
    if (deferredPrompt && !isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 10000) // Show after 10 seconds

      return () => clearTimeout(timer)
    }
  }, [deferredPrompt, isInstalled])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        onInstall?.()
      } else {
        onDismiss?.()
      }
    } catch (error) {
      console.error('PWA install error:', error)
    } finally {
      setDeferredPrompt(null)
      setIsVisible(false)
    }
  }, [deferredPrompt, onInstall, onDismiss])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    onDismiss?.()
    
    // Don't show again for 24 hours
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }, [onDismiss])

  const handleIOSInstructions = useCallback(() => {
    setShowIOSInstructions(true)
  }, [])

  // Check if user previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      
      if (now - dismissedTime < twentyFourHours) {
        setIsVisible(false)
        return
      }
    }
  }, [])

  // Don't show if already installed or not mobile
  if (isInstalled || !isMobile) {
    return null
  }

  // Don't show if not visible
  if (!isVisible && !showIOSInstructions) {
    return null
  }

  return (
    <>
      {/* Install Prompt */}
      {isVisible && (
        <div className={`fixed bottom-4 left-4 right-4 z-50 lg:hidden ${className}`}>
          <MobileCard className="p-4 border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Install SMPC Protocol
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Add to your home screen for quick access and offline capabilities
                </p>
                
                <div className="flex space-x-2">
                  {deferredPrompt ? (
                    <TouchButton
                      onClick={handleInstall}
                      variant="primary"
                      size="sm"
                    >
                      Install App
                    </TouchButton>
                  ) : isIOS ? (
                    <TouchButton
                      onClick={handleIOSInstructions}
                      variant="primary"
                      size="sm"
                    >
                      Install Instructions
                    </TouchButton>
                  ) : null}
                  
                  <TouchButton
                    onClick={handleDismiss}
                    variant="secondary"
                    size="sm"
                  >
                    Not Now
                  </TouchButton>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </MobileCard>
        </div>
      )}

      {/* iOS Installation Instructions */}
      {showIOSInstructions && isIOS && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <MobileCard className="max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Install on iOS
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Follow these steps to add SMPC Protocol to your home screen
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    Tap the <strong>Share</strong> button at the bottom of Safari
                  </p>
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-center">
                    <svg className="w-6 h-6 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </p>
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-center">
                    <svg className="w-6 h-6 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    Tap <strong>"Add"</strong> to confirm and install the app
                  </p>
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-center">
                    <svg className="w-6 h-6 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <TouchButton
                onClick={() => setShowIOSInstructions(false)}
                variant="primary"
                size="md"
                className="flex-1"
              >
                Got It
              </TouchButton>
              <TouchButton
                onClick={handleDismiss}
                variant="secondary"
                size="md"
              >
                Cancel
              </TouchButton>
            </div>
          </MobileCard>
        </div>
      )}
    </>
  )
}

// Hook for PWA installation status
export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true)
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
        setDeferredPrompt(null)
        return true
      }
    } catch (error) {
      console.error('PWA install error:', error)
    }
    
    return false
  }, [deferredPrompt])

  return {
    isInstalled,
    canInstall,
    install
  }
}

// PWA Update component
export function PWAUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        setRegistration(reg)

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
              }
            })
          }
        })
      })
    }
  }, [])

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  if (!updateAvailable) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:w-80">
      <MobileCard className="p-4 border border-blue-500 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Update Available
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A new version is ready to install
            </p>
          </div>
          <TouchButton
            onClick={handleUpdate}
            variant="primary"
            size="sm"
          >
            Update
          </TouchButton>
        </div>
      </MobileCard>
    </div>
  )
}