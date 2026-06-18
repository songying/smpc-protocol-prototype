'use client';

import React from 'react';
import { WidgetComponentProps } from '../types';

interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  status?: 'active' | 'pending' | 'completed' | 'failed' | 'warning';
  icon?: React.ReactNode;
  timestamp?: Date;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ListWidgetData {
  title?: string;
  items: ListItem[];
  showStatus?: boolean;
  showValues?: boolean;
  showTimestamps?: boolean;
  maxItems?: number;
}

export function ListWidget({ config, data }: WidgetComponentProps) {
  const listData = data as ListWidgetData;
  
  // Default data for demo purposes
  const defaultData: ListWidgetData = {
    title: 'Recent Activities',
    items: [
      {
        id: '1',
        title: 'Dataset "Healthcare Data" approved',
        subtitle: 'Data Provider: Alice Johnson',
        status: 'completed',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        id: '2',
        title: 'SMPC Computation #1234',
        subtitle: 'Consumer: Bob Corp',
        status: 'active',
        value: '85%',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      },
      {
        id: '3',
        title: 'Privacy Audit Required',
        subtitle: 'Dataset: Financial Records',
        status: 'warning',
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        id: '4',
        title: 'New data request received',
        subtitle: 'Requested by: Carol Analytics',
        status: 'pending',
        timestamp: new Date(Date.now() - 1000 * 60 * 180),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        id: '5',
        title: 'Payment received',
        subtitle: 'Amount: $1,250.00',
        status: 'completed',
        value: '$1,250',
        timestamp: new Date(Date.now() - 1000 * 60 * 240),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      }
    ],
    showStatus: true,
    showValues: true,
    showTimestamps: true,
    maxItems: 5
  };

  const list = listData || defaultData;
  const displayItems = list.maxItems ? list.items.slice(0, list.maxItems) : list.items;

  const getStatusClasses = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'warning':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        );
      case 'active':
        return (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        );
      case 'pending':
        return (
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        );
      case 'failed':
        return (
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        );
      case 'warning':
        return (
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        );
      default:
        return (
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        );
    }
  };

  const formatTimestamp = (timestamp?: Date) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="list-widget h-full flex flex-col">
      {list.title && (
        <div className="list-header mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {list.title}
          </h4>
        </div>
      )}

      <div className="list-content flex-1 overflow-y-auto">
        {displayItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0l-2-2m-14 2l2-2" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No items to display</p>
            </div>
          </div>
        ) : (
          <div className="list-items space-y-3">
            {displayItems.map((item) => (
              <div 
                key={item.id} 
                className="list-item group bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  {item.icon && (
                    <div className="flex-shrink-0 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      <div className="text-gray-600 dark:text-gray-400">
                        {item.icon}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h5>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Value */}
                      {list.showValues && item.value && (
                        <div className="flex-shrink-0 ml-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.value}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        {/* Status */}
                        {list.showStatus && item.status && (
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(item.status)}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClasses(item.status)}`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      {list.showTimestamps && item.timestamp && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    {item.action && (
                      <div className="mt-2">
                        <button
                          onClick={item.action.onClick}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                          {item.action.label}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Show more button */}
      {list.items.length > (list.maxItems || 5) && (
        <div className="list-footer mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
            Show {list.items.length - (list.maxItems || 5)} more items
          </button>
        </div>
      )}
    </div>
  );
}