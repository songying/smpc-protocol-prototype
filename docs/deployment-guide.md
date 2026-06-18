# Deployment Guide for SMPC Protocol

This comprehensive guide covers the deployment process for the SMPC Protocol platform across different environments.

## Overview

The SMPC Protocol is a comprehensive privacy data trading platform consisting of:
- **Frontend:** Next.js 14 with React 18
- **Backend:** Next.js API routes with TypeScript
- **Databases:** MongoDB (persistent data) + Redis (sessions/cache)
- **SMPC Infrastructure:** Coordinator service + 3 MP-SPDZ computation nodes
- **Storage:** IPFS for distributed file storage
- **Blockchain:** Ethereum smart contracts with ZK-rollup support
- **Infrastructure:** Docker containerized microservices

## Prerequisites

### System Requirements

**Development Environment:**
- Node.js 18.17.0 or later
- npm 9.0.0 or later
- Redis Server 6.0 or later
- Git 2.30 or later

**Production Environment:**
- Ubuntu 20.04 LTS or later / Windows Server 2019 or later
- Docker 20.10 or later (recommended)
- SSL certificate for HTTPS
- Domain name and DNS configuration

### Environment Variables

Create environment files for different deployment stages:

**.env.local (Development)**
```bash
# Application
NEXT_PUBLIC_APP_NAME="SMPC Protocol"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Databases
MONGODB_URI="mongodb://smpc:smpc123@localhost:27017/smpc-protocol?authSource=admin"
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your-walletconnect-project-id"

# Blockchain
NEXT_PUBLIC_CHAIN_ID="1337"
NEXT_PUBLIC_RPC_URL="http://localhost:8545"
CONTRACT_DEPLOYER_PRIVATE_KEY="your-deployer-private-key"

# SMPC Configuration
SMPC_COORDINATOR_URL="http://localhost:8080"
MPSPDZ_NODES="localhost:9991,localhost:9992,localhost:9993"

# External APIs
NEXT_PUBLIC_IPFS_GATEWAY="http://localhost:18080/ipfs/"
IPFS_HTTP_API_URL="http://localhost:15001"
PINATA_API_KEY="your-pinata-api-key"
PINATA_SECRET_KEY="your-pinata-secret-key"

# Demo Mode
DEMO_MODE="true"
AUTO_ACCEPT_BIDS="true"
FAST_COMPUTATION="true"

# Monitoring
NEXT_PUBLIC_ENABLE_ANALYTICS="false"
```

**.env.production**
```bash
# Application
NEXT_PUBLIC_APP_NAME="SMPC Protocol"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV="production"

# Database
REDIS_URL="redis://production-redis:6379"
REDIS_PASSWORD="your-strong-redis-password"

# Authentication
JWT_SECRET="your-production-jwt-secret-64-chars-minimum"
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your-production-walletconnect-id"

# Blockchain
NEXT_PUBLIC_CHAIN_ID="1"
NEXT_PUBLIC_RPC_URL="https://mainnet.infura.io/v3/your-infura-key"
CONTRACT_DEPLOYER_PRIVATE_KEY="your-production-deployer-key"

# External APIs
NEXT_PUBLIC_IPFS_GATEWAY="https://gateway.pinata.cloud/ipfs/"
PINATA_API_KEY="your-production-pinata-key"
PINATA_SECRET_KEY="your-production-pinata-secret"

# Monitoring
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
SENTRY_DSN="your-sentry-dsn"
```

## Quick Start with Docker (Recommended)

### 1. Prerequisites
- Docker 20.10+ and Docker Compose V2
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

### 2. Clone and Launch

```bash
# Clone repository
git clone https://github.com/your-org/smpc-protocol.git
cd smpc-protocol

# Copy environment template
cp .env.example .env.local

# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Access the application
open http://localhost:3000
```

### 3. Verify Deployment

```bash
# Check all services are running
docker compose ps

# Test individual services
curl http://localhost:3000/api/health          # Next.js app
curl http://localhost:8080/health              # SMPC coordinator
curl http://localhost:9991/status              # MP-SPDZ node 1
curl http://localhost:9992/status              # MP-SPDZ node 2
curl http://localhost:9993/status              # MP-SPDZ node 3
curl http://localhost:15001/api/v0/version     # IPFS API
```

### 4. Run Healthcare Demo

```bash
# Execute the healthcare demo
npm run smpc:demo

# Or manually through the web interface
open http://localhost:3000/demo
```

## Development Deployment

### 1. Clone and Setup

```bash
# Clone repository
git clone https://github.com/your-org/smpc-protocol.git
cd smpc-protocol

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 2. Start Redis Server

**Using Docker:**
```bash
docker run -d \
  --name smpc-redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes
```

**Using Local Installation:**
```bash
# Ubuntu/Debian
sudo systemctl start redis-server

# macOS with Homebrew
brew services start redis

# Windows
# Use Redis for Windows or WSL
```

### 3. Generate Sample Data

```bash
# Generate synthetic health records
npm run data:generate

# Alternative JSON-based generation
npm run data:generate-json
```

### 4. Start Blockchain (Optional)

```bash
# Start local Hardhat network
npm run hardhat:node

# Deploy contracts (in another terminal)
npm run contracts:deploy
```

### 5. Run Development Server

```bash
# Start Next.js development server
npm run dev

# Application will be available at http://localhost:3000
```

### 6. Verify Installation

```bash
# Run tests
npm test

