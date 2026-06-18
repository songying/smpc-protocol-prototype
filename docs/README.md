# SMPC Protocol Documentation

Welcome to the SMPC Protocol documentation! This is a demonstration platform for privacy-preserving data trading and computing with Web3 integration, implementing the protocol described in Chapter 4 of "The Protocol of Privacy Data Trading and Computing with Web3".

## 🌆 Current Status: **Fully Functional Demo**

✅ **Smart Contracts**: 5 core contracts deployed and tested  
✅ **Web3 Integration**: MetaMask authentication with role-based access  
✅ **SMPC Engine**: Multi-key FHE and secret sharing protocols  
✅ **User Interfaces**: Complete dashboards for all user roles  
✅ **Testing Suite**: 96 comprehensive tests (72% pass rate)  
✅ **Deployment**: Production-ready with Docker support  

## 🚀 Quick Start

### 🐳 Docker Deployment (Recommended)

The fastest way to get started is with Docker:

```bash
# Clone the repository
git clone https://github.com/songying/smpc-protocol.git
cd smpc-protocol

# Run with Docker (all services included)
docker-compose up -d

# Access the application
# Website: http://localhost:3000
# Redis: localhost:16379
# IPFS: localhost:15001 (API), localhost:18080 (Gateway)
```

### 🔧 Manual Development Setup

For local development without Docker:

```bash
# Install dependencies
npm install

# Terminal 1: Start blockchain
npm run hardhat:node

# Terminal 2: Deploy contracts  
node scripts/simple-deploy.cjs

# Terminal 3: Start application
npm run dev

# Open displayed URL (typically http://localhost:3000-3002)
```

**⚠️ Important**: Use `node scripts/simple-deploy.cjs` for deployment due to ES module configuration.

## 📚 Documentation Structure

### 🚀 Getting Started
- [**Getting Started Guide**](getting-started.md) - Complete beginner's guide
- [**Development Environment Setup**](dev-environment-setup.md) - Detailed setup with all fixes
- [**Deployment Guide**](deployment/README.md) - Production deployment instructions
- [**MetaMask Setup**](metamask-setup.md) - Local blockchain configuration
- [**System Requirements**](deployment/system-requirements.md) - Hardware and software requirements

### 🏗️ Development
- [**Development Phases**](development-phases.md) - 5-phase development approach
- [**Technical Specification**](technical-specification.md) - Complete system architecture
- [**Project Structure**](project-structure.md) - Codebase organization
- [**Architecture Guide**](guides/architecture.md) - System design overview

