# Quick Start Guide - SMPC Protocol

## 🚀 One-Command Deployment

```bash
git clone https://github.com/your-org/smpc-protocol.git
cd smpc-protocol
docker compose up -d --build
```

**Access**: http://localhost:3000

## 📋 Commands Reference

### Docker Operations
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build

# View service status
docker compose ps

# Scale SMPC nodes
docker compose up -d --scale smpc-mpspdz-node1=2
```

### Development
```bash
# Install dependencies
npm install

# Run development server (without Docker)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Smart Contracts
```bash
# Compile contracts
npm run contracts:compile

# Deploy to local network
npm run contracts:deploy

# Deploy to testnet
npm run contracts:deploy:testnet

# Deploy to mainnet
npm run contracts:deploy:mainnet
```

### SMPC Demo
```bash
# Run healthcare demo
npm run smpc:demo

# Generate sample health data
npm run data:generate

# Generate JSON sample data  
npm run data:generate-json
```

### Testing
```bash
# Run all tests
npm run test:all

# Run frontend tests only
npm run test:frontend

# Run smart contract tests
npm run test:contracts

# Run with coverage
npm run test:coverage
```

### Blockchain Operations
```bash
# Start local blockchain
npm run hardhat:node

# Deploy contracts to local network
npm run deploy:localhost

# Check deployment status
npm run deploy:status

# Start blockchain with GUI
npm run blockchain:start
```

## 🔍 Service Endpoints

| Service | URL | Port | Health Check |
|---------|-----|------|-------------|
| Main App | http://localhost:3000 | 3000 | `/api/health` |
| SMPC Coordinator | http://localhost:8080 | 8080 | `/health` |
| MP-SPDZ Node 1 | http://localhost:9991 | 9991 | `/status` |
| MP-SPDZ Node 2 | http://localhost:9992 | 9992 | `/status` |
| MP-SPDZ Node 3 | http://localhost:9993 | 9993 | `/status` |
| MongoDB | mongodb://localhost:27017 | 27017 | `mongosh` |
| Redis | redis://localhost:16379 | 16379 | `redis-cli ping` |
| IPFS Gateway | http://localhost:18080 | 18080 | `/ipfs/...` |
| IPFS API | http://localhost:15001 | 15001 | `/api/v0/version` |
| Hardhat Node | http://localhost:8545 | 8545 | RPC calls |

## 🏥 Healthcare Demo

The healthcare demo showcases privacy-preserving statistical analysis of medical data:

1. **Access Demo**: http://localhost:3000/demo
2. **Sample Data**: 350 synthetic health records from 2 providers
3. **Computation**: Statistical analysis, correlations, risk factors
4. **Privacy**: Individual records remain private, only aggregated results revealed
5. **Technology**: 3-party SMPC using MP-SPDZ with ZK proofs

### Demo Flow
```
Data Provider A (150 records) ──┐
                                ├──► SMPC Computation ──► Aggregated Results
Data Provider B (200 records) ──┘
```

## ⚡ Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker is running
docker --version
docker compose version

# Check port availability
netstat -tulpn | grep :3000
netstat -tulpn | grep :27017

# Free up memory
docker system prune
```

**MongoDB connection issues:**
```bash
# Check MongoDB logs
docker compose logs smpc-mongodb

# Connect manually
docker compose exec smpc-mongodb mongosh --username smpc --password smpc123

# Reset MongoDB data
docker compose down
docker volume rm smpc-protocol_smpc-mongodb-data
docker compose up -d smpc-mongodb
```

**SMPC nodes not responding:**
```bash
# Check node logs
docker compose logs smpc-mpspdz-node1

# Restart individual node
docker compose restart smpc-mpspdz-node1

# Check MP-SPDZ compilation
docker compose exec smpc-mpspdz-node1 ls -la /opt/mp-spdz/
```

**Performance issues:**
```bash
# Check resource usage
docker stats

# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory: 8GB+

# Check disk space
df -h
docker system df
```

## 📊 Monitoring

### Health Checks
```bash
# Quick health check all services
curl -f http://localhost:3000/api/health && \
curl -f http://localhost:8080/health && \
curl -f http://localhost:9991/status && \
echo "All services healthy"
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f smpc-coordinator

# Last 100 lines
docker compose logs --tail=100 smpc-app

# Filter by timestamp
docker compose logs --since="2024-01-01T00:00:00" smpc-app
```

### Performance Monitoring
```bash
# Container resource usage
docker stats

# Database performance
docker compose exec smpc-redis redis-cli info stats
docker compose exec smpc-mongodb mongosh --eval "db.stats()"

# Application metrics
curl http://localhost:3000/api/metrics
curl http://localhost:8080/api/metrics
```

## 🔧 Configuration

### Environment Variables
Key variables in `.env.local`:

```bash
# Enable demo mode
DEMO_MODE=true
AUTO_ACCEPT_BIDS=true
FAST_COMPUTATION=true

# Database connections
MONGODB_URI=mongodb://smpc:smpc123@smpc-mongodb:27017/smpc-protocol?authSource=admin
REDIS_URL=redis://smpc-redis:6379

# SMPC settings
SMPC_COORDINATOR_URL=http://smpc-coordinator:8080
MAX_COMPUTATION_DURATION=3600
MAX_CONCURRENT_JOBS=3

# Blockchain
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
```

### Docker Configuration
Adjust `docker-compose.yml` for your needs:

```yaml
# Increase memory limits
deploy:
  resources:
    limits:
      memory: 4G
    reservations:
      memory: 2G

# Change port mappings
ports:
  - "3001:3000"  # Use port 3001 instead of 3000
```

## 📱 Next Steps

1. **Explore the Interface**: Navigate to http://localhost:3000
2. **Run Healthcare Demo**: Test the SMPC computation
3. **Deploy Smart Contracts**: Set up blockchain integration
4. **Add Your Data**: Replace synthetic data with real datasets
5. **Customize UI**: Modify the frontend for your use case
6. **Production Setup**: Follow the full deployment guide

## 📚 Documentation

- [Full Deployment Guide](./deployment-guide.md)
- [Technical Architecture](./technical-architecture.md)
- [Economic Model](./economic-model.md)
- [Healthcare Demo Specification](./healthcare-demo-specification.md)
- [MVP Implementation Plan](./mvp-implementation-plan.md)

---

**Need Help?** Check the troubleshooting section above or refer to the comprehensive deployment guide for detailed instructions.