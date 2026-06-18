'use client';

import React, { useState, useEffect } from 'react';
import { 
  useDataRegistry, 
  useComputingRequest, 
  useFeeManagement, 
  useApprovalManager,
  usePrivacyCompliance
} from '../lib/contracts/hooks';
import { formatEther } from '../lib/contracts/index';

interface DataSearchFilters {
  category: number | null;
  maxPrice: string;
  tags: string;
  onlyEncrypted: boolean;
}

interface ComputingRequestForm {
  selectedDataHashes: string[];
  computingScript: string;
  selectedAlgorithm: string | null;
  budget: string;
  description: string;
}

interface DataAsset {
  dataHash: string;
  provider: string;
  metadataURI: string;
  price: bigint;
  category: number;
  tags: string[];
  isEncrypted: boolean;
  dataSize: bigint;
  status: number;
  accessCount: bigint;
  createdAt: bigint;
  updatedAt: bigint;
  // Additional fields for sample data
  id?: string;
  name?: string;
  description?: string;
  schema?: string;
  totalRecords?: number;
}

interface Algorithm {
  id: string;
  name: string;
  description: string;
  computationType: 'third_party' | 'zk' | 'fhe';
  status: 'pending' | 'approved' | 'rejected';
  authorAddress: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  version?: string;
  tags?: string[];
  executionCount?: number;
  lastExecuted?: string;
  sourceCode?: string;
}

