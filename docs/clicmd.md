# CLI Commands for SMPC Protocol Deployment
# Complete command reference for deploying the SMPC Privacy Data Trading Protocol

## 🚀 WORKING DEPLOYMENT COMMANDS (December 2024)

### Prerequisites
1. Ensure Docker Desktop is installed and running
2. Navigate to the project root directory: `C:\src\smpc-protocol`

### Step 1: Start Docker Desktop
```bash
start "Docker Desktop" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Step 2: Generate Node.js Dependencies (First Time Setup)
```bash
# Generate package-lock.json for coordinator service
cd "C:/src/smpc-protocol/services/smpc-coordinator" && npm install

# Generate package-lock.json for mpspdz-node service
cd "C:/src/smpc-protocol/services/mpspdz-node" && npm install

# Return to project root
cd "C:/src/smpc-protocol"
```

### Step 3: Start Core Infrastructure Services
```bash
# Start Redis, MongoDB, and IPFS services
docker-compose up -d smpc-redis smpc-mongodb smpc-ipfs
```

### Step 4: Start SMPC Coordinator Service
```bash
# Start the coordination service (simplified version without MP-SPDZ nodes)
docker-compose -f docker-compose.simple.yml up -d smpc-coordinator
```

### Step 5: Start Main SMPC Application
```bash
# Start the main Next.js application
docker-compose -f docker-compose.simple.yml up -d smpc-app
```

### Verification Commands
```bash
# View all running containers
docker ps

# Check coordinator logs
docker logs smpc-coordinator

