'use client';

import React, { useState, useRef } from 'react';
import { WidgetComponentProps, WidgetConfig } from './types';

export interface WidgetContainerProps extends WidgetComponentProps {
  children: React.ReactNode;
  className?: string;
}

export function WidgetContainer({ 
  config, 
  children, 
  loading = false, 
  error,
  onUpdate,
  onResize,
  onRemove,
  onSettings,
  className = ''
}: WidgetContainerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getSizeClasses = () => {
    switch (config.size) {
      case 'sm': return 'min-h-[200px] col-span-1';
      case 'md': return 'min-h-[300px] col-span-2';
      case 'lg': return 'min-h-[400px] col-span-3';
      case 'xl': return 'min-h-[500px] col-span-4';
      default: return 'min-h-[300px] col-span-2';
    }
  };

  const handleRefresh = () => {
    if (onUpdate) {
      onUpdate(config.id, { refreshRequested: true });
    }
  };

  const handleRemove = () => {
    if (onRemove && config.isRemovable) {
      if (confirm(`Remove widget "${config.title}"?`)) {
        onRemove(config.id);
      }
    }
  };

  const handleSettings = () => {
    if (onSettings) {
      onSettings(config.id);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`widget-container relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 ${getSizeClasses()} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
    >
      {/* Widget Header */}
      <div className="widget-header flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="widget-title-section flex items-center space-x-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {config.title}
            </h3>
            {config.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {config.description}
              </p>
            )}
          </div>
          {loading && (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
          )}
        </div>

        {/* Widget Controls */}
        <div className={`widget-controls flex items-center space-x-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Refresh widget"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Settings button */}
          <button
            onClick={handleSettings}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Widget settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Remove button */}
          {config.isRemovable && (
            <button
              onClick={handleRemove}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded transition-colors"
              title="Remove widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="widget-content p-4 h-full">
        {error ? (
          <div className="widget-error flex items-center justify-center h-full text-center">
            <div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Widget Error</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="widget-loading flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 animate-spin rounded-full border-3 border-blue-300 border-t-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Widget Resize Handle */}
      {config.isResizable && (
        <div className="widget-resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 14H20V12H22V14Z"/>
          </svg>
        </div>
      )}

      {/* Widget Footer */}
      {config.lastUpdated && (
        <div className="widget-footer px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {config.lastUpdated.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}