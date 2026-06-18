'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { WidgetConfig, DashboardConfig, WidgetPosition } from './types';
import { WidgetContainer } from './WidgetContainer';
import { StatsWidget } from './widgets/StatsWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { ListWidget } from './widgets/ListWidget';

export interface DashboardGridProps {
  config: DashboardConfig;
  onLayoutChange?: (layout: WidgetPosition[]) => void;
  onWidgetUpdate?: (widgetId: string, data: any) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetAdd?: (widget: WidgetConfig) => void;
  className?: string;
  isEditable?: boolean;
}

export function DashboardGrid({
  config,
  onLayoutChange,
  onWidgetUpdate,
  onWidgetRemove,
  onWidgetAdd,
  className = '',
  isEditable = false
}: DashboardGridProps) {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Calculate responsive grid columns
  const getGridCols = () => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 640) return 1; // mobile
      if (width < 768) return 2; // tablet
      if (width < 1024) return 3; // small desktop
      return config.layout.cols || 4; // large desktop
    }
    return config.layout.cols || 4;
  };

  const [gridCols, setGridCols] = useState(getGridCols);

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setGridCols(getGridCols());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [config.layout.cols]);

  // Render widget based on type
  const renderWidget = useCallback((widget: WidgetConfig) => {
    const baseProps = {
      config: widget,
      onUpdate: onWidgetUpdate,
      onRemove: onWidgetRemove,
      onSettings: (id: string) => console.log('Settings for widget:', id)
    };

    switch (widget.type) {
      case 'stats':
        return (
          <WidgetContainer key={widget.id} {...baseProps}>
            <StatsWidget {...baseProps} />
          </WidgetContainer>
        );
      
      case 'chart':
        return (
          <WidgetContainer key={widget.id} {...baseProps}>
            <ChartWidget {...baseProps} />
          </WidgetContainer>
        );
      
      case 'list':
        return (
          <WidgetContainer key={widget.id} {...baseProps}>
            <ListWidget {...baseProps} />
          </WidgetContainer>
        );
      
      default:
        return (
          <WidgetContainer key={widget.id} {...baseProps}>
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-sm">Unknown widget type</p>
                <p className="text-xs mt-1">{widget.type}</p>
              </div>
            </div>
          </WidgetContainer>
        );
    }
  }, [onWidgetUpdate, onWidgetRemove]);

  // Filter widgets based on permissions
  const visibleWidgets = useMemo(() => {
    return config.widgets.filter(widget => {
      if (!widget.permissions) return true;
      return widget.permissions.some(permission => 
        config.permissions.includes(permission)
      );
    });
  }, [config.widgets, config.permissions]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    if (!isEditable) return;
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isEditable || !draggedWidget) return;
    e.preventDefault();
    
    const draggedIndex = visibleWidgets.findIndex(w => w.id === draggedWidget);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    // Reorder widgets
    const newWidgets = [...visibleWidgets];
    const [draggedItem] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, draggedItem);

    // Update positions
    const newLayout = newWidgets.map((widget, index) => ({
      ...widget.position,
      x: index % gridCols,
      y: Math.floor(index / gridCols)
    }));

    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }

    setDraggedWidget(null);
  };

  return (
    <div className={`dashboard-grid ${className}`}>
      {/* Dashboard Header */}
      <div className="dashboard-header flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {config.name}
          </h2>
          {config.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {config.description}
            </p>
          )}
        </div>

        {/* Dashboard Controls */}
        {isEditable && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                editMode
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {editMode ? 'Done Editing' : 'Edit Layout'}
            </button>

            <button
              onClick={() => {/* Widget selector modal */}}
              className="px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Add Widget
            </button>
          </div>
        )}
      </div>

      {/* Widget Grid */}
      <div 
        className={`widgets-grid grid gap-6 auto-rows-min ${
          gridCols === 1 ? 'grid-cols-1' :
          gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' :
          gridCols === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
        style={{
          gridAutoRows: `${config.layout.rowHeight || 200}px`
        }}
      >
        {visibleWidgets.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No widgets configured
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add widgets to customize your dashboard
              </p>
              {isEditable && (
                <button
                  onClick={() => {/* Widget selector modal */}}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Your First Widget
                </button>
              )}
            </div>
          </div>
        ) : (
          visibleWidgets.map((widget, index) => (
            <div
              key={widget.id}
              draggable={isEditable && editMode}
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`widget-slot ${
                editMode ? 'cursor-move border-2 border-dashed border-transparent hover:border-blue-300 dark:hover:border-blue-600' : ''
              } ${
                draggedWidget === widget.id ? 'opacity-50' : ''
              }`}
              style={{
                gridColumn: `span ${Math.min(widget.position.w, gridCols)}`,
                gridRow: `span ${widget.position.h}`
              }}
            >
              {renderWidget(widget)}
            </div>
          ))
        )}
      </div>

      {/* Edit Mode Overlay */}
      {editMode && (
        <div className="fixed inset-0 bg-blue-600/10 backdrop-blur-sm z-10 pointer-events-none">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-medium">Edit Mode - Drag widgets to reorder</p>
          </div>
        </div>
      )}
    </div>
  );
}