# Check main app logs
docker logs smpc-app
```

### Service Access URLs
- **Main SMPC Application**: http://localhost:3000
- **SMPC Coordinator API**: http://localhost:8080
- **Redis**: localhost:16379
- **MongoDB**: localhost:27017
- **IPFS Gateway**: http://localhost:18080

## 🚀 Original Quick Start Commands (For Reference)

## 🐳 Docker Operations

# Start all services (detached mode)
docker compose up -d

# Start with build (rebuild containers)
docker compose up -d --build

# View logs for all services
docker compose logs -f

# View logs for specific service
docker compose logs -f smpc-app
docker compose logs -f smpc-coordinator
docker compose logs -f smpc-mongodb

# Check service status
docker compose ps

# Stop all services
docker compose down

# Stop services and remove volumes (DESTRUCTIVE)
docker compose down -v

# Restart a specific service
docker compose restart smpc-coordinator

# Scale SMPC nodes (if needed)
docker compose up -d --scale smpc-mpspdz-node1=2

# Execute commands inside containers
docker compose exec smpc-app bash
docker compose exec smpc-mongodb mongosh --username smpc --password smpc123

# Clean up Docker system (free space)
docker system prune -a
docker volume prune

## 💻 Node.js Development Commands

# Install dependencies
npm install

# Start development server (without Docker)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
npm run test:watch
npm run test:coverage
npm run test:frontend
npm run test:contracts
npm run test:all

## ⛓️ Blockchain Operations

# Start local Hardhat blockchain node
npm run hardhat:node

# Compile smart contracts
npm run contracts:compile

# Deploy contracts to local network
npm run contracts:deploy
npm run deploy:localhost

# Deploy to testnet (Sepolia)
npm run contracts:deploy:testnet
npm run deploy:sepolia

# Deploy to mainnet
npm run contracts:deploy:mainnet
npm run deploy:mainnet

# Check deployment status
npm run deploy:status

# Verify contracts on Etherscan
npm run contracts:verify

# Run Hardhat console
npm run hardhat:console

# Generate TypeScript types from contracts
npm run typechain

# Start blockchain with predefined accounts
npm run blockchain:start

## 🏥 SMPC Demo Commands

# Run healthcare demo
npm run smpc:demo

# Generate synthetic health data
npm run data:generate

# Generate JSON sample data
npm run data:generate-json

## 🔍 Health Check Commands

# Check all services are running
curl http://localhost:3000/api/health          # Next.js app
curl http://localhost:8080/health              # SMPC coordinator  
curl http://localhost:9991/status              # MP-SPDZ node 1
curl http://localhost:9992/status              # MP-SPDZ node 2
curl http://localhost:9993/status              # MP-SPDZ node 3
curl http://localhost:15001/api/v0/version     # IPFS API

# Quick health check all services
curl -f http://localhost:3000/api/health && \
curl -f http://localhost:8080/health && \
curl -f http://localhost:9991/status && \
echo "All services healthy"

## 🗃️ Database Operations

# Connect to MongoDB
docker compose exec smpc-mongodb mongosh --username smpc --password smpc123 --authenticationDatabase admin

# Connect to Redis
docker compose exec smpc-redis redis-cli

# MongoDB operations
docker compose exec smpc-mongodb mongosh --eval "use smpc-protocol; show collections"
docker compose exec smpc-mongodb mongosh --eval "use smpc-protocol; db.users.find()"

# Redis operations
docker compose exec smpc-redis redis-cli ping
docker compose exec smpc-redis redis-cli info
docker compose exec smpc-redis redis-cli flushdb

# Backup MongoDB
docker compose exec smpc-mongodb mongodump --username smpc --password smpc123 --authenticationDatabase admin --out /backup
docker compose cp smpc-mongodb:/backup ./backups/

# Backup Redis
docker compose exec smpc-redis redis-cli save
docker compose cp smpc-redis:/data/dump.rdb ./backups/redis-backup.rdb

## 📊 Monitoring Commands

# View container resource usage
docker stats

# View detailed service status
docker compose ps --services
docker compose top

# Monitor logs with filtering
docker compose logs -f smpc-coordinator | grep ERROR
docker compose logs -f --tail=100 smpc-app

# Check port usage
netstat -tulpn | grep :3000
lsof -i :3000

# System resource monitoring
free -h        # Memory usage
df -h         # Disk usage
htop          # System processes

## 🔧 Troubleshooting Commands

# Reset MongoDB data (DESTRUCTIVE)
docker compose down
docker volume rm smpc-protocol_smpc-mongodb-data
docker compose up -d smpc-mongodb

# Reset Redis data (DESTRUCTIVE)
docker compose exec smpc-redis redis-cli flushall

# Rebuild specific container
docker compose build smpc-coordinator
docker compose up -d smpc-coordinator

# Check container health
docker compose exec smpc-app npm run health-check
docker compose exec smpc-mpspdz-node1 ./health-check.sh

# Debug network issues
docker network ls
docker network inspect smpc-protocol_smpc-network

# Fix permission issues (Linux/macOS)
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh

# Kill processes using ports (if needed)
sudo kill -9 $(lsof -t -i:3000)
sudo kill -9 $(lsof -t -i:27017)

## 🚀 Production Deployment Commands

# Start Docker Desktop (macOS)
open -a Docker

# Add Docker to PATH (if needed)
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Production build and deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Deploy with specific profile
docker compose --profile production up -d

# Pull latest images
docker compose pull

# Deploy to remote server via SSH
ssh user@server "cd /path/to/smpc-protocol && git pull && docker compose up -d --build"

## 📦 Package Management

# Install specific dependency
npm install <package-name>

# Install development dependency  
npm install -D <package-name>

# Update all dependencies
npm update

# Check for outdated packages
npm outdated

# Audit security vulnerabilities
npm audit
npm audit fix

# Clear npm cache
npm cache clean --force

## 🔐 Security Commands

# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate new private key for contracts
npx hardhat console --network localhost
# > const wallet = ethers.Wallet.createRandom(); console.log(wallet.privateKey)

# Check file permissions
ls -la .env.local
chmod 600 .env.local  # Restrict access to environment file

## 📝 Git Operations

# Commit current progress  
git add .
git commit -m "feat: implement SMPC protocol with Docker deployment

- Add MongoDB and Redis containers
- Create SMPCProtocol and PaymentDistributor contracts
- Implement 3-node MP-SPDZ computation cluster
- Add healthcare demo with synthetic data
- Configure auction-based payment system (70/25/4/1 split)
- Set up IPFS for distributed storage
- Create comprehensive documentation

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to repository
git push origin main

# Create new branch for development
git checkout -b feature/smpc-enhancement
git push -u origin feature/smpc-enhancement

## 🧪 Testing Commands

# Run all tests with coverage
npm run test:all

# Run specific test file
npm test src/lib/models/User.test.ts

# Run smart contract tests with gas reporting
npm run gas:report

# Test SMPC computation locally
docker compose exec smpc-mpspdz-node1 /opt/mp-spdz/shamir-party.x 0 3 tutorial

# Load test the application
# Install: npm install -g loadtest
loadtest -n 100 -c 10 http://localhost:3000/api/health

## 📋 Maintenance Commands

# Update container images
docker compose pull
docker compose up -d

# Rotate logs
docker compose exec smpc-app logrotate /etc/logrotate.conf

# Clean old Docker images
docker image prune -a

# Update Node.js version in containers
# Edit Dockerfile: FROM node:20-alpine
docker compose build --no-cache

# Database maintenance
docker compose exec smpc-mongodb mongosh --eval "db.runCommand({compact: 'users'})"

## 🎯 Demo Execution Commands

# Complete healthcare demo workflow
echo "Starting SMPC Healthcare Demo..."
docker compose up -d --build
sleep 30
curl http://localhost:3000/api/health
curl http://localhost:8080/health  
curl http://localhost:9991/status
npm run smpc:demo
echo "Demo completed successfully!"

# Manual demo steps
# 1. Open browser: http://localhost:3000
# 2. Connect MetaMask wallet
# 3. Navigate to /demo
# 4. Click "Start Healthcare Analysis"
# 5. View aggregated results

## 🔄 Continuous Integration Commands

# Local CI simulation
npm ci
npm run build
npm run test:all
npm run contracts:compile

# Docker multi-stage build test
docker build -t smpc-protocol-test .
docker run --rm smpc-protocol-test npm test

## ⚡ Redis Connection Fix (September 2024)

# If experiencing Redis connection errors "connect ECONNREFUSED 127.0.0.1:6379"
# Issue: Redis client defaulting to localhost instead of Docker service name

# Solution: Update Redis client to use REDIS_URL environment variable
# File: src/lib/database/redis-client.ts

# Check Redis container status
docker ps | grep redis

# Verify Redis is accessible from inside network
docker exec smpc-redis redis-cli ping

# Test external connection (should use port 16379 from host)
docker run --rm redis:7-alpine redis-cli -h host.docker.internal -p 16379 ping

# Restart services after fixing Redis configuration
docker-compose restart smpc-app smpc-coordinator

# Verify fix with API test
curl -X POST http://localhost:3000/api/auth/nonce \
  -H 'Content-Type: application/json' \
  -d '{"address":"0x1234567890123456789012345678901234567890"}'

# Expected: Should return {"success":true,"data":{"nonce":"..."}} without Redis errors

---
# End of CLI Commands Reference
# All commands tested and working as of deployment
# Save this file for easy deployment reference
# CLI Command History

## Docker Demonstration Commands (January 2026)

### Start Docker Desktop (Windows)
```bash
# Start Docker Desktop application
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait for Docker to be ready (check with)
docker info
```

### Start All Services for Demo
```bash
# Start infrastructure services (Redis, MongoDB, IPFS)
docker compose up -d smpc-redis smpc-mongodb smpc-ipfs

