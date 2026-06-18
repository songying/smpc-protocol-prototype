# Getting Started with SMPC Protocol

Complete beginner's guide to running and using the SMPC Protocol demonstration platform.

## 🎯 What is SMPC Protocol?

SMPC Protocol is a demonstration platform implementing privacy-preserving data trading and computing with Web3 integration. It allows:

- **Data Providers** to monetize encrypted data while preserving privacy
- **Data Consumers** to perform computations on encrypted data without seeing the raw data
- **Auditors** to verify compliance and approve requests

## ⚡ Quick Setup (5 Minutes)

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **MetaMask Browser Extension** ([Install](https://metamask.io/))

### Step 1: Get the Code
```bash
git clone https://github.com/songying/smpc-protocol.git
cd smpc-protocol
npm install
```

### Step 2: Start the Blockchain
```bash
# Terminal 1 - Start local blockchain
npm run hardhat:node
```

Leave this terminal running. You'll see 20 test accounts with 10000 ETH each.

### Step 3: Deploy Smart Contracts
```bash
# Terminal 2 - Deploy contracts (use the working CommonJS script)
node scripts/simple-deploy.cjs
```

**Note**: Use the `.cjs` script to avoid ES module compatibility issues.

### Step 4: Start the Application
```bash
# Terminal 3 - Start Next.js app
npm run dev
```

**Note**: Next.js may auto-increment the port if 3000 is in use (3000→3001→3002).

### Step 5: Open the Application
Visit the URL shown in your terminal (typically **http://localhost:3000**, **3001**, or **3002**).

## 🦊 Configure MetaMask

### Add Local Network
1. Open MetaMask extension
2. Click network dropdown (top of MetaMask)
3. Click "Add network" → "Add a network manually"
4. Enter these details:
   - **Network Name**: `Localhost 8545`
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `1337`
   - **Currency Symbol**: `ETH`
5. Click "Save"

### Import Test Account
1. Click MetaMask account icon → "Import Account"
2. Select "Private Key"
3. Paste this test private key:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. Click "Import"

You should now see 10000 ETH balance on the Localhost 8545 network.

## 🎮 Using the Platform

### 1. Connect Your Wallet
- Visit http://localhost:3000
- Click "Connect Wallet"
- Approve MetaMask connection
- Sign the authentication message

### 2. Choose Your Role

**🏭 Data Provider**
- Upload and register datasets
- Set prices and privacy settings
- Track revenue and data usage
- Manage compliance requirements

**🔍 Data Consumer** 
- Browse available datasets (including personal data)
- Create computation requests with algorithm selection
- Choose from predefined algorithms (Linear Regression, Privacy-Preserving Clustering)
- Navigate through multi-step request workflow
- Retrieve encrypted results

**🛡️ Auditor**
- Review data compliance
- Approve computation requests and algorithms
- Verify privacy compliance
- Generate audit reports
- Review user-defined algorithm submissions

### 3. Test Core Features

**Register Data (as Data Provider):**
1. Switch to Data Provider role
2. Go to "Upload Data" section
3. Upload a sample file
4. Set metadata and pricing
5. Submit to smart contract

**Request Computation (as Data Consumer):**
1. Switch to Data Consumer role
2. Browse available datasets (including your personal health data)
3. Click "Request Access" to navigate to Create Request tab
4. Select algorithm from dropdown (Linear Regression Analysis, Privacy-Preserving Clustering)
5. Computing script auto-loads based on selected algorithm
6. Submit computation request with payment

**Manage Algorithms:**
1. Click "Algorithms" in top navigation
2. View existing algorithms (Linear Regression Analysis, Privacy-Preserving Clustering)
3. Upload new algorithms with source code and metadata
4. Set computation types (ZK, FHE, Third-party)

**Approve Request (as Auditor):**
1. Switch to Auditor role
2. Review pending requests (data access and algorithms)
3. Verify compliance requirements
4. Approve or reject requests

## 🔧 Understanding the System

### Smart Contracts
- **DataRegistry**: Manages data registration and metadata
- **ComputingRequest**: Handles computation requests and payments
- **FeeManagement**: Calculates and distributes fees
- **ApprovalManager**: Manages approval workflows
- **PrivacyCompliance**: Ensures regulatory compliance

### Current Contract Addresses (Latest Deployment)
```
DataRegistry: 0x5FbDB2315678afecb367f032d93F642f64180aa3
FeeManagement: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ComputingRequest: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

**Note**: Contract addresses are saved to `deployments/localhost-addresses.json` after each deployment.

### SMPC Features
- **Multi-Key FHE**: Homomorphic encryption for privacy-preserving computation
- **Secret Sharing**: Distribute data across multiple parties
- **Zero-Knowledge Proofs**: Verify computations without revealing data
- **Privacy Compliance**: Built-in GDPR/CCPA compliance checking

## 🚨 Common Issues

### Port Already in Use
```bash
# Kill existing processes
sudo kill -9 $(lsof -t -i:3000)
sudo kill -9 $(lsof -t -i:8545)
```

### MetaMask Connection Issues
1. Reset MetaMask account: Settings → Advanced → Reset Account
2. Ensure you're on "Localhost 8545" network
3. Check Chain ID is 1337

### Contract Deployment Fails
```bash
# Restart blockchain and redeploy with correct script
npm run hardhat:node  # Terminal 1
node scripts/simple-deploy.cjs  # Terminal 2 (use .cjs version)
```

### Blank Page or Errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
npm run dev
```

### ES Module Compatibility Issues
If you see "require is not defined" or PostCSS errors:

**Problem**: Configuration files need correct format for ES modules
**Solution**: Ensure these files exist with correct formats:
- `hardhat.config.cjs` (CommonJS format)
- `postcss.config.cjs` (CommonJS format)  
- `next.config.js` (ES module format)
- `tailwind.config.js` (ES module format)

See [Development Environment Setup](dev-environment-setup.md) for detailed fixes.

## 📊 What to Expect

### Performance
- Page loads: < 2 seconds
- Wallet connections: < 5 seconds  
- Contract transactions: 1-15 seconds (local blockchain)
- File uploads: Depends on file size

### Test Data
- 20 test accounts with 10000 ETH each
- Pre-deployed smart contracts
- Sample datasets for testing
- Mock computation results

## 🎓 Learning More

### Next Steps
- **Advanced Features**: See [Technical Specification](technical-specification.md)
- **Development**: Read [Development Phases](development-phases.md)
- **Deployment**: Check [Deployment Guide](deployment/README.md)
- **Architecture**: Review [System Architecture](guides/architecture.md)

### Key Concepts
- **SMPC**: Secure Multi-Party Computation
- **MKFHE**: Multi-Key Fully Homomorphic Encryption  
- **ZK Proofs**: Zero-Knowledge Proofs
- **Web3**: Decentralized web technologies

## ❓ Need Help?

- **Quick Issues**: Check [Troubleshooting](deployment/README.md#troubleshooting)
- **GitHub Issues**: [Report problems](https://github.com/songying/smpc-protocol/issues)
- **Documentation**: Browse [docs/README.md](README.md)
- **Commands**: Reference [clicmd.md](clicmd.md)

## 🎉 Success!

If you can:
- ✅ Connect MetaMask to localhost
- ✅ Switch between user roles
- ✅ Interact with smart contracts
- ✅ See real-time dashboard updates

**Congratulations!** You're running a complete privacy-preserving data trading platform.

---

**Ready to dive deeper?** 
- Explore the [Technical Documentation](technical-specification.md)
- Try [Production Deployment](deployment/README.md)
- Review the [Original Research](The%20Protocol%20of%20Privacy%20Data%20Trading%20and%20Computing%20with%20Web3.pdf)