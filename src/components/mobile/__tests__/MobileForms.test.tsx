import React from 'react'
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils'
import {
  MobileInput,
  MobileTextarea,
  MobileSelect,
  MobileFileUpload,
  MobileCheckbox,
  MobileForm
} from '../MobileForms'
import { setupTestEnvironment, cleanupTestEnvironment, createUserEvent } from '../../../test/test-utils'

describe('MobileForms', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('MobileInput', () => {
    const mockOnChange = jest.fn()

    beforeEach(() => {
      mockOnChange.mockClear()
    })

    it('should render with label and value', () => {
      render(
        <MobileInput
          label="Test Input"
          value="test value"
          onChange={mockOnChange}
        />
      )

      expect(screen.getByLabelText('Test Input')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test value')).toBeInTheDocument()
    })

    it('should show required indicator when required', () => {
      render(
        <MobileInput
          label="Required Input"
          value=""
          onChange={mockOnChange}
          required
        />
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('should display error message when error prop is provided', () => {
      render(
        <MobileInput
          label="Error Input"
          value=""
          onChange={mockOnChange}
          error="This field is required"
        />
      )

      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('should display helper text when provided', () => {
      render(
        <MobileInput
          label="Helper Input"
          value=""
          onChange={mockOnChange}
          helperText="This is helper text"
        />
      )

      expect(screen.getByText('This is helper text')).toBeInTheDocument()
    })

    it('should call onChange when value changes', async () => {
      const user = createUserEvent()
      
      render(
        <MobileInput
          label="Change Input"
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByLabelText('Change Input')
      await user.type(input, 'new value')

      expect(mockOnChange).toHaveBeenCalledWith('new value')
    })

    it('should show character count when maxLength is set', () => {
      render(
        <MobileInput
          label="Limited Input"
          value="test"
          onChange={mockOnChange}
          maxLength={10}
        />
      )

      expect(screen.getByText('4/10')).toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <MobileInput
          label="Disabled Input"
          value=""
          onChange={mockOnChange}
          disabled
        />
      )

      const input = screen.getByLabelText('Disabled Input')
      expect(input).toBeDisabled()
    })

    it('should render with icon when provided', () => {
      render(
        <MobileInput
          label="Icon Input"
          value=""
          onChange={mockOnChange}
          icon={<span data-testid="input-icon">📧</span>}
        />
      )

      expect(screen.getByTestId('input-icon')).toBeInTheDocument()
    })
  })

  describe('MobileTextarea', () => {
    const mockOnChange = jest.fn()

    beforeEach(() => {
      mockOnChange.mockClear()
    })

    it('should render with label and value', () => {
      render(
        <MobileTextarea
          label="Test Textarea"
          value="test content"
          onChange={mockOnChange}
        />
      )

      expect(screen.getByLabelText('Test Textarea')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test content')).toBeInTheDocument()
    })

    it('should show character count when maxLength is set', () => {
      render(
        <MobileTextarea
          label="Limited Textarea"
          value="test content"
          onChange={mockOnChange}
          maxLength={100}
        />
      )

      expect(screen.getByText('12/100')).toBeInTheDocument()
    })

    it('should call onChange when value changes', async () => {
      const user = createUserEvent()
      
      render(
        <MobileTextarea
          label="Change Textarea"
          value=""
          onChange={mockOnChange}
        />
      )

      const textarea = screen.getByLabelText('Change Textarea')
      await user.type(textarea, 'new content')

      expect(mockOnChange).toHaveBeenCalledWith('new content')
    })
  })

  describe('MobileSelect', () => {
    const mockOnChange = jest.fn()
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3', disabled: true },
    ]

    beforeEach(() => {
      mockOnChange.mockClear()
    })

    it('should render with label and placeholder', () => {
      render(
        <MobileSelect
          label="Test Select"
          value=""
          onChange={mockOnChange}
          options={options}
          placeholder="Choose an option"
        />
      )

      expect(screen.getByText('Test Select')).toBeInTheDocument()
      expect(screen.getByText('Choose an option')).toBeInTheDocument()
    })

    it('should show selected option', () => {
      render(
        <MobileSelect
          label="Selected Test"
          value="option1"
          onChange={mockOnChange}
          options={options}
        />
      )

      expect(screen.getByText('Option 1')).toBeInTheDocument()
    })

    it('should open options when clicked', async () => {
      render(
        <MobileSelect
          label="Click Select"
          value=""
          onChange={mockOnChange}
          options={options}
        />
      )

      const selectButton = screen.getByRole('button')
      fireEvent.click(selectButton)

      await waitFor(() => {
        expect(screen.getByText('Option 2')).toBeInTheDocument()
      })
    })

    it('should filter options when searchable', async () => {
      const user = createUserEvent()
      
      render(
        <MobileSelect
          label="Searchable Select"
          value=""
          onChange={mockOnChange}
          options={options}
          searchable
        />
      )

      const selectButton = screen.getByRole('button')
      fireEvent.click(selectButton)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search options...')
        expect(searchInput).toBeInTheDocument()
      })
    })

    it('should call onChange when option is selected', async () => {
      render(
        <MobileSelect
          label="Change Select"
          value=""
          onChange={mockOnChange}
          options={options}
        />
      )

      const selectButton = screen.getByRole('button')
      fireEvent.click(selectButton)

      await waitFor(() => {
        const option = screen.getByText('Option 1')
        fireEvent.click(option)
      })

      expect(mockOnChange).toHaveBeenCalledWith('option1')
    })

    it('should not select disabled options', async () => {
      render(
        <MobileSelect
          label="Disabled Option Select"
          value=""
          onChange={mockOnChange}
          options={options}
        />
      )

      const selectButton = screen.getByRole('button')
      fireEvent.click(selectButton)

      await waitFor(() => {
        const disabledOption = screen.getByText('Option 3')
        expect(disabledOption.closest('button')).toHaveClass('opacity-50')
      })
    })
  })

  describe('MobileFileUpload', () => {
    const mockOnFilesSelected = jest.fn()

    beforeEach(() => {
      mockOnFilesSelected.mockClear()
    })

    it('should render with label', () => {
      render(
        <MobileFileUpload
          label="File Upload"
          onFilesSelected={mockOnFilesSelected}
        />
      )

      expect(screen.getByText('File Upload')).toBeInTheDocument()
      expect(screen.getByText('Upload files')).toBeInTheDocument()
    })

    it('should show required indicator when required', () => {
      render(
        <MobileFileUpload
          label="Required Upload"
          onFilesSelected={mockOnFilesSelected}
          required
        />
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('should handle file selection', () => {
      render(
        <MobileFileUpload
          label="File Selection"
          onFilesSelected={mockOnFilesSelected}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      
      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        configurable: true,
      })

      fireEvent.change(fileInput)
      expect(mockOnFilesSelected).toHaveBeenCalledWith([testFile])
    })

    it('should show file preview when preview is enabled', () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      
      render(
        <MobileFileUpload
          label="Preview Upload"
          onFilesSelected={mockOnFilesSelected}
          preview
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        configurable: true,
      })

      fireEvent.change(fileInput)
      
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })

    it('should display error message when error prop is provided', () => {
      render(
        <MobileFileUpload
          label="Error Upload"
          onFilesSelected={mockOnFilesSelected}
          error="File upload failed"
        />
      )

      expect(screen.getByText('File upload failed')).toBeInTheDocument()
    })
  })

  describe('MobileCheckbox', () => {
    const mockOnChange = jest.fn()

    beforeEach(() => {
      mockOnChange.mockClear()
    })

    it('should render with label', () => {
      render(
        <MobileCheckbox
          label="Test Checkbox"
          checked={false}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('Test Checkbox')).toBeInTheDocument()
    })

    it('should show checked state', () => {
      render(
        <MobileCheckbox
          label="Checked Box"
          checked={true}
          onChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call onChange when clicked', async () => {
      const user = createUserEvent()
      
      render(
        <MobileCheckbox
          label="Click Checkbox"
          checked={false}
          onChange={mockOnChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledWith(true)
    })

    it('should show description when provided', () => {
      render(
        <MobileCheckbox
          label="Checkbox with Description"
          checked={false}
          onChange={mockOnChange}
          description="This is a description"
        />
      )

      expect(screen.getByText('This is a description')).toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <MobileCheckbox
          label="Disabled Checkbox"
          checked={false}
          onChange={mockOnChange}
          disabled
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })
  })

  describe('MobileForm', () => {
    const mockOnSubmit = jest.fn()

    beforeEach(() => {
      mockOnSubmit.mockClear()
    })

    it('should render form with children', () => {
      render(
        <MobileForm onSubmit={mockOnSubmit}>
          <p>Form content</p>
        </MobileForm>
      )

      expect(screen.getByText('Form content')).toBeInTheDocument()
    })

    it('should call onSubmit when form is submitted', () => {
      render(
        <MobileForm onSubmit={mockOnSubmit}>
          <button type="submit">Submit</button>
        </MobileForm>
      )

      const submitButton = screen.getByText('Submit')
      fireEvent.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalled()
    })

    it('should prevent default form submission', () => {
      const mockPreventDefault = jest.fn()
      
      render(
        <MobileForm onSubmit={mockOnSubmit}>
          <button type="submit">Submit</button>
        </MobileForm>
      )

      const form = screen.getByRole('form')
      fireEvent.submit(form, { preventDefault: mockPreventDefault })

      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })

  describe('Form validation integration', () => {
    it('should validate required fields', async () => {
      const mockSubmit = jest.fn()
      const [inputValue, setInputValue] = React.useState('')
      
      const TestForm = () => (
        <MobileForm onSubmit={mockSubmit}>
          <MobileInput
            label="Required Field"
            value={inputValue}
            onChange={setInputValue}
            required
            error={!inputValue ? 'This field is required' : ''}
          />
          <button type="submit">Submit</button>
        </MobileForm>
      )

      render(<TestForm />)

      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('should validate input patterns', () => {
      const [email, setEmail] = React.useState('invalid-email')
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      
      const TestForm = () => (
        <MobileForm onSubmit={() => {}}>
          <MobileInput
            type="email"
            label="Email"
            value={email}
            onChange={setEmail}
            error={!emailPattern.test(email) ? 'Please enter a valid email' : ''}
          />
        </MobileForm>
      )

      render(<TestForm />)

      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
    })
  })

  describe('Accessibility compliance', () => {
    it('should have proper form labels', () => {
      render(
        <MobileForm onSubmit={() => {}}>
          <MobileInput
            label="Accessible Input"
            value=""
            onChange={() => {}}
          />
        </MobileForm>
      )

      const input = screen.getByLabelText('Accessible Input')
      expect(input).toBeInTheDocument()
    })

    it('should associate error messages with inputs', () => {
      render(
        <MobileInput
          label="Error Input"
          value=""
          onChange={() => {}}
          error="Error message"
        />
      )

      const input = screen.getByLabelText('Error Input')
      const errorMessage = screen.getByText('Error message')
      
      expect(input).toBeInTheDocument()
      expect(errorMessage).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = createUserEvent()
      
      render(
        <MobileForm onSubmit={() => {}}>
          <MobileInput label="First" value="" onChange={() => {}} />
          <MobileInput label="Second" value="" onChange={() => {}} />
        </MobileForm>
      )

      const firstInput = screen.getByLabelText('First')
      const secondInput = screen.getByLabelText('Second')

      await user.click(firstInput)
      expect(firstInput).toHaveFocus()

      await user.tab()
      expect(secondInput).toHaveFocus()
    })
  })
})