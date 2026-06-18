# Technical Architecture Document
# SMPC Privacy Data Trading Protocol

## System Overview

**Protocol Name**: SMPC Privacy Data Trading Protocol  
**Architecture**: Ethereum ZK-Rollup with Hybrid SMPC  
**Target**: B2C privacy-preserving data monetization  
**Primary Use Cases**: Healthcare data analysis, financial records, communication data  

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Layer (Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│  Data Provider UI  │  Data Consumer UI  │  Compute Provider UI  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js Routes)                  │
├─────────────────────────────────────────────────────────────────┤
│  Authentication  │  Job Manager  │  Payment  │  SMPC Coordinator │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌─────────────────────────────┐  ┌──────────────────────────────┐
│     Storage Layer           │  │      Blockchain Layer        │
├─────────────────────────────┤  ├──────────────────────────────┤
│  Redis (Session/Cache)      │  │   Ethereum L1 (Settlement)   │
│  MongoDB (Persistent Data)  │  │   ZK-Rollup L2 (Execution)   │
│  IPFS (Data Storage)        │  │   Smart Contracts            │
└─────────────────────────────┘  └──────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SMPC Computation Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  SCALE-MAMBA Integration  │  MP-SPDZ Integration  │  ZK Proofs  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Component Specifications

### 2.1 Frontend Layer (Next.js)

**Data Provider Interface:**
- Wallet connection (MetaMask)
- Data upload and categorization (healthcare, financial, communication)
- Privacy preferences and pricing
- Revenue tracking dashboard

**Data Consumer Interface:**
- Browse available data categories
- Submit computation requests
- Auction bidding interface
- Results viewing (authorized access only)

**Compute Provider Interface:**
- Node registration and management
- Computation job queue
- Performance monitoring
- Reward tracking

### 2.2 API Layer (Next.js API Routes)

**Core Services:**

1. **Authentication Service**
   - MetaMask wallet authentication
   - KYC/identity verification
   - Session management (Redis)
   - Access control

2. **Job Manager**
   - Computation request processing
   - Auction mechanism (minimum fee + bidding)
   - Job scheduling and routing
   - Status tracking

3. **Payment Service**
   - ETH/USDT payment processing
   - Fee distribution (70% data provider, 25% compute provider, 4% validator, 1% protocol)
   - Smart contract interactions
   - Transaction history

4. **SMPC Coordinator**
   - Multi-party computation orchestration
   - Hybrid cryptographic protocol management
   - Result verification
   - Zero-knowledge proof generation

### 2.3 Blockchain Layer

**Ethereum L1 (Settlement):**
- Final transaction settlement
- Dispute resolution
- Validator stake management
- Emergency controls

**ZK-Rollup L2 (Execution):**
- Computation job execution
- Payment processing
- State transitions
- Data availability

**Smart Contracts:**

```solidity
contract SMPCProtocol {
    // Job management
    struct ComputationJob {
        address dataProvider;
        address dataConsumer;
        address computeProvider;
        uint256 bidAmount;
        bytes32 dataHash;
        JobStatus status;
        uint256 timestamp;
    }
    
    // Fee distribution
    function distributePayment(uint256 jobId, uint256 amount) external {
        // 70% to data provider
        // 25% to compute provider  
        // 4% to validator
        // 1% to protocol treasury
    }
    
    // Auction mechanism
    function submitBid(uint256 jobId, uint256 bidAmount) external;
    function acceptBid(uint256 jobId, uint256 bidId) external;
}
```

### 2.4 Storage Layer

**Redis:**
- Session management
- Real-time job status
- Caching layer for API responses
- Temporary computation results

**MongoDB:**
- User profiles and KYC data
- Job history and metadata
- Audit trails for compliance
- Analytics and reporting data

**IPFS:**
- Encrypted data storage
- Computation result storage
- Metadata storage
- Distributed content addressing

### 2.5 SMPC Computation Layer

**Hybrid Cryptographic Approach:**

1. **Threshold Secret Sharing** (for data partitioning)
2. **Garbled Circuits** (for simple computations)
3. **Homomorphic Encryption** (for aggregation operations)
4. **Zero-Knowledge Proofs** (for result verification)

**Integration Strategy:**
- **SCALE-MAMBA**: For threshold-based protocols
- **MP-SPDZ**: For general-purpose SMPC
- **Custom wrapper**: Unified API for different SMPC backends

## 3. Data Flow Architecture

### 3.1 Data Provider Flow

1. **Data Upload**: Encrypt and upload to IPFS
2. **Metadata Registration**: Store in MongoDB with privacy preferences
3. **Smart Contract**: Register data availability on L2
4. **Auction Participation**: Receive and evaluate bid requests

### 3.2 Computation Request Flow

