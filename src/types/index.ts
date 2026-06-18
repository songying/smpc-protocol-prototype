// Core types for SMPC Protocol application

export type UserRole = 'data-provider' | 'auditor' | 'data-consumer';

export type AuthMethod = 'metamask';

export type ChainId = 1 | 11155111 | 1337; // Mainnet, Sepolia, Local

// User and Authentication Types
export interface Web3User {
  walletAddress: string;
  chainId: ChainId;
  role: UserRole;
  signature: string;
  nonce: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Web3Session {
  id: string;
  userId: string;
  walletAddress: string;
  role: UserRole;
  chainId: ChainId;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActive: Date;
}

export interface UserProfile {
  id: string;
  walletAddress: string;
  role: UserRole;
  displayName?: string;
  avatar?: string;
  isVerified: boolean;
  permissions: Permission[];
  metadata: UserMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMetadata {
  preferredChain: ChainId;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  inApp: boolean;
  wallet: boolean;
}

// Permission and Role Types
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RoleConfig {
  name: string;
  title: string;
  description: string;
  color: string;
  permissions: Permission[];
  features: string[];
}

// Application Configuration Types
export interface AppConfig {
  name: string;
  description: string;
  tagline: string;
  version: string;
  chains: ChainConfig[];
  roles: Record<UserRole, RoleConfig>;
}

export interface ChainConfig {
  id: ChainId;
  name: string;
  network: string;
  rpcUrl: string;
  blockExplorer?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// UI Component Types
export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
  external?: boolean;
  roles?: UserRole[];
}

export interface MenuItem extends NavItem {
  submenu?: MenuItem[];
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
  isCurrentPage?: boolean;
}

// Web3 Specific Types
export interface WalletConnection {
  address: string;
  chainId: ChainId;
  isConnected: boolean;
  isConnecting: boolean;
  connector?: string;
}

export interface SignatureRequest {
  message: string;
  nonce: string;
  timestamp: number;
  address: string;
}

export interface SignatureVerification {
  isValid: boolean;
  address: string;
  message: string;
  signature: string;
  recoveredAddress: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ValidationError extends AppError {
  field: string;
  value: any;
  constraints: string[];
}

export interface Web3Error extends AppError {
  chainId?: ChainId;
  walletAddress?: string;
  transactionHash?: string;
}

// Utility Types
export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type WithId<T> = T & {
  id: string;
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export interface LoadingProps extends BaseComponentProps {
  isLoading: boolean;
  loadingText?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
}

export interface ErrorProps extends BaseComponentProps {
  error: AppError | string;
  onRetry?: () => void;
  showDetails?: boolean;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRule[];
  options?: SelectOption[];
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// Theme Types
export interface ThemeConfig {
  colors: {
    brand: {
      primary: string;
      secondary: string;
      accent: string;
      danger: string;
    };
    role: {
      'data-provider': string;
      'auditor': string;
      'data-consumer': string;
    };
  };
  fonts: {
    sans: string[];
    mono: string[];
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
}

// Store Types (for Zustand)
export interface AuthStore {
  user: UserProfile | null;
  session: Web3Session | null;
  isLoading: boolean;
  error: AppError | null;
  
  // Actions
  login: (walletAddress: string, signature: string, nonce: string) => Promise<void>;
  logout: () => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

export interface Web3Store {
  connection: WalletConnection | null;
  isConnecting: boolean;
  error: Web3Error | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: ChainId) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  clearError: () => void;
}

// Constants
export const USER_ROLES: Record<UserRole, RoleConfig> = {
  'data-provider': {
    name: 'data-provider',
    title: 'Data Provider',
    description: 'Upload and monetize your datasets securely',
    color: '#8B5CF6',
    permissions: [],
    features: [
      'Encrypted data upload',
      'Automated revenue tracking',
      'Privacy compliance monitoring'
    ]
  },
  'auditor': {
    name: 'auditor',
    title: 'MAS (Monetary Authority)',
    description: 'MAS - The Default Regulatory Auditor',
    color: '#06B6D4',
    permissions: [],
    features: [
      'Verify user privacy protection',
      'Ensure data and outcome legality',
      'Validate pricing reasonableness'
    ]
  },
  'data-consumer': {
    name: 'data-consumer',
    title: 'AEP (e-Commerce Platform)',
    description: 'Advanced e-Commerce Analytics Platform',
    color: '#84CC16',
    permissions: [],
    features: [
      'Analyze user preferences and behavior',
      'Study interest distribution across wealth levels',
      'Consume secure data computations'
    ]
  }
};

export const SUPPORTED_CHAINS: Record<ChainId, ChainConfig> = {
  1: {
    id: 1,
    name: 'Ethereum',
    network: 'mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/public',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia',
    network: 'testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/public',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    }
  },
  1337: {
    id: 1337,
    name: 'Localhost',
    network: 'development',
    rpcUrl: 'http://localhost:8545',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  }
};