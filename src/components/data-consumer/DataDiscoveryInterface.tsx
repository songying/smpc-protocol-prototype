'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface AvailableDataset {
  id: string
  title: string
  description: string
  provider: string
  providerAddress: string
  category: number
  price: number
  size: number
  uploadDate: Date
  lastUpdated: Date
  tags: string[]
  fileType: string
  isEncrypted: boolean
  complianceStatus: 'compliant' | 'warning' | 'non-compliant'
  privacyScore: number
  downloadCount: number
  rating: number
  reviewCount: number
  sampleAvailable: boolean
  dataQuality: {
    completeness: number
    accuracy: number
    freshness: number
    relevance: number
  }
  usage: {
    allowedPurposes: string[]
    restrictions: string[]
    licenseType: 'open' | 'commercial' | 'restricted'
  }
  preview: {
    schema?: any
    sampleData?: any
    statistics?: any
  }
}

interface DataDiscoveryProps {
  onDatasetSelect?: (dataset: AvailableDataset) => void
  onAddToCart?: (dataset: AvailableDataset) => void
  onRequestComputation?: (dataset: AvailableDataset) => void
}

const CATEGORIES = [
  'Personal', 'Financial', 'Health', 'Behavioral', 'Commercial', 'Other'
]

const PRICE_RANGES = [
  { label: 'Free', min: 0, max: 0 },
  { label: 'Under 0.1 ETH', min: 0.001, max: 0.1 },
  { label: '0.1 - 0.5 ETH', min: 0.1, max: 0.5 },
  { label: '0.5 - 1 ETH', min: 0.5, max: 1 },
  { label: '1 - 5 ETH', min: 1, max: 5 },
  { label: 'Over 5 ETH', min: 5, max: Infinity }
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'size_asc', label: 'Size: Small to Large' },
  { value: 'size_desc', label: 'Size: Large to Small' }
]