### 📌 User Guides
- [**Data Provider Guide**](phase4-user-interface.md#data-provider-dashboard) - Upload and monetize your data
- [**Data Consumer Guide**](phase4-user-interface.md#data-consumer-interface) - Request computations on encrypted data
- [**Auditor Guide**](phase4-user-interface.md#auditor-interface) - Verify compliance and approve requests

### 🔧 Technical Reference
- [**API Reference**](api/README.md) - REST and Smart Contract APIs
- [**Smart Contract Details**](phase2-blockchain.md) - Contract architecture and deployment
- [**SMPC Implementation**](phase3-smpc-core.md) - Cryptographic protocols
- [**Redis Schema**](redis-schema.md) - Database structure

### 🚀 Deployment
- [**Docker Deployment Guide**](docker-deployment.md) - Containerized deployment (recommended)
- [**Complete Deployment Guide**](deployment/README.md) - Local to production deployment
- [**System Requirements**](deployment/system-requirements.md) - Hardware and infrastructure needs
- [**Command Reference**](clicmd.md) - All CLI commands with examples
- [**Configuration Guide**](config.md) - Environment and network setup

### 🛡️ Security & Testing
- [**Security Framework**](phase5-security-testing.md) - GDPR/CCPA compliance implementation
- [**Testing Results**](phase2-task2.3-testing-complete.md) - Comprehensive test suite results
- [**Privacy Features**](technical-specification.md#security-specifications) - Privacy-preserving protocols
- [**Smart Contract Security**](technical-specification.md#smart-contract-system) - Contract security measures

## 🎯 Quick Navigation

### For Developers
```
docs/
├── development-phases.md         # 5-phase development approach
├── technical-specification.md    # Complete system architecture
├── project-structure.md          # Current codebase structure
├── phase2-blockchain.md          # Smart contract implementation
├── phase3-smpc-core.md           # SMPC protocol implementation
└── api/README.md                 # API documentation
```

### For Operators
```
docs/
├── deployment/
│   ├── README.md                 # Complete deployment guide
│   └── system-requirements.md    # Infrastructure requirements
├── clicmd.md                     # All CLI commands
├── config.md                     # Configuration guide
└── metamask-setup.md             # Local blockchain setup
```

### For Users
```
docs/
├── phase4-user-interface.md      # Complete UI guide for all roles
├── guides/architecture.md        # System overview
└── The Protocol of Privacy...pdf  # Original thesis reference
```

## 🔍 Find What You Need

### I want to...

**🚀 Run the demo locally**
→ [Docker Quick Start](#-docker-deployment-recommended) or [Manual Setup](#-manual-development-setup)

**💻 Understand the codebase**
→ [Project Structure](project-structure.md) and [Technical Specification](technical-specification.md)

**🏗️ See the development process**
→ [Development Phases](development-phases.md) - 5-phase implementation approach

**📊 Use as a data provider**
→ [Phase 4 User Interface Guide](phase4-user-interface.md#data-provider-dashboard)

**🔍 Request computations**
→ [Phase 4 User Interface Guide](phase4-user-interface.md#data-consumer-interface)

**🛡️ Audit and approve**
→ [Phase 4 User Interface Guide](phase4-user-interface.md#auditor-interface)

**🚀 Deploy to production**
→ [Docker Deployment](docker-deployment.md) or [Complete Deployment Guide](deployment/README.md)

**🔧 Integrate via API**
→ [API Reference](api/README.md) (note: some endpoints are demonstration-ready)

**🔐 Understand SMPC protocols**
→ [SMPC Core Implementation](phase3-smpc-core.md)

**🐛 Report issues**
→ [GitHub Issues](https://github.com/songying/smpc-protocol/issues)

**✨ Contribute improvements**
→ [Contributing Guidelines](../CONTRIBUTING.md)

## 📋 Project Status

| Component | Status | Details |
|-----------|--------|---------|
| 💻 **Core Platform** | ✅ **Complete** | Next.js app with full Web3 integration |
| 🔗 **Smart Contracts** | ✅ **Complete** | 5 core contracts deployed and tested |
| 🔐 **SMPC Engine** | ✅ **Complete** | MKFHE, secret sharing, ZK proofs |
| 🎨 **User Interfaces** | ✅ **Complete** | Role-based dashboards with dark/light themes |
| 🧪 **Testing** | ✅ **Complete** | 96 tests, 72% pass rate, comprehensive coverage |
| 🚀 **Deployment** | ✅ **Complete** | Docker, VPS, cloud deployment ready |
| 🧮 **Algorithm System** | ✅ **Complete** | User-defined algorithm management & execution |
| 📊 **Sample Data Integration** | ✅ **Complete** | Personal datasets with realistic health records |
| 📝 **Documentation** | ✅ **Complete** | Comprehensive docs updated with latest features |

## 🔍 Live Demo Information

**Docker Deployment Status:**
- 🌐 **Web Application**: http://localhost:3000 (Next.js + Web3)
- 🗄️ **Redis Database**: localhost:16379 (data storage)
- 📁 **IPFS Storage**: localhost:15001 (API), localhost:18080 (Gateway)
- ⚙️ **Blockchain Node**: Built-in Hardhat node (Chain ID: 1337)
- 📄 **Smart Contracts**: Auto-deployed and configured

**Manual Setup Status:**
- 🌐 **Local Application**: http://localhost:3000
- ⚙️ **Hardhat Blockchain**: http://127.0.0.1:8545 (Chain ID: 1337)  
- 📊 **Test Accounts**: 20 accounts with 10000 ETH each
- 📄 **Smart Contracts**: Deployed and verified

**Key Features You Can Test:**
1. **MetaMask Integration**: Connect wallet with local blockchain
2. **Role-Based Access**: Switch between Data Provider, Consumer, Auditor
3. **Smart Contract Interaction**: Register data, create requests, approve transactions
4. **SMPC Computations**: Privacy-preserving data processing
5. **Real-time Dashboard**: Live updates with Web3 events
6. **Algorithm Management**: Upload, manage, and execute custom algorithms
7. **Personal Dataset Access**: Browse your own health data (Joseph Jones, Linda Rodriguez)
8. **Multi-Step Request Workflow**: Complete data discovery to computation request flow

### 🔧 For Developers
- **Source Code**: Well-structured TypeScript/React codebase
- **Smart Contracts**: Solidity contracts with comprehensive tests
- **Deployment Scripts**: Automated deployment and configuration
- **Testing Suite**: Unit, integration, and E2E tests

## 🆘 Getting Help

### 💬 Community Support
- **GitHub Issues**: [Report bugs or ask questions](https://github.com/songying/smpc-protocol/issues)
- **GitHub Discussions**: [Share ideas and get community help](https://github.com/songying/smpc-protocol/discussions)
- **Documentation**: This comprehensive guide covers most use cases

### 🔧 Technical Support
- **Deployment Issues**: Check [Deployment Troubleshooting](deployment/README.md#troubleshooting)
- **Smart Contract Questions**: See [Technical Specification](technical-specification.md)
- **API Integration**: Reference [API Documentation](api/README.md)

## 📄 License

This project is licensed under the Apache License 2.0. See [LICENSE](../LICENSE) for details.

## 🔗 Related Resources

- **Main Repository**: [SMPC Protocol GitHub](https://github.com/songying/smpc-protocol)
- **Original Research**: See `The Protocol of Privacy Data Trading and Computing with Web3.pdf`
- **Live Demo**: http://localhost:3000 (after running `docker-compose up -d`)
- **System Requirements**: [Hardware/Software Specs](deployment/system-requirements.md)

---

<div align="center">

**[Main README](../README.md) • [Quick Start](#quick-start) • [Deployment Guide](deployment/README.md) • [Technical Docs](technical-specification.md)**

*SMPC Protocol - Privacy-Preserving Data Trading with Web3*

</div>