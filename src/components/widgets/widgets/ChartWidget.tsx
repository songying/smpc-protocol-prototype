'use client';

import React from 'react';
import { WidgetComponentProps } from '../types';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartWidgetData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title?: string;
  data: ChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function ChartWidget({ config, data }: WidgetComponentProps) {
  const chartData = data as ChartWidgetData;
  
  // Default data for demo purposes
  const defaultData: ChartWidgetData = {
    type: 'bar',
    title: 'Revenue Trend',
    data: [
      { label: 'Jan', value: 65, color: '#3B82F6' },
      { label: 'Feb', value: 78, color: '#10B981' },
      { label: 'Mar', value: 52, color: '#F59E0B' },
      { label: 'Apr', value: 91, color: '#EF4444' },
      { label: 'May', value: 84, color: '#8B5CF6' },
      { label: 'Jun', value: 76, color: '#06B6D4' }
    ],
    xAxisLabel: 'Month',
    yAxisLabel: 'Revenue ($K)'
  };

  const chart = chartData || defaultData;
  const maxValue = Math.max(...chart.data.map(d => d.value));

  // Simple bar chart implementation
  const renderBarChart = () => {
    return (
      <div className="chart-container h-full flex flex-col">
        {chart.title && (
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 text-center">
            {chart.title}
          </h4>
        )}
        
        <div className="chart-area flex-1 flex items-end justify-between space-x-2 px-2">
          {chart.data.map((point, index) => (
            <div key={index} className="bar-column flex flex-col items-center space-y-2 flex-1">
              <div 
                className="bar-value text-xs font-medium text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {point.value}
              </div>
              
              <div 
                className="bar group bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative"
                style={{
                  height: `${(point.value / maxValue) * 100}%`,
                  backgroundColor: point.color || '#3B82F6',
                  minHeight: '4px',
                  width: '100%'
                }}
                title={`${point.label}: ${point.value}`}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {point.value}
                </div>
              </div>
              
              <div className="bar-label text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                {point.label}
              </div>
            </div>
          ))}
        </div>

        {(chart.xAxisLabel || chart.yAxisLabel) && (
          <div className="chart-labels flex justify-between items-end mt-4 text-xs text-gray-500 dark:text-gray-400">
            {chart.yAxisLabel && (
              <div className="y-axis-label transform -rotate-90 origin-bottom-left absolute left-2 bottom-1/2">
                {chart.yAxisLabel}
              </div>
            )}
            {chart.xAxisLabel && (
              <div className="x-axis-label text-center w-full">
                {chart.xAxisLabel}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Simple line chart implementation
  const renderLineChart = () => {
    const points = chart.data.map((point, index) => {
      const x = (index / (chart.data.length - 1)) * 100;
      const y = 100 - (point.value / maxValue) * 80; // 80% of height for chart area
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="chart-container h-full flex flex-col">
        {chart.title && (
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 text-center">
            {chart.title}
          </h4>
        )}
        
        <div className="chart-area flex-1 relative">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
              </linearGradient>
            </defs>
            
            {/* Grid lines */}
            {[20, 40, 60, 80].map(y => (
              <line 
                key={y}
                x1="0" y1={y} x2="100" y2={y} 
                stroke="currentColor" 
                strokeWidth="0.2" 
                className="text-gray-300 dark:text-gray-600"
              />
            ))}
            
            {/* Area under curve */}
            <polygon 
              points={`0,100 ${points} 100,100`}
              fill="url(#lineGradient)"
            />
            
            {/* Line */}
            <polyline 
              points={points}
              fill="none" 
              stroke="#3B82F6" 
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            
            {/* Data points */}
            {chart.data.map((point, index) => {
              const x = (index / (chart.data.length - 1)) * 100;
              const y = 100 - (point.value / maxValue) * 80;
              return (
                <circle 
                  key={index}
                  cx={x} cy={y} r="2" 
                  fill="#3B82F6" 
                  className="hover:r-3 transition-all cursor-pointer"
                  title={`${point.label}: ${point.value}`}
                />
              );
            })}
          </svg>
          
          {/* Labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 dark:text-gray-400">
            {chart.data.map((point, index) => (
              <span key={index}>{point.label}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render appropriate chart type
  const renderChart = () => {
    switch (chart.type) {
      case 'line':
      case 'area':
        return renderLineChart();
      case 'bar':
      default:
        return renderBarChart();
      case 'pie':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm">Pie chart coming soon</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="chart-widget h-full p-2">
      {renderChart()}
    </div>
  );
}