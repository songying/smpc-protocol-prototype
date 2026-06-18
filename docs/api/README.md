# API Reference

Complete API documentation for the SMPC Protocol platform, including smart contracts, REST endpoints, and WebSocket connections.

## 📋 API Overview

The SMPC Protocol exposes several types of APIs:

- **Smart Contract API** - On-chain interactions via Web3
- **REST API** - HTTP endpoints for off-chain operations
- **WebSocket API** - Real-time updates and notifications
- **IPFS API** - Decentralized file storage operations

## 🔗 Base URLs

### Mainnet
```
Smart Contracts: Ethereum Mainnet (Chain ID: 1)
REST API: https://api.smpc-protocol.org/v1
WebSocket: wss://ws.smpc-protocol.org
IPFS Gateway: https://gateway.smpc-protocol.org
```

### Testnet (Sepolia)
```
Smart Contracts: Sepolia Testnet (Chain ID: 11155111)
REST API: https://api-testnet.smpc-protocol.org/v1
WebSocket: wss://ws-testnet.smpc-protocol.org
IPFS Gateway: https://gateway-testnet.smpc-protocol.org
```

### Local Development
```
Smart Contracts: Localhost (Chain ID: 31337)
REST API: http://localhost:3006/api/v1
WebSocket: ws://localhost:3006/ws
IPFS Gateway: http://localhost:8080
```

## 🔐 Authentication

### API Key Authentication
```http
Authorization: Bearer YOUR_API_KEY
```

### Web3 Wallet Authentication
```javascript
// Connect wallet and sign message
const signature = await wallet.signMessage(message);

// Include in requests
headers: {
  'X-Wallet-Address': walletAddress,
  'X-Signature': signature,
  'X-Message': message
}
```

## 📊 Smart Contract API

### Core Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| DataRegistry | `0x...` | Manages encrypted data registrations |
| ComputingRequest | `0x...` | Handles computation requests and results |
| ApprovalManager | `0x...` | Manages approval workflows |
| FeeManagement | `0x...` | Handles fee calculations and payments |
| PrivacyCompliance | `0x...` | Ensures privacy compliance |

### DataRegistry Contract

#### Register Data
```solidity
function registerData(
    bytes32 dataHash,
    string memory metadataURI,
    uint256 price,
    uint8 category,
    string[] memory tags,
    bool isEncrypted
) external returns (bytes32)
```

**Parameters:**
- `dataHash`: Keccak256 hash of the encrypted data
- `metadataURI`: IPFS URI pointing to metadata JSON
- `price`: Price in wei for data access
- `category`: Data category (0-5)
- `tags`: Array of searchable tags
- `isEncrypted`: Whether data is encrypted with MKFHE

**Example Usage:**
```javascript
import { useDataRegistry } from '@/lib/contracts/hooks';

const { registerData } = useDataRegistry();

const result = await registerData(
  '0x1234...', // dataHash
  'ipfs://QmX...', // metadataURI
  ethers.utils.parseEther('0.1'), // price
  1, // category (Financial)
  ['healthcare', 'anonymized'], // tags
  true // isEncrypted
);
```

#### Get Data Entry
```solidity
function getDataEntry(bytes32 dataHash) external view returns (DataEntry memory)
```

**Returns:**
```solidity
struct DataEntry {
    bytes32 dataHash;
    address provider;
    string metadataURI;
    uint256 price;
    uint8 category;
    string[] tags;
    bool isEncrypted;
    uint256 dataSize;
    uint8 status; // 0: Pending, 1: Active, 2: Suspended
    uint256 accessCount;
    uint256 createdAt;
    uint256 updatedAt;
}
```

### ComputingRequest Contract

#### Create Request
```solidity
function createRequest(
    bytes32[] memory dataHashes,
    string memory computingScript,
    uint256 budget
) external payable returns (uint256 requestId)
```

**Example:**
```javascript
const { createRequest } = useComputingRequest();

const requestId = await createRequest(
  ['0x1234...', '0x5678...'], // dataHashes
  'def compute(data): return np.mean(data)', // script
  ethers.utils.parseEther('1.0') // budget
);
```

#### Get Request Status
```solidity
function getRequest(uint256 requestId) external view returns (ComputingRequest memory)
```

**Returns:**
```solidity
struct ComputingRequest {
    uint256 id;
    address consumer;
    bytes32[] dataHashes;
    string computingScript;
    uint256 budget;
    address assignedProvider;
    uint8 status; // 0: Pending, 1: Approved, 2: Assigned, 3: Completed, 4: Cancelled
    bytes32 resultHash;
    uint256 createdAt;
    uint256 updatedAt;
    bool paymentProcessed;
}
```

## 🌐 REST API

### Authentication Endpoints

#### POST `/auth/connect`
Connect Web3 wallet and get authentication token.

