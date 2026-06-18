'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useDataRegistry } from '@/hooks/useDataRegistry'
import { SimpleDataEncryption, PrivacyCompliance } from '@/lib/crypto'

interface DataUploadFormProps {
  onSuccess?: () => void
}

export function DataUploadForm({ onSuccess }: DataUploadFormProps) {
  const { address, isConnected } = useAccount()
  const { registerData, isRegistering, isConfirming, registerError } = useDataRegistry()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 0,
    price: '',
    tags: '',
    rawData: ''
  })
  
  const [encryptedData, setEncryptedData] = useState<{
    dataHash: string
    encryptionKey: string
    isEncrypted: boolean
  } | null>(null)
  
  const [privacyAnalysis, setPrivacyAnalysis] = useState<{
    isCompliant: boolean
    issues: string[]
    recommendations: string[]
  } | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const analyzePrivacy = () => {
    if (!formData.rawData) return
    
    const analysis = PrivacyCompliance.checkGDPRCompliance(formData.rawData)
    setPrivacyAnalysis(analysis)
  }

  const encryptAndHashData = () => {
    if (!formData.rawData) return
    
    const { encryptedData: encrypted, key } = SimpleDataEncryption.encrypt(formData.rawData)
    const dataHash = SimpleDataEncryption.generateDataHash(formData.rawData)
    
    setEncryptedData({
      dataHash,
      encryptionKey: key,
      isEncrypted: true
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }
    
    if (!encryptedData) {
      alert('Please encrypt your data first')
      return
    }
    
    try {
      // Create metadata object
      const metadata = {
        title: formData.title,
        description: formData.description,
        provider: address,
        timestamp: Date.now(),
        encryptionKey: encryptedData.encryptionKey,
        privacyAnalysis
      }
      
      // In a real implementation, this would be uploaded to IPFS
      const metadataURI = `ipfs://Qm${SimpleDataEncryption.generateDataHash(JSON.stringify(metadata)).slice(0, 44)}`
      
      await registerData({
        dataHash: encryptedData.dataHash,
        metadataURI,
        price: formData.price,
        category: parseInt(formData.category.toString()),
        tags: formData.tags.split(',').map(tag => tag.trim()),
        isEncrypted: encryptedData.isEncrypted,
        dataSize: formData.rawData.length
      })
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 0,
        price: '',
        tags: '',
        rawData: ''
      })
      setEncryptedData(null)
      setPrivacyAnalysis(null)
      
      onSuccess?.()
    } catch (error) {
      console.error('Error uploading data:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please connect your wallet to upload data</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Private Data</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Data Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Customer Survey Data 2024"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your dataset..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price (ETH)
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              step="0.001"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.1"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="survey, customer-data, 2024"
          />
        </div>

        {/* Data Input */}
        <div>
          <label htmlFor="rawData" className="block text-sm font-medium text-gray-700 mb-1">
            Raw Data
          </label>
          <textarea
            id="rawData"
            name="rawData"
            value={formData.rawData}
            onChange={handleInputChange}
            required
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste your data here..."
          />
          
          {formData.rawData && (
            <div className="mt-2 flex space-x-2">
              <button
                type="button"
                onClick={analyzePrivacy}
                className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
              >
                Analyze Privacy
              </button>
              <button
                type="button"
                onClick={encryptAndHashData}
                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              >
                Encrypt Data
              </button>
            </div>
          )}
        </div>

        {/* Privacy Analysis Results */}
        {privacyAnalysis && (
          <div className={`p-4 rounded-md ${privacyAnalysis.isCompliant ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <h3 className="font-medium text-gray-900 mb-2">Privacy Analysis</h3>
            <p className={`text-sm ${privacyAnalysis.isCompliant ? 'text-green-700' : 'text-yellow-700'}`}>
              {privacyAnalysis.isCompliant ? '✅ GDPR Compliant' : '⚠️ Privacy Issues Detected'}
            </p>
            {privacyAnalysis.issues.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">Issues:</p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {privacyAnalysis.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {privacyAnalysis.recommendations.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">Recommendations:</p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {privacyAnalysis.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Encryption Status */}
        {encryptedData && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-medium text-gray-900 mb-2">🔒 Data Encrypted</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Data Hash:</strong> <code className="bg-gray-100 px-1 rounded">{encryptedData.dataHash.slice(0, 16)}...</code></p>
              <p><strong>Encryption Key:</strong> <code className="bg-gray-100 px-1 rounded">{encryptedData.encryptionKey.slice(0, 16)}...</code></p>
              <p className="text-green-600">✅ Ready for blockchain registration</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!encryptedData || isRegistering || isConfirming}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isRegistering ? 'Encrypting & Registering...' :
           isConfirming ? 'Confirming Transaction...' :
           'Register Data on Blockchain'}
        </button>

        {registerError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">Error: {registerError.message}</p>
          </div>
        )}
      </form>
    </div>
  )
}