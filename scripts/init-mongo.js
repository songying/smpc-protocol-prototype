// MongoDB initialization script for SMPC Protocol
// This script runs automatically when the MongoDB container starts

// Switch to the smpc-protocol database
db = db.getSiblingDB('smpc-protocol');

// Create user with read/write permissions
db.createUser({
  user: 'smpc-app',
  pwd: 'smpc-app123',
  roles: [
    {
      role: 'readWrite',
      db: 'smpc-protocol'
    }
  ]
});

// Create collections with validators and indexes

// Users collection - stores user profiles and KYC information
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['walletAddress', 'createdAt'],
      properties: {
        walletAddress: {
          bsonType: 'string',
          description: 'Ethereum wallet address - required and must be a string'
        },
        kycStatus: {
          bsonType: 'string',
          enum: ['pending', 'approved', 'rejected', 'not_required'],
          description: 'KYC verification status'
        },
        profile: {
          bsonType: 'object',
          properties: {
            email: { bsonType: 'string' },
            location: { bsonType: 'string' },
            verificationLevel: { bsonType: 'int', minimum: 0, maximum: 3 }
          }
        },
        roles: {
          bsonType: 'array',
          items: {
            bsonType: 'string',
            enum: ['data_provider', 'data_consumer', 'compute_provider', 'validator']
          }
        },
        reputation: {
          bsonType: 'int',
          minimum: 0,
          maximum: 1000,
          description: 'User reputation score out of 1000'
        },
        totalJobs: { bsonType: 'int', minimum: 0 },
        successfulJobs: { bsonType: 'int', minimum: 0 },
        totalEarnings: { bsonType: 'double', minimum: 0 },
        createdAt: { bsonType: 'date' },
        lastActive: { bsonType: 'date' }
      }
    }
  }
});

// Jobs collection - stores SMPC computation jobs
db.createCollection('jobs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['jobId', 'consumer', 'category', 'status', 'createdAt'],
      properties: {
        jobId: {
          bsonType: 'string',
          description: 'Unique job identifier from blockchain - required'
        },
        consumer: {
          bsonType: 'string',
          description: 'Consumer wallet address - required'
        },
        category: {
          bsonType: 'string',
          enum: ['healthcare', 'financial', 'communication', 'iot', 'custom'],
          description: 'Data category - required'
        },
        description: { bsonType: 'string' },
        reservePrice: { bsonType: 'double', minimum: 0 },
        buyNowPrice: { bsonType: 'double', minimum: 0 },
        finalPrice: { bsonType: 'double', minimum: 0 },
        deadline: { bsonType: 'date' },
        maxComputeTime: { bsonType: 'int', minimum: 0 },
        status: {
          bsonType: 'string',
          enum: ['created', 'bidding', 'assigned', 'computing', 'completed', 'failed', 'disputed', 'cancelled'],
          description: 'Job status - required'
        },
        participants: {
          bsonType: 'object',
          properties: {
            dataProviders: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            computeProviders: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            validators: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            }
          }
        },
        computation: {
          bsonType: 'object',
          properties: {
            type: {
              bsonType: 'string',
              enum: ['statistical_analysis', 'ml_training', 'data_matching', 'aggregation', 'custom']
            },
            parameters: { bsonType: 'object' },
            requirements: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            }
          }
        },
        results: {
          bsonType: 'object',
          properties: {
            resultHash: { bsonType: 'string' },
            resultURI: { bsonType: 'string' },
            zkProof: { bsonType: 'string' },
            completedAt: { bsonType: 'date' }
          }
        },
        privacy: {
          bsonType: 'object',
          properties: {
            level: {
              bsonType: 'string',
              enum: ['basic', 'standard', 'high', 'maximum']
            },
            requirements: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            }
          }
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Bids collection - stores auction bids
db.createCollection('bids', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['bidId', 'jobId', 'bidder', 'amount', 'bidderType', 'createdAt'],
      properties: {
        bidId: { bsonType: 'string', description: 'Unique bid identifier' },
        jobId: { bsonType: 'string', description: 'Associated job ID - required' },
        bidder: { bsonType: 'string', description: 'Bidder wallet address - required' },
        amount: { bsonType: 'double', minimum: 0, description: 'Bid amount - required' },
        bidderType: {
          bsonType: 'string',
          enum: ['data_provider', 'compute_provider'],
          description: 'Type of bidder - required'
        },
        commitment: { bsonType: 'string', description: 'IPFS hash of bid commitment' },
        isWinner: { bsonType: 'bool' },
        transactionHash: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        expiresAt: { bsonType: 'date' }
      }
    }
  }
});

