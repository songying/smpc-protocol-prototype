# Docker Deployment Guide for SMPC Protocol

## Overview

This guide provides comprehensive instructions for deploying the SMPC (Secure Multi-Party Computation) Protocol platform using Docker containers. The Docker setup includes all necessary services and dependencies for both development and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Options](#deployment-options)
6. [Testing and Validation](#testing-and-validation)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Troubleshooting](#troubleshooting)
9. [Production Considerations](#production-considerations)

## Prerequisites

### System Requirements

- **Operating System**: Windows 10/11, macOS 12+, or Linux (Ubuntu 20.04+ recommended)
- **Memory**: Minimum 8GB RAM (16GB recommended for production)
- **Storage**: At least 20GB free disk space
- **Network**: Stable internet connection

### Required Software

1. **Docker Desktop** (recommended) or Docker Engine
   - Windows/Mac: [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: Install Docker Engine and Docker Compose

2. **Git** (for cloning the repository)
   - [Download Git](https://git-scm.com/downloads)

### Verify Installation

```bash
# Check Docker installation
docker --version
docker-compose --version

# Check Docker is running
docker info
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/smpc-protocol.git
cd smpc-protocol
```

### 2. Run the Setup Script

```bash
# Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh

# Run the Docker setup script
./scripts/docker-setup.sh
```

### 3. Access the Application

Once setup is complete, you can access:

- **SMPC Protocol Application**: http://localhost:3000
- **Hardhat Blockchain Node**: http://localhost:8545
- **IPFS Gateway**: http://localhost:8080
- **Redis (internal)**: localhost:6379

### 4. Verify Installation

```bash
# Run comprehensive tests
./scripts/docker-test.sh
```

## Architecture Overview

### Container Services

The Docker setup includes the following services:

#### 1. smpc-app
- **Purpose**: Main Next.js application with Hardhat blockchain node
- **Ports**: 3000 (HTTP), 8545 (Blockchain RPC)
- **Base Image**: Node.js 18 Alpine
- **Features**: 
  - Hot reload for development
  - Smart contract compilation and deployment
  - Web3 integration
  - Algorithm execution engine

#### 2. smpc-redis
- **Purpose**: Caching and session management
- **Port**: 6379
- **Base Image**: Redis 7 Alpine
- **Features**:
  - Data persistence
  - Memory optimization
  - Health monitoring

#### 3. smpc-ipfs
- **Purpose**: Distributed file storage
- **Ports**: 4001 (Swarm), 5001 (API), 8080 (Gateway)
- **Base Image**: IPFS Kubo
- **Features**:
  - File storage and retrieval
  - Distributed content delivery
  - API access for applications

### Network Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   smpc-app      │    │   smpc-redis    │    │   smpc-ipfs     │
│  (Next.js +     │◄──►│   (Cache &      │    │  (File Storage) │
│   Hardhat)      │    │   Sessions)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ smpc-network    │
│ (172.20.0.0/16) │
└─────────────────┘
```

## Environment Configuration

### Environment Files

The Docker setup uses `.env.docker` for configuration:

```bash
# Copy and customize environment file
cp .env.docker.example .env.docker
# Edit .env.docker with your specific settings
```

### Key Configuration Variables

```bash
# Application
NODE_ENV=development
PORT=3000

# Blockchain
NEXT_PUBLIC_CHAIN_ID=1337
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Services
REDIS_URL=redis://smpc-redis:6379
IPFS_HTTP_API_URL=http://smpc-ipfs:5001

# Security (change in production)
JWT_SECRET=docker_development_secret
ENCRYPTION_KEY=docker_encryption_key_32_chars_long
```

### Security Notes

- **Development**: Uses default keys for convenience
- **Production**: Must change all security-related variables
- **Never commit**: Production secrets to version control

## Deployment Options

### Option 1: Development Environment (Recommended)

```bash
# Start all services in development mode
docker-compose up -d

# Or with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

**Features**:
- Hot reload enabled
- Volume mounts for live code editing
- Development debugging tools
- Automatic contract deployment

### Option 2: Production Build

```bash
# Build production images
docker-compose build --target production

# Start in production mode
NODE_ENV=production docker-compose up -d
```

**Features**:
- Optimized production builds
- Security hardening
- Performance optimization
- Minimal attack surface

### Option 3: Single Container Development

```bash
# Build and run just the app container
docker build -t smpc-protocol .
docker run -p 3000:3000 -p 8545:8545 smpc-protocol
```

### Option 4: Custom Configuration

```bash
# Use custom docker-compose file
docker-compose -f docker-compose.custom.yml up -d
```

## Testing and Validation

### Automated Testing

The project includes comprehensive testing scripts:

```bash
# Run all Docker tests
./scripts/docker-test.sh

# View test results
cat docker-test-results.json
```

### Test Categories

1. **Service Status**: Verify all containers are running
2. **Network Connectivity**: Test inter-container communication
3. **Health Checks**: Validate service health endpoints
4. **Port Accessibility**: Confirm external access to services
5. **File Mounts**: Verify volume mounts are working
6. **Environment Variables**: Check configuration is loaded
7. **Smart Contracts**: Validate blockchain deployment
8. **Web3 Functionality**: Test blockchain interactions
9. **API Endpoints**: Verify application endpoints
10. **Data Persistence**: Confirm data survives restarts
11. **Development Features**: Test development workflow
12. **Security**: Basic security configuration checks

### Manual Testing

```bash
# Check container status
docker ps

# View logs
docker-compose logs -f smpc-app
docker-compose logs -f smpc-redis
docker-compose logs -f smpc-ipfs

# Execute commands in containers
docker exec -it smpc-app bash
docker exec -it smpc-redis redis-cli
```

### Health Monitoring

```bash
# Check container health
docker ps --filter "health=healthy"

# View health check details
docker inspect smpc-app --format='{{.State.Health}}'
```

## Monitoring and Logging

### Container Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs smpc-app
docker-compose logs smpc-redis
docker-compose logs smpc-ipfs

# Filter logs by time
docker-compose logs --since="1h" smpc-app
```

### Log Persistence

Logs are stored in named volumes:

- **Application logs**: `smpc-logs` volume
- **Redis logs**: Container logs via Docker
- **IPFS logs**: Container logs via Docker

### Monitoring Stack (Optional)

Enable monitoring with profiles:

```bash
# Start with monitoring
docker-compose --profile monitoring up -d

# Access Prometheus
open http://localhost:9090
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Problem**: `Error starting userland proxy: listen tcp 0.0.0.0:3000: bind: address already in use`

**Solution**:
```bash
# Find process using the port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change port
docker-compose down
# Edit docker-compose.yml to use different ports
docker-compose up -d
```

#### 2. Container Won't Start

**Problem**: Container exits immediately or fails health checks

**Solution**:
```bash
# Check container logs
docker-compose logs smpc-app

# Check container status
docker ps -a

# Rebuild with no cache
docker-compose build --no-cache smpc-app
docker-compose up -d smpc-app
```

#### 3. Smart Contracts Not Deployed

**Problem**: Application can't find deployed contracts

**Solution**:
```bash
# Deploy contracts manually
docker exec smpc-app node scripts/simple-deploy.cjs

# Check deployment files
docker exec smpc-app ls -la deployments/
docker exec smpc-app cat deployments/localhost-addresses.json
```

#### 4. IPFS Connection Issues

**Problem**: Cannot upload/download files from IPFS

**Solution**:
```bash
# Check IPFS container
docker exec smpc-ipfs ipfs version

# Test IPFS API
curl http://localhost:5001/api/v0/version

# Restart IPFS
docker-compose restart smpc-ipfs
```

#### 5. Redis Connection Errors

**Problem**: Application cannot connect to Redis

**Solution**:
```bash
# Test Redis connection
docker exec smpc-redis redis-cli ping

# Check Redis logs
docker-compose logs smpc-redis

# Verify network connectivity
docker exec smpc-app ping smpc-redis
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
DEBUG=smpc:* docker-compose up -d

# View debug logs
docker-compose logs -f smpc-app
```

### Clean Slate Restart

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Rebuild everything
docker-compose build --no-cache
docker-compose up -d
```

## Production Considerations

### Security Hardening

1. **Environment Variables**:
   ```bash
   # Use strong, unique secrets
   JWT_SECRET=$(openssl rand -base64 32)
   ENCRYPTION_KEY=$(openssl rand -base64 32)
   ```

2. **Network Security**:
   ```bash
   # Use custom networks
   # Implement SSL termination
   # Configure firewall rules
   ```

3. **Container Security**:
   ```bash
   # Use non-root users
   # Scan images for vulnerabilities
   # Keep images updated
   ```

### Performance Optimization

1. **Resource Limits**:
   ```yaml
   services:
     smpc-app:
       deploy:
         resources:
           limits:
             memory: 2G
             cpus: '1.0'
   ```

2. **Volume Optimization**:
   ```yaml
   volumes:
     smpc-redis-data:
       driver_opts:
         type: tmpfs
         device: tmpfs
   ```

### High Availability

1. **Load Balancing**:
   ```yaml
   services:
     smpc-proxy:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
   ```

2. **Health Checks**:
   ```yaml
   healthcheck:
     test: ["CMD", "/usr/local/bin/health-check.sh"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

3. **Data Backup**:
   ```bash
   # Regular backups
   docker run --rm -v smpc-redis-data:/data -v $(pwd):/backup alpine \
     tar -czf /backup/redis-backup-$(date +%Y%m%d).tar.gz /data
   ```

### Scaling

1. **Horizontal Scaling**:
   ```bash
   # Scale application instances
   docker-compose up -d --scale smpc-app=3
   ```

2. **Service Discovery**:
   ```yaml
   # Use external load balancer
   # Implement service mesh
   # Configure auto-scaling
   ```

## Command Reference

### Essential Commands

```bash
# Setup and start
./scripts/docker-setup.sh

# Test deployment
./scripts/docker-test.sh

# View status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Update images
docker-compose pull
docker-compose up -d

# Clean up
docker-compose down -v --rmi all
```

### Development Commands

```bash
# Start with file watching
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Execute in container
docker exec -it smpc-app bash

# Run tests in container
docker exec smpc-app npm test

# View container info
docker inspect smpc-app

# Monitor resources
docker stats
```

## Support and Updates

### Getting Help

1. **Check logs**: Use `docker-compose logs` for error details
2. **Run tests**: Use `./scripts/docker-test.sh` for diagnostics
3. **Documentation**: Check project README and documentation
4. **Issues**: Report problems via project issue tracker

### Staying Updated

```bash
# Update Docker images
docker-compose pull

# Update application code
git pull origin main

# Rebuild containers
docker-compose build --no-cache

# Update dependencies
docker exec smpc-app npm update
```

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Compatibility**: Docker 20.10+, Docker Compose 2.0+