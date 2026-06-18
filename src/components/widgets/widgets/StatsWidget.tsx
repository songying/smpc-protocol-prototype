'use client';

import React from 'react';
import { WidgetComponentProps } from '../types';

interface StatsData {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan';
}

interface StatsWidgetData {
  stats: StatsData[];
}

export function StatsWidget({ config, data }: WidgetComponentProps) {
  const widgetData = data as StatsWidgetData;
  
  // Default data for demo purposes
  const defaultStats: StatsData[] = [
    {
      title: 'Total Revenue',
      value: '$12,345',
      change: { value: 12.5, type: 'increase', period: 'vs last month' },
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      title: 'Active Datasets',
      value: 24,
      change: { value: 3, type: 'increase', period: 'new this week' },
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ];

  const stats = widgetData?.stats || defaultStats;
  const isSingleStat = stats.length === 1;

  const getColorClasses = (color: StatsData['color'] = 'blue') => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400',
      green: 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400',
      red: 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400',
      yellow: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400',
      purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-400',
      cyan: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/50 dark:text-cyan-400'
    };
    return colorMap[color];
  };

  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase': return 'text-green-600 dark:text-green-400';
      case 'decrease': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
          </svg>
        );
      case 'decrease':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 12h18M12 3v18"/>
          </svg>
        );
    }
  };

  if (isSingleStat) {
    const stat = stats[0];
    return (
      <div className="stats-widget-single h-full flex flex-col justify-center">
        <div className="text-center">
          {stat.icon && (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${getColorClasses(stat.color)}`}>
              {stat.icon}
            </div>
          )}
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {stat.title}
            </h4>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stat.value}
            </p>
            
            {stat.change && (
              <div className={`flex items-center justify-center space-x-1 text-sm ${getChangeColor(stat.change.type)}`}>
                {getChangeIcon(stat.change.type)}
                <span>{stat.change.value}%</span>
                <span className="text-gray-500 dark:text-gray-400">{stat.change.period}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-widget-multiple h-full">
      <div className={`grid gap-4 h-full ${stats.length === 2 ? 'grid-cols-1' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {stats.map((stat, index) => (
          <div key={index} className="stat-item bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {stat.title}
                </h4>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                  {stat.value}
                </p>
                
                {stat.change && (
                  <div className={`flex items-center space-x-1 text-xs mt-1 ${getChangeColor(stat.change.type)}`}>
                    {getChangeIcon(stat.change.type)}
                    <span>{stat.change.value}%</span>
                  </div>
                )}
              </div>
              
              {stat.icon && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getColorClasses(stat.color)}`}>
                  {React.cloneElement(stat.icon as React.ReactElement, { className: 'w-4 h-4' })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}