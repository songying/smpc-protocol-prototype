'use client'

import React, { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface AlgorithmUploadFormProps {
  onSuccess?: (algorithm: any) => void
  onError?: (error: string) => void
  onCancel?: () => void
}

export default function AlgorithmUploadForm({ onSuccess, onError, onCancel }: AlgorithmUploadFormProps) {
  const { address, isConnected } = useAccount()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceCode: '',
    computationType: 'third_party' as 'third_party' | 'zk' | 'fhe'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setValidationWarnings([])
  }, [])

  const handleFileUpload = useCallback((file: File) => {
    if (file.size > 1024 * 1024) { // 1MB limit
      onError?.('File size must be less than 1MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setFormData(prev => ({ ...prev, sourceCode: content }))
    }
    reader.readAsText(file)
  }, [onError])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }, [handleFileUpload])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      onError?.('Please connect your wallet first')
      return
    }

    if (!formData.name.trim() || !formData.description.trim() || !formData.sourceCode.trim()) {
      onError?.('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/algorithms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      if (result.warnings && result.warnings.length > 0) {
        setValidationWarnings(result.warnings)
      }

      onSuccess?.(result.algorithm)
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        sourceCode: '',
        computationType: 'third_party'
      })

    } catch (error) {
      console.error('Algorithm upload error:', error)
      onError?.(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsLoading(false)
    }
  }

  const computationTypeDescriptions = {
    third_party: 'Execute on external secure computing nodes with result verification',
    zk: 'Generate zero-knowledge proofs without revealing input data',
    fhe: 'Perform computations on encrypted data using fully homomorphic encryption'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Upload New Algorithm
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Algorithm Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Algorithm Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter algorithm name"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            maxLength={1000}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Describe what your algorithm does"
            required
          />
        </div>

        {/* Computation Type */}
        <div>
          <label htmlFor="computationType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Computation Type *
          </label>
          <select
            id="computationType"
            name="computationType"
            value={formData.computationType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            required
          >
            <option value="third_party">Third Party Computing</option>
            <option value="zk">Zero Knowledge (ZK)</option>
            <option value="fhe">Fully Homomorphic Encryption (FHE)</option>
          </select>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {computationTypeDescriptions[formData.computationType]}
          </p>
        </div>

        {/* Source Code Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Algorithm Source Code *
          </label>
          
          {/* File Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Upload a file
                  </span>
                  <span> or drag and drop</span>
                </label>
                <p className="text-xs">JS, TS, PY files up to 1MB</p>
              </div>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".js,.ts,.py,.txt"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Text Area for Direct Input */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or paste your code directly:
            </label>
            <textarea
              name="sourceCode"
              value={formData.sourceCode}
              onChange={handleInputChange}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder="// Paste your algorithm source code here
function myAlgorithm(data) {
  // Your implementation here
  return result;
}"
              required
            />
          </div>
        </div>

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Validation Warnings
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <ul className="list-disc pl-5 space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                sourceCode: '',
                computationType: 'third_party'
              })
              setValidationWarnings([])
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isLoading || !isConnected}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Uploading...' : 'Upload Algorithm'}
          </button>
        </div>
      </form>
    </div>
  )
}