**Request:**
```json
{
  "address": "0x742d35Cc6aC3930ce1b61E85A1F6c2FE0b0e3B1c",
  "signature": "0x...",
  "message": "Sign this message to authenticate with SMPC Protocol"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "address": "0x742d35Cc6aC3930ce1b61E85A1F6c2FE0b0e3B1c",
    "role": "data-provider",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Data Management Endpoints

#### GET `/data`
Retrieve data entries with filtering and pagination.

**Query Parameters:**
- `category`: Filter by category (0-5)
- `tags`: Comma-separated tags
- `provider`: Filter by provider address
- `encrypted`: Filter encrypted data (true/false)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "dataHash": "0x1234...",
      "provider": "0x742d35...",
      "metadataURI": "ipfs://QmX...",
      "price": "100000000000000000",
      "category": 1,
      "tags": ["healthcare", "anonymized"],
      "isEncrypted": true,
      "status": 1,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### POST `/data/upload`
Upload data metadata to IPFS and prepare for registration.

**Request (multipart/form-data):**
```
file: [binary data]
metadata: {
  "title": "Healthcare Dataset Q4 2023",
  "description": "Anonymized patient records",
  "category": 2,
  "tags": ["healthcare", "anonymized", "q4-2023"],
  "license": "CC-BY-4.0",
  "schema": {...}
}
```

**Response:**
```json
{
  "dataHash": "0x1234...",
  "metadataURI": "ipfs://QmX...",
  "encryptedSize": 1024000,
  "uploadId": "upload_12345"
}
```

### Computing Request Endpoints

#### POST `/requests`
Create a new computing request.

**Request:**
```json
{
  "dataHashes": ["0x1234...", "0x5678..."],
  "computingScript": "def compute(data): return np.mean(data)",
  "budget": "1000000000000000000",
  "description": "Calculate average values"
}
```

**Response:**
```json
{
  "requestId": 123,
  "status": "pending",
  "estimatedCost": "800000000000000000",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### GET `/requests/{requestId}`
Get request details and status.

**Response:**
```json
{
  "id": 123,
  "consumer": "0x742d35...",
  "dataHashes": ["0x1234..."],
  "status": "completed",
  "resultHash": "0xabcd...",
  "assignedProvider": "0x987f...",
  "progress": {
    "current": 100,
    "total": 100,
    "stage": "completed"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "completedAt": "2024-01-01T01:00:00Z"
}
```

### Analytics Endpoints

#### GET `/analytics/dashboard`
Get dashboard analytics data.

**Response:**
```json
{
  "revenue": {
    "total": "12450000000000000000",
    "thisMonth": "2100000000000000000",
    "change": 12.5
  },
  "datasets": {
    "active": 24,
    "thisWeek": 3,
    "change": 3
  },
  "requests": {
    "total": 156,
    "thisMonth": 23,
    "change": 8.2
  },
  "compliance": {
    "score": 95,
    "change": 2.1
  }
}
```

## 🔌 WebSocket API

### Connection
```javascript
const ws = new WebSocket('wss://ws.smpc-protocol.org');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_jwt_token'
}));
```

### Event Types

#### Request Status Updates
```json
{
  "type": "request_status",
  "data": {
    "requestId": 123,
    "status": "processing",
    "progress": 45,
    "message": "Computing homomorphic operations..."
  }
}
```

#### New Data Available
```json
{
  "type": "data_available",
  "data": {
    "dataHash": "0x1234...",
    "category": 2,
    "tags": ["healthcare"],
    "provider": "0x742d35..."
  }
}
```

#### Payment Received
```json
{
  "type": "payment_received",
  "data": {
    "amount": "500000000000000000",
    "from": "0x987f...",
    "requestId": 123,
    "txHash": "0xabcd..."
  }
}
```

## 📁 IPFS API

### Upload File
```javascript
const response = await fetch('/api/ipfs/upload', {
  method: 'POST',
  body: formData
});

const { hash, size } = await response.json();
// Returns: { hash: "QmX...", size: 1024 }
```

### Retrieve File
```javascript
const response = await fetch(`/api/ipfs/get/${hash}`);
const data = await response.json();
```

### Pin File
```javascript
await fetch(`/api/ipfs/pin/${hash}`, {
  method: 'POST'
});
```

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "The provided signature is invalid",
    "details": { ... }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| `INVALID_SIGNATURE` | Wallet signature verification failed |
| `INSUFFICIENT_FUNDS` | Not enough balance for operation |
| `DATA_NOT_FOUND` | Requested data does not exist |
| `UNAUTHORIZED` | Authentication required |
| `RATE_LIMITED` | Too many requests |
| `VALIDATION_ERROR` | Request validation failed |
| `NETWORK_ERROR` | Blockchain network error |
| `ENCRYPTION_ERROR` | MKFHE encryption/decryption error |

## 🔄 Rate Limiting

Rate limits are applied per API key/wallet address:

- **REST API**: 100 requests/minute
- **WebSocket**: 1000 messages/minute
- **File Upload**: 10 uploads/minute
- **Contract Interactions**: Limited by gas and network

Headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## 📝 SDKs and Libraries

### JavaScript/TypeScript SDK
```bash
npm install @smpc-protocol/sdk
```

```javascript
import { SMPCProtocol } from '@smpc-protocol/sdk';

const client = new SMPCProtocol({
  network: 'mainnet',
  apiKey: 'your_api_key'
});

// Register data
const result = await client.data.register({
  file: fileBuffer,
  metadata: { ... }
});
```

### Python SDK
```bash
pip install smpc-protocol
```

```python
from smpc_protocol import Client

client = Client(
    network='mainnet',
    api_key='your_api_key'
)

# Create computing request
request = client.requests.create(
    data_hashes=['0x1234...'],
    script='def compute(data): return np.mean(data)',
    budget=1.0
)
```

## 🧪 Testing

### Testnet Faucet
Get test ETH for Sepolia testnet:
```
https://faucet.sepolia.dev/
```

### Mock Data
Use test data for development:
```javascript
const mockData = await fetch('/api/test/mock-data');
```

## 📞 Support

- **API Issues**: [GitHub Issues](https://github.com/songying/smpc-protocol/issues)
- **Documentation**: [API Docs](https://docs.smpc-protocol.org/api)
- **Discord**: [Community Chat](https://discord.gg/smpc-protocol) (coming soon)

---

**Related Documentation:**
- [Smart Contracts](contracts.md) - Detailed contract documentation
- [Authentication](auth.md) - Authentication and authorization
- [WebSocket Events](websocket.md) - Real-time event documentation