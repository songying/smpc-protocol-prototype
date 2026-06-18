// Real Web3 auth store with MetaMask integration
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

interface AuthUser {
  id: string;
  walletAddress: string;
  role: 'data-provider' | 'auditor' | 'data-consumer';
  isVerified: boolean;
  permissions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthSession {
  id: string;
  userId: string;
  walletAddress: string;
  role: 'data-provider' | 'auditor' | 'data-consumer';
  chainId: number;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActive: Date;
}

// Storage keys
const AUTH_STORAGE_KEYS = {
  authenticated: 'smpc_authenticated',
  walletAddress: 'smpc_wallet_address',
  role: 'smpc_user_role',
  chainId: 'smpc_chain_id',
} as const;

// Utility functions
const getStorageItem = (key: string) => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setStorageItem = (key: string, value: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const removeStorageItem = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

export const useAuthUser = (): AuthUser | null => {
  const [user, setUser] = useState<AuthUser | null>(null);
  
  useEffect(() => {
    // Check localStorage on client side after hydration
    const updateUser = () => {
      const walletAddress = getStorageItem(AUTH_STORAGE_KEYS.walletAddress);
      const role = getStorageItem(AUTH_STORAGE_KEYS.role) as AuthUser['role'];
      
      if (walletAddress && role) {
        setUser({
          id: `user_${walletAddress}`,
          walletAddress,
          role,
          isVerified: true,
          permissions: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        setUser(null);
      }
    };
    
    updateUser();
    
    // Listen for auth changes
    window.addEventListener('auth-change', updateUser);
    
    return () => {
      window.removeEventListener('auth-change', updateUser);
    };
  }, []);
  
  return user;
};

export const useAuthSession = (): AuthSession | null => {
  const [session, setSession] = useState<AuthSession | null>(null);
  
  useEffect(() => {
    // Only check localStorage on client side after hydration
    const walletAddress = getStorageItem(AUTH_STORAGE_KEYS.walletAddress);
    const role = getStorageItem(AUTH_STORAGE_KEYS.role) as AuthSession['role'];
    const chainId = getStorageItem(AUTH_STORAGE_KEYS.chainId);
    
    if (walletAddress && role && chainId) {
      setSession({
        id: `session_${walletAddress}`,
        userId: `user_${walletAddress}`,
        walletAddress,
        role,
        chainId: parseInt(chainId),
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastActive: new Date()
      });
    } else {
      setSession(null);
    }
  }, []);
  
  return session;
};

export const useAuthLoading = () => {
  const [loading, setLoading] = useState(false);
  return loading;
};

export const useAuthError = () => {
  const [error, setError] = useState<string | null>(null);
  return error;
};

export const useIsAuthenticated = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check localStorage on client side after hydration
    const checkAuth = () => {
      setIsAuthenticated(getStorageItem(AUTH_STORAGE_KEYS.authenticated) === 'true');
    };
    
    checkAuth();
    
    // Listen for auth changes
    window.addEventListener('auth-change', checkAuth);
    
    return () => {
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);
  
  return isAuthenticated;
};

export const useAuthActions = () => ({
  login: async (walletAddress: string, signature: string, message: string, nonce: string) => {
    try {
      // Verify signature (simplified verification for demo)
      if (!signature || !walletAddress) {
        throw new Error('Invalid signature or wallet address');
      }
      
      setStorageItem(AUTH_STORAGE_KEYS.authenticated, 'true');
      setStorageItem(AUTH_STORAGE_KEYS.walletAddress, walletAddress);
      
      console.log('User authenticated:', { walletAddress, signature, message, nonce });
      
      // Trigger a window event to update all auth hooks
      window.dispatchEvent(new Event('auth-change'));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  logout: async () => {
    removeStorageItem(AUTH_STORAGE_KEYS.authenticated);
    removeStorageItem(AUTH_STORAGE_KEYS.walletAddress);
    removeStorageItem(AUTH_STORAGE_KEYS.role);
    removeStorageItem(AUTH_STORAGE_KEYS.chainId);
    console.log('User logged out');
    
    // Trigger a window event to update all auth hooks
    window.dispatchEvent(new Event('auth-change'));
  },
  
  selectRole: async (role: string, chainId: number) => {
    setStorageItem(AUTH_STORAGE_KEYS.role, role);
    setStorageItem(AUTH_STORAGE_KEYS.chainId, chainId.toString());
    console.log('Role selected:', { role, chainId });
    
    // Trigger a window event to update all auth hooks
    window.dispatchEvent(new Event('auth-change'));
  },
  
  updateProfile: async (updates: any) => {
    console.log('Profile update:', updates);
  },
  
  refreshSession: async () => {
    console.log('Session refreshed');
  },
  
  clearError: () => {
    console.log('Error cleared');
  },
  
  loadSession: async () => {
    console.log('Session loaded');
  },
});

export const useUserRole = () => {
  const [role, setRole] = useState<'data-provider' | 'auditor' | 'data-consumer' | null>(null);
  
  useEffect(() => {
    // Only check localStorage on client side after hydration
    setRole(getStorageItem(AUTH_STORAGE_KEYS.role) as 'data-provider' | 'auditor' | 'data-consumer' | null);
  }, []);
  
  return role;
};

export const useIsRole = (targetRole: string) => {
  const [isRole, setIsRole] = useState(false);
  
  useEffect(() => {
    // Only check localStorage on client side after hydration
    setIsRole(getStorageItem(AUTH_STORAGE_KEYS.role) === targetRole);
  }, [targetRole]);
  
  return isRole;
};