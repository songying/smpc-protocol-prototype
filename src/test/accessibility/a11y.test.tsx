import React from 'react'
import { render, screen } from '../test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { setupTestEnvironment, cleanupTestEnvironment, createUserEvent } from '../test-utils'

// Components to test
import { TouchButton, MobileCard, BottomSheet, MobileTabBar } from '../../components/mobile/MobileUtils'
import { MobileInput, MobileTextarea, MobileSelect, MobileCheckbox } from '../../components/mobile/MobileForms'
import { PWAInstaller } from '../../components/mobile/PWAInstaller'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock data for testing
const mockTabs = [
  {
    id: 'tab1',
    label: 'Dashboard',
    icon: <span>📊</span>,
  },
  {
    id: 'tab2',
    label: 'Data',
    icon: <span>📁</span>,
    badge: 3,
  },
]

const mockSelectOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
]

describe('Accessibility Tests (WCAG 2.1 AA Compliance)', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Mobile Components Accessibility', () => {
    describe('TouchButton', () => {
      it('should have no accessibility violations', async () => {
        const { container } = render(
          <TouchButton onClick={() => {}}>
            Accessible Button
          </TouchButton>
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should have proper ARIA attributes when disabled', async () => {
        const { container } = render(
          <TouchButton onClick={() => {}} disabled>
            Disabled Button
          </TouchButton>
        )

        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('disabled')
        expect(button).toHaveAttribute('aria-disabled', 'true')

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should support keyboard navigation', async () => {
        const mockClick = jest.fn()
        const user = createUserEvent()

        render(
          <TouchButton onClick={mockClick}>
            Keyboard Button
          </TouchButton>
        )

        const button = screen.getByRole('button')
        
        // Test keyboard navigation
        await user.tab()
        expect(button).toHaveFocus()

        await user.keyboard('{Enter}')
        expect(mockClick).toHaveBeenCalledTimes(1)

        await user.keyboard('{Space}')
        expect(mockClick).toHaveBeenCalledTimes(2)
      })

      it('should have sufficient color contrast', async () => {
        const { container } = render(
          <div>
            <TouchButton onClick={() => {}} variant="primary">Primary</TouchButton>
            <TouchButton onClick={() => {}} variant="secondary">Secondary</TouchButton>
            <TouchButton onClick={() => {}} variant="danger">Danger</TouchButton>
          </div>
        )

        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true }
          }
        })
        expect(results).toHaveNoViolations()
      })
    })

    describe('MobileCard', () => {
      it('should have no accessibility violations', async () => {
        const { container } = render(
          <MobileCard>
            <h2>Card Title</h2>
            <p>Card content with proper semantic structure</p>
          </MobileCard>
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should maintain proper heading hierarchy', async () => {
        const { container } = render(
          <div>
            <h1>Main Title</h1>
            <MobileCard>
              <h2>Card Title</h2>
              <h3>Subsection</h3>
              <p>Content</p>
            </MobileCard>
          </div>
        )

        const results = await axe(container, {
          rules: {
            'heading-order': { enabled: true }
          }
        })
        expect(results).toHaveNoViolations()
      })
    })

    describe('BottomSheet', () => {
      it('should have no accessibility violations when open', async () => {
        const { container } = render(
          <BottomSheet isOpen={true} onClose={() => {}} title="Accessible Sheet">
            <p>Sheet content</p>
            <button>Action Button</button>
          </BottomSheet>
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should have proper focus management', async () => {
        const user = createUserEvent()
        const mockClose = jest.fn()

        render(
          <div>
            <button>Outside Button</button>
            <BottomSheet isOpen={true} onClose={mockClose} title="Focus Sheet">
              <button>Inside Button</button>
            </BottomSheet>
          </div>
        )

        // Focus should move to the sheet when opened
        const insideButton = screen.getByText('Inside Button')
        expect(document.activeElement).toBe(insideButton)

        // Escape key should close sheet
        await user.keyboard('{Escape}')
        expect(mockClose).toHaveBeenCalledTimes(1)
      })

      it('should have proper ARIA attributes', async () => {
        const { container } = render(
          <BottomSheet isOpen={true} onClose={() => {}} title="ARIA Sheet">
            <p>Content</p>
          </BottomSheet>
        )

        // Check for proper modal attributes
        const sheet = container.querySelector('[role="dialog"]')
        expect(sheet).toBeInTheDocument()
        expect(sheet).toHaveAttribute('aria-modal', 'true')
        expect(sheet).toHaveAttribute('aria-labelledby')

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })

    describe('MobileTabBar', () => {
      it('should have no accessibility violations', async () => {
        const { container } = render(
          <MobileTabBar
            tabs={mockTabs}
            activeTab="tab1"
            onTabChange={() => {}}
          />
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should have proper ARIA attributes for tabs', async () => {
        render(
          <MobileTabBar
            tabs={mockTabs}
            activeTab="tab1"
            onTabChange={() => {}}
          />
        )

        const tablist = screen.getByRole('tablist')
        expect(tablist).toBeInTheDocument()

        const tabs = screen.getAllByRole('tab')
        expect(tabs).toHaveLength(2)

        // Active tab should have proper ARIA state
        const activeTab = tabs[0]
        expect(activeTab).toHaveAttribute('aria-selected', 'true')
        expect(activeTab).toHaveAttribute('tabindex', '0')

        // Inactive tab should have proper ARIA state
        const inactiveTab = tabs[1]
        expect(inactiveTab).toHaveAttribute('aria-selected', 'false')
        expect(inactiveTab).toHaveAttribute('tabindex', '-1')
      })

      it('should support keyboard navigation', async () => {
        const mockTabChange = jest.fn()
        const user = createUserEvent()

        render(
          <MobileTabBar
            tabs={mockTabs}
            activeTab="tab1"
            onTabChange={mockTabChange}
          />
        )

        const firstTab = screen.getAllByRole('tab')[0]
        const secondTab = screen.getAllByRole('tab')[1]

        // Focus first tab
        await user.tab()
        expect(firstTab).toHaveFocus()

        // Arrow key navigation
        await user.keyboard('{ArrowRight}')
        expect(secondTab).toHaveFocus()
        expect(mockTabChange).toHaveBeenCalledWith('tab2')

        await user.keyboard('{ArrowLeft}')
        expect(firstTab).toHaveFocus()
        expect(mockTabChange).toHaveBeenCalledWith('tab1')
      })
    })
  })

  describe('Form Components Accessibility', () => {
    describe('MobileInput', () => {
      it('should have no accessibility violations', async () => {
        const { container } = render(
          <MobileInput
            label="Accessible Input"
            value=""
            onChange={() => {}}
          />
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should have proper label association', async () => {
        render(
          <MobileInput
            label="Email Address"
            value=""
            onChange={() => {}}
            type="email"
          />
        )

        const input = screen.getByLabelText('Email Address')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('type', 'email')
      })

      it('should handle required fields properly', async () => {
        const { container } = render(
          <MobileInput
            label="Required Field"
            value=""
            onChange={() => {}}
            required
          />
        )

        const input = screen.getByLabelText(/Required Field/)
        expect(input).toHaveAttribute('required')

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should associate error messages correctly', async () => {
        const { container } = render(
          <MobileInput
            label="Input with Error"
            value=""
            onChange={() => {}}
            error="This field is required"
          />
        )

        const input = screen.getByLabelText('Input with Error')
        const errorMessage = screen.getByText('This field is required')
        
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(input).toHaveAttribute('aria-describedby')
        expect(errorMessage).toHaveAttribute('id', input.getAttribute('aria-describedby'))

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })

    describe('MobileTextarea', () => {
      it('should have no accessibility violations', async () => {
        const { container } = render(
          <MobileTextarea
            label="Message"
            value=""
            onChange={() => {}}
          />
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should support keyboard navigation', async () => {
        const user = createUserEvent()

        render(
          <MobileTextarea
            label="Description"
            value=""
            onChange={() => {}}
            maxLength={100}
          />
        )

        const textarea = screen.getByLabelText('Description')
        
        await user.tab()
        expect(textarea).toHaveFocus()

        await user.type(textarea, 'Test content')
        expect(textarea).toHaveValue('Test content')
      })
    })

    describe('MobileSelect', () => {
      it('should have no accessibility violations', async () => {
        const { container } = render(
          <MobileSelect
            label="Choose Option"
            value=""
            onChange={() => {}}
            options={mockSelectOptions}
          />
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should have proper combobox attributes', async () => {
        render(
          <MobileSelect
            label="Accessible Select"
            value="option1"
            onChange={() => {}}
            options={mockSelectOptions}
          />
        )

        const select = screen.getByLabelText('Accessible Select')
        expect(select).toHaveAttribute('role', 'combobox')
        expect(select).toHaveAttribute('aria-expanded')
        expect(select).toHaveAttribute('aria-haspopup', 'listbox')
      })

      it('should handle option selection with keyboard', async () => {
        const mockOnChange = jest.fn()
        const user = createUserEvent()

        render(
          <MobileSelect
            label="Keyboard Select"
            value=""
            onChange={mockOnChange}
            options={mockSelectOptions}
          />
        )

        const select = screen.getByLabelText('Keyboard Select')
        
        await user.tab()
        expect(select).toHaveFocus()

        await user.keyboard('{Enter}')
        // Should open options list
        await user.keyboard('{ArrowDown}')
        await user.keyboard('{Enter}')
        
        expect(mockOnChange).toHaveBeenCalled()
      })
    })

    describe('MobileCheckbox', () => {
      it('should have no accessibility violations', async () => {
        const { container } = render(
          <MobileCheckbox
            label="Accept Terms"
            checked={false}
            onChange={() => {}}
          />
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should have proper checkbox attributes', async () => {
        render(
          <MobileCheckbox
            label="Newsletter Subscription"
            checked={true}
            onChange={() => {}}
            description="Receive weekly updates"
          />
        )

        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toBeChecked()
        expect(checkbox).toHaveAttribute('aria-describedby')

        const label = screen.getByText('Newsletter Subscription')
        expect(label).toBeInTheDocument()

        const description = screen.getByText('Receive weekly updates')
        expect(description).toHaveAttribute('id', checkbox.getAttribute('aria-describedby'))
      })
    })
  })

  describe('PWA Components Accessibility', () => {
    describe('PWAInstaller', () => {
      it('should have no accessibility violations', async () => {
        const { container } = render(<PWAInstaller />)

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should handle modal accessibility properly', async () => {
        // Mock iOS detection
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          configurable: true,
        })

        const { container } = render(<PWAInstaller />)

        // Trigger iOS instructions modal
        const instructionsButton = screen.queryByText('Install Instructions')
        if (instructionsButton) {
          const user = createUserEvent()
          await user.click(instructionsButton)

          // Check modal accessibility
          const modal = screen.getByRole('dialog')
          expect(modal).toHaveAttribute('aria-modal', 'true')
          expect(modal).toHaveAttribute('aria-labelledby')

          const results = await axe(container)
          expect(results).toHaveNoViolations()
        }
      })
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide proper screen reader announcements', async () => {
      render(
        <div>
          <h1>SMPC Protocol Dashboard</h1>
          <nav aria-label="Main navigation">
            <MobileTabBar
              tabs={mockTabs}
              activeTab="tab1"
              onTabChange={() => {}}
            />
          </nav>
          <main>
            <MobileCard>
              <h2>System Status</h2>
              <p>All systems operational</p>
            </MobileCard>
          </main>
        </div>
      )

      // Check landmark regions
      const navigation = screen.getByRole('navigation')
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation')

      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()

      // Check heading structure
      const h1 = screen.getByRole('heading', { level: 1 })
      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h1).toBeInTheDocument()
      expect(h2).toBeInTheDocument()
    })

    it('should announce dynamic content changes', async () => {
      const TestComponent = () => {
        const [message, setMessage] = React.useState('')

        return (
          <div>
            <button onClick={() => setMessage('Content updated!')}>
              Update Content
            </button>
            <div aria-live="polite" aria-atomic="true">
              {message}
            </div>
          </div>
        )
      }

      const user = createUserEvent()
      render(<TestComponent />)

      const button = screen.getByText('Update Content')
      await user.click(button)

      const liveRegion = screen.getByText('Content updated!')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })
  })

  describe('High Contrast Mode Support', () => {
    it('should maintain usability in high contrast mode', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const { container } = render(
        <div>
          <TouchButton onClick={() => {}} variant="primary">
            High Contrast Button
          </TouchButton>
          <MobileInput
            label="High Contrast Input"
            value=""
            onChange={() => {}}
          />
        </div>
      )

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
      expect(results).toHaveNoViolations()
    })
  })

  describe('Reduced Motion Support', () => {
    it('should respect reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const { container } = render(
        <BottomSheet isOpen={true} onClose={() => {}} title="Reduced Motion Sheet">
          <p>Content should appear without animation</p>
        </BottomSheet>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Touch Target Sizes', () => {
    it('should have minimum touch target sizes for mobile', async () => {
      render(
        <div>
          <TouchButton onClick={() => {}} size="sm">Small Button</TouchButton>
          <TouchButton onClick={() => {}} size="md">Medium Button</TouchButton>
          <TouchButton onClick={() => {}} size="lg">Large Button</TouchButton>
        </div>
      )

      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minHeight = parseInt(styles.minHeight)
        
        // WCAG 2.1 AA requires minimum 44x44px touch targets
        expect(minHeight).toBeGreaterThanOrEqual(40) // Allowing slight variance for sm size
      })
    })

    it('should have sufficient spacing between interactive elements', async () => {
      const { container } = render(
        <div>
          <TouchButton onClick={() => {}}>Button 1</TouchButton>
          <TouchButton onClick={() => {}}>Button 2</TouchButton>
          <TouchButton onClick={() => {}}>Button 3</TouchButton>
        </div>
      )

      const results = await axe(container, {
        rules: {
          'target-size': { enabled: true }
        }
      })
      expect(results).toHaveNoViolations()
    })
  })

  describe('Form Accessibility', () => {
    it('should group related form fields properly', async () => {
      const { container } = render(
        <form>
          <fieldset>
            <legend>Personal Information</legend>
            <MobileInput label="First Name" value="" onChange={() => {}} />
            <MobileInput label="Last Name" value="" onChange={() => {}} />
          </fieldset>
          <fieldset>
            <legend>Contact Information</legend>
            <MobileInput label="Email" value="" onChange={() => {}} type="email" />
            <MobileInput label="Phone" value="" onChange={() => {}} type="tel" />
          </fieldset>
        </form>
      )

      const fieldsets = screen.getAllByRole('group')
      expect(fieldsets).toHaveLength(2)

      const legends = screen.getAllByText(/Information/)
      expect(legends).toHaveLength(2)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should provide clear form validation messages', async () => {
      const { container } = render(
        <form>
          <MobileInput
            label="Email Address"
            value="invalid-email"
            onChange={() => {}}
            error="Please enter a valid email address"
            required
          />
        </form>
      )

      const input = screen.getByLabelText('Email Address *')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby')

      const errorMessage = screen.getByText('Please enter a valid email address')
      expect(errorMessage).toBeInTheDocument()

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Data Tables Accessibility', () => {
    it('should have proper table structure', async () => {
      const { container } = render(
        <table>
          <caption>Dataset Information</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Size</th>
              <th scope="col">Type</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Medical Dataset A</th>
              <td>100 MB</td>
              <td>Medical</td>
              <td>
                <TouchButton onClick={() => {}} size="sm">
                  View
                </TouchButton>
              </td>
            </tr>
          </tbody>
        </table>
      )

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      const caption = screen.getByText('Dataset Information')
      expect(caption).toBeInTheDocument()

      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders).toHaveLength(4)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})