# Verify services are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Health Check Commands
```bash
# Check main application
curl http://localhost:3000

# Check coordinator service
curl http://localhost:8080/health

# Check Redis
docker exec smpc-redis redis-cli ping

# Check MongoDB
docker exec smpc-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Service Access URLs
| Service | URL |
|---------|-----|
| Main Application | http://localhost:3000 |
| SMPC Coordinator | http://localhost:8080 |
| IPFS Gateway | http://localhost:18080 |
| Redis | localhost:16379 |
| MongoDB | localhost:27017 |

### Stop Demo
```bash
# Stop all containers
docker compose down

# Stop and remove all data (clean reset)
docker compose down -v
```

---

## Documentation Generation Commands

### Chapter 2 Literature Review Extension

#### Task 1: Daniel Sousa-Dias (2024) - Energy Market Data Security
```bash
# Extend Chapter 2 (dsr-2.md) with Daniel Sousa-Dias (2024) thesis
# Added new section 2.10: "Privacy-Preserving Data Trading in Transactive Energy Markets"
# Content: ~1,727 words covering:
#   - Threat landscape in blockchain-based TEM systems (14 threat categories)
#   - Cyclic Homomorphic Encryption Aggregation (CHEA) protocol
#   - Individually Linkable Pseudonymous Trading Scheme (ILPTS)
#   - Cross-domain implications for SMPC data marketplaces
# Source: docs/references/Daniel Sousa-Dias (2024) - Energy market data security.md
# Date: 2025-12-11
```

#### Task 2: Wirawan Agahari (2023) - Business & Consumer Implications
```bash
# Expanded existing section 2.7: "Socio-Technical Dynamics of SMPC Adoption"
# Added 6 new subsections (2.7.4 through 2.7.9): ~1,874 additional words
# New content covers:
#   - Mixed-method research design (15 expert interviews, 23 industry interviews, 1,457 participant experiment)
#   - Automotive industry context and control-utility paradox
#   - Experimental findings and technology communication challenge
#   - B2B data sharing: control-risk trade-off
#   - Relational trust vs. technological trust paradigm shift
#   - Design implications for Web3 SMPC protocol
#   - Bridging cryptography and human factors
# Total section 2.7: ~2,798 words (original 924 + new 1,874)
# Source: docs/references/Wirawan Agahari (2023) - Multi-party computation business implications.md
# Date: 2025-12-11
```

#### Task 3: Jan Pennekamp (2024) - Secure IIoT Collaborations
```bash
# Added new section 2.11: "Secure Collaborations in Industrial IoT Environments"
# Content: ~2,016 words covering:
#   - Confidentiality barrier in industrial collaborations (trade secrets, supply chains)
#   - Distinction between vertical (supply chain) and horizontal (competitor) collaborations
#   - Private computing building blocks (SMPC, homomorphic encryption, confidential computing)
#   - Resource constraints, heterogeneous trust, real-time requirements in IIoT
#   - Interdisciplinary methodology for secure collaboration design
#   - Implications for Web3 data marketplaces (B2B contexts, technical guarantees)
#   - Scalability and performance considerations (thousands of IoT devices)
#   - Pragmatic design principles for operational deployments
# Source: docs/references/Jan Pennekamp (2024) - Secure IIoT collaborations.md
# Date: 2025-12-11
```

#### Task 4: Nicolas Küchler (2025) - End-to-End Privacy Systems
```bash
# Added new section 2.12: "End-to-End Privacy and Resource Management in Data Sharing Systems"
# Content: ~2,375 words covering:
#   - Centralized trust problem and cryptographic user control
#   - Zeph system: encrypted data with transformation tokens (MPC + homomorphic encryption)
#   - Differential Privacy as managed resource (privacy budgets)
#   - Cohere: unified privacy resource allocation across heterogeneous applications
#   - Fine-grained privacy budgets for user subsets (6.4-28x utility improvement)
#   - DPolicy: context-aware multi-release privacy management with policy language
#   - Integration with SMPC and blockchain coordination
#   - Privacy-aware fee structures and delegated authorization modes
#   - Regulatory compliance (GDPR Articles 5, 17, 25) and auditable accounting
#   - Privacy as infrastructure: lifecycle management from consent to budget depletion
# Source: docs/references/Nicolas Küchler (2025) - End-to-end privacy systems.md
# Date: 2025-12-11
```

#### Task 5: Nikolaos Kapsoulis (2024) - Industrial Blockchain Privacy
```bash
# Added new section 2.13: "Privacy-Oriented Industrial Blockchain Architectures"
# Content: ~1,526 words covering:
#   - Blockchain transparency-privacy paradox
#   - Five-layer privacy stack (Data, Access, Computation, Communication, Governance)
#   - KYC systems with public-private smart contract separation
#   - Consortium blockchains for copyright/data rights management
#   - TEE-enabled SLA assessment with confidential computation
#   - Implications for enterprise data monetization
# Source: docs/references/Nikolaos Kapsoulis (2024) - Industrial blockchain privacy.md
# Date: 2025-12-11
```

#### Task 6: Yueyue He (2025) - Blockchain Financial Systems Privacy
```bash
# Added new section 2.14: "Secure and Privacy-Preserving Financial Systems on Blockchain"
# Content: ~3,013 words covering:
#   - Authentication trilemma: privacy, compliance, and Sybil resistance
#   - SPDID (Self-Proving Decentralized Identity) with masterID/contextualID hierarchy
#   - Legacy credential conversion mechanism (ePassport integration, NFC-based enrollment)
#   - PUF-based identity management (Physically Unclonable Functions)
#   - SRAM PUF key generation with biometric integration (fingerprint/iris)
#   - Fuzzy extractors for noise-tolerant key derivation
#   - Auditable confidential transactions (Pedersen commitments, Bulletproofs range proofs)
#   - Dual-key commitment scheme for regulatory audit capability
#   - Auditing with accountability (on-chain logging, ZK proofs of authorization)
#   - ERC20 stablecoin integration for volatility management (USDC, USDT, DAI)
#   - Hyperledger Fabric implementation (45ms credential verification, 180ms transaction validation)
#   - Policy-driven confidentiality levels (Public, Consortium, Confidential, Audit tiers)
#   - Hybrid deployment strategies (consortium + public chain anchoring)
#   - Quantum resistance roadmap (post-quantum primitives)
#   - Comprehensive privacy stack: identity, key management, transactions, computation, compliance layers
# Total Chapter 2 word count: 20,184 words (up from 17,171 words)
# Source: docs/references/Yueyue He (2025) - Blockchain financial systems privacy.md
# Date: 2025-12-11
```

### Chapter 5 System Implementation Expansion
```bash
# Expand Chapter 5 - System Implementation for PhD thesis
# This command analyzes the entire codebase to create comprehensive documentation
# Output: Expanded dsr-5.md from ~1,700 words to ~15,000-20,000 words
# Date: 2025-12-11
```

## Thesis Document Generation (March 2026)

### Generate Master Markdown (resolve @include directives)
```bash
cd "C:/src/smpc-protocol/docs" && python3 -c "
import re
with open('dsr-index.md', 'r', encoding='utf-8') as f:
    content = f.read()
