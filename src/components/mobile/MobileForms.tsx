'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { TouchButton, MobileCard, BottomSheet, useIsMobile } from './MobileUtils'

// Mobile-optimized input component
interface MobileInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  icon?: React.ReactNode
  maxLength?: number
  pattern?: string
  autoComplete?: string
}

export const MobileInput: React.FC<MobileInputProps> = ({
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  icon,
  maxLength,
  pattern,
  autoComplete
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = () => {
    setIsFocused(true)
    // Scroll input into view on mobile
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }, 300)
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {icon}
            </div>
          </div>
        )}
        
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          pattern={pattern}
          autoComplete={autoComplete}
          className={`
            w-full px-4 py-3 text-base border rounded-lg transition-colors duration-200
            ${icon ? 'pl-10' : ''}
            ${isFocused ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-300 dark:border-gray-600'}
            ${error ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-800' : ''}
            ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}
            text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none
            touch-manipulation
          `}
          style={{ fontSize: '16px' }} // Prevents zoom on iOS
        />
        
        {maxLength && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-xs text-gray-400">
              {value.length}/{maxLength}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
}

// Mobile-optimized textarea
interface MobileTextareaProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  rows?: number
  maxLength?: number
  autoResize?: boolean
}

export const MobileTextarea: React.FC<MobileTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  rows = 4,
  maxLength,
  autoResize = true
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value, autoResize])

  const handleFocus = () => {
    setIsFocused(true)
    if (textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }, 300)
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={`
            w-full px-4 py-3 text-base border rounded-lg transition-colors duration-200 resize-none
            ${isFocused ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-300 dark:border-gray-600'}
            ${error ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-800' : ''}
            ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}
            text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none
            touch-manipulation
          `}
          style={{ fontSize: '16px', minHeight: `${rows * 1.5}rem` }}
        />
        
        {maxLength && (
          <div className="absolute bottom-2 right-3">
            <span className="text-xs text-gray-400 bg-white dark:bg-gray-800 px-1">
              {value.length}/{maxLength}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
}

// Mobile-optimized select component
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface MobileSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  searchable?: boolean
}

export const MobileSelect: React.FC<MobileSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error,
  helperText,
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const isMobile = useIsMobile()

  const filteredOptions = searchable
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  const selectedOption = options.find(opt => opt.value === value)

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <TouchButton
        onClick={() => !disabled && setIsOpen(true)}
        variant="secondary"
        size="lg"
        disabled={disabled}
        className={`
          w-full justify-between px-4 py-3 text-left
          ${error ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-800' : ''}
          ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}
        `}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </TouchButton>

      {/* Mobile Bottom Sheet */}
      {isMobile && (
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={label}
          height="half"
        >
          {searchable && (
            <div className="mb-4">
              <MobileInput
                type="search"
                label=""
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search options..."
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>
          )}
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredOptions.map((option) => (
              <TouchButton
                key={option.value}
                onClick={() => handleSelect(option.value)}
                variant={value === option.value ? 'primary' : 'secondary'}
                size="lg"
                disabled={option.disabled}
                className="w-full justify-start"
              >
                <span className="flex-1 text-left">{option.label}</span>
                {value === option.value && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </TouchButton>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* Desktop Dropdown */}
      {!isMobile && isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          )}
          
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={option.disabled}
              className={`
                w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between
                ${value === option.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}
                ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
}

// Mobile file upload component
interface MobileFileUploadProps {
  label: string
  accept?: string
  multiple?: boolean
  maxSize?: number // in MB
  onFilesSelected: (files: File[]) => void
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  preview?: boolean
}

export const MobileFileUpload: React.FC<MobileFileUploadProps> = ({
  label,
  accept,
  multiple = false,
  maxSize,
  onFilesSelected,
  required = false,
  disabled = false,
  error,
  helperText,
  preview = true
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    
    // Check file size
    if (maxSize) {
      const oversizedFiles = fileArray.filter(file => file.size > maxSize * 1024 * 1024)
      if (oversizedFiles.length > 0) {
        alert(`Some files exceed the maximum size of ${maxSize}MB`)
        return
      }
    }

    setSelectedFiles(fileArray)
    onFilesSelected(fileArray)
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    onFilesSelected(newFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
          ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          if (!disabled) {
            handleFileSelect(e.dataTransfer.files)
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled}
          className="hidden"
        />

        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>

        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected` : 'Upload files'}
        </p>
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tap to select or drag and drop files here
          {maxSize && ` (Max ${maxSize}MB per file)`}
        </p>
      </div>

      {/* File Preview */}
      {preview && selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, index) => (
            <MobileCard key={index} className="flex items-center justify-between p-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <TouchButton
                onClick={() => removeFile(index)}
                variant="danger"
                size="sm"
                className="p-2 ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </TouchButton>
            </MobileCard>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
}

// Mobile checkbox component
interface MobileCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  error?: string
  description?: string
}

export const MobileCheckbox: React.FC<MobileCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  error,
  description
}) => {
  return (
    <div className="mb-4">
      <label className={`flex items-start space-x-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="flex-shrink-0 pt-0.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only"
          />
          <div className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 touch-manipulation
            ${checked 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }
            ${error ? 'border-red-500' : ''}
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}>
            {checked && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </span>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </label>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

// Mobile form container
interface MobileFormProps {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  className?: string
}

export const MobileForm: React.FC<MobileFormProps> = ({
  children,
  onSubmit,
  className = ''
}) => {
  return (
    <form 
      onSubmit={onSubmit}
      className={`space-y-4 ${className}`}
      noValidate
    >
      {children}
    </form>
  )
}