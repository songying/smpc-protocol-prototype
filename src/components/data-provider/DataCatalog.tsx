'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface Dataset {
  id: string
  title: string
  description: string
  category: number
  price: number
  size: number
  uploadDate: Date
  lastUpdated: Date
  status: 'active' | 'pending' | 'rejected' | 'archived'
  downloads: number
  revenue: number
  tags: string[]
  fileType: string
  isEncrypted: boolean
  complianceStatus: 'compliant' | 'warning' | 'non-compliant'
  privacyScore: number
  usage: {
    totalRequests: number
    activeRequests: number
    completedRequests: number
  }
  sharing: {
    isPublic: boolean
    allowedUsers: string[]
    restrictions: string[]
  }
}

interface DataCatalogProps {
  onDatasetSelect?: (dataset: Dataset) => void
  onDatasetEdit?: (dataset: Dataset) => void
  onDatasetDelete?: (datasetId: string) => void
}

const CATEGORIES = [
  'Personal', 'Financial', 'Health', 'Behavioral', 'Commercial', 'Other'
]

const SORT_OPTIONS = [
  { value: 'title', label: 'Name' },
  { value: 'uploadDate', label: 'Upload Date' },
  { value: 'lastUpdated', label: 'Last Updated' },
  { value: 'price', label: 'Price' },
  { value: 'downloads', label: 'Downloads' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'size', label: 'File Size' }
]

const VIEW_MODES = ['grid', 'list', 'table'] as const
type ViewMode = typeof VIEW_MODES[number]

