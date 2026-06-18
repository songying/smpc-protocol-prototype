'use client'

import React, { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'

interface Transaction {
  id: string
  datasetId: string
  datasetTitle: string
  buyerAddress: string
  amount: number
  fee: number
  netAmount: number
  timestamp: Date
  status: 'completed' | 'pending' | 'failed'
  transactionHash: string
  paymentMethod: 'eth' | 'usdc' | 'dai'
}

interface EarningsData {
  period: string
  totalRevenue: number
  transactionCount: number
  avgTransactionValue: number
  topDataset: string
}

interface PaymentStatus {
  totalEarnings: number
  pendingPayments: number
  withdrawableAmount: number
  nextPaymentDate: Date
  paymentFrequency: 'weekly' | 'monthly'
}

interface RevenueTrackingProps {
  className?: string
}

export function RevenueTrackingDashboard({ className = '' }: RevenueTrackingProps) {
  const { address } = useAccount()
  
  // Mock data - in real app this would come from API/blockchain
  const [transactions] = useState<Transaction[]>([
    {
      id: '1',
      datasetId: '1',
      datasetTitle: 'Customer Survey Data Q4 2024',
      buyerAddress: '0x742d35Cc6C4A1bE45cF0f2e35C5bbA123456789',
      amount: 0.5,
      fee: 0.025,
      netAmount: 0.475,
      timestamp: new Date('2024-01-20T10:30:00'),
      status: 'completed',
      transactionHash: '0xabcd1234...',
      paymentMethod: 'eth'
    },
    {
      id: '2',
      datasetId: '2',
      datasetTitle: 'Financial Transaction Logs',
      buyerAddress: '0x123456789A1bE45cF0f2e35C5bbA742d35Cc6C4',
      amount: 1.2,
      fee: 0.06,
      netAmount: 1.14,
      timestamp: new Date('2024-01-19T14:15:00'),
      status: 'completed',
      transactionHash: '0xefgh5678...',
      paymentMethod: 'eth'
    },
    {
      id: '3',
      datasetId: '1',
      datasetTitle: 'Customer Survey Data Q4 2024',
      buyerAddress: '0x987654321B1cE45dF0f2e35C5ccA742d35Cc6C4',
      amount: 0.5,
      fee: 0.025,
      netAmount: 0.475,
      timestamp: new Date('2024-01-18T09:45:00'),
      status: 'pending',
      transactionHash: '0xijkl9012...',
      paymentMethod: 'usdc'
    }
  ])

  const [paymentStatus] = useState<PaymentStatus>({
    totalEarnings: 2.089,
    pendingPayments: 0.475,
    withdrawableAmount: 1.614,
    nextPaymentDate: new Date('2024-01-25'),
    paymentFrequency: 'weekly'
  })

  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedDataset, setSelectedDataset] = useState<string>('all')

  // Generate earnings data for charts
  const earningsData = useMemo(() => {
    const periods: EarningsData[] = []
    const now = new Date()
    const daysBack = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365
    
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.timestamp)
        return tDate.toDateString() === date.toDateString() && 
               (selectedDataset === 'all' || t.datasetId === selectedDataset)
      })
      
      const totalRevenue = dayTransactions.reduce((sum, t) => sum + t.netAmount, 0)
      const topDataset = dayTransactions.length > 0 ? dayTransactions[0].datasetTitle : ''
      
      periods.push({
        period: selectedTimeRange === '7d' || selectedTimeRange === '30d' 
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        totalRevenue,
        transactionCount: dayTransactions.length,
        avgTransactionValue: dayTransactions.length > 0 ? totalRevenue / dayTransactions.length : 0,
        topDataset
      })
    }
    
    return periods
  }, [transactions, selectedTimeRange, selectedDataset])

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const filteredTransactions = transactions.filter(t => 
      selectedDataset === 'all' || t.datasetId === selectedDataset
    )
    
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.netAmount, 0)
    const totalFees = filteredTransactions.reduce((sum, t) => sum + t.fee, 0)
    const avgTransactionValue = filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0
    const completedTransactions = filteredTransactions.filter(t => t.status === 'completed').length
    
    return {
      totalRevenue,
      totalFees,
      avgTransactionValue,
      transactionCount: filteredTransactions.length,
      completedTransactions,
      conversionRate: filteredTransactions.length > 0 ? (completedTransactions / filteredTransactions.length) * 100 : 0
    }
  }, [transactions, selectedDataset])

  // Get unique datasets
  const datasets = useMemo(() => {
    const uniqueDatasets = new Map()
    transactions.forEach(t => {
      if (!uniqueDatasets.has(t.datasetId)) {
        uniqueDatasets.set(t.datasetId, t.datasetTitle)
      }
    })
    return Array.from(uniqueDatasets.entries()).map(([id, title]) => ({ id, title }))
  }, [transactions])

  const formatCurrency = (amount: number, currency: string = 'ETH') => {
    return `${amount.toFixed(4)} ${currency}`
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    }
  }

  const maxRevenue = Math.max(...earningsData.map(d => d.totalRevenue))

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue Tracking</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor your data monetization performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Dataset Filter */}
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Datasets</option>
            {datasets.map(dataset => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.title.slice(0, 30)}...
              </option>
            ))}
          </select>
          
          {/* Time Range Filter */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as const).map(range => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summaryStats.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryStats.transactionCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Transaction</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summaryStats.avgTransactionValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryStats.conversionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Revenue Trend</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">ETH</span>
          </div>
          
          <div className="h-64 flex items-end justify-between space-x-2">
            {earningsData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="w-full relative group">
                  <div 
                    className="bg-blue-500 hover:bg-blue-600 rounded-t transition-colors cursor-pointer"
                    style={{
                      height: `${maxRevenue > 0 ? (data.totalRevenue / maxRevenue) * 200 : 4}px`,
                      minHeight: '4px'
                    }}
                    title={`${data.period}: ${formatCurrency(data.totalRevenue)}`}
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap">
                      {formatCurrency(data.totalRevenue)}
                    </div>
                  </div>
                </div>
                
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 transform -rotate-45 origin-top-left">
                  {data.period}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Payment Status</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(paymentStatus.totalEarnings)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                {formatCurrency(paymentStatus.pendingPayments)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Withdrawable</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatCurrency(paymentStatus.withdrawableAmount)}
              </span>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Next Payment</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {paymentStatus.nextPaymentDate.toLocaleDateString()}
                </span>
              </div>
              
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                Withdraw Available Funds
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Transactions</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              View All
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dataset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Buyer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Net
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.slice(0, 10).map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.datasetTitle.slice(0, 30)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatAddress(transaction.buyerAddress)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(transaction.fee)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(transaction.netAmount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {transaction.timestamp.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}