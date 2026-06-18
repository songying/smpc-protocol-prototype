'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletConnector } from '@/components/WalletConnector';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import NotificationBadge from '@/components/notifications/NotificationBadge';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <nav className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-line">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center mr-3 shadow-glow">
                <svg className="w-5 h-5 text-surface-base" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-ink tracking-tight">SMPC Protocol</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {isMounted && isConnected ? (
              <>
                <Link
                  href="/demo"
                  className="text-brand-primary hover:text-teal-300 px-3 py-2 rounded-md text-sm font-semibold transition-colors"
                >
                  Live Demo
                </Link>
                <Link
                  href="/dashboard"
                  className="text-ink-muted hover:text-ink px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/algorithms"
                  className="text-ink-muted hover:text-ink px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Algorithms
                </Link>
                <Link
                  href="/analytics"
                  className="text-ink-muted hover:text-ink px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  href="/infrastructure"
                  className="text-ink-muted hover:text-ink px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Infrastructure
                </Link>
                <div className="flex items-center ml-2">
                  <NotificationBadge showIcon={true} showCount={true} />
                </div>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-3"></div>
                <div className="flex items-center space-x-2">
                  <RoleSwitcher />
                  <ThemeSwitcher />
                  <WalletConnector />
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/demo"
                  className="text-brand-primary hover:text-teal-300 px-3 py-2 rounded-md text-sm font-semibold transition-colors"
                >
                  Live Demo
                </Link>
                <Link
                  href="/about"
                  className="text-ink-muted hover:text-ink px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  About
                </Link>
                <div className="flex items-center space-x-2 ml-4">
                  <ThemeSwitcher />
                  <WalletConnector />
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2">
            <ThemeSwitcher />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:text-gray-900 dark:focus:text-white p-2"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {isMounted && isConnected ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/algorithms"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Algorithms
                  </Link>
                  <Link
                    href="/analytics"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/infrastructure"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Infrastructure
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Notifications
                  </Link>
                  <div className="px-3 py-2">
                    <RoleSwitcher />
                  </div>
                  <div className="px-3 py-2">
                    <WalletConnector />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/about"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    About
                  </Link>
                  <div className="px-3 py-2">
                    <WalletConnector />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}