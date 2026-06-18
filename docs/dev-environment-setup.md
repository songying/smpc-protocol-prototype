# Development Environment Setup Guide

Complete guide for setting up the SMPC Protocol development environment with all necessary dependencies and configuration fixes.

## 🎯 Overview

This guide covers the complete setup process for the SMPC Protocol development environment, including all dependency installations, configuration fixes, and common issue resolutions discovered during development sessions.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18+ (ES module support required)
- **npm**: Version 8+ (included with Node.js)
- **Git**: Latest version
- **Operating System**: Windows 10/11, macOS 12+, or Ubuntu 20.04+
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: Minimum 10GB free space

### Browser Requirements
- **MetaMask Extension**: Required for Web3 functionality
- **Modern Browser**: Chrome, Firefox, Edge, or Safari

## 🚀 Step-by-Step Installation

### Step 1: Clone and Initial Setup

```bash
# Clone the repository
git clone https://github.com/songying/smpc-protocol.git
cd smpc-protocol

# Install all dependencies (this may take 2-3 minutes)
npm install
```

**Expected Output**: ~1820 packages installed with some deprecation warnings (normal).

### Step 2: Install Global Dependencies

```bash
# Install Ganache globally for blockchain development
npm install -g ganache
```

**Note**: Ganache provides an alternative to Hardhat's built-in node for blockchain development.

### Step 3: Essential Development Dependencies

All these are already included in package.json, but for reference:

```bash
# Core Web3 dependencies (already installed)
# npm install ethers@6 @metamask/detect-provider

# Hardhat and blockchain tooling (already installed)
# npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Smart contract dependencies (already installed)  
# npm install @openzeppelin/contracts @openzeppelin/contracts-upgradeable

# Testing framework (already installed)
# npm install --save-dev jest @types/jest jest-environment-jsdom

# Additional utilities (already installed)
# npm install ioredis @types/ioredis jsonwebtoken crypto-js
```

## ⚙️ Configuration Fixes (Critical)

Due to ES module configuration in package.json, several files require specific formats:

### Fix 1: Hardhat Configuration
```bash
# Hardhat config must be CommonJS format
# File: hardhat.config.cjs (not .js)
```

Content should use:
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");
module.exports = { /* config */ };
```

### Fix 2: PostCSS Configuration
```bash
# PostCSS config must be CommonJS format
# File: postcss.config.cjs (not .js)
```

Content should use:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Fix 3: Next.js Configuration
```bash
# Next.js config uses ES module format
# File: next.config.js
```

Content should use:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = { /* config */ };
export default nextConfig;
```

### Fix 4: Tailwind Configuration
```bash
# Tailwind config uses ES module format
# File: tailwind.config.js
```

Content should use:
```javascript
/** @type {import('tailwindcss').Config} */
export default { /* config */ };
```

## 🚀 Starting the Development Environment

### Terminal 1: Blockchain Node
```bash
cd C:\src\smpc-protocol
npm run hardhat:node
```

**Expected Output**:
- Server starts at http://127.0.0.1:8545
- 20 test accounts displayed with 10,000 ETH each
- Chain ID: 1337

**Keep this terminal running** - it's your local blockchain.

### Terminal 2: Smart Contract Deployment
```bash
# Deploy contracts using the working CommonJS script
node scripts/simple-deploy.cjs
```

**Expected Output**:
```
🚀 Simple SMPC Protocol deployment...
✅ DataRegistry deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ FeeManagement deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ ComputingRequest deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
📄 Addresses saved to: deployments/localhost-addresses.json
```

### Terminal 3: Next.js Application
```bash
npm run dev
```

**Expected Output**:
- Next.js starts (may auto-increment port: 3000 → 3001 → 3002)
- "Ready in X seconds" message
- Application available at displayed localhost URL

## 🌐 Application Access

### Main Application
- **URL**: http://localhost:3000 (or auto-incremented port)
- **Status Check**: Should return HTTP 200

### Blockchain Node
- **URL**: http://127.0.0.1:8545
- **Chain ID**: 1337
- **Test Accounts**: 20 accounts with 10,000 ETH each

