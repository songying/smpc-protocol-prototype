'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useDataRegistry } from '@/hooks/useDataRegistry'
import { SimpleDataEncryption, PrivacyCompliance } from '@/lib/crypto'

interface FileUpload {
  id: string
  file: File
  name: string
  size: number
  type: string
  preview?: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  metadata?: {
    title: string
    description: string
    category: number
    price: string
    tags: string[]
  }
  encryptionData?: {
    dataHash: string
    encryptionKey: string
    isEncrypted: boolean
  }
  privacyAnalysis?: {
    isCompliant: boolean
    issues: string[]
    recommendations: string[]
  }
}

interface DataUploadFormProps {
  onSuccess?: () => void
  maxFiles?: number
  acceptedTypes?: string[]
  maxFileSize?: number // in MB
}

export function EnhancedDataUploadForm({ 
  onSuccess, 
  maxFiles = 10,
  acceptedTypes = ['.csv', '.json', '.txt', '.xlsx', '.xml'],
  maxFileSize = 100 // 100MB
}: DataUploadFormProps) {
  const { address, isConnected } = useAccount()
  const { registerData, isRegistering, isConfirming, registerError } = useDataRegistry()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [selectedUpload, setSelectedUpload] = useState<string | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [globalSettings, setGlobalSettings] = useState({
    category: 0,
    priceTemplate: '',
    tagsTemplate: ''
  })

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return { valid: false, error: `File size exceeds ${maxFileSize}MB limit` }
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(fileExtension)) {
      return { valid: false, error: `File type ${fileExtension} not supported` }
    }

    return { valid: true }
  }

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList) => {
    const newUploads: FileUpload[] = []

    Array.from(files).forEach((file) => {
      const validation = validateFile(file)
      
      if (!validation.valid) {
        console.error(`Invalid file ${file.name}: ${validation.error}`)
        return
      }

      if (uploads.length + newUploads.length >= maxFiles) {
        console.error(`Maximum ${maxFiles} files allowed`)
        return
      }

      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newUpload: FileUpload = {
        id: uploadId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: '',
          category: globalSettings.category,
          price: globalSettings.priceTemplate,
          tags: globalSettings.tagsTemplate ? globalSettings.tagsTemplate.split(',').map(t => t.trim()) : []
        }
      }

      // Generate preview for text files
      if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, preview: content.slice(0, 500) + (content.length > 500 ? '...' : '') }
              : upload
          ))
        }
        reader.readAsText(file.slice(0, 1024)) // Read first 1KB for preview
      }

      newUploads.push(newUpload)
    })

    setUploads(prev => [...prev, ...newUploads])
  }, [uploads.length, maxFiles, globalSettings])

  // Drag and drop handlers
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
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  // File input handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files)
    }
  }

  // Update upload metadata
  const updateUploadMetadata = (uploadId: string, metadata: Partial<FileUpload['metadata']>) => {
    setUploads(prev => prev.map(upload => 
      upload.id === uploadId 
        ? { ...upload, metadata: { ...upload.metadata!, ...metadata } }
        : upload
    ))
  }

  // Privacy analysis for individual upload
  const analyzePrivacy = async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId)
    if (!upload) return

    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: 'processing', progress: 25 } : u
    ))

    try {
      const text = await upload.file.text()
      const analysis = PrivacyCompliance.checkGDPRCompliance(text)
      
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, privacyAnalysis: analysis, progress: 50 }
          : u
      ))
    } catch (error) {
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: 'Privacy analysis failed' }
          : u
      ))
    }
  }

  // Encrypt individual upload
  const encryptUpload = async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId)
    if (!upload) return

    try {
      const text = await upload.file.text()
      const { encryptedData, key } = SimpleDataEncryption.encrypt(text)
      const dataHash = SimpleDataEncryption.generateDataHash(text)
      
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { 
              ...u, 
              encryptionData: { dataHash, encryptionKey: key, isEncrypted: true },
              progress: 75,
              status: 'completed'
            }
          : u
      ))
    } catch (error) {
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: 'Encryption failed' }
          : u
      ))
    }
  }

  // Process all uploads (batch)
  const processAllUploads = async () => {
    const pendingUploads = uploads.filter(u => u.status === 'pending')
    
    for (const upload of pendingUploads) {
      await analyzePrivacy(upload.id)
      await new Promise(resolve => setTimeout(resolve, 500)) // Small delay
      await encryptUpload(upload.id)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  // Submit individual upload
  const submitUpload = async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId)
    if (!upload || !upload.encryptionData || !upload.metadata) return

    try {
      const metadata = {
        title: upload.metadata.title,
        description: upload.metadata.description,
        provider: address,
        timestamp: Date.now(),
        encryptionKey: upload.encryptionData.encryptionKey,
        privacyAnalysis: upload.privacyAnalysis,
        fileName: upload.name,
        fileSize: upload.size,
        fileType: upload.type
      }
      
      const metadataURI = `ipfs://Qm${SimpleDataEncryption.generateDataHash(JSON.stringify(metadata)).slice(0, 44)}`
      
      await registerData({
        dataHash: upload.encryptionData.dataHash,
        metadataURI,
        price: upload.metadata.price,
        category: upload.metadata.category,
        tags: upload.metadata.tags,
        isEncrypted: upload.encryptionData.isEncrypted,
        dataSize: upload.size
      })

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u
      ))

    } catch (error) {
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: 'Registration failed' }
          : u
      ))
    }
  }

  // Submit all completed uploads
  const submitAllUploads = async () => {
    const readyUploads = uploads.filter(u => u.status === 'completed' && u.encryptionData)
    
    for (const upload of readyUploads) {
      await submitUpload(upload.id)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    onSuccess?.()
  }

  // Remove upload
  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId))
  }

  // Clear all uploads
  const clearAllUploads = () => {
    setUploads([])
    setSelectedUpload(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: FileUpload['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-600 bg-gray-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'error': return 'text-red-600 bg-red-100'
    }
  }

  const getStatusIcon = (status: FileUpload['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to upload data</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enhanced Data Upload</h2>
            <p className="text-gray-600 dark:text-gray-400">Upload and manage your private datasets with advanced features</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={batchMode}
                onChange={(e) => setBatchMode(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Batch mode</span>
            </label>
            
            {uploads.length > 0 && (
              <button
                onClick={clearAllUploads}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Global Settings for Batch Mode */}
        {batchMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Category
              </label>
              <select
                value={globalSettings.category}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, category: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value={0}>Personal</option>
                <option value={1}>Financial</option>
                <option value={2}>Health</option>
                <option value={3}>Behavioral</option>
                <option value={4}>Commercial</option>
                <option value={5}>Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Template (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={globalSettings.priceTemplate}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, priceTemplate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags Template
              </label>
              <input
                type="text"
                value={globalSettings.tagsTemplate}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, tagsTemplate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="dataset, private, 2024"
              />
            </div>
          </div>
        )}
      </div>

      {/* Drag and Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Drag and drop files here, or <span className="text-blue-600 dark:text-blue-400">browse</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Support: {acceptedTypes.join(', ')} • Max {maxFileSize}MB per file • Up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Uploaded Files ({uploads.length})
              </h3>
              
              {batchMode && uploads.some(u => u.status === 'pending') && (
                <button
                  onClick={processAllUploads}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Process All
                </button>
              )}
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {uploads.map((upload) => (
              <div key={upload.id} className="p-6">
                <div className="flex items-start space-x-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {upload.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(upload.size)} • {upload.type || 'Unknown type'}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(upload.status)}`}>
                          {getStatusIcon(upload.status)}
                          <span className="ml-1 capitalize">{upload.status}</span>
                        </span>
                        
                        <button
                          onClick={() => removeUpload(upload.id)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {upload.status === 'processing' && (
                      <div className="mt-2">
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{upload.progress}% complete</p>
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {upload.error && (
                      <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {upload.error}
                      </div>
                    )}
                    
                    {/* Metadata Form (when selected) */}
                    {selectedUpload === upload.id && upload.metadata && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={upload.metadata.title}
                              onChange={(e) => updateUploadMetadata(upload.id, { title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Price (ETH)
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={upload.metadata.price}
                              onChange={(e) => updateUploadMetadata(upload.id, { price: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={upload.metadata.description}
                            onChange={(e) => updateUploadMetadata(upload.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedUpload(selectedUpload === upload.id ? null : upload.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {selectedUpload === upload.id ? 'Hide Details' : 'Edit Details'}
                      </button>
                      
                      {upload.status === 'pending' && (
                        <>
                          <button
                            onClick={() => analyzePrivacy(upload.id)}
                            className="text-sm text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                          >
                            Analyze Privacy
                          </button>
                          <button
                            onClick={() => encryptUpload(upload.id)}
                            className="text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Encrypt
                          </button>
                        </>
                      )}
                      
                      {upload.status === 'completed' && upload.encryptionData && (
                        <button
                          onClick={() => submitUpload(upload.id)}
                          disabled={isRegistering || isConfirming}
                          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:bg-gray-400"
                        >
                          Register on Blockchain
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Batch Submit */}
          {uploads.some(u => u.status === 'completed' && u.encryptionData) && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={submitAllUploads}
                disabled={isRegistering || isConfirming}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isRegistering ? 'Processing...' : isConfirming ? 'Confirming...' : 'Submit All to Blockchain'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {registerError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 dark:text-red-400 text-sm">Error: {registerError.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}