1. **Request Submission**: Data consumer submits computation job
2. **Auction Creation**: System creates bidding auction
3. **Bid Collection**: Data and compute providers submit bids
4. **Job Execution**: SMPC coordinator orchestrates computation
5. **Result Delivery**: ZK-verified results delivered to authorized parties
6. **Payment Distribution**: Smart contract distributes fees

### 3.3 SMPC Computation Flow

```
Data Provider 1 ──┐
                  ├──► SMPC Coordinator ──► Result + ZK Proof
Data Provider 2 ──┤
                  ├──► Compute Nodes
Data Provider N ──┘
```

## 4. Security Architecture

### 4.1 Privacy Guarantees

**Computational Privacy:**
- Raw data never leaves encrypted environment
- Multi-party computation with threshold security
- Result verification without data exposure

**Metadata Privacy:**
- Encrypted job parameters
- Anonymous bidding process
- Private communication channels

### 4.2 Security Measures

**Against Malicious Compute Nodes:**
- Verifiable computation with ZK proofs
- Multi-node verification
- Economic slashing for misbehavior

**Against Curious Data Providers:**
- Secret sharing prevents individual data access
- Threshold protocols require majority collusion
- Encrypted communication channels

**Against External Observers:**
- All communication encrypted
- Metadata obfuscation
- Private transaction pools

## 5. Scalability Design

### 5.1 ZK-Rollup Benefits

- **Cost Efficiency**: ~100x cheaper than Ethereum L1
- **Throughput**: ~1000 TPS vs ~15 TPS on L1  
- **Finality**: Fast confirmation with L1 security
- **Data Availability**: Optimized for computation jobs

### 5.2 SMPC Optimization

- **Preprocessing**: Offline phase for garbled circuits
- **Parallel Execution**: Multiple jobs simultaneously
- **Caching**: Reuse computation elements
- **Batching**: Group similar operations

## 6. Compliance & Audit

### 6.1 GDPR Compliance

- **Data Minimization**: Only collect necessary data
- **Right to be Forgotten**: Data deletion mechanisms
- **Consent Management**: Granular permission controls
- **Data Portability**: Export capabilities

### 6.2 Audit Trails

- **Immutable Logs**: All operations recorded on blockchain
- **Compliance Reports**: Automated regulatory reporting
- **Access Logs**: Track all data access events
- **Verification Trails**: ZK proof chains for auditing

## 7. API Architecture

### 7.1 External API (for third-party developers)

```typescript
// Data Provider API
POST /api/data/upload
GET  /api/data/list
POST /api/data/pricing

// Data Consumer API  
POST /api/computation/request
GET  /api/computation/results
POST /api/auction/bid

// Compute Provider API
POST /api/node/register
GET  /api/jobs/available
POST /api/jobs/complete
```

### 7.2 Internal API (SMPC coordination)

```typescript
// SMPC Coordinator
POST /api/smpc/initiate
POST /api/smpc/execute  
GET  /api/smpc/status
POST /api/smpc/verify
```

## 8. Deployment Architecture

### 8.1 MVP Phase (Month 1-2)

- **Centralized coordinator**: Single SMPC orchestrator
- **Single compute node**: Simplified for demonstration  
- **Testnet deployment**: Sepolia/Goerli for testing
- **Local IPFS**: Development storage solution

### 8.2 Alpha Phase (Month 3-4)

- **Multi-node setup**: 3-5 compute providers
- **ZK-rollup integration**: Deploy L2 solution
- **Distributed storage**: Production IPFS network
- **Basic monitoring**: Health checks and alerts

## 9. Technology Integration

### 9.1 Next.js Application Structure

```
/pages
  /api
    /auth        # Authentication endpoints
    /data        # Data management
    /computation # Job management  
    /payment     # Transaction handling
  /dashboard     # User interfaces
  /marketplace   # Data trading UI

/lib
  /smpc         # SMPC integration layer
  /blockchain   # Smart contract interfaces
  /storage      # Database and IPFS clients
  /crypto       # Cryptographic utilities

/contracts      # Smart contract source code
/scripts        # Deployment and maintenance scripts
```

### 9.2 Database Schema (MongoDB)

```javascript
// Users collection
{
  _id: ObjectId,
  walletAddress: String,
  kycStatus: String,
  profile: {
    email: String,
    location: String,
    verificationLevel: Number
  },
  createdAt: Date
}

// Jobs collection  
{
  _id: ObjectId,
  dataProviderId: ObjectId,
  dataConsumerId: ObjectId,
  computeProviderId: ObjectId,
  jobType: String, // "healthcare", "financial", "communication"
  parameters: Object,
  bidAmount: Number,
  status: String,
  results: {
    ipfsHash: String,
    zkProof: String
  },
  auditTrail: Array
}
```

This architecture provides a comprehensive foundation for your SMPC privacy data trading protocol, optimized for cost-efficiency, privacy, and regulatory compliance in Hong Kong SAR.