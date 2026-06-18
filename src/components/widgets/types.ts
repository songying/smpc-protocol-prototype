export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';
export type WidgetType = 'stats' | 'chart' | 'list' | 'table' | 'form' | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: WidgetSize;
  position: WidgetPosition;
  isResizable: boolean;
  isDraggable: boolean;
  isRemovable: boolean;
  data?: any;
  settings?: Record<string, any>;
  permissions?: string[];
  refreshInterval?: number;
  lastUpdated?: Date;
}

export interface WidgetComponentProps {
  config: WidgetConfig;
  data?: any;
  loading?: boolean;
  error?: string;
  onUpdate?: (id: string, data: any) => void;
  onResize?: (id: string, size: WidgetPosition) => void;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  layout: {
    cols: number;
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
    breakpoints: Record<string, number>;
    layouts: Record<string, WidgetPosition[]>;
  };
  isDefault: boolean;
  userRole: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}