export function DataDiscoveryInterface({ onDatasetSelect, onAddToCart, onRequestComputation }: DataDiscoveryProps) {
  const { address } = useAccount()
  
  // Mock data - in real app this would come from API/blockchain
  const [datasets] = useState<AvailableDataset[]>([
    {
      id: '1',
      title: 'E-commerce Customer Behavior Dataset',
      description: 'Comprehensive analysis of customer purchasing patterns, browsing behavior, and engagement metrics from a major e-commerce platform. Includes anonymized user journeys, product preferences, and seasonal trends.',
      provider: 'DataMart Analytics',
      providerAddress: '0x742d35Cc6C4A1bE45cF0f2e35C5bbA123456789',
      category: 4, // Commercial
      price: 0.75,
      size: 15728640, // 15MB
      uploadDate: new Date('2024-01-15'),
      lastUpdated: new Date('2024-01-20'),
      tags: ['e-commerce', 'customer-behavior', 'analytics', 'purchasing-patterns'],
      fileType: 'csv',
      isEncrypted: true,
      complianceStatus: 'compliant',
      privacyScore: 92,
      downloadCount: 45,
      rating: 4.6,
      reviewCount: 12,
      sampleAvailable: true,
      dataQuality: {
        completeness: 95,
        accuracy: 91,
        freshness: 88,
        relevance: 94
      },
      usage: {
        allowedPurposes: ['research', 'analytics', 'machine-learning'],
        restrictions: ['no-resale', 'attribution-required'],
        licenseType: 'commercial'
      },
      preview: {
        schema: {
          user_id: 'string',
          session_id: 'string',
          timestamp: 'datetime',
          page_views: 'integer',
          products_viewed: 'array',
          purchase_amount: 'float'
        },
        statistics: {
          totalRecords: 125000,
          dateRange: '2023-01-01 to 2023-12-31',
          uniqueUsers: 45000
        }
      }
    },
    {
      id: '2',
      title: 'Medical Research Dataset - Cardiovascular Studies',
      description: 'De-identified patient data for cardiovascular disease research. Includes diagnostic imaging features, lab results, and treatment outcomes. Perfect for AI/ML model training in medical diagnostics.',
      provider: 'MedData Research',
      providerAddress: '0x123456789A1bE45cF0f2e35C5bbA742d35Cc6C4',
      category: 2, // Health
      price: 2.5,
      size: 52428800, // 50MB
      uploadDate: new Date('2024-01-10'),
      lastUpdated: new Date('2024-01-18'),
      tags: ['medical', 'cardiovascular', 'research', 'healthcare', 'ai-training'],
      fileType: 'json',
      isEncrypted: true,
      complianceStatus: 'compliant',
      privacyScore: 98,
      downloadCount: 8,
      rating: 4.9,
      reviewCount: 5,
      sampleAvailable: false,
      dataQuality: {
        completeness: 98,
        accuracy: 96,
        freshness: 85,
        relevance: 97
      },
      usage: {
        allowedPurposes: ['medical-research', 'ai-training'],
        restrictions: ['research-only', 'irb-approval-required', 'no-commercial-use'],
        licenseType: 'restricted'
      },
      preview: {
        schema: {
          patient_id: 'string',
          age: 'integer',
          gender: 'string',
          diagnosis: 'string',
          lab_results: 'object',
          imaging_features: 'array'
        },
        statistics: {
          totalRecords: 15000,
          dateRange: '2020-01-01 to 2023-12-31',
          uniquePatients: 15000
        }
      }
    },
    {
      id: '3',
      title: 'Financial Transaction Patterns - Crypto Trading',
      description: 'Anonymized cryptocurrency trading data including transaction volumes, price movements, and market sentiment indicators. Useful for quantitative trading strategies and market analysis.',
      provider: 'CryptoInsights',
      providerAddress: '0x987654321B1cE45dF0f2e35C5ccA742d35Cc6C4',
      category: 1, // Financial
      price: 1.2,
      size: 31457280, // 30MB
      uploadDate: new Date('2024-01-12'),
      lastUpdated: new Date('2024-01-19'),
      tags: ['cryptocurrency', 'trading', 'financial', 'market-analysis', 'defi'],
      fileType: 'parquet',
      isEncrypted: true,
      complianceStatus: 'warning',
      privacyScore: 85,
      downloadCount: 23,
      rating: 4.3,
      reviewCount: 8,
      sampleAvailable: true,
      dataQuality: {
        completeness: 89,
        accuracy: 93,
        freshness: 96,
        relevance: 92
      },
      usage: {
        allowedPurposes: ['research', 'trading-algorithms', 'market-analysis'],
        restrictions: ['no-redistribution', 'commercial-license-required'],
        licenseType: 'commercial'
      },
      preview: {
        schema: {
          timestamp: 'datetime',
          symbol: 'string',
          price: 'float',
          volume: 'float',
          market_cap: 'float',
          sentiment_score: 'float'
        },
        statistics: {
          totalRecords: 500000,
          dateRange: '2023-06-01 to 2024-01-01',
          uniqueSymbols: 150
        }
      }
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | 'all'>('all')
  const [selectedCompliance, setSelectedCompliance] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('relevance')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<AvailableDataset | null>(null)

  // Filter and sort datasets
  const filteredAndSortedDatasets = useMemo(() => {
    let filtered = datasets.filter(dataset => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!dataset.title.toLowerCase().includes(query) &&
            !dataset.description.toLowerCase().includes(query) &&
            !dataset.provider.toLowerCase().includes(query) &&
            !dataset.tags.some(tag => tag.toLowerCase().includes(query))) {
          return false
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && dataset.category !== selectedCategory) {
        return false
      }

      // Price range filter
      if (selectedPriceRange !== 'all') {
        const range = PRICE_RANGES[selectedPriceRange]
        if (dataset.price < range.min || dataset.price > range.max) {
          return false
        }
      }

      // Compliance filter
      if (selectedCompliance !== 'all' && dataset.complianceStatus !== selectedCompliance) {
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
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price
        case 'price_desc':
          return b.price - a.price
        case 'rating':
          return b.rating - a.rating
        case 'newest':
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        case 'popular':
          return b.downloadCount - a.downloadCount
        case 'size_asc':
          return a.size - b.size
        case 'size_desc':
          return b.size - a.size
        default: // relevance
          return 0
      }
    })

    return filtered
  }, [datasets, searchQuery, selectedCategory, selectedPriceRange, selectedCompliance, selectedTags, sortBy])

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

  const getComplianceColor = (status: AvailableDataset['complianceStatus']) => {
    switch (status) {
      case 'compliant': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'non-compliant': return 'text-red-600 dark:text-red-400'
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const DatasetCard = ({ dataset }: { dataset: AvailableDataset }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {dataset.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              by {dataset.provider}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(dataset.rating) ? 'fill-current' : 'text-gray-300'}`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                ({dataset.reviewCount})
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          {dataset.description}
        </p>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Category:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {CATEGORIES[dataset.category]}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Size:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {formatFileSize(dataset.size)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Downloads:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {dataset.downloadCount}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Updated:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {formatDate(dataset.lastUpdated)}
            </span>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.entries(dataset.dataQuality).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className={`text-lg font-bold ${getQualityColor(value)}`}>
                {value}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {key}
              </div>
            </div>
          ))}
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

        {/* Price and Actions */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {dataset.price === 0 ? 'Free' : `${dataset.price} ETH`}
          </div>
          
          <div className="flex items-center space-x-2">
            {dataset.sampleAvailable && (
              <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 rounded">
                Preview
              </button>
            )}
            <button
              onClick={() => setSelectedDataset(dataset)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded"
            >
              View Details
            </button>
            <button
              onClick={() => onAddToCart?.(dataset)}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Add to Cart
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Marketplace</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Discover {datasets.length} privacy-preserving datasets
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search datasets by title, description, provider, or tags..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((category, index) => (
                <option key={index} value={index}>{category}</option>
              ))}
            </select>

            <select
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Prices</option>
              {PRICE_RANGES.map((range, index) => (
                <option key={index} value={index}>{range.label}</option>
              ))}
            </select>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Compliance Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Compliance Status
                  </label>
                  <select
                    value={selectedCompliance}
                    onChange={(e) => setSelectedCompliance(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="compliant">Compliant</option>
                    <option value="warning">Warning</option>
                    <option value="non-compliant">Non-Compliant</option>
                  </select>
                </div>

                {/* Tags Filter */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.slice(0, 10).map(tag => (
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredAndSortedDatasets.length} of {datasets.length} datasets
          </p>
        </div>

        {filteredAndSortedDatasets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No datasets found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredAndSortedDatasets.map(dataset => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        )}
      </div>

      {/* Dataset Detail Modal */}
      {selectedDataset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedDataset.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    by {selectedDataset.provider}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDataset(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedDataset.description}</p>
                </div>

                {/* Schema Preview */}
                {selectedDataset.preview.schema && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Data Schema</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <pre className="text-sm text-gray-800 dark:text-gray-200">
                        {JSON.stringify(selectedDataset.preview.schema, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Usage Rights */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Usage Rights</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Allowed purposes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDataset.usage.allowedPurposes.map(purpose => (
                          <span key={purpose} className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded">
                            {purpose}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Restrictions:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDataset.usage.restrictions.map(restriction => (
                          <span key={restriction} className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs rounded">
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedDataset.price === 0 ? 'Free' : `${selectedDataset.price} ETH`}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onRequestComputation?.(selectedDataset)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                      Request Computation
                    </button>
                    <button
                      onClick={() => onAddToCart?.(selectedDataset)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}