import { MongoClient, Db, Collection } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

class MongoDB {
  private static instance: MongoDB;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): MongoDB {
    if (!MongoDB.instance) {
      MongoDB.instance = new MongoDB();
    }
    return MongoDB.instance;
  }

  public async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    try {
      const uri = process.env.MONGODB_URI || 'mongodb://smpc:smpc123@localhost:27017/smpc-protocol?authSource=admin';
      
      // In development, use a global variable to preserve the connection
      // across hot reloads in Next.js
      if (process.env.NODE_ENV === 'development') {
        if (!global._mongoClientPromise) {
          this.client = new MongoClient(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
          });
          global._mongoClientPromise = this.client.connect();
        }
        this.client = await global._mongoClientPromise;
      } else {
        this.client = new MongoClient(uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        await this.client.connect();
      }

      this.db = this.client.db('smpc-protocol');
      console.log('Connected to MongoDB');
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  public async getCollection<T = any>(name: string): Promise<Collection<T>> {
    const db = await this.connect();
    return db.collection<T>(name);
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      const db = await this.connect();
      await db.admin().ping();
      return true;
    } catch (error) {
      console.error('MongoDB health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const mongodb = MongoDB.getInstance();

// Collection interfaces for type safety
export interface User {
  _id?: string;
  walletAddress: string;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_required';
  profile?: {
    email?: string;
    location?: string;
    verificationLevel?: number;
  };
  roles?: Array<'data_provider' | 'data_consumer' | 'compute_provider' | 'validator'>;
  reputation?: number;
  totalJobs?: number;
  successfulJobs?: number;
  totalEarnings?: number;
  createdAt: Date;
  lastActive?: Date;
}

export interface Job {
  _id?: string;
  jobId: string;
  consumer: string;
  category: 'healthcare' | 'financial' | 'communication' | 'iot' | 'custom';
  description?: string;
  reservePrice?: number;
  buyNowPrice?: number;
  finalPrice?: number;
  deadline?: Date;
  maxComputeTime?: number;
  status: 'created' | 'bidding' | 'assigned' | 'computing' | 'completed' | 'failed' | 'disputed' | 'cancelled';
  participants?: {
    dataProviders?: string[];
    computeProviders?: string[];
    validators?: string[];
  };
  computation?: {
    type?: 'statistical_analysis' | 'ml_training' | 'data_matching' | 'aggregation' | 'custom';
    parameters?: any;
    requirements?: string[];
  };
  results?: {
    resultHash?: string;
    resultURI?: string;
    zkProof?: string;
    completedAt?: Date;
  };
  privacy?: {
    level?: 'basic' | 'standard' | 'high' | 'maximum';
    requirements?: string[];
  };
  createdAt: Date;
  updatedAt?: Date;
}

export interface Bid {
  _id?: string;
  bidId: string;
  jobId: string;
  bidder: string;
  amount: number;
  bidderType: 'data_provider' | 'compute_provider';
  commitment?: string;
  isWinner?: boolean;
  transactionHash?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Payment {
  _id?: string;
  paymentId: string;
  jobId: string;
  totalAmount: number;
  currency: 'ETH' | 'USDT' | 'USDC';
  distribution?: {
    dataProviders?: Array<{ address: string; amount: number }>;
    computeProviders?: Array<{ address: string; amount: number }>;
    validators?: Array<{ address: string; amount: number }>;
    protocolFee?: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionHash?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface AuditLog {
  _id?: string;
  eventId: string;
  eventType: 'user_registration' | 'job_created' | 'bid_placed' | 'job_assigned' | 
            'computation_started' | 'computation_completed' | 'payment_distributed' |
            'kyc_verified' | 'dispute_raised' | 'admin_action';
  actor: string;
  target?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface SMPCComputation {
  _id?: string;
  computationId: string;
  jobId: string;
  nodes?: Array<{
    nodeId: string;
    address: string;
    status: 'ready' | 'computing' | 'completed' | 'failed';
    lastHeartbeat?: Date;
  }>;
  protocol?: 'shamir' | 'garbled_circuits' | 'homomorphic' | 'hybrid';
  progress?: {
    phase?: 'initialization' | 'preprocessing' | 'computation' | 'verification' | 'completed';
    percentage?: number;
    estimatedCompletion?: Date;
  };
  status: 'pending' | 'initializing' | 'computing' | 'completed' | 'failed' | 'timeout';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}