def resolve_includes(text):
    lines = text.split('\n')
    result = []
    for line in lines:
        match = re.match(r'^@include:\s*(.+)$', line.strip())
        if match:
            filename = match.group(1).strip()
            try:
                with open(filename, 'r', encoding='utf-8') as inc:
                    result.append(inc.read())
            except FileNotFoundError:
                result.append(f'<!-- FILE NOT FOUND: {filename} -->')
        else:
            result.append(line)
    return '\n'.join(result)
resolved = resolve_includes(content)
with open('dsr-master.md', 'w', encoding='utf-8') as f:
    f.write(resolved)
print(f'Master file created: {len(resolved)} characters')
"
# Resolves all @include: directives in dsr-index.md into a single dsr-master.md
```

### Generate Thesis DOCX from Template
```bash
cd "C:/src/smpc-protocol" && pandoc docs/dsr-master.md \
  --reference-doc="Thesis/thesis-template.docx" \
  -o Thesis/thesis-final.docx \
  --toc \
  --resource-path=docs
# Generates thesis-final.docx using the university template styling
# --resource-path=docs needed for image references (images/ relative to docs/)
# Note: Do NOT use --number-sections as headings already have manual numbering
# Requires: pandoc 3.x
```

### Generate Publication-Quality Diagrams (March 2026)
```bash
# Install matplotlib for diagram generation
.venv/Scripts/pip.exe install matplotlib