// Payments collection - stores payment distribution records
db.createCollection('payments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['paymentId', 'jobId', 'totalAmount', 'currency', 'status', 'createdAt'],
      properties: {
        paymentId: { bsonType: 'string', description: 'Unique payment identifier' },
        jobId: { bsonType: 'string', description: 'Associated job ID - required' },
        totalAmount: { bsonType: 'double', minimum: 0, description: 'Total payment amount' },
        currency: {
          bsonType: 'string',
          enum: ['ETH', 'USDT', 'USDC'],
          description: 'Payment currency'
        },
        distribution: {
          bsonType: 'object',
          properties: {
            dataProviders: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  address: { bsonType: 'string' },
                  amount: { bsonType: 'double', minimum: 0 }
                }
              }
            },
            computeProviders: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  address: { bsonType: 'string' },
                  amount: { bsonType: 'double', minimum: 0 }
                }
              }
            },
            validators: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                properties: {
                  address: { bsonType: 'string' },
                  amount: { bsonType: 'double', minimum: 0 }
                }
              }
            },
            protocolFee: { bsonType: 'double', minimum: 0 }
          }
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'processing', 'completed', 'failed'],
          description: 'Payment status'
        },
        transactionHash: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        processedAt: { bsonType: 'date' }
      }
    }
  }
});

// Audit logs collection - stores all system actions for compliance
db.createCollection('audit_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['eventId', 'eventType', 'actor', 'timestamp'],
      properties: {
        eventId: { bsonType: 'string', description: 'Unique event identifier' },
        eventType: {
          bsonType: 'string',
          enum: [
            'user_registration', 'job_created', 'bid_placed', 'job_assigned', 
            'computation_started', 'computation_completed', 'payment_distributed',
            'kyc_verified', 'dispute_raised', 'admin_action'
          ],
          description: 'Type of event'
        },
        actor: { bsonType: 'string', description: 'Wallet address of actor' },
        target: { bsonType: 'string', description: 'Target of the action (job ID, user address, etc.)' },
        details: { bsonType: 'object', description: 'Additional event details' },
        ipAddress: { bsonType: 'string' },
        userAgent: { bsonType: 'string' },
        timestamp: { bsonType: 'date' }
      }
    }
  }
});

// SMPC computations collection - stores computation metadata and progress
db.createCollection('smpc_computations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['computationId', 'jobId', 'status', 'createdAt'],
      properties: {
        computationId: { bsonType: 'string', description: 'Unique computation identifier' },
        jobId: { bsonType: 'string', description: 'Associated job ID' },
        nodes: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              nodeId: { bsonType: 'string' },
              address: { bsonType: 'string' },
              status: {
                bsonType: 'string',
                enum: ['ready', 'computing', 'completed', 'failed']
              },
              lastHeartbeat: { bsonType: 'date' }
            }
          }
        },
        protocol: {
          bsonType: 'string',
          enum: ['shamir', 'garbled_circuits', 'homomorphic', 'hybrid'],
          description: 'SMPC protocol used'
        },
        progress: {
          bsonType: 'object',
          properties: {
            phase: {
              bsonType: 'string',
              enum: ['initialization', 'preprocessing', 'computation', 'verification', 'completed']
            },
            percentage: { bsonType: 'int', minimum: 0, maximum: 100 },
            estimatedCompletion: { bsonType: 'date' }
          }
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'initializing', 'computing', 'completed', 'failed', 'timeout'],
          description: 'Computation status'
        },
        createdAt: { bsonType: 'date' },
        startedAt: { bsonType: 'date' },
        completedAt: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes for better query performance

// Users collection indexes
db.users.createIndex({ 'walletAddress': 1 }, { unique: true });
db.users.createIndex({ 'kycStatus': 1 });
db.users.createIndex({ 'roles': 1 });
db.users.createIndex({ 'reputation': -1 });
db.users.createIndex({ 'createdAt': -1 });

// Jobs collection indexes
db.jobs.createIndex({ 'jobId': 1 }, { unique: true });
db.jobs.createIndex({ 'consumer': 1, 'createdAt': -1 });
db.jobs.createIndex({ 'category': 1, 'status': 1 });
db.jobs.createIndex({ 'status': 1, 'createdAt': -1 });
db.jobs.createIndex({ 'deadline': 1 });
db.jobs.createIndex({ 'participants.dataProviders': 1 });
db.jobs.createIndex({ 'participants.computeProviders': 1 });

