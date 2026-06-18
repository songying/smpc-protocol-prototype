'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Code, 
  Eye, 
  Edit, 
  Trash2, 
  Play, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Filter,
  Download,
  Search
} from 'lucide-react'
import { useAccount } from 'wagmi'
import AlgorithmUploadForm from './AlgorithmUploadForm'
import AlgorithmExecutionInterface from '../execution/AlgorithmExecutionInterface'

interface Algorithm {
  id: string
  name: string
  description: string
  computationType: 'third_party' | 'zk' | 'fhe'
  status: 'pending' | 'approved' | 'rejected'
  authorAddress: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  version?: string
  tags?: string[]
  executionCount?: number
  lastExecuted?: string
  statusReason?: string
}

interface AlgorithmStats {
  totalAlgorithms: number
  algorithmsByStatus: Record<string, number>
  algorithmsByType: Record<string, number>
  totalAuthors: number
}

export default function AlgorithmManagementDashboard() {
  const { address, isConnected } = useAccount()
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([])
  const [stats, setStats] = useState<AlgorithmStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showExecutionInterface, setShowExecutionInterface] = useState(false)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [filterType, setFilterType] = useState<'all' | 'third_party' | 'zk' | 'fhe'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('my-algorithms')
  const [isMounted, setIsMounted] = useState(false)

  // Fix hydration mismatch by ensuring component is mounted
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const fetchAlgorithms = async () => {
    // For demo purposes, allow access without wallet connection

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterType !== 'all') params.append('computationType', filterType)
      
      const response = await fetch(`/api/algorithms?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          // Remove authorization for demo
          // 'Authorization': `Bearer ${address}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch algorithms')
      }
      
      const data = await response.json()
      setAlgorithms(data.algorithms || [])
    } catch (error) {
      console.error('Error fetching algorithms:', error)
      // Show mock data for demonstration
      setAlgorithms([
        {
          id: 'algo_1',
          name: 'Linear Regression Analysis',
          description: 'Performs linear regression on encrypted health data',
          computationType: 'third_party',
          status: 'approved',
          authorAddress: address || '0x123...demo',
          isPublic: true,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-16T08:30:00Z',
          version: '1.2.0',
          tags: ['regression', 'health', 'statistics'],
          executionCount: 45,
          lastExecuted: '2024-01-20T14:22:00Z'
        },
        {
          id: 'algo_2',
          name: 'Privacy-Preserving Clustering',
          description: 'Zero-knowledge clustering algorithm for patient segmentation',
          computationType: 'zk',
          status: 'pending',
          authorAddress: address || '0x123...demo',
          isPublic: false,
          createdAt: '2024-01-18T16:45:00Z',
          updatedAt: '2024-01-18T16:45:00Z',
          version: '1.0.0',
          tags: ['clustering', 'zk-proof', 'privacy'],
          executionCount: 0
        },
        {
          id: 'algo_3',
          name: 'Homomorphic Risk Calculator',
          description: 'FHE-based risk assessment for insurance calculations',
          computationType: 'fhe',
          status: 'rejected',
          authorAddress: address || '0x123...demo',
          isPublic: false,
          createdAt: '2024-01-10T09:15:00Z',
          updatedAt: '2024-01-12T11:20:00Z',
          version: '0.8.0',
          tags: ['fhe', 'insurance', 'risk-assessment'],
          executionCount: 0,
          statusReason: 'Security vulnerability in encryption implementation'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    // For demo purposes, allow access without wallet connection

    try {
      const response = await fetch('/api/algorithms?view=statistics', {
        headers: {
          'Content-Type': 'application/json',
          // Remove authorization for demo
          // 'Authorization': `Bearer ${address}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Mock stats for demonstration
      setStats({
        totalAlgorithms: 3,
        algorithmsByStatus: { approved: 1, pending: 1, rejected: 1 },
        algorithmsByType: { third_party: 1, zk: 1, fhe: 1 },
        totalAuthors: 1
      })
    }
  }

  useEffect(() => {
    if (isMounted) {
      fetchAlgorithms()
      fetchStats()
    }
  }, [isMounted, filterStatus, filterType])

  const handleUploadSuccess = (newAlgorithm: Algorithm) => {
    setAlgorithms(prev => [newAlgorithm, ...prev])
    setShowUploadForm(false)
    fetchStats()
  }

  const handleDeleteAlgorithm = async (algorithmId: string) => {
    if (!confirm('Are you sure you want to delete this algorithm?')) return

    try {
      const response = await fetch(`/api/algorithms?algorithmId=${algorithmId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Remove authorization for demo
          // 'Authorization': `Bearer ${address}`,
        },
      })

      if (response.ok) {
        setAlgorithms(prev => prev.filter(algo => algo.id !== algorithmId))
        fetchStats()
      }
    } catch (error) {
      console.error('Error deleting algorithm:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getComputationTypeColor = (type: string) => {
    switch (type) {
      case 'third_party':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'zk':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'fhe':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredAlgorithms = algorithms.filter(algo => {
    const matchesSearch = algo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         algo.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Show loading state during hydration to prevent mismatch
  if (!isMounted) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User-Defined Algorithms</h1>
            <p className="text-muted-foreground">
              Upload, manage, and execute your custom privacy-preserving algorithms
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // For demo purposes, remove wallet connection requirement
  // This prevents hydration mismatches and allows testing
  /*
  if (!isConnected) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
              <p className="text-muted-foreground">
                Please connect your wallet to access the algorithm management dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  */

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User-Defined Algorithms</h1>
          <p className="text-muted-foreground">
            Upload, manage, and execute your custom privacy-preserving algorithms
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowExecutionInterface(!showExecutionInterface)}
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            Execute Algorithm
          </Button>
          <Button onClick={() => setShowUploadForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Algorithm
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Algorithms</CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlgorithms}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.algorithmsByStatus.approved || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.algorithmsByStatus.pending || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {algorithms.reduce((sum, algo) => sum + (algo.executionCount || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-algorithms">My Algorithms</TabsTrigger>
          <TabsTrigger value="public-algorithms">Public Algorithms</TabsTrigger>
        </TabsList>

        <TabsContent value="my-algorithms" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters & Search</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search algorithms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="third_party">Third Party</option>
                  <option value="zk">Zero Knowledge</option>
                  <option value="fhe">Homomorphic Encryption</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Algorithm List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading algorithms...</p>
              </div>
            ) : filteredAlgorithms.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Code className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No algorithms found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                        ? "No algorithms match your current filters."
                        : "You haven't uploaded any algorithms yet."
                      }
                    </p>
                    <Button onClick={() => setShowUploadForm(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Algorithm
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredAlgorithms.map((algorithm) => (
                <Card key={algorithm.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold">{algorithm.name}</h3>
                          <Badge
                            variant="outline"
                            className={getComputationTypeColor(algorithm.computationType)}
                          >
                            {algorithm.computationType.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(algorithm.status)}
                            <span className="text-sm capitalize">{algorithm.status}</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{algorithm.description}</p>
                        {algorithm.tags && (
                          <div className="flex flex-wrap gap-1">
                            {algorithm.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {algorithm.status === 'approved' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedAlgorithm(algorithm)
                              setShowExecutionInterface(true)
                            }}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Execute
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAlgorithm(algorithm.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <div className="font-medium">{algorithm.version || '1.0.0'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Executions:</span>
                        <div className="font-medium">{algorithm.executionCount || 0}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <div className="font-medium">
                          {new Date(algorithm.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span>
                        <div className="font-medium">
                          {new Date(algorithm.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {algorithm.status === 'rejected' && algorithm.statusReason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-red-800">Rejection Reason:</div>
                            <div className="text-sm text-red-700">{algorithm.statusReason}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="public-algorithms" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Code className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Public Algorithm Marketplace</h3>
                <p className="text-muted-foreground">
                  Browse and execute algorithms shared by the community.
                </p>
                <Button className="mt-4" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Browse Public Algorithms
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <AlgorithmUploadForm
              onSuccess={handleUploadSuccess}
              onCancel={() => setShowUploadForm(false)}
            />
          </div>
        </div>
      )}

      {/* Execution Interface Modal */}
      {showExecutionInterface && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Algorithm Execution</h2>
              <Button
                variant="outline"
                onClick={() => {
                  setShowExecutionInterface(false)
                  setSelectedAlgorithm(null)
                }}
              >
                Close
              </Button>
            </div>
            <AlgorithmExecutionInterface selectedAlgorithm={selectedAlgorithm} />
          </div>
        </div>
      )}
    </div>
  )
}