### Contract Addresses (Latest)
```
DataRegistry: 0x5FbDB2315678afecb367f032d93F642f64180aa3
FeeManagement: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ComputingRequest: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

## 🦊 MetaMask Configuration

### Add Local Network
1. Open MetaMask → Network dropdown
2. "Add network" → "Add a network manually"
3. Enter:
   - **Network Name**: `SMPC Local`
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `1337`
   - **Currency Symbol**: `ETH`

### Import Test Account
Use the first test account private key:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Account Address**: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
**Balance**: 10,000 ETH

## 🔧 Troubleshooting

### Issue 1: "require is not defined in ES module scope"
**Cause**: File has .js extension but needs CommonJS format
**Solution**: Rename file to .cjs and use `require()` / `module.exports`

### Issue 2: "PostCSS configuration must export a plugins key"
**Cause**: PostCSS config not in correct format for Next.js
**Solution**: Use postcss.config.cjs with module.exports format

### Issue 3: Port conflicts during development
**Cause**: Multiple services trying to use same port
**Solution**: Next.js auto-increments ports (3000→3001→3002)

### Issue 4: Contract deployment fails
**Cause**: Blockchain not running or wrong script format
**Solution**: 
1. Ensure `npm run hardhat:node` is running
2. Use `node scripts/simple-deploy.cjs` (not .js version)

### Issue 5: Application shows 500 error
**Cause**: Configuration file format errors
**Solution**: Check all config files use correct ES/CommonJS format

### Issue 6: "Cannot find package" errors
**Cause**: Dependencies not installed or corrupted
**Solution**: 
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🧪 Verification Commands

### Check Services Status
```bash
# Test blockchain
curl http://127.0.0.1:8545

# Test application (replace 3000 with actual port)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Should return: 200
```

### Check Contract Deployment
```bash
# Verify deployment files exist
ls deployments/
# Should show: localhost-addresses.json, localhost-deployment.json
```

### Check Application Build
```bash
# Test if application builds successfully
npm run build
```

## 📦 Additional Dependencies (Optional)

### For Production Deployment
```bash
npm install --save-dev hardhat-deploy dotenv tsx
```

### For Advanced Testing
```bash
npm install --save-dev jest-axe msw axios-mock-adapter
```

### For Redis Integration (Production)
```bash
# Requires Redis server running
npm install ioredis @types/ioredis
```

### For IPFS Integration (Production)
```bash
# Requires IPFS node running
npm install ipfs-http-client
```

## 🔄 Development Workflow

### Daily Startup
1. `npm run hardhat:node` (Terminal 1)
2. `node scripts/simple-deploy.cjs` (Terminal 2)
3. `npm run dev` (Terminal 3)
4. Open http://localhost:3000 (or displayed port)

### Making Changes
1. Code changes auto-reload in development
2. Smart contract changes require redeployment
3. Config changes may require restart

### Running Tests
```bash
# Smart contract tests
npm run test:contracts

# Frontend tests  
npm run test:frontend

# All tests
npm run test:all
```

## 📋 Environment Checklist

Before starting development, ensure:

- [ ] Node.js 18+ installed
- [ ] npm install completed successfully
- [ ] hardhat.config.cjs exists (not .js)
- [ ] postcss.config.cjs exists (not .js)
- [ ] scripts/simple-deploy.cjs exists
- [ ] MetaMask extension installed
- [ ] No port conflicts on 3000-3002 and 8545

## 🎯 Success Indicators

You've successfully set up the environment when:

- [ ] Hardhat node shows 20 test accounts
- [ ] Contract deployment completes without errors
- [ ] Next.js application returns HTTP 200
- [ ] MetaMask connects to local network
- [ ] Contract addresses saved to deployments folder

## 📚 Related Documentation

- [Getting Started Guide](getting-started.md) - User-focused quick start
- [CLI Commands Reference](clicmd.md) - All development commands
- [System Requirements](deployment/system-requirements.md) - Hardware specs
- [Production Deployment](deployment/README.md) - Production setup

---

**Last Updated**: 2025-08-22 (Session fixes applied)
**Environment**: Windows 11, Node.js 22.18.0, npm 10.8.2
**Status**: ✅ All installation commands verified and working