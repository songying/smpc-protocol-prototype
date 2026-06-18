'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { ThemeToggle } from './ThemeToggle';

export interface UserRole {
  type: 'data-provider' | 'auditor' | 'data-consumer' | 'admin';
  permissions: string[];
  displayName: string;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  role?: UserRole;
  title?: string;
  subtitle?: string;
  className?: string;
  sidebarCollapsed?: boolean;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function DashboardLayout({
  children,
  role,
  title,
  subtitle,
  className = '',
  sidebarCollapsed = false,
  showBreadcrumb = true,
  breadcrumbItems = []
}: DashboardLayoutProps) {
  const { isConnected, address } = useAccount();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(sidebarCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Dark mode persistence
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-theme');
    if (saved) {
      setIsDarkMode(saved === 'dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Determine user role based on wallet address or props
  const currentRole: UserRole = role || {
    type: 'data-provider',
    permissions: ['data.upload', 'data.manage'],
    displayName: 'Data Provider'
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to access the dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-layout min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''} ${className}`}>
      {/* CSS Grid Layout Container */}
      <div className="dashboard-grid min-h-screen grid grid-cols-1 lg:grid-cols-[auto_1fr] grid-rows-[auto_1fr_auto]">
        
        {/* Sidebar - spans full height on desktop, overlay on mobile */}
        <aside className={`
          sidebar-container
          ${isMobile ? 'fixed left-0 top-0 z-40 h-full' : 'lg:row-span-3'}
          ${isSidebarCollapsed ? 'w-16' : 'w-64'}
          transition-all duration-300 ease-in-out
          ${isMobile && isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}
        `}>
          <Sidebar
            role={currentRole}
            collapsed={isSidebarCollapsed}
            onToggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobile={isMobile}
          />
        </aside>

        {/* Mobile sidebar overlay */}
        {isMobile && !isSidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        {/* Header - spans full width on mobile, content area on desktop */}
        <header className={`
          header-container
          ${isMobile ? 'col-span-1' : 'lg:col-start-2'}
          sticky top-0 z-20
        `}>
          <Header
            title={title}
            subtitle={subtitle}
            role={currentRole}
            showBreadcrumb={showBreadcrumb}
            breadcrumbItems={breadcrumbItems}
            onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            sidebarCollapsed={isSidebarCollapsed}
            isMobile={isMobile}
          />
        </header>

        {/* Main content area - responsive grid positioning */}
        <main className={`
          main-container
          ${isMobile ? 'col-span-1' : 'lg:col-start-2'}
          overflow-hidden
        `}>
          <div className="dashboard-content h-full">
            <div className="content-wrapper h-full px-4 sm:px-6 lg:px-8 py-6">
              <div className="content-inner max-w-7xl mx-auto">
                {children}
              </div>
            </div>
          </div>
        </main>

        {/* Footer - spans content area */}
        <footer className={`
          footer-container
          ${isMobile ? 'col-span-1' : 'lg:col-start-2'}
        `}>
          <Footer role={currentRole} />
        </footer>
      </div>

      {/* Theme toggle - floating button */}
      <div className="fixed bottom-4 right-4 z-50">
        <ThemeToggle 
          isDarkMode={isDarkMode}
          onToggle={() => setIsDarkMode(!isDarkMode)}
        />
      </div>

      {/* Role indicator */}
      <div className={`fixed top-4 right-4 z-30 px-3 py-1 rounded-full text-xs font-medium ${
        currentRole.type === 'data-provider' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
        currentRole.type === 'auditor' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' :
        currentRole.type === 'data-consumer' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      }`}>
        {currentRole.displayName}
      </div>
    </div>
  );
}

// Custom hook for dashboard state management
export function useDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isConnected, address } = useAccount();

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    isDarkMode,
    setIsDarkMode,
    isConnected,
    address
  };
}