export function DataCatalog({ onDatasetSelect, onDatasetEdit, onDatasetDelete }: DataCatalogProps) {
  const { address } = useAccount()
  
  // Mock data - in real app this would come from API/blockchain
  const [datasets] = useState<Dataset[]>([
    {
      id: '1',
      title: 'Customer Survey Data Q4 2024',
      description: 'Comprehensive customer satisfaction survey data from Q4 2024 including demographics, preferences, and feedback.',
      category: 4, // Commercial
      price: 0.5,
      size: 2048576, // 2MB
      uploadDate: new Date('2024-01-15'),
      lastUpdated: new Date('2024-01-16'),
      status: 'active',
      downloads: 12,
      revenue: 6.0,
      tags: ['survey', 'customer', 'satisfaction', '2024'],
      fileType: 'csv',
      isEncrypted: true,
      complianceStatus: 'compliant',
      privacyScore: 95,
      usage: {
        totalRequests: 15,
        activeRequests: 2,
        completedRequests: 13
      },
      sharing: {
        isPublic: true,
        allowedUsers: [],
        restrictions: ['no-resale', 'research-only']
      }
    },
    {
      id: '2',
      title: 'Financial Transaction Logs',
      description: 'Anonymized financial transaction data for ML training and analysis.',
      category: 1, // Financial
      price: 1.2,
      size: 5242880, // 5MB
      uploadDate: new Date('2024-01-10'),
      lastUpdated: new Date('2024-01-12'),
      status: 'active',
      downloads: 8,
      revenue: 9.6,
      tags: ['finance', 'transactions', 'anonymous', 'ml'],
      fileType: 'json',
      isEncrypted: true,
      complianceStatus: 'warning',
      privacyScore: 88,
      usage: {
        totalRequests: 10,
        activeRequests: 1,
        completedRequests: 9
      },
      sharing: {
        isPublic: false,
        allowedUsers: ['0x742d35Cc6C4A1bE45cF0f2e...'],
        restrictions: ['commercial-use', 'attribution-required']
      }
    },
    {
      id: '3',
      title: 'Healthcare Research Dataset',
      description: 'De-identified patient data for medical research and drug discovery.',
      category: 2, // Health
      price: 2.0,
      size: 10485760, // 10MB
      uploadDate: new Date('2024-01-05'),
      lastUpdated: new Date('2024-01-08'),
      status: 'pending',
      downloads: 0,
      revenue: 0,
      tags: ['healthcare', 'research', 'medical', 'patients'],
      fileType: 'xlsx',
      isEncrypted: true,
      complianceStatus: 'compliant',
      privacyScore: 98,
      usage: {
        totalRequests: 3,
        activeRequests: 3,
        completedRequests: 0
      },
      sharing: {
        isPublic: false,
        allowedUsers: [],
        restrictions: ['research-only', 'irb-approval-required']
      }
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('uploadDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([])

  // Filter and sort datasets
  const filteredAndSortedDatasets = useMemo(() => {
    let filtered = datasets.filter(dataset => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!dataset.title.toLowerCase().includes(query) &&
            !dataset.description.toLowerCase().includes(query) &&
            !dataset.tags.some(tag => tag.toLowerCase().includes(query))) {
          return false
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && dataset.category !== selectedCategory) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'all' && dataset.status !== selectedStatus) {
        return false
      }

      // Tags filter
      if (selectedTags.length > 0) {
        if (!selectedTags.some(tag => dataset.tags.includes(tag))) {
          return false
        }
      }

      return true
    })

    // Sort datasets
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Dataset]
      let bValue: any = b[sortBy as keyof Dataset]

      if (sortBy === 'uploadDate' || sortBy === 'lastUpdated') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [datasets, searchQuery, selectedCategory, selectedStatus, selectedTags, sortBy, sortOrder])

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    datasets.forEach(dataset => {
      dataset.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [datasets])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: Dataset['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getComplianceColor = (status: Dataset['complianceStatus']) => {
    switch (status) {
      case 'compliant': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'non-compliant': return 'text-red-600 dark:text-red-400'
    }
  }

  const handleSelectDataset = (datasetId: string) => {
    setSelectedDatasets(prev => 
      prev.includes(datasetId) 
        ? prev.filter(id => id !== datasetId)
        : [...prev, datasetId]
    )
  }

  const handleSelectAll = () => {
    if (selectedDatasets.length === filteredAndSortedDatasets.length) {
      setSelectedDatasets([])
    } else {
      setSelectedDatasets(filteredAndSortedDatasets.map(d => d.id))
    }
  }

  const handleBulkAction = (action: string) => {
    console.log(`Bulk ${action} for datasets:`, selectedDatasets)
    // Implement bulk actions
  }

  const DatasetCard = ({ dataset }: { dataset: Dataset }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={selectedDatasets.includes(dataset.id)}
              onChange={() => handleSelectDataset(dataset.id)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {dataset.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {dataset.description.slice(0, 100)}...
              </p>
            </div>
          </div>
          
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dataset.status)}`}>
            {dataset.status.charAt(0).toUpperCase() + dataset.status.slice(1)}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{dataset.price} ETH</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Downloads</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{dataset.downloads}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{dataset.revenue} ETH</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Size</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatFileSize(dataset.size)}</p>
          </div>
        </div>

        {/* Compliance and Privacy */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getComplianceColor(dataset.complianceStatus).replace('text-', 'bg-')}`} />
            <span className={`text-xs font-medium ${getComplianceColor(dataset.complianceStatus)}`}>
              {dataset.complianceStatus.charAt(0).toUpperCase() + dataset.complianceStatus.slice(1)}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Privacy Score: {dataset.privacyScore}%
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {dataset.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded">
              {tag}
            </span>
          ))}
          {dataset.tags.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{dataset.tags.length - 3} more
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Updated {formatDate(dataset.lastUpdated)}
          </span>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDatasetSelect?.(dataset)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View
            </button>
            <button
              onClick={() => onDatasetEdit?.(dataset)}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Catalog</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your {datasets.length} datasets
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          {VIEW_MODES.map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-2 rounded-lg ${
                viewMode === mode
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {mode === 'grid' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
              {mode === 'list' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
              {mode === 'table' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search datasets..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((category, index) => (
                <option key={index} value={index}>{category}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    )
                  }}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedDatasets.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedDatasets.length} datasets selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedDatasets([])}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredAndSortedDatasets.length} of {datasets.length} datasets
          </p>
          
          {filteredAndSortedDatasets.length > 0 && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedDatasets.length === filteredAndSortedDatasets.length}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Select all</span>
            </label>
          )}
        </div>

        {filteredAndSortedDatasets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0l-2-2m-14 2l2-2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No datasets found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or upload a new dataset.</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' :
            viewMode === 'list' ? 'space-y-4' :
            'overflow-x-auto'
          }>
            {viewMode !== 'table' ? (
              filteredAndSortedDatasets.map(dataset => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))
            ) : (
              // Table view would go here
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Table view coming soon
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}