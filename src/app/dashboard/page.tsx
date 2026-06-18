'use client';

import dynamic from 'next/dynamic';

// Dynamically import the dashboard client component with SSR disabled
const DashboardClient = dynamic(() => import('@/components/DashboardClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Dashboard...</span>
      </div>
    </div>
  )
});

export default function DashboardPage() {
  return <DashboardClient />;
}