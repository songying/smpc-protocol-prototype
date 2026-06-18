'use client';

import React, { useState, useEffect } from 'react';
import { useContractEvents } from '../lib/contracts/hooks';
import { formatEther } from '../lib/contracts/index';

interface ContractEvent {
  type: string;
  data: any;
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
}

interface EventFilters {
  eventTypes: string[];
  timeRange: '1h' | '24h' | '7d' | 'all';
  showOnlyMyEvents: boolean;
}

export const EventMonitor: React.FC = () => {
  const { events, isListening, startListening, stopListening, clearEvents } = useContractEvents();
  const [filteredEvents, setFilteredEvents] = useState<ContractEvent[]>([]);
  const [filters, setFilters] = useState<EventFilters>({
    eventTypes: [],
    timeRange: '24h',
    showOnlyMyEvents: false
  });
  const [currentAccount, setCurrentAccount] = useState<string>('');

  // Available event types
  const eventTypes = [
    'DataRegistered',
    'DataUpdated',
    'RequestSubmitted',
    'RequestApproved',
    'ComputingCompleted',
    'FeesCalculated',
    'FeesDistributed',
    'ApprovalRequestCreated',
    'ApprovalGiven',
    'PrivacyPolicyCreated',
    'PrivacyPolicyAcknowledged'
  ];

  // Get current account
  useEffect(() => {
    const getCurrentAccount = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setCurrentAccount(accounts[0]);
          }
        } catch (error) {
          console.error('Failed to get current account:', error);
        }
      }
    };

    getCurrentAccount();
  }, []);

  // Filter events based on current filters
  useEffect(() => {
    let filtered = [...events];

    // Filter by event type
    if (filters.eventTypes.length > 0) {
      filtered = filtered.filter(event => filters.eventTypes.includes(event.type));
    }

    // Filter by time range
    const now = Date.now();
    const timeFilters = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };
    
    if (filters.timeRange !== 'all') {
      const cutoffTime = now - timeFilters[filters.timeRange];
      filtered = filtered.filter(event => event.timestamp > cutoffTime);
    }

    // Filter by user events
    if (filters.showOnlyMyEvents && currentAccount) {
      filtered = filtered.filter(event => {
        // Check if the event involves the current user
        const eventData = event.data;
        return (
          eventData.provider === currentAccount ||
          eventData.consumer === currentAccount ||
          eventData.user === currentAccount ||
          eventData.requester === currentAccount ||
          eventData.dataSubject === currentAccount
        );
      });
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    setFilteredEvents(filtered);
  }, [events, filters, currentAccount]);

  const handleEventTypeToggle = (eventType: string) => {
    setFilters(prev => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(eventType)
        ? prev.eventTypes.filter(type => type !== eventType)
        : [...prev.eventTypes, eventType]
    }));
  };

  const getEventIcon = (eventType: string) => {
    const icons = {
      DataRegistered: '📊',
      DataUpdated: '📝',
      RequestSubmitted: '📋',
      RequestApproved: '✅',
      ComputingCompleted: '⚡',
      FeesCalculated: '💰',
      FeesDistributed: '💸',
      ApprovalRequestCreated: '🔐',
      ApprovalGiven: '🎯',
      PrivacyPolicyCreated: '📜',
      PrivacyPolicyAcknowledged: '✍️'
    };
    return icons[eventType as keyof typeof icons] || '📡';
  };

  const getEventColor = (eventType: string) => {
    const colors = {
      DataRegistered: 'bg-blue-100 text-blue-800',
      DataUpdated: 'bg-indigo-100 text-indigo-800',
      RequestSubmitted: 'bg-yellow-100 text-yellow-800',
      RequestApproved: 'bg-green-100 text-green-800',
      ComputingCompleted: 'bg-purple-100 text-purple-800',
      FeesCalculated: 'bg-orange-100 text-orange-800',
      FeesDistributed: 'bg-emerald-100 text-emerald-800',
      ApprovalRequestCreated: 'bg-red-100 text-red-800',
      ApprovalGiven: 'bg-teal-100 text-teal-800',
      PrivacyPolicyCreated: 'bg-gray-100 text-gray-800',
      PrivacyPolicyAcknowledged: 'bg-cyan-100 text-cyan-800'
    };
    return colors[eventType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatEventData = (event: ContractEvent) => {
    const { type, data } = event;
    
    switch (type) {
      case 'DataRegistered':
        return {
          title: 'New Data Registered',
          details: [
            `Provider: ${data.provider?.slice(0, 6)}...${data.provider?.slice(-4)}`,
            `Data Hash: ${data.dataHash?.slice(0, 10)}...`,
            `Price: ${data.price ? formatEther(data.price) : 'N/A'} ETH`
          ]
        };
      
      case 'RequestSubmitted':
        return {
          title: 'Computing Request Submitted',
          details: [
            `Consumer: ${data.consumer?.slice(0, 6)}...${data.consumer?.slice(-4)}`,
            `Request ID: ${data.requestId || 'N/A'}`,
            `Budget: ${data.budget ? formatEther(data.budget) : 'N/A'} ETH`
          ]
        };
      
      case 'ComputingCompleted':
        return {
          title: 'Computing Completed',
          details: [
            `Request ID: ${data.requestId || 'N/A'}`,
            `Provider: ${data.provider?.slice(0, 6)}...${data.provider?.slice(-4)}`,
            `Result Available: Yes`
          ]
        };
      
      case 'FeesDistributed':
        return {
          title: 'Fees Distributed',
          details: [
            `Total Amount: ${data.totalAmount ? formatEther(data.totalAmount) : 'N/A'} ETH`,
            `Platform Fee: ${data.platformFee ? formatEther(data.platformFee) : 'N/A'} ETH`,
            `Provider Fee: ${data.providerFee ? formatEther(data.providerFee) : 'N/A'} ETH`
          ]
        };
      
      case 'ApprovalGiven':
        return {
          title: 'Approval Given',
          details: [
            `Request ID: ${data.requestId || 'N/A'}`,
            `Approver: ${data.approver?.slice(0, 6)}...${data.approver?.slice(-4)}`,
            `Data Hash: ${data.dataHash?.slice(0, 10)}...`
          ]
        };
      
      default:
        return {
          title: type,
          details: [
            `Event Type: ${type}`,
            `Block: ${data.blockNumber || 'N/A'}`,
            `Transaction: ${data.transactionHash?.slice(0, 10)}...`
          ]
        };
    }
  };

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Real-time Event Monitor</h1>
        <p className="text-gray-600">Monitor smart contract events across the SMPC protocol</p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              {isListening ? 'Connected - Monitoring Events' : 'Disconnected'}
            </span>
            <span className="text-sm text-gray-600">
              ({filteredEvents.length} events)
            </span>
          </div>
          <div className="flex space-x-2">
            {!isListening ? (
              <button
                onClick={startListening}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Start Monitoring
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Stop Monitoring
              </button>
            )}
            <button
              onClick={clearEvents}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Events
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        
        <div className="space-y-4">
          {/* Event Type Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Types</label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map(eventType => (
                <button
                  key={eventType}
                  onClick={() => handleEventTypeToggle(eventType)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    filters.eventTypes.includes(eventType)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {getEventIcon(eventType)} {eventType}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range and User Filter */}
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showOnlyMyEvents}
                  onChange={(e) => setFilters(prev => ({ ...prev, showOnlyMyEvents: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Show only my events</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Events Feed</h2>
        
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📡</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">
              {isListening 
                ? 'Waiting for new events to appear...' 
                : 'Start monitoring to see real-time events'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => {
              const formatted = formatEventData(event);
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{getEventIcon(event.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{formatted.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventColor(event.type)}`}>
                            {event.type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {formatted.details.map((detail, idx) => (
                            <div key={idx}>{detail}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{new Date(event.timestamp).toLocaleTimeString()}</div>
                      <div>{new Date(event.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statistics */}
      {filteredEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Event Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {eventTypes
              .filter(type => filteredEvents.some(event => event.type === type))
              .map(type => {
                const count = filteredEvents.filter(event => event.type === type).length;
                return (
                  <div key={type} className="text-center">
                    <div className="text-2xl mb-1">{getEventIcon(type)}</div>
                    <div className="text-lg font-semibold">{count}</div>
                    <div className="text-xs text-gray-600">{type}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};