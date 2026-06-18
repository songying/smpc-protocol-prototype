import { NextRequest, NextResponse } from 'next/server'
import algorithmService from '@/lib/services/algorithm-service'
import algorithmDatabase from '@/lib/database/algorithm-schemas'
import { verifyAuth } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('user')
    const timeRange = searchParams.get('range') || '30d' // 7d, 30d, 90d, 1y
    
    const requestorAddress = authResult.user.address
    const isAdmin = authResult.user.roles?.includes('admin')
    const isProvider = authResult.user.roles?.includes('provider')

    // For data providers: show algorithm usage on their data
    if (isProvider && (!userAddress || userAddress === requestorAddress)) {
      const analytics = await getProviderAnalytics(requestorAddress, timeRange)
      return NextResponse.json(analytics)
    }

    // For algorithm owners: show their algorithm statistics
    if (userAddress) {
      // Verify permission to view user analytics
      if (userAddress !== requestorAddress && !isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized to view other user\'s analytics' },
          { status: 403 }
        )
      }

      const analytics = await getUserAlgorithmAnalytics(userAddress, timeRange)
      return NextResponse.json(analytics)
    }

    // Admin: get system-wide statistics
    if (isAdmin) {
      const systemStats = await algorithmService.getAlgorithmStatistics()
      const detailedAnalytics = await getSystemAnalytics(timeRange)
      
      return NextResponse.json({
        ...systemStats,
        ...detailedAnalytics
      })
    }

    // Default: get user's own algorithm analytics
    const userAnalytics = await getUserAlgorithmAnalytics(requestorAddress, timeRange)
    return NextResponse.json(userAnalytics)

  } catch (error) {
    console.error('GET /api/analytics/algorithms error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get user's algorithm analytics
async function getUserAlgorithmAnalytics(userAddress: string, timeRange: string) {
  const algorithms = await algorithmDatabase.getAlgorithmsByUser(userAddress)
  
  // Get basic stats
  const totalAlgorithms = algorithms.length
  const approvedAlgorithms = algorithms.filter(a => a.status === 'approved').length
  const pendingAlgorithms = algorithms.filter(a => a.status === 'pending').length
  const rejectedAlgorithms = algorithms.filter(a => a.status === 'rejected').length
  
  // Group by computation type
  const byComputationType = algorithms.reduce((acc, algorithm) => {
    acc[algorithm.computation_type] = (acc[algorithm.computation_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Get recent activity (algorithms created in time range)
  const timeFilter = getTimeFilterDate(timeRange)
  const recentAlgorithms = algorithms.filter(
    a => new Date(a.created_at) >= timeFilter
  )
  
  // Get audit statistics
  const auditStats = await Promise.all(
    algorithms.map(async (algorithm) => {
      const audits = await algorithmDatabase.getAuditsByAlgorithm(algorithm.id)
      return {
        algorithmId: algorithm.id,
        algorithmName: algorithm.name,
        auditCount: audits.length,
        avgAuditTime: audits.length > 0 ? calculateAvgAuditTime(audits) : 0,
        lastAuditStatus: audits[0]?.status || 'none'
      }
    })
  )
  
  // Mock usage statistics (TODO: implement real usage tracking)
  const usageStats = algorithms.map(algorithm => ({
    algorithmId: algorithm.id,
    algorithmName: algorithm.name,
    computationType: algorithm.computation_type,
    totalExecutions: Math.floor(Math.random() * 100), // Mock data
    totalDataProcessed: Math.floor(Math.random() * 1000), // Mock data
    avgExecutionTime: Math.floor(Math.random() * 5000), // Mock data in ms
    successRate: Math.random() * 0.3 + 0.7 // Mock data (70-100%)
  }))
  
  return {
    user: userAddress,
    timeRange,
    summary: {
      totalAlgorithms,
      approvedAlgorithms,
      pendingAlgorithms,
      rejectedAlgorithms,
      approvalRate: totalAlgorithms > 0 ? approvedAlgorithms / totalAlgorithms : 0
    },
    byComputationType,
    recentActivity: {
      newAlgorithms: recentAlgorithms.length,
      algorithms: recentAlgorithms.map(a => ({
        id: a.id,
        name: a.name,
        computationType: a.computation_type,
        status: a.status,
        createdAt: a.created_at
      }))
    },
    auditStatistics: auditStats,
    usageStatistics: usageStats
  }
}

// Helper function for data provider analytics
async function getProviderAnalytics(providerAddress: string, timeRange: string) {
  // This would integrate with the data registry to find algorithms used on provider's data
  // For now, return mock data structure
  
  return {
    provider: providerAddress,
    timeRange,
    summary: {
      totalDataSets: Math.floor(Math.random() * 50), // Mock
      algorithmsUsed: Math.floor(Math.random() * 20), // Mock
      totalComputations: Math.floor(Math.random() * 200), // Mock
      totalRevenue: Math.floor(Math.random() * 10000), // Mock
    },
    algorithmUsage: [
      // Mock data - would come from real computation logs
      {
        algorithmId: 'sample-1',
        algorithmName: 'Health Risk Assessment',
        computationType: 'zk',
        usageCount: 25,
        lastUsed: new Date().toISOString(),
        revenue: 150
      }
    ],
    dataSetUsage: [
      // Mock data - would come from real usage logs
      {
        dataSetId: 'data-1',
        dataSetName: 'Health Records',
        algorithmCount: 5,
        totalComputations: 50,
        revenue: 300
      }
    ],
    topAlgorithms: [
      // Mock top performing algorithms
      {
        algorithmId: 'sample-1',
        algorithmName: 'Health Risk Assessment',
        computationType: 'zk',
        usageCount: 25,
        revenue: 150
      }
    ]
  }
}

// Helper function for system-wide analytics (admin only)
async function getSystemAnalytics(timeRange: string) {
  const timeFilter = getTimeFilterDate(timeRange)
  
  // Get recent activity
  // This would query algorithms and audits created in the time range
  
  return {
    recentActivity: {
      newAlgorithms: Math.floor(Math.random() * 20), // Mock
      completedAudits: Math.floor(Math.random() * 15), // Mock
      activeComputations: Math.floor(Math.random() * 30), // Mock
    },
    performance: {
      avgAuditTime: Math.floor(Math.random() * 24) + 24, // Mock: 24-48 hours
      systemUptime: 99.5, // Mock
      avgComputationTime: Math.floor(Math.random() * 1000) + 500 // Mock: 500-1500ms
    },
    trends: {
      popularComputationType: 'zk', // Mock
      growthRate: Math.random() * 0.2 + 0.05, // Mock: 5-25% growth
      userGrowth: Math.floor(Math.random() * 10) + 5 // Mock: 5-15 new users
    }
  }
}

// Helper function to calculate average audit time
function calculateAvgAuditTime(audits: any[]) {
  const completedAudits = audits.filter(audit => 
    audit.completed_at && ['approved', 'rejected', 'request_changes'].includes(audit.status)
  )
  
  if (completedAudits.length === 0) return 0
  
  const totalTime = completedAudits.reduce((sum, audit) => {
    const assigned = new Date(audit.assigned_at)
    const completed = new Date(audit.completed_at)
    return sum + (completed.getTime() - assigned.getTime())
  }, 0)
  
  return totalTime / completedAudits.length // Average time in milliseconds
}

// Helper function to get date filter based on time range
function getTimeFilterDate(range: string): Date {
  const now = new Date()
  
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}