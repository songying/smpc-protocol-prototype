# SMPC Protocol Deployment Guide

Complete deployment guide for the SMPC Protocol platform with tested instructions for local development, staging, and production environments.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ 
- Git
- Redis (optional for full features)

### 1-Minute Setup
```bash
# Clone repository
git clone https://github.com/songying/smpc-protocol.git
cd smpc-protocol

# Install dependencies
npm install

# Start blockchain (Terminal 1)
npm run hardhat:node

# Deploy contracts (Terminal 2)
npm run contracts:compile
npm run contracts:deploy

# Start application (Terminal 3)
npm run dev

# Access application
open http://localhost:3000
```

## 🏗️ System Components

The SMPC Protocol consists of:
- **Next.js Application** (Frontend + API)
- **Smart Contracts** (Ethereum/Hardhat)
- **Redis** (Caching and sessions) - Optional for basic operation
- **IPFS** (Decentralized storage) - Optional for basic operation

## 🏗️ Current Architecture

```
┌─────────────────────────────────────────────────┐
│                 Next.js App                     │
│  ┌─────────────┐    ┌──────────────────────┐    │
│  │  Frontend   │    │      API Routes      │    │
│  │   (React)   │    │   (/api/auth, etc)   │    │
│  └─────────────┘    └──────────────────────┘    │
└──────────────┬──────────────────┬───────────────┘
               │                  │
    ┌──────────▼─────────┐ ┌──────▼──────┐
    │   Hardhat Node     │ │   Redis     │
    │ (Local Blockchain) │ │ (Optional)  │
    │   Port: 8545       │ │ Port: 6379  │
    └────────────────────┘ └─────────────┘
```

**Current Status:**
- ✅ Next.js application running on port 3000
- ✅ Hardhat blockchain on port 8545 with deployed contracts
- ✅ Smart contracts compiled and deployed
- ❌ Redis (not required for basic operation)
- ❌ IPFS (not required for basic operation)

## 🌐 Deployment Options

### 1. Vercel (Recommended for Frontend)

**Advantages:**
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Built-in analytics
- Free tier available

**Steps:**
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy with automatic builds on push

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### 2. Docker + Cloud Providers

**Supported Platforms:**
- AWS (ECS, EKS, Lambda)
- Google Cloud (Cloud Run, GKE)
- Azure (Container Instances, AKS)
- DigitalOcean (App Platform, Droplets)

### 3. Traditional VPS/Server

**Requirements:**
- Linux server (Ubuntu 20.04+ recommended)
- Node.js 18+
- Nginx (reverse proxy)
- PM2 (process manager)
- SSL certificate

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Domain name configured
- [ ] SSL certificate obtained
- [ ] Environment variables prepared
- [ ] Database provisioned
- [ ] External services configured

### Security Checklist
- [ ] Environment variables secured
- [ ] API keys rotated
- [ ] Firewall configured
- [ ] HTTPS enabled
- [ ] Security headers set

### Performance Checklist
- [ ] Assets optimized
- [ ] Caching configured
- [ ] Database indexed
- [ ] CDN setup
- [ ] Monitoring enabled

## ⚙️ Environment Configuration

### Local Development (No .env needed)
The application works out of the box with these defaults:
```bash
# Blockchain
CHAIN_ID=1337
RPC_URL=http://127.0.0.1:8545
PORT=3000

# Contracts (auto-deployed to localhost)
DataRegistry: 0x5FbDB2315678afecb367f032d93F642f64180aa3
FeeManagement: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ApprovalManager: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
PrivacyCompliance: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
ComputingRequest: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

### Production Environment Variables
Create `.env.local` for production:
```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
PORT=3000

# Blockchain (Mainnet)
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY

# Blockchain (Sepolia Testnet)
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Optional Services
REDIS_URL=redis://localhost:6379
IPFS_API_URL=http://localhost:5001

