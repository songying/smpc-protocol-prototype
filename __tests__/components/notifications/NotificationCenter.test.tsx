import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NotificationCenter from '../../../src/components/notifications/NotificationCenter'

// Mock wagmi
const mockUseAccount = jest.fn()
jest.mock('wagmi', () => ({
  useAccount: mockUseAccount
}))

// Mock fetch
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock UI components
jest.mock('../../../src/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={`card-content ${className}`}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={`card-header ${className}`}>{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={`card-title ${className}`}>{children}</div>,
}))

jest.mock('../../../src/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}))

jest.mock('../../../src/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  )
}))

jest.mock('../../../src/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid={`tab-trigger-${value}`} onClick={() => onClick?.(value)}>
      {children}
    </button>
  )
}))

jest.mock('../../../src/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={`scroll-area ${className}`}>{children}</div>
  )
}))

describe('NotificationCenter', () => {
  const mockAddress = '0x123456789abcdef'
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({
      address: mockAddress,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false,
      status: 'connected'
    } as any)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders authentication required when not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isReconnecting: false,
      status: 'disconnected'
    } as any)

    render(<NotificationCenter />)

    expect(screen.getByText('Authentication Required')).toBeInTheDocument()
    expect(screen.getByText('Please connect your wallet to access notifications.')).toBeInTheDocument()
  })

  it('renders notification center when connected', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif1',
          userId: mockAddress,
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Your algorithm has been approved',
          read: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'notif2',
          userId: mockAddress,
          type: 'computation_completed',
          title: 'Computation Completed',
          message: 'Your computation has finished',
          read: true,
          createdAt: new Date().toISOString()
        }
      ],
      total: 2,
      unreadCount: 1,
      hasMore: false
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNotifications)
    } as Response)

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })

    expect(screen.getByText('Algorithm Approved')).toBeInTheDocument()
    expect(screen.getByText('Computation Completed')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // unread count badge
  })

  it('filters notifications by type', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif1',
          userId: mockAddress,
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Your algorithm has been approved',
          read: false,
          createdAt: new Date().toISOString()
        }
      ],
      total: 1,
      unreadCount: 1,
      hasMore: false
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNotifications)
    } as Response)

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('Algorithm Approved')).toBeInTheDocument()
    })

    // Click on "Approved" filter
    const approvedFilter = screen.getByText('Approved')
    fireEvent.click(approvedFilter)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('type=algorithm_approved'),
        expect.any(Object)
      )
    })
  })

  it('marks notification as read', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif1',
          userId: mockAddress,
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Your algorithm has been approved',
          read: false,
          createdAt: new Date().toISOString()
        }
      ],
      total: 1,
      unreadCount: 1,
      hasMore: false
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNotifications)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('Algorithm Approved')).toBeInTheDocument()
    })

    // Find and click the mark as read button (check icon)
    const markReadButton = screen.getByRole('button', { name: /check/i })
    fireEvent.click(markReadButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            notificationId: 'notif1',
            action: 'mark_read'
          })
        })
      )
    })
  })

  it('deletes notification', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif1',
          userId: mockAddress,
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Your algorithm has been approved',
          read: false,
          createdAt: new Date().toISOString()
        }
      ],
      total: 1,
      unreadCount: 1,
      hasMore: false
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNotifications)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('Algorithm Approved')).toBeInTheDocument()
    })

    // Find and click the delete button (trash icon)
    const deleteButton = screen.getByRole('button', { name: /trash/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            notificationId: 'notif1',
            action: 'delete'
          })
        })
      )
    })
  })

  it('marks all notifications as read', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif1',
          userId: mockAddress,
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Your algorithm has been approved',
          read: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'notif2',
          userId: mockAddress,
          type: 'computation_completed',
          title: 'Computation Completed',
          message: 'Your computation has finished',
          read: false,
          createdAt: new Date().toISOString()
        }
      ],
      total: 2,
      unreadCount: 2,
      hasMore: false
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNotifications)
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('Mark All Read')).toBeInTheDocument()
    })

    const markAllReadButton = screen.getByText('Mark All Read')
    fireEvent.click(markAllReadButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            notificationId: 'notif1',
            action: 'mark_read'
          })
        })
      )
    })
  })

  it('clears read notifications', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif1',
          userId: mockAddress,
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Your algorithm has been approved',
          read: true,
          createdAt: new Date().toISOString()
        }
      ],
      total: 1,
      unreadCount: 0,
      hasMore: false
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNotifications)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, deletedCount: 1 })
      } as Response)

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('Clear Read')).toBeInTheDocument()
    })

    const clearReadButton = screen.getByText('Clear Read')
    fireEvent.click(clearReadButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/notifications?action=clear_read',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    // Mock console.error to avoid error output in test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('shows empty state when no notifications', async () => {
    const mockNotifications = {
      notifications: [],
      total: 0,
      unreadCount: 0,
      hasMore: false
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNotifications)
    } as Response)

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument()
      expect(screen.getByText("You don't have any notifications yet.")).toBeInTheDocument()
    })
  })

  it('formats time ago correctly', async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const mockNotifications = {
      notifications: [
        {
          id: 'notif1',
          userId: mockAddress,
          type: 'algorithm_approved',
          title: 'Algorithm Approved',
          message: 'Your algorithm has been approved',
          read: false,
          createdAt: oneHourAgo
        }
      ],
      total: 1,
      unreadCount: 1,
      hasMore: false
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNotifications)
    } as Response)

    render(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('1h ago')).toBeInTheDocument()
    })
  })
})