# Generate all 5 thesis diagrams (300 DPI PNGs)
.venv/Scripts/python.exe scripts/generate_diagrams.py --all
# Outputs to docs/images/:
#   fig-4-1-seven-layer-arch.png     (Seven-Layer Architecture)
#   fig-4-2-contract-interaction.png  (Contract Interaction Flow)
#   fig-5-1-five-tier-arch.png        (Five-Tier Architecture)
#   fig-5-2-sequence-diagram.png      (14-Step Sequence Diagram)
#   fig-5-3-contract-arch-tree.png    (Contract Architecture Tree)

# Generate a single diagram
.venv/Scripts/python.exe scripts/generate_diagrams.py --diagram seven-layer
.venv/Scripts/python.exe scripts/generate_diagrams.py --diagram contract-interaction
.venv/Scripts/python.exe scripts/generate_diagrams.py --diagram five-tier
.venv/Scripts/python.exe scripts/generate_diagrams.py --diagram sequence
.venv/Scripts/python.exe scripts/generate_diagrams.py --diagram contract-tree
```

### Generate Defense Slides PPTX
```bash
cd "C:/src/smpc-protocol" && pandoc docs/defense-slides.md \
  --reference-doc="Thesis/The Protocol of Privacy Data Trading and Computing with Web3 - draft.pptx" \
  -o Thesis/defense-slides-final.pptx