# Security (for production)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secure-secret-here
```

### Network Configuration

**Local Development (Default):**
```bash
# Automatic configuration - no setup needed
Chain ID: 1337
RPC URL: http://127.0.0.1:8545
Contracts: Auto-deployed on startup
Test Accounts: 20 accounts with 10000 ETH each
```

**Sepolia Testnet:**
```env
# Add to .env.local
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# Then deploy contracts: npm run deploy:sepolia
```

**Mainnet (Production):**
```env
# Add to .env.local
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# Then deploy contracts: npm run deploy:mainnet
```

## 🐳 Docker Deployment

### Dockerfile (Updated for Current Project)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### Docker Compose (Complete Setup)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_CHAIN_ID=1337
      - NEXT_PUBLIC_RPC_URL=http://hardhat:8545
    depends_on:
      - hardhat
      - redis
    restart: unless-stopped

  hardhat:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - .:/app
    ports:
      - "8545:8545"
    command: npm run hardhat:node
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

### Deploy with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# Deploy contracts to Hardhat node
docker-compose exec app npm run contracts:compile
docker-compose exec app npm run contracts:deploy

# View logs
docker-compose logs -f app
docker-compose logs -f hardhat

# Scale application (if needed)
docker-compose up -d --scale app=2
```

## ☁️ Cloud Provider Guides

### AWS Deployment

#### Using AWS App Runner
```bash
# Create apprunner.yaml
cat > apprunner.yaml << 'EOF'
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm ci
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 3006
  env:
    - name: NODE_ENV
      value: production
EOF
```

#### Using ECS with Fargate
```json
{
  "family": "smpc-protocol",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "smpc-protocol",
      "image": "your-account.dkr.ecr.region.amazonaws.com/smpc-protocol:latest",
      "portMappings": [
        {
          "containerPort": 3006,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/smpc-protocol",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Platform

#### Using Cloud Run
```bash
# Build and push container
gcloud builds submit --tag gcr.io/PROJECT_ID/smpc-protocol

# Deploy to Cloud Run
gcloud run deploy smpc-protocol \
  --image gcr.io/PROJECT_ID/smpc-protocol \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### Azure Container Instances

```bash
# Create resource group
az group create --name smpc-protocol --location eastus

# Deploy container
az container create \
  --resource-group smpc-protocol \
  --name smpc-protocol-app \
  --image your-registry/smpc-protocol:latest \
  --cpu 1 --memory 2 \
  --ports 3006 \
  --environment-variables NODE_ENV=production \
  --restart-policy Always
```

## 🔧 Server Setup (VPS/Dedicated)

### Ubuntu 20.04+ Setup Script

```bash
#!/bin/bash
# SMPC Protocol Server Setup

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install git -y

# Install Nginx (for reverse proxy)
sudo apt install nginx -y

# Install Redis (optional)
sudo apt install redis-server -y
sudo systemctl enable redis-server

# Verify installations
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"
```

### Production Deployment Steps

```bash
# Clone repository
git clone https://github.com/songying/smpc-protocol.git
cd smpc-protocol

# Install dependencies
npm install

# Compile smart contracts
npm run contracts:compile

# Build Next.js application
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'smpc-hardhat',
      script: 'npm',
      args: 'run hardhat:node',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'smpc-app',
      script: 'npm',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_CHAIN_ID: 1337,
        NEXT_PUBLIC_RPC_URL: 'http://localhost:8545'
      }
    }
  ]
}
EOF

# Start Hardhat node first
pm2 start ecosystem.config.js --only smpc-hardhat

# Wait for blockchain to start, then deploy contracts
sleep 10
npm run contracts:deploy

# Start the application
pm2 start ecosystem.config.js --only smpc-app

# Save PM2 configuration
pm2 save
pm2 startup
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/smpc-protocol
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers for Web3 apps
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss: ws:" always;

    # Main application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Optional: Expose RPC endpoint (be careful with security)
    location /rpc {
        proxy_pass http://127.0.0.1:8545;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Add CORS headers for Web3 requests
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
    }
}
```

## 📊 Monitoring and Logging

### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart smpc-protocol
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop

# Check system resources
htop
iotop
df -h
free -h
```

### Log Rotation
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/smpc-protocol

# Add configuration
/home/user/.pm2/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 user user
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 🛡️ Security Hardening

### Firewall Configuration
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install snapd
sudo snap install --classic certbot

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Environment Security
```bash
# Set proper file permissions
chmod 600 .env.production
chown user:user .env.production

# Use systemd for PM2
pm2 startup systemd -u user --hp /home/user
```

## 🔍 Health Checks

### Application Health Check
```bash
# Create health check endpoint
curl -f http://localhost:3006/api/health || exit 1
```

### Automated Monitoring
```bash
# Install monitoring service (example with New Relic)
npm install newrelic

