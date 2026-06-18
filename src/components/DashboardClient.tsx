'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { WalletConnector } from '@/components/WalletConnector';
import { useRole } from '@/contexts/RoleContext';
import { DataProviderDashboard } from '@/components/data-provider/DataProviderDashboard';
import { AuditorDashboard } from '@/components/auditor/AuditorDashboard';
import { DataConsumerInterface } from '@/components/DataConsumerInterface';

export default function DashboardClient() {
  const { isConnected, address } = useAccount();
  const { currentRole, getRoleDisplayName, getRoleIcon } = useRole();
  const [activeTab, setActiveTab] = useState<'upload' | 'mydata' | 'compute'>('upload');

  const renderRoleDashboard = () => {
    switch (currentRole) {
      case 'data-provider':
        return <DataProviderDashboard />
      case 'data-consumer':
        return <DataConsumerInterface />
      case 'auditor':
        return (
          <AuditorDashboard 
            onAuditComplete={() => {}}
            onViewDetails={() => {}}
            className=""
          />
        )
      default:
        return <DataProviderDashboard />
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-4xl mx-auto pt-8 sm:pt-20 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-8 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">SMPC Protocol Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Connect your wallet to access the decentralized data trading platform
              </p>
            </div>
            
            <WalletConnector />
            
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Upload Private Data</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Securely encrypt and register your datasets</p>
                </div>
                
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Privacy Computing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Run computations on encrypted data</p>
                </div>
                
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Earn Revenue</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monetize your data while preserving privacy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Role-Specific Dashboard Content */}
      {renderRoleDashboard()}
    </div>
  );
}