# Check Redis connection
redis-cli ping

# Verify contracts (if deployed)
npm run hardhat:console
```

## Production Deployment

### Option 1: Docker Deployment (Recommended)

#### 1. Create Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. Create Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

#### 3. Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale app=3
```

### Option 2: Traditional VPS Deployment

#### 1. Server Setup (Ubuntu 20.04+)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 2. Deploy Application

```bash
# Clone and setup
git clone https://github.com/your-org/smpc-protocol.git
cd smpc-protocol

# Install dependencies
npm ci --production

# Build application
npm run build

# Setup environment
cp .env.example .env.production
# Edit .env.production with production values

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 3. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'smpc-protocol',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/smpc-protocol',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

#### 4. Nginx Configuration

```nginx
# /etc/nginx/sites-available/smpc-protocol
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.pem;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /_next/static {
        alias /path/to/smpc-protocol/.next/static;
        expires 365d;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'" always;
}
```

### Option 3: Cloud Platform Deployment

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
# Add Redis database (Upstash or Redis Cloud)
```

#### AWS Deployment

```bash
# Using AWS Amplify
amplify init
amplify add hosting
amplify publish

# Or using AWS ECS with Fargate
# Use provided docker-compose.yml with ECS service definition
```

#### Digital Ocean App Platform

```yaml
# .do/app.yaml
name: smpc-protocol
services:
- name: web
  source_dir: /
  github:
    repo: your-org/smpc-protocol
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: "production"
databases:
- name: redis
  engine: REDIS
  version: "7"
```

## Database Setup

### Redis Configuration

#### Production Redis Settings

```bash
# /etc/redis/redis.conf
bind 127.0.0.1 ::1
protected-mode yes
requirepass your-strong-password
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

#### Redis Cluster (High Availability)

```bash
# Setup Redis Cluster with 6 nodes (3 masters, 3 replicas)
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

## Blockchain Deployment

### Smart Contract Deployment

```bash
# Compile contracts
npm run contracts:compile

# Deploy to testnet
npm run contracts:deploy:testnet

# Deploy to mainnet
npm run contracts:deploy:mainnet

# Verify contracts
npm run contracts:verify
```

### Network Configuration

```javascript
// hardhat.config.ts
networks: {
  localhost: {
    url: "http://127.0.0.1:8545"
  },
  sepolia: {
    url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [DEPLOYER_PRIVATE_KEY]
  },
  mainnet: {
    url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [DEPLOYER_PRIVATE_KEY],
    gasPrice: 20000000000
  }
}
```

## Monitoring and Maintenance

### Health Checks

```bash
# Application health
curl https://your-domain.com/api/health

# Redis health
redis-cli ping

# Application metrics
curl https://your-domain.com/api/metrics
```

### Logging

```bash
# PM2 logs
pm2 logs smpc-protocol

# Docker logs
docker-compose logs -f app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Strategy

```bash
# Redis backup
redis-cli BGSAVE

# Application data export
npm run data:export

# Database backup script
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
redis-cli --rdb $BACKUP_DIR/dump.rdb
```

### Updates and Maintenance

```bash
# Zero-downtime deployment
git pull origin main
npm ci --production
npm run build
pm2 reload ecosystem.config.js --env production

# Database migrations (if any)
npm run migrate

# Clear Redis cache if needed
redis-cli FLUSHDB
```

## Security Considerations

### SSL/TLS Setup

```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

### Firewall Configuration

```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Security Headers

```nginx
# Additional Nginx security headers
add_header Strict-Transport-Security "max-age=63072000" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## Performance Optimization

### Caching Strategy

```javascript
// Next.js cache configuration
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=59'
          }
        ]
      }
    ]
  }
}
```

### CDN Setup

```bash
# CloudFlare setup
# 1. Add domain to CloudFlare
# 2. Update nameservers
# 3. Enable caching rules
# 4. Configure SSL/TLS
```

## Troubleshooting

### Common Issues

**1. Redis Connection Issues**
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Check logs
sudo journalctl -u redis-server
```

**2. Application Not Starting**
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs smpc-protocol

# Restart application
pm2 restart smpc-protocol
```

**3. High Memory Usage**
```bash
# Monitor Redis memory
redis-cli info memory

# Monitor application memory
pm2 monit

# Check system resources
htop
df -h
```

### Performance Issues

```bash
# Application performance
npm run build:analyze

# Database performance
redis-cli --latency
redis-cli --stat

# Network performance
curl -w "@curl-format.txt" -o NUL -s https://your-domain.com
```

## Support and Resources

### Documentation Links
- [Next.js Production Guide](https://nextjs.org/docs/deployment)
- [Redis Production Guide](https://redis.io/docs/management/admin/)
- [PM2 Production Guide](https://pm2.keymetrics.io/docs/usage/quick-start/)

### Monitoring Tools
- **Application:** PM2 Monitoring, New Relic, DataDog
- **Infrastructure:** Prometheus + Grafana, CloudWatch
- **Logs:** ELK Stack, Splunk, CloudWatch Logs

### Backup Services
- **Database:** Redis Cloud, AWS ElastiCache backup
- **Application:** Git repositories, Docker registries
- **Files:** AWS S3, Google Cloud Storage

This deployment guide provides comprehensive instructions for deploying the SMPC Protocol across different environments. Choose the deployment method that best fits your infrastructure requirements and operational capabilities.