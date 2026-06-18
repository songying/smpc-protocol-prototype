'use client';

import React from 'react';
import Link from 'next/link';
import { useAccount, useDisconnect } from 'wagmi';
import { UserRole } from './DashboardLayout';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  role: UserRole;
  showBreadcrumb?: boolean;
  breadcrumbItems?: BreadcrumbItem[];
  onSidebarToggle: () => void;
  sidebarCollapsed: boolean;
  isMobile: boolean;
}

export function Header({
  title = 'Dashboard',
  subtitle,
  role,
  showBreadcrumb = true,
  breadcrumbItems = [],
  onSidebarToggle,
  sidebarCollapsed,
  isMobile
}: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    if (breadcrumbItems.length > 0) return breadcrumbItems;
    
    return [
      { label: 'Dashboard', href: '/dashboard' },
      { label: title }
    ];
  };

  return (
    <header className="header sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="header-content px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Mobile menu + Title */}
          <div className="flex items-center space-x-4">
            {/* Mobile sidebar toggle */}
            {isMobile && (
              <button
                onClick={onSidebarToggle}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {/* Page title and subtitle */}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right section - User menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5h5l-5-5H9l5 5-5 5h6z" />
              </svg>
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800" />
            </button>

            {/* User menu */}
            {isConnected && address && (
              <div className="relative flex items-center space-x-3">
                {/* Wallet address display */}
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatAddress(address)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Connected
                  </span>
                </div>

                {/* User avatar and menu */}
                <div className="relative">
                  <button className="flex items-center space-x-2 p-2 text-sm rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {role.displayName.charAt(0)}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown menu (simplified - would need state management for real implementation) */}
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden">
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Profile Settings
                      </Link>
                      <Link
                        href="/preferences"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Preferences
                      </Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button
                        onClick={() => disconnect()}
                        className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
                      >
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumb navigation */}
        {showBreadcrumb && (
          <div className="header-breadcrumb pb-4">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                {getBreadcrumbItems().map((item, index) => (
                  <li key={item.label} className="flex items-center">
                    {index > 0 && (
                      <svg
                        className="flex-shrink-0 h-4 w-4 text-gray-300 dark:text-gray-600 mx-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}