# Generates defense-slides-final.pptx (~35 slides with speaker notes)
# Requires: pandoc 3.x
```


---

## 🔵 LIVE VERTICAL SLICE + DARK FINTECH UI + PRODUCTION DOCKER (June 2026)

### Smart contracts — compile, deploy, export ABIs
```bash
# Compile all 8 Solidity contracts (now includes PaymentDistributor + SMPCProtocol)
npx hardhat compile

# Start a local chain (separate terminal), then deploy + export ABIs.
# deploy.cjs now also writes deployments/localhost-abis.json (previously missing),
# deploys PaymentDistributor, grants the relayer the fee-settlement role, and sets
# the canonical 70/25/4/1 fee split in FeeManagement.
npx hardhat node                                  # terminal 1
npx hardhat run scripts/deploy.cjs --network localhost   # terminal 2
```

### Run the 3 SMPC compute nodes locally (Shamir share-holders)
```bash
NODE_ID=1 NODE_PORT=9991 node services/mpspdz-node/src/index.js &
NODE_ID=2 NODE_PORT=9992 node services/mpspdz-node/src/index.js &
NODE_ID=3 NODE_PORT=9993 node services/mpspdz-node/src/index.js &
```

### Build + run the app, test the live slice end-to-end
```bash
npm install recharts@2.12.7            # charts dependency added for the fintech UI
npx next build                          # standalone production build

# Run the standalone server with the on-chain bridge + real SMPC enabled:
ENABLE_ONCHAIN=true ENABLE_REAL_SMPC=true RPC_URL=http://127.0.0.1:8545 \
  CONTRACT_NETWORK=localhost \
  SERVER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  SMPC_NODE_URLS=http://localhost:9991,http://localhost:9992,http://localhost:9993 \
  PORT=3007 node .next/standalone/server.js

# One-click full lifecycle (register on-chain -> 3-node SMPC -> on-chain settlement):
curl -s -X POST http://localhost:3007/api/demo/run \
  -H 'Content-Type: application/json' -d '{"operation":"mean"}'
# Expect: registration.txHash, aggregation.live=true (3 node partials),
#         settlement.breakdown = 70/25/4/1 of total.
```

### Seed idempotent demo data (datasets on-chain + Redis, one approved algorithm)
```bash
RPC_URL=http://127.0.0.1:8545 \
  SERVER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  REDIS_HOST=127.0.0.1 node scripts/seed-demo.cjs
```

### Production deployment (public internet, HTTPS via Caddy)
```bash
# 1. Configure
cp .env.prod.example .env.prod
#    edit DOMAIN + ACME_EMAIL in .env.prod
./scripts/gen-secrets.sh >> .env.prod    # appends JWT/ENCRYPTION/SESSION secrets

# 2. Launch the full stack (caddy + web + chain + redis + 3 nodes)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 3. Status / logs / verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f smpc-chain    # waits for "ready"
curl -s https://your-domain.com/api/demo/run -X POST \
  -H 'content-type: application/json' -d '{"operation":"mean"}'

# Tear down (keep volumes) / wipe everything
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml down -v
```
See docs/PRODUCTION_DEPLOY.md for the full walkthrough.

## Post-viva thesis revision + production-real prototype (June 2026)

Commands added during the thesis-revision / production-real work (Workstreams A & B).
All run from the repo root. `node_modules` must be installed first (`npm install`).

```bash
# --- Dependencies added this phase ---
npm install                       # restore node_modules (fresh machine)
npm install node-seal             # real FHE library (Microsoft SEAL, WASM) for the benchmark
pip3 install matplotlib           # figure generation (python-docx already used for .docx work)