export const DataConsumerInterface: React.FC = () => {
  const { 
    getDataEntry,
    isConnected 
  } = useDataRegistry();
  
  const { 
    createRequest, 
    getConsumerRequests, 
    getRequest,
    isLoading: requestLoading,
    error: requestError
  } = useComputingRequest();
  
  const { 
    calculateFees,
    getUserBalance 
  } = useFeeManagement();
  
  const { 
    createApprovalRequest
  } = useApprovalManager();

  const {
    acknowledgePrivacyPolicy,
    submitDataSubjectRequest,
    isLoading: privacyLoading
  } = usePrivacyCompliance();

  const [activeTab, setActiveTab] = useState<'discover' | 'request' | 'my-requests' | 'privacy'>('discover');
  const [searchFilters, setSearchFilters] = useState<DataSearchFilters>({
    category: null,
    maxPrice: '',
    tags: '',
    onlyEncrypted: false
  });
  
  const [availableData, setAvailableData] = useState<DataAsset[]>([]);
  const [availableAlgorithms, setAvailableAlgorithms] = useState<Algorithm[]>([]);
  const [isLoadingAlgorithmCode, setIsLoadingAlgorithmCode] = useState(false);
  const [computingForm, setComputingForm] = useState<ComputingRequestForm>({
    selectedDataHashes: [],
    computingScript: '',
    selectedAlgorithm: null,
    budget: '',
    description: ''
  });
  
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [estimatedFees, setEstimatedFees] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Category options
  const categories = [
    { value: 0, label: 'Personal' },
    { value: 1, label: 'Financial' },
    { value: 2, label: 'Health' },
    { value: 3, label: 'Location' },
    { value: 4, label: 'Social' },
    { value: 5, label: 'Behavioral' }
  ];

  // Request status labels
  const requestStatusLabels = {
    0: 'Pending',
    1: 'Approved',
    2: 'Assigned',
    3: 'Completed',
    4: 'Cancelled'
  };

  const requestStatusColors = {
    0: 'bg-yellow-100 text-yellow-800',
    1: 'bg-blue-100 text-blue-800',
    2: 'bg-purple-100 text-purple-800',
    3: 'bg-green-100 text-green-800',
    4: 'bg-red-100 text-red-800'
  };

  // Sample computing scripts
  const scriptTemplates = [
    {
      name: 'Statistical Analysis',
      script: `def analyze_data(data):
    return {
        'mean': np.mean(data),
        'std': np.std(data),
        'count': len(data)
    }`
    },
    {
      name: 'Privacy-Preserving Aggregation',
      script: `def secure_aggregate(data_sources):
    aggregated = []
    for data in data_sources:
        # Apply differential privacy
        noise = np.random.laplace(0, sensitivity/epsilon)
        aggregated.append(np.sum(data) + noise)
    return aggregated`
    },
    {
      name: 'Machine Learning Training',
      script: `def federated_learning(data):
    model = initialize_model()
    for epoch in range(epochs):
        local_gradients = compute_gradients(model, data)
        # Secure aggregation would happen here
    return model_weights`
    }
  ];

  useEffect(() => {
    if (isConnected) {
      loadUserData();
      loadAvailableData();
      loadAvailableAlgorithms();
    }
  }, [isConnected]);

  // Reload data when search filters change
  useEffect(() => {
    if (isConnected) {
      loadAvailableData();
    }
  }, [searchFilters, isConnected]);

  // Update fee estimation when budget changes
  useEffect(() => {
    if (computingForm.budget && parseFloat(computingForm.budget) > 0) {
      estimateFees();
    }
  }, [computingForm.budget]);

  const loadUserData = async () => {
    if (!isConnected) return;
    
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const balance = await getUserBalance(accounts[0]);
          setUserBalance(balance);
          
          const requestIds = await getConsumerRequests(accounts[0]);
          const requests = await Promise.all(
            requestIds.map(async (id) => await getRequest(id))
          );
          setUserRequests(requests.filter(Boolean));
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadAvailableData = async () => {
    setIsLoadingData(true);
    try {
      // Load sample data from JSON files - Enhanced with actual data from files
      const sampleDataSources = [
        // Default user's personal datasets
        {
          id: 'user-health-schema-doc',
          name: 'My Health Schema Documentation',
          description: 'Personal comprehensive health screening data schema based on medical examination reports',
          schema: 'health_screening_v1',
          totalRecords: 1000,
          category: 2, // Health
          tags: ['health', 'screening', 'medical', 'comprehensive', 'personal'],
          price: BigInt('0'), // Free for own data
          dataSize: BigInt('2048000'), // ~2MB
          provider: 'current_user', // Default user's own data
          dataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          metadataURI: 'ipfs://QmUserHealthSchemaDoc',
          isEncrypted: false, // User's own data
          status: 1,
          accessCount: BigInt('0'),
          createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400),
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        },
        {
          id: 'user-public-health-sample',
          name: 'My Public Health Sample - Joseph Jones',
          description: 'Personal health screening sample data for Joseph Jones (Age: 62, Male) - Own dataset',
          schema: 'health_screening_v1',
          totalRecords: 1,
          category: 2, // Health
          tags: ['health', 'public', 'sample', 'personal', 'joseph-jones', 'male', 'elderly', 'diabetes-risk'],
          price: BigInt('0'), // Free for own data
          dataSize: BigInt('4096'), // ~4KB
          provider: 'current_user', // Default user's own data
          dataHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
          metadataURI: 'ipfs://QmUserPublicHealthSample',
          isEncrypted: false,
          status: 1,
          accessCount: BigInt('0'),
          createdAt: BigInt(Math.floor(Date.now() / 1000) - 259200),
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        },
        {
          id: 'user-synthetic-health-records',
          name: 'My Synthetic Health Records Collection',
          description: 'Personal collection of synthetic health records including Linda Rodriguez and others - anonymized for research',
          schema: 'health_screening_v1',
          totalRecords: 100,
          category: 2, // Health
          tags: ['health', 'synthetic', 'anonymized', 'personal', 'research', 'linda-rodriguez', 'female'],
          price: BigInt('0'), // Free for own data
          dataSize: BigInt('2300000'), // ~2.3MB
          provider: 'current_user', // Default user's own data
          dataHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          metadataURI: 'ipfs://QmUserSyntheticHealthRecords',
          isEncrypted: false,
          status: 1,
          accessCount: BigInt('0'),
          createdAt: BigInt(Math.floor(Date.now() / 1000) - 172800),
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        },
        // Available marketplace datasets from other providers
        {
          id: 'marketplace-health-schema-doc',
          name: 'Premium Health Screening Schema',
          description: 'Professional comprehensive health screening data schema from certified medical providers',
          schema: 'health_screening_v1',
          totalRecords: 5000,
          category: 2, // Health
          tags: ['health', 'screening', 'medical', 'premium', 'certified'],
          price: BigInt('500000000000000000'), // 0.5 ETH
          dataSize: BigInt('10240000'), // ~10MB
          provider: '0x9DC00F109AcfBA2622f0fE48a522558fA4f1D509',
          dataHash: '0x1111567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          metadataURI: 'ipfs://QmMarketplaceHealthSchemaDoc',
          isEncrypted: true,
          status: 1,
          accessCount: BigInt('125'),
          createdAt: BigInt(Math.floor(Date.now() / 1000) - 604800), // 1 week ago
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        },
        {
          id: 'marketplace-synthetic-health-records',
          name: 'Large Scale Synthetic Health Dataset',
          description: 'Comprehensive anonymized synthetic health records for large-scale research and ML training',
          schema: 'health_screening_v1',
          totalRecords: 10000,
          category: 2, // Health
          tags: ['health', 'synthetic', 'large-scale', 'ml-training', 'research'],
          price: BigInt('1500000000000000000'), // 1.5 ETH
          dataSize: BigInt('50000000'), // ~50MB
          provider: '0x742d35Cc6634C0532925a3b8D23B32C8aeB0Ab3f',
          dataHash: '0x2222ef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          metadataURI: 'ipfs://QmMarketplaceLargeSyntheticHealth',
          isEncrypted: true,
          status: 1,
          accessCount: BigInt('67'),
          createdAt: BigInt(Math.floor(Date.now() / 1000) - 1209600), // 2 weeks ago
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        },
        {
          id: 'marketplace-public-health-sample',
          name: 'Community Health Sample Dataset',
          description: 'Public health screening samples from community health initiatives',
          schema: 'health_screening_v1',
          totalRecords: 50,
          category: 2, // Health
          tags: ['health', 'public', 'community', 'initiative'],
          price: BigInt('200000000000000000'), // 0.2 ETH
          dataSize: BigInt('204800'), // ~200KB
          provider: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          dataHash: '0x3333543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
          metadataURI: 'ipfs://QmMarketplacePublicHealthSample',
          isEncrypted: false,
          status: 1,
          accessCount: BigInt('245'),
          createdAt: BigInt(Math.floor(Date.now() / 1000) - 432000), // 5 days ago
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        }
      ];

      // Filter based on search criteria
      let filteredData = sampleDataSources.filter(data => {
        if (searchFilters.category !== null && data.category !== searchFilters.category) {
          return false;
        }
        if (searchFilters.maxPrice && parseFloat(formatEther(data.price)) > parseFloat(searchFilters.maxPrice)) {
          return false;
        }
        if (searchFilters.tags && !data.tags.some(tag => 
          tag.toLowerCase().includes(searchFilters.tags.toLowerCase())
        )) {
          return false;
        }
        if (searchFilters.onlyEncrypted && !data.isEncrypted) {
          return false;
        }
        return true;
      });

      setAvailableData(filteredData as DataAsset[]);
    } catch (error) {
      console.error('Failed to load available data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAlgorithmCode = async (algorithmId: string): Promise<string | null> => {
    setIsLoadingAlgorithmCode(true);
    try {
      // First try to get from cache if algorithm already has source code
      const cachedAlgorithm = availableAlgorithms.find(a => a.id === algorithmId);
      if (cachedAlgorithm?.sourceCode) {
        return cachedAlgorithm.sourceCode;
      }

      // Try to fetch from API
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const userAddress = accounts[0];
          
          try {
            const response = await fetch(`/api/algorithms/${algorithmId}/code`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userAddress}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              return data.sourceCode || null;
            }
          } catch (error) {
            console.warn('Failed to fetch algorithm code from API:', error);
          }
        }
      }

      // Fallback to sample source code based on algorithm ID
      const sampleCodes: Record<string, string> = {
        'algo_1': `# Linear Regression Analysis
# Performs linear regression on encrypted health data

import numpy as np
from sklearn.linear_model import LinearRegression
from cryptography.fernet import Fernet

def compute(encrypted_data):
    """Perform linear regression on health data"""
    # Decrypt the health data
    decrypted_data = decrypt_health_data(encrypted_data)
    
    # Extract features and target variables
    X = decrypted_data[['age', 'bmi', 'blood_pressure', 'cholesterol']]
    y = decrypted_data['cardiovascular_risk']
    
    # Create and train linear regression model
    model = LinearRegression()
    model.fit(X, y)
    
    # Calculate predictions and metrics
    predictions = model.predict(X)
    coefficients = model.coef_
    intercept = model.intercept_
    
    # Return encrypted results
    results = {
        'coefficients': coefficients.tolist(),
        'intercept': float(intercept),
        'predictions': predictions.tolist(),
        'r_squared': model.score(X, y)
    }
    
    return encrypt_results(results)

def decrypt_health_data(encrypted_data):
    """Decrypt health data for processing"""
    # Implementation for secure data decryption
    pass

def encrypt_results(results):
    """Encrypt computation results"""
    # Implementation for secure result encryption
    pass`,
        'algo_2': `// Privacy-Preserving Clustering
// Zero-knowledge clustering algorithm for patient segmentation

const { buildPoseidon } = require("circomlib");
const snarkjs = require("snarkjs");

async function compute(healthDataProofs) {
    // Initialize zero-knowledge clustering circuit
    const poseidon = await buildPoseidon();
    
    // Extract health features while preserving privacy
    const features = await extractPrivateFeatures(healthDataProofs);
    
    // Perform k-means clustering with ZK proofs
    const k = 3; // Number of clusters
    const clusters = await zkKMeansClustering(features, k, poseidon);
    
    // Generate cluster assignments with zero-knowledge proofs
    const assignments = await generateClusterAssignments(clusters, features);
    
    // Create privacy-preserving results
    const results = {
        clusterCenters: clusters.map(center => hashFeatures(center, poseidon)),
        assignments: assignments,
        privacyProof: await generatePrivacyProof(clusters, assignments)
    };
    
    return results;
}

async function extractPrivateFeatures(healthDataProofs) {
    // Extract features from ZK proofs without revealing raw data
    const features = [];
    
    for (const proof of healthDataProofs) {
        const privateFeatures = await snarkjs.groth16.verify(
            verificationKey,
            proof.publicSignals,
            proof.proof
        );
        
        if (privateFeatures) {
            features.push(proof.publicSignals);
        }
    }
    
    return features;
}

async function zkKMeansClustering(features, k, poseidon) {
    // Implement k-means clustering with zero-knowledge constraints
    const clusters = initializeClusters(k);
    
    for (let iteration = 0; iteration < 10; iteration++) {
        // Update cluster centers using ZK-friendly operations
        for (let i = 0; i < k; i++) {
            clusters[i] = await updateClusterCenter(clusters[i], features, poseidon);
        }
    }
    
    return clusters;
}

function hashFeatures(features, poseidon) {
    return poseidon(features).toString();
}`,
        'algo_4': `# Secure Aggregation Protocol
# Multi-party secure aggregation for statistical analysis

from typing import List, Dict, Any
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import numpy as np

def compute(participant_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Perform secure multi-party aggregation using FHE"""
    
    # Initialize FHE parameters
    fhe_params = initialize_fhe_parameters()
    
    # Encrypt each participant's data
    encrypted_data = []
    for participant in participant_data:
        encrypted_values = encrypt_participant_data(participant, fhe_params)
        encrypted_data.append(encrypted_values)
    
    # Perform homomorphic aggregation
    aggregated_results = homomorphic_aggregation(encrypted_data, fhe_params)
    
    # Decrypt final results
    final_results = decrypt_aggregated_results(aggregated_results, fhe_params)
    
    return {
        'total_participants': len(participant_data),
        'aggregated_statistics': final_results,
        'privacy_preserved': True
    }

def initialize_fhe_parameters():
    """Initialize Fully Homomorphic Encryption parameters"""
    return {
        'polynomial_modulus_degree': 4096,
        'coefficient_modulus': [40, 30, 30, 40],
        'plain_modulus': 1024
    }

def encrypt_participant_data(participant_data, fhe_params):
    """Encrypt individual participant data using FHE"""
    encrypted_values = {}
    
    for key, value in participant_data.items():
        if isinstance(value, (int, float)):
            # Encrypt numerical values
            encrypted_values[key] = fhe_encrypt(value, fhe_params)
        elif isinstance(value, list):
            # Encrypt arrays of values
            encrypted_values[key] = [fhe_encrypt(v, fhe_params) for v in value]
    
    return encrypted_values

def homomorphic_aggregation(encrypted_data, fhe_params):
    """Perform aggregation on encrypted data"""
    # Initialize aggregation containers
    aggregated = {}
    
    # Sum encrypted values across all participants
    for participant_data in encrypted_data:
        for key, encrypted_values in participant_data.items():
            if key not in aggregated:
                aggregated[key] = encrypted_values
            else:
                # Homomorphic addition
                if isinstance(encrypted_values, list):
                    for i, val in enumerate(encrypted_values):
                        aggregated[key][i] = fhe_add(aggregated[key][i], val)
                else:
                    aggregated[key] = fhe_add(aggregated[key], encrypted_values)
    
    return aggregated

def fhe_encrypt(value, params):
    """FHE encryption function"""
    # Simplified FHE encryption
    return {'encrypted_value': value, 'params': params}

def fhe_add(a, b):
    """Homomorphic addition"""
    return {
        'encrypted_value': a['encrypted_value'] + b['encrypted_value'],
        'params': a['params']
    }

def decrypt_aggregated_results(aggregated, fhe_params):
    """Decrypt the final aggregated results"""
    results = {}
    
    for key, encrypted_value in aggregated.items():
        if isinstance(encrypted_value, list):
            results[key] = [fhe_decrypt(v) for v in encrypted_value]
        else:
            results[key] = fhe_decrypt(encrypted_value)
    
    return results

def fhe_decrypt(encrypted_value):
    """FHE decryption function"""
    return encrypted_value['encrypted_value']`,
        'fallback-1': `def compute(data):
    """Simple linear regression computation"""
    import numpy as np
    
    # Extract features
    X = np.array([[row['age'], row['bmi']] for row in data])
    y = np.array([row['risk_score'] for row in data])
    
    # Calculate linear regression
    X_mean = np.mean(X, axis=0)
    y_mean = np.mean(y)
    
    # Calculate coefficients
    numerator = np.sum((X - X_mean) * (y - y_mean).reshape(-1, 1))
    denominator = np.sum((X - X_mean) ** 2)
    
    coefficients = numerator / denominator
    intercept = y_mean - np.sum(coefficients * X_mean)
    
    return {
        'coefficients': coefficients.tolist(),
        'intercept': float(intercept)
    }`,
        'fallback-2': `def compute(data):
    """Privacy-preserving clustering"""
    import numpy as np
    from sklearn.cluster import KMeans
    
    # Extract features for clustering
    features = np.array([[row['age'], row['bmi'], row['blood_pressure']] for row in data])
    
    # Apply k-means clustering
    kmeans = KMeans(n_clusters=3, random_state=42)
    cluster_labels = kmeans.fit_predict(features)
    
    # Return cluster assignments (privacy-preserved)
    return {
        'cluster_centers': kmeans.cluster_centers_.tolist(),
        'labels': cluster_labels.tolist(),
        'n_clusters': 3
    }`
      };

      return sampleCodes[algorithmId] || null;
    } catch (error) {
      console.error('Failed to load algorithm code:', error);
      return null;
    } finally {
      setIsLoadingAlgorithmCode(false);
    }
  };

  const loadAvailableAlgorithms = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const userAddress = accounts[0];
          
          // Fetch approved algorithms from the API
          const response = await fetch('/api/algorithms?status=approved', {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userAddress}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setAvailableAlgorithms(data.algorithms || []);
          } else {
            console.warn('Failed to fetch algorithms from API, using fallback data');
            // Fallback to the same algorithms shown in AlgorithmManagementDashboard
            setAvailableAlgorithms([
              {
                id: 'algo_1',
                name: 'Linear Regression Analysis',
                description: 'Performs linear regression on encrypted health data',
                computationType: 'third_party',
                status: 'approved',
                authorAddress: userAddress,
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
                status: 'approved',
                authorAddress: userAddress,
                isPublic: true,
                createdAt: '2024-01-18T16:45:00Z',
                updatedAt: '2024-01-18T16:45:00Z',
                version: '1.0.0',
                tags: ['clustering', 'zk-proof', 'privacy'],
                executionCount: 12
              },
              {
                id: 'algo_4',
                name: 'Secure Aggregation Protocol',
                description: 'Multi-party secure aggregation for statistical analysis',
                computationType: 'fhe',
                status: 'approved',
                authorAddress: userAddress,
                isPublic: true,
                createdAt: '2024-01-20T12:30:00Z',
                updatedAt: '2024-01-21T09:15:00Z',
                version: '2.1.0',
                tags: ['aggregation', 'fhe', 'multi-party'],
                executionCount: 28,
                lastExecuted: '2024-01-22T16:40:00Z'
              }
            ]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load available algorithms:', error);
      // Provide basic fallback algorithms if everything fails
      setAvailableAlgorithms([
        {
          id: 'fallback-1',
          name: 'Linear Regression Analysis',
          description: 'Standard linear regression analysis',
          computationType: 'third_party',
          status: 'approved',
          authorAddress: '0x000',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'fallback-2', 
          name: 'Privacy-Preserving Clustering',
          description: 'Clustering with privacy preservation',
          computationType: 'zk',
          status: 'approved',
          authorAddress: '0x000',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    }
  };

  const estimateFees = async () => {
    try {
      const fees = await calculateFees(computingForm.budget);
      setEstimatedFees(fees);
    } catch (error) {
      console.error('Failed to estimate fees:', error);
    }
  };

  const handleDataSelection = (dataHash: string, selected: boolean) => {
    setComputingForm(prev => ({
      ...prev,
      selectedDataHashes: selected
        ? [...prev.selectedDataHashes, dataHash]
        : prev.selectedDataHashes.filter(hash => hash !== dataHash)
    }));
  };

  const handleScriptTemplate = (script: string) => {
    setComputingForm(prev => ({ ...prev, computingScript: script }));
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (computingForm.selectedDataHashes.length === 0) {
      alert('Please select at least one data source');
      return;
    }

    if (!computingForm.selectedAlgorithm && !computingForm.computingScript.trim()) {
      alert('Please either select an algorithm or provide a custom computing script');
      return;
    }

    try {
      // First, submit approval requests for all selected data
      for (const dataHash of computingForm.selectedDataHashes) {
        try {
          await createApprovalRequest(
            0, // DataAccess type
            dataHash,
            `Access request for computing: ${computingForm.description || 'Data analysis'}`,
            JSON.stringify({ purpose: 'computing', retention: '90days', budget: computingForm.budget })
          );
        } catch (approvalError: any) {
          console.warn(`Failed to submit approval request for ${dataHash}:`, approvalError);
          // Continue with other data sources even if one fails
        }
      }

      // Then submit the computing request
      const scriptToUse = computingForm.selectedAlgorithm 
        ? `algorithm:${computingForm.selectedAlgorithm}` 
        : computingForm.computingScript;
        
      await createRequest(
        computingForm.selectedDataHashes,
        scriptToUse,
        computingForm.budget
      );

      alert('Computing request and data access requests submitted successfully!');
      
      // Navigate to My Requests tab to see the submitted request
      setActiveTab('my-requests');

      // Reset form
      setComputingForm({
        selectedDataHashes: [],
        computingScript: '',
        selectedAlgorithm: null,
        budget: '',
        description: ''
      });

      // Reload user requests
      await loadUserData();
      
      alert('Computing request submitted successfully!');
      setActiveTab('my-requests');
    } catch (error: any) {
      alert(`Failed to submit request: ${error.message}`);
    }
  };

  const handleRequestAccess = (dataHash: string) => {
    // Add data to computing form if not already selected
    if (!computingForm.selectedDataHashes.includes(dataHash)) {
      setComputingForm(prev => ({
        ...prev,
        selectedDataHashes: [...prev.selectedDataHashes, dataHash]
      }));
    }
    
    // Navigate to Create Request tab
    setActiveTab('request');
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Wallet Not Connected</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to discover and request data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Data Consumer Interface</h1>
        <p className="text-gray-600 dark:text-gray-400">Discover, request, and process data through secure multi-party computation</p>
      </div>

      {/* User Balance Display */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Available Balance</div>
            <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">{formatEther(userBalance)} ETH</div>
          </div>
          <div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Active Requests</div>
            <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">{userRequests.length}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'discover', label: 'Discover Data' },
            { id: 'request', label: 'Create Request' },
            { id: 'my-requests', label: 'My Requests' },
            { id: 'privacy', label: 'Privacy Center' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Discover Data Tab */}
      {activeTab === 'discover' && (
        <div className="space-y-6">
          {/* Search Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Search Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={searchFilters.category || ''}
                  onChange={(e) => setSearchFilters(prev => ({ 
                    ...prev, 
                    category: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Price (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  value={searchFilters.maxPrice}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder="1.0"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                <input
                  type="text"
                  value={searchFilters.tags}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="health, finance"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={searchFilters.onlyEncrypted}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, onlyEncrypted: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-300">Only encrypted data</span>
                </label>
              </div>
            </div>
          </div>

          {/* Available Data */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Available Data Assets</h2>
              <button
                onClick={loadAvailableData}
                disabled={isLoadingData}
                className="bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {isLoadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {availableData.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-600 dark:text-gray-400">No data assets found matching your criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableData.map((data) => (
                  <div key={data.dataHash} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <div className="mb-3">
                      <div className="text-lg font-medium text-gray-900 dark:text-white">
                        {data.name || `${categories.find(c => c.value === data.category)?.label} Data`}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {data.description || 'No description available'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Provider: {data.provider.slice(0, 6)}...{data.provider.slice(-4)}
                      </div>
                      {data.schema && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Schema: {data.schema}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Price:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatEther(data.price)} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Size:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {Number(data.dataSize) > 1024 * 1024 
                            ? `${(Number(data.dataSize) / (1024 * 1024)).toFixed(1)} MB`
                            : Number(data.dataSize) > 1024
                            ? `${(Number(data.dataSize) / 1024).toFixed(1)} KB` 
                            : `${data.dataSize.toString()} bytes`}
                        </span>
                      </div>
                      {data.totalRecords && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Records:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{data.totalRecords.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Access Count:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{data.accessCount.toString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Privacy:</span>
                        <span className={`font-medium ${data.isEncrypted ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {data.isEncrypted ? 'Encrypted' : 'Public'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tags</div>
                      <div className="flex flex-wrap gap-1">
                        {data.tags.map((tag, index) => (
                          <span key={index} className="bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDataSelection(data.dataHash, !computingForm.selectedDataHashes.includes(data.dataHash))}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                          computingForm.selectedDataHashes.includes(data.dataHash)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                      >
                        {computingForm.selectedDataHashes.includes(data.dataHash) ? 'Selected' : 'Select'}
                      </button>
                      <button
                        onClick={() => handleRequestAccess(data.dataHash)}
                        className="py-2 px-3 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Request Access
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Request Tab */}
      {activeTab === 'request' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create Computing Request</h2>
          
          <form onSubmit={handleRequestSubmit} className="space-y-6">
            {/* Selected Data Sources */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selected Data Sources ({computingForm.selectedDataHashes.length})
              </label>
              {computingForm.selectedDataHashes.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No data sources selected</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Go to Discover tab to select data
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {computingForm.selectedDataHashes.map((hash, index) => (
                    <div key={hash} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">{hash.slice(0, 20)}...{hash.slice(-10)}</span>
                      <button
                        type="button"
                        onClick={() => handleDataSelection(hash, false)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Algorithm Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Computation Method
              </label>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="computationMethod"
                      checked={!computingForm.selectedAlgorithm}
                      onChange={() => setComputingForm(prev => ({ ...prev, selectedAlgorithm: null }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">Custom Script</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="computationMethod"
                      checked={!!computingForm.selectedAlgorithm}
                      onChange={() => {
                        if (availableAlgorithms.length > 0) {
                          setComputingForm(prev => ({ 
                            ...prev, 
                            selectedAlgorithm: availableAlgorithms[0].id,
                            computingScript: ''
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">Pre-approved Algorithm</span>
                  </label>
                </div>

                {/* Algorithm Selection Dropdown */}
                {computingForm.selectedAlgorithm !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Algorithm
                      </label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {availableAlgorithms.length} approved algorithms available
                      </span>
                    </div>
                    <select
                      value={computingForm.selectedAlgorithm || ''}
                      onChange={(e) => setComputingForm(prev => ({ ...prev, selectedAlgorithm: e.target.value || null }))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Choose an algorithm...</option>
                      {availableAlgorithms.map(algo => (
                        <option key={algo.id} value={algo.id}>
                          {algo.name} - {algo.computationType.toUpperCase()}{algo.version ? ` v${algo.version}` : ''}
                        </option>
                      ))}
                    </select>
                    {computingForm.selectedAlgorithm && (
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
                        {(() => {
                          const selectedAlgo = availableAlgorithms.find(a => a.id === computingForm.selectedAlgorithm);
                          return selectedAlgo ? (
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                    {selectedAlgo.name}
                                    {selectedAlgo.version && (
                                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                        v{selectedAlgo.version}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    {selectedAlgo.description}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {selectedAlgo.isPublic && (
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                                      Public
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    selectedAlgo.computationType === 'zk' 
                                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                      : selectedAlgo.computationType === 'fhe'
                                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                      : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                                  }`}>
                                    {selectedAlgo.computationType.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              
                              {selectedAlgo.tags && selectedAlgo.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {selectedAlgo.tags.map((tag, index) => (
                                    <span key={index} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex space-x-4">
                                  {typeof selectedAlgo.executionCount !== 'undefined' && (
                                    <span>
                                      <span className="font-medium">{selectedAlgo.executionCount}</span> executions
                                    </span>
                                  )}
                                  {selectedAlgo.lastExecuted && (
                                    <span>
                                      Last used: {new Date(selectedAlgo.lastExecuted).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  Created: {new Date(selectedAlgo.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Computing Script Section - Always Visible */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Computing Script
                    </label>
                    {isLoadingAlgorithmCode && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Loading algorithm code...
                      </span>
                    )}
                    {computingForm.selectedAlgorithm && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Algorithm code loaded
                      </span>
                    )}
                  </div>
                  
                  {/* Script Templates - Only show when no algorithm selected */}
                  {!computingForm.selectedAlgorithm && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Templates: </span>
                      {scriptTemplates.map((template, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleScriptTemplate(template.script)}
                          className="text-sm text-blue-600 hover:text-blue-800 mr-4"
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <textarea
                    value={computingForm.computingScript}
                    onChange={(e) => setComputingForm(prev => ({ ...prev, computingScript: e.target.value }))}
                    placeholder={computingForm.selectedAlgorithm 
                      ? "Algorithm code will be loaded here. You can view and modify it."
                      : "def compute(data):\n    # Your computation logic here\n    return result"
                    }
                    rows={12}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    disabled={isLoadingAlgorithmCode}
                  />
                  
                  {computingForm.selectedAlgorithm && computingForm.computingScript && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      ℹ️ This algorithm code has been loaded automatically. You can modify it if needed.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={computingForm.budget}
                  onChange={(e) => setComputingForm(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="1.0"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={computingForm.description}
                  onChange={(e) => setComputingForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of your computation"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Fee Estimation */}
            {estimatedFees && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Fees</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Platform Fee</div>
                    <div className="font-medium text-gray-900 dark:text-white">{formatEther(estimatedFees.platformFee)} ETH</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Provider Fee</div>
                    <div className="font-medium text-gray-900 dark:text-white">{formatEther(estimatedFees.providerFee)} ETH</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Auditor Fee</div>
                    <div className="font-medium text-gray-900 dark:text-white">{formatEther(estimatedFees.auditorFee)} ETH</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Total Fees</div>
                    <div className="font-medium text-gray-900 dark:text-white">{formatEther(estimatedFees.totalFees)} ETH</div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={requestLoading || 
                computingForm.selectedDataHashes.length === 0 || 
                (!computingForm.selectedAlgorithm && !computingForm.computingScript.trim())}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestLoading ? 'Submitting Request...' : 'Submit Computing Request'}
            </button>

            {requestError && (
              <div className="text-red-600 text-sm">{requestError}</div>
            )}
          </form>
        </div>
      )}

      {/* My Requests Tab */}
      {activeTab === 'my-requests' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Computing Requests</h2>
            <button
              onClick={loadUserData}
              className="bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>

          {userRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-600 dark:text-gray-400">No computing requests submitted yet</p>
              <button
                onClick={() => setActiveTab('request')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Your First Request
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userRequests.map((request, index) => (
                <div key={request.id.toString()} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-lg font-medium text-gray-900 dark:text-white">Request #{request.id.toString()}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {request.dataHashes.length} data source(s) • Budget: {formatEther(request.budget)} ETH
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${requestStatusColors[request.status as keyof typeof requestStatusColors]}`}>
                      {requestStatusLabels[request.status as keyof typeof requestStatusLabels]}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Computing Script Preview</div>
                    <div className="bg-gray-50 dark:bg-gray-600 p-2 rounded font-mono text-xs text-gray-900 dark:text-gray-100">
                      {request.computingScript.slice(0, 100)}...
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Created</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {new Date(Number(request.createdAt) * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Provider</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {request.assignedProvider === '0x0000000000000000000000000000000000000000' 
                          ? 'Unassigned' 
                          : `${request.assignedProvider.slice(0, 6)}...`}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Payment</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {request.paymentProcessed ? 'Processed' : 'Pending'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Result</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {request.resultHash ? 'Available' : 'Pending'}
                      </div>
                    </div>
                  </div>

                  {request.resultHash && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                      <div className="text-sm text-green-600 dark:text-green-400 mb-1">Result Hash</div>
                      <div className="font-mono text-xs break-all text-green-800 dark:text-green-300">{request.resultHash}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Privacy Center Tab */}
      {activeTab === 'privacy' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Privacy Center</h2>
          
          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700">
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Data Subject Rights</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Exercise your rights under GDPR and other privacy regulations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-700"
                  onClick={() => alert('Data access request functionality would be implemented here')}
                >
                  <div className="font-medium text-gray-900 dark:text-white">Access My Data</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Request a copy of your data</div>
                </button>
                <button 
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-700"
                  onClick={() => alert('Data rectification request functionality would be implemented here')}
                >
                  <div className="font-medium text-gray-900 dark:text-white">Correct My Data</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Request data correction</div>
                </button>
                <button 
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-700"
                  onClick={() => alert('Data deletion request functionality would be implemented here')}
                >
                  <div className="font-medium text-gray-900 dark:text-white">Delete My Data</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Request data deletion</div>
                </button>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700">
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Privacy Policies</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Review and acknowledge privacy policies for data you want to access.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-600 rounded">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">GDPR Compliance Policy</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Version 1.0 • Effective Date: 2024-01-01</div>
                  </div>
                  <button 
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    onClick={() => alert('Policy acknowledgment functionality would be implemented here')}
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700">
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Consent Management</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Manage your consent for data processing activities.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Analytics and Research</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Allow anonymized data to be used for research</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Third-party Sharing</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Allow data to be shared with approved partners</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};