// Bids collection indexes
db.bids.createIndex({ 'bidId': 1 }, { unique: true });
db.bids.createIndex({ 'jobId': 1, 'createdAt': -1 });
db.bids.createIndex({ 'bidder': 1, 'createdAt': -1 });
db.bids.createIndex({ 'bidderType': 1 });
db.bids.createIndex({ 'isWinner': 1 });
db.bids.createIndex({ 'expiresAt': 1 });

// Payments collection indexes
db.payments.createIndex({ 'paymentId': 1 }, { unique: true });
db.payments.createIndex({ 'jobId': 1 });
db.payments.createIndex({ 'status': 1, 'createdAt': -1 });
db.payments.createIndex({ 'currency': 1 });
db.payments.createIndex({ 'distribution.dataProviders.address': 1 });
db.payments.createIndex({ 'distribution.computeProviders.address': 1 });

// Audit logs collection indexes
db.audit_logs.createIndex({ 'eventId': 1 }, { unique: true });
db.audit_logs.createIndex({ 'eventType': 1, 'timestamp': -1 });
db.audit_logs.createIndex({ 'actor': 1, 'timestamp': -1 });
db.audit_logs.createIndex({ 'target': 1, 'timestamp': -1 });
db.audit_logs.createIndex({ 'timestamp': -1 });

// SMPC computations collection indexes
db.smpc_computations.createIndex({ 'computationId': 1 }, { unique: true });
db.smpc_computations.createIndex({ 'jobId': 1 });
db.smpc_computations.createIndex({ 'status': 1, 'createdAt': -1 });
db.smpc_computations.createIndex({ 'nodes.nodeId': 1 });
db.smpc_computations.createIndex({ 'createdAt': -1 });

// Insert sample data for development
print('Creating sample data...');

// Sample users
db.users.insertMany([
  {
    walletAddress: '0x1234567890123456789012345678901234567890',
    kycStatus: 'approved',
    profile: {
      email: 'alice@example.com',
      location: 'Hong Kong',
      verificationLevel: 2
    },
    roles: ['data_provider'],
    reputation: 850,
    totalJobs: 15,
    successfulJobs: 14,
    totalEarnings: 2.5,
    createdAt: new Date(),
    lastActive: new Date()
  },
  {
    walletAddress: '0x2345678901234567890123456789012345678901',
    kycStatus: 'approved',
    profile: {
      email: 'bob@research.com',
      location: 'Hong Kong',
      verificationLevel: 3
    },
    roles: ['data_consumer'],
    reputation: 920,
    totalJobs: 8,
    successfulJobs: 8,
    totalEarnings: 0, // Consumers don't earn from jobs directly
    createdAt: new Date(),
    lastActive: new Date()
  },
  {
    walletAddress: '0x3456789012345678901234567890123456789012',
    kycStatus: 'approved',
    profile: {
      email: 'charlie@compute.io',
      location: 'Hong Kong',
      verificationLevel: 2
    },
    roles: ['compute_provider'],
    reputation: 780,
    totalJobs: 25,
    successfulJobs: 23,
    totalEarnings: 1.8,
    createdAt: new Date(),
    lastActive: new Date()
  }
]);

// Sample jobs
const sampleJobId = '0x' + Date.now().toString(16) + Math.random().toString(16).substr(2, 8);
db.jobs.insertOne({
  jobId: sampleJobId,
  consumer: '0x2345678901234567890123456789012345678901',
  category: 'healthcare',
  description: 'Statistical analysis of health screening data for population health study',
  reservePrice: 0.05,
  buyNowPrice: 0.1,
  deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  maxComputeTime: 3600, // 1 hour in seconds
  status: 'created',
  computation: {
    type: 'statistical_analysis',
    parameters: {
      analysisType: 'correlation',
      metrics: ['bmi', 'blood_pressure', 'cholesterol']
    },
    requirements: ['minimum_3_parties', 'differential_privacy']
  },
  privacy: {
    level: 'high',
    requirements: ['zero_knowledge_proof', 'metadata_privacy']
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB initialization completed successfully!');
print('Created collections: users, jobs, bids, payments, audit_logs, smpc_computations');
print('Created indexes for optimal query performance');
print('Inserted sample data for development');

// Log the initialization
db.audit_logs.insertOne({
  eventId: 'init_' + Date.now(),
  eventType: 'admin_action',
  actor: 'system',
  target: 'database',
  details: {
    action: 'database_initialization',
    collections_created: 6,
    indexes_created: 23,
    sample_records_inserted: 4
  },
  timestamp: new Date()
});