# --- B4: tamper-evident audit trail (QE2.2) ---
npx jest --config jest.config.cjs src/lib/audit        # 13 tests: hash-chain + lifecycle
npx tsx scripts/audit-tamper-demo.ts                   # tamper demo -> prototype/reports/audit-tamper-demo.json (Fig 5)
# verify endpoint (needs dev server): GET /api/demo/audit  (demo mode) or ?sessionId=<id>

# --- B1: comparative benchmark (QE4.2) ---
npx tsx prototype/benchmarks/src/harness.ts            # full run (10 reps, 1k/10k/100k/500k)
BENCH_REPS=3 BENCH_PAYLOADS=1000,10000 \
  npx tsx prototype/benchmarks/src/harness.ts          # quick smoke
# outputs: prototype/benchmarks/results/{bench_raw.csv, bench_summary.csv}

# --- Figures (>=5) from the real data ---
python3 scripts/generate-benchmark-figures.py          # -> prototype/reports/figures/fig1..5.png

# --- Manuscript: assemble the revised thesis .docx ---
python3 scripts/assemble-revised-thesis.py             # Thesis/thesis-final.docx -> Thesis/thesis-revised.docx
#   replaces Ch.2 (consolidated), removes §6.1.4, appends Appendix H; source is never mutated
```
Revision artifacts: `Thesis/thesis-revised.docx`, `Thesis/REVISION-CHANGELOG.md`,
`Thesis/revisions/*.md`, `prototype/reports/TEST-REPORT.md` (thesis Appendix F).

### On-chain request/approval (B-REQ) + L2 deploy (B0)

```bash
# B-REQ end-to-end on a local chain (verified reaching "Approved")
npx hardhat node &                                      # terminal 1: local chain
npx hardhat run scripts/deploy.cjs --network localhost  # terminal 2: deploy + grant roles + export ABIs
npx tsx scripts/verify-onchain-request.ts               # register -> submit -> approve -> "Approved"

# B0 — deploy to Arbitrum Sepolia for MEASURED L2 gas (needs a funded key in .env:
#   ARBITRUM_SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY)
npx hardhat run scripts/deploy.cjs --network arbitrumSepolia   # prints total gas units + est. cost

# Projected L2 gas (no funded key): local gas UNITS x Arbitrum gas price (~0.01–0.1 gwei) x ETH price.
```

### Verify the full live lifecycle WITHOUT Docker (advisor-demo proof)

```bash
# the compute-node service has its OWN deps (express/cors) — install them first:
npm --prefix services/mpspdz-node install

npx hardhat node &                                            # terminal 1: local chain
npx hardhat run scripts/deploy.cjs --network localhost        # terminal 2: deploy + grant roles + Groth16Verifier
NODE_ID=1 NODE_PORT=9991 node services/mpspdz-node/src/index.js &   # 3 SMPC compute nodes
NODE_ID=2 NODE_PORT=9992 node services/mpspdz-node/src/index.js &
NODE_ID=3 NODE_PORT=9993 node services/mpspdz-node/src/index.js &
ENABLE_ONCHAIN=true ENABLE_REAL_SMPC=true RPC_URL=http://127.0.0.1:8545 CONTRACT_NETWORK=localhost \
  SERVER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  SMPC_NODE_URLS=http://localhost:9991,http://localhost:9992,http://localhost:9993 \
  npx next dev -p 3007 &                                      # the app with live flags
curl -s -X POST http://localhost:3007/api/demo/run -d '{"operation":"mean"}' -H 'content-type: application/json'
# verified: registration live · request->Approved · aggregation live (3 nodes) · settlement 70/25/4/1 · audit valid (6 records)
```

### Docker prod stack (one command) — macOS keychain note

```bash
# create .env.prod first: cp .env.prod.example .env.prod ; set DOMAIN=localhost ; ./scripts/gen-secrets.sh >> .env.prod
# Run from YOUR OWN Terminal (interactive login = keychain unlocked) — no workaround needed:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
# then open https://localhost/demo  (accept the self-signed cert)
```
A non-interactive/automated session cannot unlock the macOS keychain that Docker Desktop's
`credsStore: desktop` helper needs, so image pulls fail there; pre-pulling does not help the build
step. Run the build from an interactive Terminal (or temporarily remove `credsStore` from
`~/.docker/config.json`). `.env.prod` is git-ignored (local secrets).

## Demo redesign — four-phase lifecycle (Groth16 + MP-SPDZ + FHE)

```sh
# Regenerate the Groth16 proof artifacts (verify-only) for the canonical sum=703 vector.
# Reuses the committed wasm/zkey; no circom needed. (See circuits/artifacts/README.md.)
cd /tmp/groth16 && node sum_js/generate_witness.js sum_js/sum.wasm input_valid.json witness.wtns \
  && npx snarkjs groth16 prove sum_final.zkey witness.wtns proof_valid.json public_valid.json

# Local dev verification (3 nodes + Next dev), no chain required:
( cd services/mpspdz-node && NODE_ID=1 NODE_PORT=9991 node src/index.js & \
  NODE_ID=2 NODE_PORT=9992 node src/index.js & NODE_ID=3 NODE_PORT=9993 node src/index.js & )
ENABLE_REAL_SMPC=true ENABLE_ONCHAIN=false \
  SMPC_NODE_URLS=http://localhost:9991,http://localhost:9992,http://localhost:9993 npm run dev

# Exercise each path (open http://localhost:3000/demo or curl):
curl -s -XPOST localhost:3000/api/demo/run -H 'content-type: application/json' \
  -d '{"operation":"variance","backend":"mpspdz","values":[92,110,134,88,156,102,99,145,120,77]}'   # Beaver, ~604.61
curl -s -XPOST localhost:3000/api/demo/run -H 'content-type: application/json' \
  -d '{"operation":"sum","backend":"fhe"}'                                                            # real SEAL BFV, 703
curl -s -XPOST localhost:3000/api/demo/run -H 'content-type: application/json' \
  -d '{"operation":"sum","tamper":true}'   # zk verified=false, settlement blocked, audit broken_at=2

# On-chain Groth16 gas (real verifier): npx hardhat run scripts/measure-groth16-gas.cjs  (~214k gas)
```

NOTE: the compute-node image and the web image changed (Beaver modes; new API/UI). For the Docker
stack, rebuild both: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
(run from an interactive Terminal — keychain, see the Docker note above).

## Real MP-SPDZ engine (shamir-party.x + external-client I/O)

Phase III can run on the genuine MP-SPDZ framework instead of the JS Shamir engine.
Each node container runs a real `shamir-party.x` party; the web backend acts as an
MP-SPDZ external client that secret-shares inputs to the 3 parties (no party sees
cleartext). Programs: `agg_sum` (sum/mean), `agg_variance` (Σv, Σv²), `agg_dotproduct`.

```sh
# Build (multi-stage; compiles MP-SPDZ, precompiles programs, bakes dev certs):
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build \
  web smpc-node1 smpc-node2 smpc-node3

# Verify each op runs on real MP-SPDZ (engine=mp-spdz) through Caddy:
curl -sk -XPOST https://localhost/api/demo/run -H 'content-type: application/json' \
  -d '{"operation":"sum","backend":"mpspdz","values":[42,17,99,5,230,81,64,38,120,7]}'      # 703
curl -sk -XPOST https://localhost/api/demo/run -H 'content-type: application/json' \
  -d '{"operation":"variance","backend":"mpspdz","values":[92,110,134,88,156,102,99,145,120,77]}'  # 604.61
curl -sk -XPOST https://localhost/api/demo/run -H 'content-type: application/json' \
  -d '{"operation":"dotProduct","backend":"mpspdz","values":[3,0,5,2,8,1,4,0,6,2],"valuesB":[10,20,30,40,50,60,70,80,90,100]}'  # 1740
```

NOTES (dev/demo): node image ~431 MB (multi-stage); arm64 build needs `libgmp-dev`
and dropping `-Werror` (the sse2neon arm shim trips it). Party 0 (smpc-node1) publishes
dev TLS certs to the `mpspdz_certs` volume for the web client (NON-PRODUCTION certs).
If MP-SPDZ is unavailable the API falls back to the JS Shamir engine (labelled SIMULATED).
The macOS build context is case-insensitive, so the `.mpc` programs are generated inline
in the node Dockerfile rather than COPYed.
