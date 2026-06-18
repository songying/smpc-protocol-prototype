import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '../lib/wagmi'
import { WebSocketManager } from '../components/realtime/WebSocketManager'
import userEvent from '@testing-library/user-event'

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  })

// Test wrapper component
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WebSocketManager>
          {children}
        </WebSocketManager>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock implementations for testing
export const mockWagmiHooks = {
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
  }),
  useConnect: () => ({
    connect: jest.fn(),
    connectors: [],
    isLoading: false,
    error: null,
  }),
  useDisconnect: () => ({
    disconnect: jest.fn(),
  }),
}

// Mock WebSocket for testing
export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string, public protocols?: string | string[]) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    // Simulate receiving messages for testing
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage?.(new MessageEvent('message', { data }))
      }, 10)
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code, reason }))
  }
}

// Test data factories
export const createMockDataset = (overrides: Partial<any> = {}) => ({
  id: 'dataset_001',
  name: 'Test Medical Dataset',
  description: 'Sample medical data for testing',
  size: 1024 * 1024 * 100, // 100MB
  type: 'medical',
  provider: '0x1234567890123456789012345678901234567890',
  encrypted: true,
  compliance: ['GDPR', 'HIPAA'],
  price: 0.1,
  createdAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockComputationRequest = (overrides: Partial<any> = {}) => ({
  id: 'req_001',
  title: 'Test ML Training Request',
  description: 'Machine learning model training',
  datasets: ['dataset_001', 'dataset_002'],
  algorithm: 'federated_learning',
  consumer: '0x9876543210987654321098765432109876543210',
  status: 'pending',
  estimatedFees: {
    computation: 0.05,
    data: 0.1,
    auditor: 0.02,
    total: 0.17,
  },
  createdAt: new Date('2024-01-02'),
  ...overrides,
})

export const createMockAuditRequest = (overrides: Partial<any> = {}) => ({
  id: 'audit_001',
  requestId: 'req_001',
  auditor: '0x5555666677778888999900001111222233334444',
  status: 'pending',
  priority: 'high' as const,
  complianceChecks: {
    gdpr: { status: 'pending', score: null },
    hipaa: { status: 'pending', score: null },
    ccpa: { status: 'pending', score: null },
  },
  createdAt: new Date('2024-01-02'),
  deadline: new Date('2024-01-04'),
  ...overrides,
})

export const createMockNotification = (overrides: Partial<any> = {}) => ({
  id: 'notif_001',
  type: 'request_submitted' as const,
  priority: 'medium' as const,
  title: 'New Request Submitted',
  message: 'A new computation request has been submitted for review',
  timestamp: new Date(),
  read: false,
  actionable: true,
  relatedEntity: {
    type: 'request' as const,
    id: 'req_001',
    name: 'Test Request',
  },
  metadata: {
    source: 'request_system',
    category: 'approval',
    tags: ['test'],
  },
  persistent: false,
  ...overrides,
})

// Mock API responses
export const mockApiResponses = {
  datasets: {
    list: [createMockDataset(), createMockDataset({ id: 'dataset_002', name: 'Test Financial Dataset' })],
    upload: { success: true, datasetId: 'dataset_003', ipfsHash: 'QmTest123' },
  },
  computations: {
    list: [createMockComputationRequest()],
    submit: { success: true, requestId: 'req_002', estimatedCompletion: new Date() },
    status: {
      id: 'req_001',
      status: 'computing',
      progress: 45,
      participants: 2,
      estimatedCompletion: new Date(Date.now() + 60 * 60 * 1000),
    },
  },
  audits: {
    queue: [createMockAuditRequest()],
    approve: { success: true, auditId: 'audit_001' },
    reject: { success: true, auditId: 'audit_001', reason: 'Non-compliance detected' },
  },
  notifications: {
    list: [createMockNotification()],
    markRead: { success: true },
  },
}

// Helper functions for testing
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const createUserEvent = () => userEvent.setup()

// Accessibility testing helpers
export const checkA11y = async (container: HTMLElement) => {
  const { axe } = await import('@axe-core/react')
  const results = await axe(container)
  return results
}

// Performance testing helpers
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now()
  fn()
  const end = performance.now()
  return {
    name,
    duration: end - start,
    timestamp: Date.now(),
  }
}

// Mock intersection observer for testing
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })
  window.IntersectionObserver = mockIntersectionObserver
}

// Mock resize observer for testing
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn()
  mockResizeObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })
  window.ResizeObserver = mockResizeObserver
}

// Mock media queries for responsive testing
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock localStorage for testing
export const mockLocalStorage = () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString()
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      },
      length: Object.keys(store).length,
      key: (index: number) => Object.keys(store)[index] || null,
    }
  })()
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })
}

// Mock geolocation for testing
export const mockGeolocation = (coords: Partial<GeolocationCoordinates> = {}) => {
  const mockGeolocation = {
    getCurrentPosition: jest.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 100,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          ...coords,
        },
        timestamp: Date.now(),
      })
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  }
  
  Object.defineProperty(navigator, 'geolocation', {
    value: mockGeolocation,
  })
}

// Setup function for all mocks
export const setupTestEnvironment = () => {
  mockIntersectionObserver()
  mockResizeObserver()
  mockMatchMedia()
  mockLocalStorage()
  
  // Mock console methods to avoid noise in tests
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  
  // Mock WebSocket globally
  global.WebSocket = MockWebSocket as any
  
  // Mock crypto for testing
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      },
    },
  })
}

// Cleanup function
export const cleanupTestEnvironment = () => {
  jest.restoreAllMocks()
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }