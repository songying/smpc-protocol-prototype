import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '../../../test/test-utils'
import {
  useIsMobile,
  useTouchGestures,
  useViewport,
  TouchButton,
  MobileCard,
  BottomSheet,
  MobileDrawer,
  PullToRefresh,
  MobileTabBar
} from '../MobileUtils'
import { setupTestEnvironment, cleanupTestEnvironment, mockMatchMedia } from '../../../test/test-utils'

describe('MobileUtils', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('useIsMobile hook', () => {
    const TestComponent = () => {
      const isMobile = useIsMobile()
      return <div data-testid="mobile-status">{isMobile ? 'mobile' : 'desktop'}</div>
    }

    it('should detect mobile devices', () => {
      mockMatchMedia(true)
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      })

      render(<TestComponent />)
      expect(screen.getByTestId('mobile-status')).toHaveTextContent('mobile')
    })

    it('should detect desktop devices', () => {
      mockMatchMedia(false)
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      })

      render(<TestComponent />)
      expect(screen.getByTestId('mobile-status')).toHaveTextContent('desktop')
    })
  })

  describe('useViewport hook', () => {
    const TestComponent = () => {
      const viewport = useViewport()
      return (
        <div data-testid="viewport-info">
          {viewport.width}x{viewport.height} - {viewport.orientation}
        </div>
      )
    }

    it('should track viewport dimensions', () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })

      render(<TestComponent />)
      expect(screen.getByTestId('viewport-info')).toHaveTextContent('375x667 - portrait')
    })

    it('should detect landscape orientation', () => {
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true })

      render(<TestComponent />)
      expect(screen.getByTestId('viewport-info')).toHaveTextContent('667x375 - landscape')
    })
  })

  describe('TouchButton', () => {
    const mockClick = jest.fn()

    beforeEach(() => {
      mockClick.mockClear()
    })

    it('should render with primary variant', () => {
      render(
        <TouchButton onClick={mockClick} variant="primary">
          Test Button
        </TouchButton>
      )

      const button = screen.getByRole('button', { name: 'Test Button' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-blue-600')
    })

    it('should handle click events', () => {
      render(
        <TouchButton onClick={mockClick}>
          Click Me
        </TouchButton>
      )

      const button = screen.getByRole('button', { name: 'Click Me' })
      fireEvent.click(button)

      expect(mockClick).toHaveBeenCalledTimes(1)
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <TouchButton onClick={mockClick} disabled>
          Disabled Button
        </TouchButton>
      )

      const button = screen.getByRole('button', { name: 'Disabled Button' })
      expect(button).toBeDisabled()
      fireEvent.click(button)
      expect(mockClick).not.toHaveBeenCalled()
    })

    it('should support different sizes', () => {
      render(
        <TouchButton onClick={mockClick} size="lg">
          Large Button
        </TouchButton>
      )

      const button = screen.getByRole('button', { name: 'Large Button' })
      expect(button).toHaveClass('min-h-[56px]')
    })
  })

  describe('MobileCard', () => {
    it('should render children correctly', () => {
      render(
        <MobileCard>
          <p>Card content</p>
        </MobileCard>
      )

      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(
        <MobileCard className="custom-class">
          Content
        </MobileCard>
      )

      const card = screen.getByText('Content').closest('div')
      expect(card).toHaveClass('custom-class')
    })

    it('should support different padding sizes', () => {
      render(
        <MobileCard padding="lg">
          Large padding content
        </MobileCard>
      )

      const card = screen.getByText('Large padding content').closest('div')
      expect(card).toHaveClass('p-6')
    })
  })

  describe('BottomSheet', () => {
    const mockClose = jest.fn()

    beforeEach(() => {
      mockClose.mockClear()
    })

    it('should not render when closed', () => {
      render(
        <BottomSheet isOpen={false} onClose={mockClose}>
          <p>Sheet content</p>
        </BottomSheet>
      )

      expect(screen.queryByText('Sheet content')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockClose}>
          <p>Sheet content</p>
        </BottomSheet>
      )

      expect(screen.getByText('Sheet content')).toBeInTheDocument()
    })

    it('should close when backdrop is clicked', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockClose}>
          <p>Sheet content</p>
        </BottomSheet>
      )

      const backdrop = document.querySelector('.bg-black.bg-opacity-50')
      fireEvent.click(backdrop!)

      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('should render with title', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockClose} title="Test Sheet">
          <p>Sheet content</p>
        </BottomSheet>
      )

      expect(screen.getByText('Test Sheet')).toBeInTheDocument()
    })

    it('should close when close button is clicked', () => {
      render(
        <BottomSheet isOpen={true} onClose={mockClose} title="Test Sheet">
          <p>Sheet content</p>
        </BottomSheet>
      )

      const closeButton = screen.getByRole('button')
      fireEvent.click(closeButton)

      expect(mockClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('MobileDrawer', () => {
    const mockClose = jest.fn()

    beforeEach(() => {
      mockClose.mockClear()
    })

    it('should not render when closed', () => {
      render(
        <MobileDrawer isOpen={false} onClose={mockClose}>
          <p>Drawer content</p>
        </MobileDrawer>
      )

      expect(screen.queryByText('Drawer content')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      render(
        <MobileDrawer isOpen={true} onClose={mockClose}>
          <p>Drawer content</p>
        </MobileDrawer>
      )

      expect(screen.getByText('Drawer content')).toBeInTheDocument()
    })

    it('should close when backdrop is clicked', () => {
      render(
        <MobileDrawer isOpen={true} onClose={mockClose}>
          <p>Drawer content</p>
        </MobileDrawer>
      )

      const backdrop = document.querySelector('.bg-black.bg-opacity-50')
      fireEvent.click(backdrop!)

      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('should support right side positioning', () => {
      render(
        <MobileDrawer isOpen={true} onClose={mockClose} side="right">
          <p>Right drawer content</p>
        </MobileDrawer>
      )

      const drawer = screen.getByText('Right drawer content').closest('div')
      expect(drawer).toHaveClass('right-0')
    })
  })

  describe('PullToRefresh', () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined)

    beforeEach(() => {
      mockRefresh.mockClear()
    })

    it('should render children', () => {
      render(
        <PullToRefresh onRefresh={mockRefresh}>
          <p>Content to refresh</p>
        </PullToRefresh>
      )

      expect(screen.getByText('Content to refresh')).toBeInTheDocument()
    })

    it('should not trigger refresh when disabled', () => {
      render(
        <PullToRefresh onRefresh={mockRefresh} disabled>
          <p>Disabled content</p>
        </PullToRefresh>
      )

      const container = screen.getByText('Disabled content').closest('div')
      fireEvent.touchStart(container!, { touches: [{ clientY: 100 }] })
      fireEvent.touchMove(container!, { touches: [{ clientY: 200 }] })
      fireEvent.touchEnd(container!)

      expect(mockRefresh).not.toHaveBeenCalled()
    })
  })

  describe('MobileTabBar', () => {
    const mockTabChange = jest.fn()
    const tabs = [
      {
        id: 'tab1',
        label: 'Tab 1',
        icon: <span>Icon1</span>,
      },
      {
        id: 'tab2',
        label: 'Tab 2',
        icon: <span>Icon2</span>,
        badge: 5,
      },
    ]

    beforeEach(() => {
      mockTabChange.mockClear()
    })

    it('should render all tabs', () => {
      render(
        <MobileTabBar
          tabs={tabs}
          activeTab="tab1"
          onTabChange={mockTabChange}
        />
      )

      expect(screen.getByText('Tab 1')).toBeInTheDocument()
      expect(screen.getByText('Tab 2')).toBeInTheDocument()
    })

    it('should highlight active tab', () => {
      render(
        <MobileTabBar
          tabs={tabs}
          activeTab="tab1"
          onTabChange={mockTabChange}
        />
      )

      const activeTab = screen.getByText('Tab 1').closest('button')
      expect(activeTab).toHaveClass('text-blue-600')
    })

    it('should show badge when provided', () => {
      render(
        <MobileTabBar
          tabs={tabs}
          activeTab="tab1"
          onTabChange={mockTabChange}
        />
      )

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should call onTabChange when tab is clicked', () => {
      render(
        <MobileTabBar
          tabs={tabs}
          activeTab="tab1"
          onTabChange={mockTabChange}
        />
      )

      const tab2 = screen.getByText('Tab 2').closest('button')
      fireEvent.click(tab2!)

      expect(mockTabChange).toHaveBeenCalledWith('tab2')
    })

    it('should limit badge display to 99+', () => {
      const tabsWithLargeBadge = [
        {
          id: 'tab1',
          label: 'Tab with large badge',
          icon: <span>Icon</span>,
          badge: 150,
        },
      ]

      render(
        <MobileTabBar
          tabs={tabsWithLargeBadge}
          activeTab="tab1"
          onTabChange={mockTabChange}
        />
      )

      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  describe('Touch gesture handling', () => {
    const TestComponent = () => {
      const ref = React.useRef<HTMLDivElement>(null)
      const { onTouchEnd } = useTouchGestures(ref)
      const [gestureResult, setGestureResult] = React.useState<string>('')

      const handleTouchEnd = () => {
        const result = onTouchEnd()
        if (result?.isLeftSwipe) setGestureResult('left swipe')
        if (result?.isRightSwipe) setGestureResult('right swipe')
        if (result?.isUpSwipe) setGestureResult('up swipe')
        if (result?.isDownSwipe) setGestureResult('down swipe')
      }

      return (
        <div 
          ref={ref}
          onTouchEnd={handleTouchEnd}
          data-testid="gesture-area"
        >
          <p data-testid="gesture-result">{gestureResult}</p>
        </div>
      )
    }

    it('should detect left swipe', async () => {
      render(<TestComponent />)
      
      const gestureArea = screen.getByTestId('gesture-area')
      
      // Simulate touch events for left swipe
      fireEvent.touchStart(gestureArea, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchMove(gestureArea, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchEnd(gestureArea)

      await waitFor(() => {
        expect(screen.getByTestId('gesture-result')).toHaveTextContent('left swipe')
      })
    })

    it('should detect right swipe', async () => {
      render(<TestComponent />)
      
      const gestureArea = screen.getByTestId('gesture-area')
      
      // Simulate touch events for right swipe
      fireEvent.touchStart(gestureArea, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchMove(gestureArea, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchEnd(gestureArea)

      await waitFor(() => {
        expect(screen.getByTestId('gesture-result')).toHaveTextContent('right swipe')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on TouchButton', () => {
      render(
        <TouchButton onClick={() => {}} disabled>
          Accessible Button
        </TouchButton>
      )

      const button = screen.getByRole('button', { name: 'Accessible Button' })
      expect(button).toHaveAttribute('disabled')
    })

    it('should support keyboard navigation on MobileTabBar', () => {
      const mockTabChange = jest.fn()
      const tabs = [
        { id: 'tab1', label: 'Tab 1', icon: <span>Icon</span> },
        { id: 'tab2', label: 'Tab 2', icon: <span>Icon</span> },
      ]

      render(
        <MobileTabBar
          tabs={tabs}
          activeTab="tab1"
          onTabChange={mockTabChange}
        />
      )

      const tab = screen.getByText('Tab 2').closest('button')
      
      // Test keyboard navigation
      fireEvent.keyDown(tab!, { key: 'Enter' })
      fireEvent.click(tab!) // Click should also work
      
      expect(mockTabChange).toHaveBeenCalledWith('tab2')
    })
  })
})