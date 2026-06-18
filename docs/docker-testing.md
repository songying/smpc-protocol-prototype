# Docker Testing Guide for SMPC Protocol

## Overview

This guide provides comprehensive testing procedures to validate the Docker deployment of the SMPC Protocol platform. It includes automated test scripts, manual verification steps, and troubleshooting procedures.

## Table of Contents

1. [Automated Testing](#automated-testing)
2. [Manual Testing Procedures](#manual-testing-procedures)
3. [Performance Testing](#performance-testing)
4. [Security Testing](#security-testing)
5. [Integration Testing](#integration-testing)
6. [Test Results Analysis](#test-results-analysis)
7. [Troubleshooting Failed Tests](#troubleshooting-failed-tests)

## Automated Testing

### Running the Test Suite

The project includes a comprehensive automated test script:

```bash
# Make script executable (Linux/Mac)
chmod +x scripts/docker-test.sh

# Run all tests
./scripts/docker-test.sh

# View results
cat docker-test-results.json
```

### Test Categories

The automated test suite covers 12 main categories:

#### 1. Docker Services Status
- Verifies all containers are running
- Checks container health status
- Validates service dependencies

```bash
# Manual check
docker ps --filter "name=smpc-"
docker inspect smpc-app --format='{{.State.Health.Status}}'
```

#### 2. Network Connectivity
- Tests Docker network configuration
- Validates inter-container communication
- Checks DNS resolution between services

```bash
# Manual check
docker network ls | grep smpc-network
docker exec smpc-app ping -c 1 smpc-redis
docker exec smpc-app ping -c 1 smpc-ipfs
```

#### 3. Service Health Checks
- Redis availability and response
- IPFS API functionality
- Next.js application responsiveness

```bash
# Manual check
docker exec smpc-redis redis-cli ping
docker exec smpc-ipfs wget -q --spider http://localhost:5001/api/v0/version
curl -f http://localhost:3000
```

#### 4. Port Accessibility
- External port binding validation
- Application endpoint accessibility
- Blockchain RPC availability

```bash
# Manual check
curl -f http://localhost:3000
curl -f -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

#### 5. File System Mounts
- Volume mount verification
- Source code accessibility
- Configuration file presence

```bash
# Manual check
docker exec smpc-app ls -la /app/src
docker exec smpc-app test -f /app/data/health-schema-documentation.json
docker exec smpc-app test -d /app/contracts
```

#### 6. Environment Variables
- Critical environment variable presence
- Container configuration validation
- Service connection strings

```bash
# Manual check
docker exec smpc-app printenv NODE_ENV
docker exec smpc-app printenv REDIS_URL
docker exec smpc-app printenv IPFS_HTTP_API_URL
```

#### 7. Smart Contract Deployment
- Contract compilation verification
- Deployment address validation
- Blockchain interaction testing

```bash
# Manual check
docker exec smpc-app test -f /app/deployments/localhost-addresses.json
docker exec smpc-app cat /app/deployments/localhost-addresses.json
```

#### 8. Web3 Functionality
- Blockchain connectivity
- Account and balance verification
- Transaction capability testing

```bash
# Manual check
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
  http://localhost:8545
```

#### 9. API Endpoints
- Application API availability
- Data retrieval endpoints
- Authentication mechanisms

```bash
# Manual check
curl -f http://localhost:3000/api/algorithms
curl -f http://localhost:3000/api/sample-data
```

#### 10. Data Persistence
- Volume data retention
- Database persistence
- Configuration survival

```bash
# Manual check
docker exec smpc-redis test -d /data
docker exec smpc-ipfs test -d /ipfsdata
```

#### 11. Development Features
- Hot reload functionality
- Development tools availability
- Build system integration

```bash
# Manual check
docker exec smpc-app npm --version
docker exec smpc-app npx hardhat --version
```

#### 12. Security Configuration
- User privilege validation
- File permission verification
- Sensitive data protection

```bash
# Manual check
docker exec smpc-app whoami
docker exec smpc-app test ! -f /app/.env
```

## Manual Testing Procedures

### Pre-Testing Checklist

Before running tests, ensure:

1. **Docker Desktop is running**
   ```bash
   docker info
   ```

2. **All services are started**
   ```bash
   docker-compose ps
   ```

3. **No port conflicts exist**
   ```bash
   # Check if ports are free (Windows)
   netstat -ano | findstr :3000
   netstat -ano | findstr :8545
   
   # Check if ports are free (Linux/Mac)
   lsof -i :3000
   lsof -i :8545
   ```

### Step-by-Step Manual Testing

#### Test 1: Container Status Verification

1. Check all containers are running:
   ```bash
   docker ps
   ```
   Expected: All three containers (smpc-app, smpc-redis, smpc-ipfs) should be in "Up" status

2. Verify health status:
   ```bash
   docker ps --filter "health=healthy"
   ```
   Expected: All containers should show as healthy

#### Test 2: Application Access

1. Access the main application:
   ```bash
   curl http://localhost:3000
   ```
   Expected: HTTP 200 response with HTML content

2. Test specific pages:
   ```bash
   curl http://localhost:3000/dashboard
   curl http://localhost:3000/algorithms
   ```

#### Test 3: Blockchain Functionality

1. Test blockchain connection:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8545
   ```
   Expected: JSON response with block number

2. Check accounts:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
     http://localhost:8545
   ```
   Expected: Array of account addresses

#### Test 4: File Operations

1. Test IPFS functionality:
   ```bash
   # Add a test file
   echo "Hello IPFS" | curl -X POST -F file=@- http://localhost:5001/api/v0/add
   
   # Retrieve version info
   curl http://localhost:5001/api/v0/version
   ```

2. Test file upload via application:
   ```bash
   # Upload via the web interface or API
   curl -F "file=@test.txt" http://localhost:3000/api/data/upload
   ```

#### Test 5: Database Operations

1. Test Redis functionality:
   ```bash
   docker exec smpc-redis redis-cli ping
   docker exec smpc-redis redis-cli set test-key test-value
   docker exec smpc-redis redis-cli get test-key
   ```

2. Test application database integration:
   ```bash
   curl http://localhost:3000/api/test-redis
   ```

### User Interface Testing

1. **Open browser** and navigate to http://localhost:3000

2. **Test navigation**:
   - Click on Dashboard
   - Navigate to Data Provider interface
   - Access Data Consumer interface
   - Check Algorithm Management

3. **Test functionality**:
   - Try uploading a sample file
   - Create a computing request
   - Check algorithm selection
   - Verify sample data display

4. **Test MetaMask integration** (if available):
   - Connect to localhost:8545
   - Chain ID: 1337
   - Import test account with private key

## Performance Testing

### Load Testing

1. **Application load test**:
   ```bash
   # Install ab (Apache Bench) if not available
   apt-get install apache2-utils  # Ubuntu
   brew install httpie           # macOS
   
   # Test application performance
   ab -n 100 -c 10 http://localhost:3000/
   ```

2. **API endpoint testing**:
   ```bash
   # Test API performance
   ab -n 50 -c 5 http://localhost:3000/api/algorithms
   ```

### Resource Usage Monitoring

1. **Monitor container resources**:
   ```bash
   docker stats
   ```

2. **Check memory usage**:
   ```bash
   docker exec smpc-app cat /proc/meminfo
   docker exec smpc-redis redis-cli info memory
   ```

3. **Monitor disk usage**:
   ```bash
   docker system df
   docker volume ls
   ```

## Security Testing

### Basic Security Checks

1. **Verify non-root user**:
   ```bash
   docker exec smpc-app whoami
   # Should return: nextjs
   ```

2. **Check file permissions**:
   ```bash
   docker exec smpc-app ls -la /app/
   # Files should be owned by nextjs:nodejs
   ```

3. **Verify no sensitive files exposed**:
   ```bash
   docker exec smpc-app test ! -f /app/.env
   # Should exit with code 0 (file doesn't exist)
   ```

### Network Security

1. **Test internal network isolation**:
   ```bash
   # Should work (internal communication)
   docker exec smpc-app ping smpc-redis
   
   # Should not expose internal services externally
   nmap -p 6379 localhost  # Redis should not be accessible externally without explicit port mapping
   ```

## Integration Testing

### End-to-End Workflow Testing

1. **Complete user workflow**:
   - Start services: `docker-compose up -d`
   - Deploy contracts: Verify in logs or run manually
   - Access application: http://localhost:3000
   - Upload sample data
   - Create algorithm request
   - Execute computation
   - View results

2. **Cross-service integration**:
   ```bash
   # Test Redis integration
   curl -X POST http://localhost:3000/api/test-cache \
     -H "Content-Type: application/json" \
     -d '{"key": "test", "value": "integration"}'
   
   # Test IPFS integration
   curl -X POST http://localhost:3000/api/test-ipfs \
     -F "file=@test.txt"
   ```

### MetaMask Integration Testing

1. **Configure MetaMask**:
   - Network Name: Localhost 8545
   - RPC URL: http://localhost:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

2. **Import test account**:
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Should show ~10000 ETH balance

3. **Test transactions**:
   - Connect wallet in the application
   - Try contract interactions
   - Verify transaction history

## Test Results Analysis

### Understanding Test Output

The automated test script generates a JSON report:

```json
{
  "timestamp": "2025-08-28T10:30:00Z",
  "summary": {
    "total_tests": 50,
    "passed_tests": 48,
    "failed_tests": 2,
    "success_rate": "96.00%"
  },
  "environment": {
    "docker_version": "Docker version 20.10.21",
    "compose_version": "docker-compose version 1.29.2",
    "platform": "Linux x86_64"
  },
  "services_status": {
    "smpc_app": "Up 5 minutes",
    "smpc_redis": "Up 5 minutes", 
    "smpc_ipfs": "Up 5 minutes"
  }
}
```

### Success Criteria

- **Success Rate**: Should be ≥90%
- **Critical Tests**: All security and core functionality tests must pass
- **Service Health**: All containers should be healthy
- **Response Times**: API calls should respond within 5 seconds

### Performance Benchmarks

- **Application Start Time**: <60 seconds
- **API Response Time**: <2 seconds
- **Page Load Time**: <5 seconds
- **Memory Usage**: <2GB per container
- **CPU Usage**: <50% under normal load

## Troubleshooting Failed Tests

### Common Test Failures and Solutions

#### 1. Container Not Running
**Symptoms**: Service status tests fail
**Solutions**:
```bash
# Check container status
docker ps -a

# View container logs
docker-compose logs smpc-app

# Restart specific service
docker-compose restart smpc-app
```

#### 2. Port Binding Issues
**Symptoms**: Port accessibility tests fail
**Solutions**:
```bash
# Check port usage
netstat -tlnp | grep :3000

# Kill conflicting processes
sudo kill $(sudo lsof -t -i:3000)

# Restart with different ports
docker-compose down
# Edit docker-compose.yml
docker-compose up -d
```

#### 3. Network Connectivity Issues
**Symptoms**: Inter-service communication fails
**Solutions**:
```bash
# Recreate network
docker network rm smpc-network
docker network create smpc-network

# Restart all services
docker-compose down
docker-compose up -d
```

#### 4. Smart Contract Deployment Failures
**Symptoms**: Contract-related tests fail
**Solutions**:
```bash
# Redeploy contracts manually
docker exec smpc-app node scripts/simple-deploy.cjs

# Check Hardhat node
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

#### 5. File Mount Issues
**Symptoms**: File system tests fail
**Solutions**:
```bash
# Check volume mounts
docker inspect smpc-app | grep -A 20 "Mounts"

# Recreate with proper mounts
docker-compose down -v
docker-compose up -d
```

### Debug Mode Testing

Enable debug mode for detailed diagnostics:

```bash
# Set debug environment
DEBUG=smpc:* docker-compose up -d

# Run tests with verbose output
DEBUG=1 ./scripts/docker-test.sh

# Check detailed logs
docker-compose logs -f smpc-app | grep DEBUG
```

### Recovery Procedures

#### Complete Reset
```bash
# Stop all services
docker-compose down

# Remove all volumes (WARNING: destroys data)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Clean Docker system
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache
./scripts/docker-setup.sh
```

#### Selective Reset
```bash
# Reset specific service
docker-compose stop smpc-app
docker-compose rm smpc-app
docker-compose build --no-cache smpc-app
docker-compose up -d smpc-app
```

## Continuous Integration Testing

### Automated Testing in CI/CD

Example GitHub Actions workflow:

```yaml
name: Docker Tests
on: [push, pull_request]

jobs:
  docker-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Docker
        run: |
          docker --version
          docker-compose --version
      
      - name: Build and test
        run: |
          chmod +x scripts/*.sh
          ./scripts/docker-setup.sh
          ./scripts/docker-test.sh
      
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: docker-test-results.json
```

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Compatibility**: Docker 20.10+, Docker Compose 2.0+