# Configure monitoring
cat > newrelic.js << 'EOF'
exports.config = {
  app_name: ['SMPC Protocol'],
  license_key: 'your_license_key',
  distributed_tracing: {
    enabled: true
  }
}
EOF
```

## 🚨 Troubleshooting

### Quick Diagnostic Commands

```bash
# Check all SMPC services
pm2 status

# Check if ports are available
sudo netstat -tlnp | grep :3000  # Next.js app
sudo netstat -tlnp | grep :8545  # Hardhat node
sudo netstat -tlnp | grep :6379  # Redis

# View application logs
pm2 logs smpc-app
pm2 logs smpc-hardhat

# Test blockchain connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

### Common Issues & Solutions

**Port Already in Use:**
```bash
# Find and kill processes
sudo lsof -i :3000 && sudo kill -9 $(lsof -t -i:3000)
sudo lsof -i :8545 && sudo kill -9 $(lsof -t -i:8545)
```

**Blockchain Connection Issues:**
```bash
# Restart Hardhat node
pm2 restart smpc-hardhat
# Wait 10 seconds then redeploy contracts
sleep 10 && npm run contracts:deploy
```

**Application Won't Start:**
```bash
# Clear Next.js cache
rm -rf .next/
npm run build
pm2 restart smpc-app
```

**Contract Deployment Fails:**
```bash
# Check Hardhat node is running
curl http://localhost:8545
# Recompile and deploy
npm run contracts:compile
npm run contracts:deploy
```

### Important File Locations

```bash
# Application logs
~/.pm2/logs/smpc-app-out.log     # Application output
~/.pm2/logs/smpc-app-error.log   # Application errors
~/.pm2/logs/smpc-hardhat-out.log # Blockchain output

# Configuration files
~/smpc-protocol/ecosystem.config.js  # PM2 config
/etc/nginx/sites-available/smpc-protocol  # Nginx config
~/smpc-protocol/.env.local  # Environment variables

# Smart contract artifacts
~/smpc-protocol/artifacts/  # Compiled contracts
~/smpc-protocol/deployments/  # Deployment info

# System logs
/var/log/nginx/access.log   # Nginx access
/var/log/nginx/error.log    # Nginx errors
```

## ✅ Deployment Verification

### Quick Health Check
```bash
# Test local deployment
curl http://localhost:3000/api/health  # Should return 200 OK
curl http://localhost:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'  # Should return block number

# Test MetaMask connection
open http://localhost:3000
# Should show SMPC Protocol dashboard with wallet connect option
```

### Production Checklist
- [ ] Application accessible at domain
- [ ] HTTPS certificate working
- [ ] Smart contracts deployed
- [ ] Database connected (if using Redis)
- [ ] PM2 processes running
- [ ] Nginx reverse proxy configured
- [ ] Firewall rules applied
- [ ] SSL certificate auto-renewal setup
- [ ] Monitoring and alerting configured

## 📋 System Requirements Reference

See [System Requirements](system-requirements.md) for detailed hardware and software specifications.

## 📞 Support

**Quick Help:**
- **GitHub Issues**: [Report deployment problems](https://github.com/songying/smpc-protocol/issues)
- **Documentation**: Check [docs/README.md](../README.md) for guides
- **Command Reference**: See [docs/clicmd.md](../clicmd.md) for all CLI commands

**Common Solutions:**
- Port conflicts: Kill existing processes on 3000/8545
- Permission issues: Check file ownership and chmod 755
- Network issues: Verify firewall allows required ports
- SSL issues: Use Let's Encrypt certbot for certificates

---

## 📈 Next Steps After Deployment

1. **Configure MetaMask**: Follow [MetaMask Setup Guide](../metamask-setup.md)
2. **Test Smart Contracts**: Use the dashboard to register data and create computation requests
3. **Monitor Performance**: Set up logging and monitoring for production
4. **Scale Infrastructure**: Add load balancing and horizontal scaling as needed

**Production-Ready Features:**
- ✅ Role-based authentication (Data Provider, Consumer, Auditor)
- ✅ Smart contract interaction with Web3 wallets
- ✅ Real-time dashboard with dark/light themes
- ✅ SMPC computation engine
- ✅ Privacy compliance features
- ✅ Comprehensive testing suite (96 tests)