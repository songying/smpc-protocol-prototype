# SMPC Protocol Project Structure

## Overview
This document outlines the complete project structure for the SMPC Protocol demonstration platform built with Next.js 14+, TypeScript, and supporting technologies.

## Root Directory Structure
```
smpc-protocol/
├── README.md
├── CLAUDE.md
├── LICENSE
├── package.json
├── package-lock.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── .env.local
├── .env.example
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── docs/
├── src/
├── contracts/
├── scripts/
├── tests/
├── public/
├── .github/
├── docker/
└── k8s/
```

## Source Code Structure (`src/`)
```
src/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles
│   │
│   ├── algorithms/              # User-defined algorithm management
│   │   └── page.tsx            # Algorithm management dashboard
│   │
│   ├── analytics/               # Data analytics and insights
│   │   └── page.tsx            # Analytics dashboard
│   │
│   ├── auth/                    # Authentication routes
│   │   └── page.tsx            # Auth page with wallet connection
│   │
│   ├── dashboard/               # Main dashboard routes
│   │   └── page.tsx            # Unified dashboard for all roles
│   │
│   ├── infrastructure/          # Infrastructure monitoring
│   │   └── page.tsx            # System health monitoring
│   │
│   ├── notifications/           # Notification management
│   │   └── page.tsx            # Notification center
│   │
│   └── api/                     # API routes
│       ├── algorithms/          # Algorithm management APIs
│       │   ├── route.ts        # CRUD operations
│       │   └── [id]/
│       │       └── route.ts    # Individual algorithm operations
│       │
│       ├── analytics/           # Analytics APIs
│       │   └── algorithms/
│       │       └── route.ts    # Algorithm performance analytics
│       │
│       ├── auth/               # Authentication APIs
│       │   ├── login/
│       │   │   └── route.ts    # Web3 login with nonce
│       │   ├── logout/
│       │   │   └── route.ts    # Session cleanup
│       │   ├── nonce/
│       │   │   └── route.ts    # Generate authentication nonce
│       │   └── refresh/
│       │       └── route.ts    # Token refresh
│       │
│       ├── audits/             # Audit system APIs
│       │   ├── route.ts        # Audit CRUD operations
│       │   └── [id]/
│       │       └── review/
│       │           └── route.ts # Audit review process
│       │
│       ├── computation/         # Computation request APIs
│       │   └── route.ts        # Request processing
│       │
│       ├── data/               # Data management APIs
│       │   ├── route.ts        # Data registry operations
│       │   ├── upload/
│       │   │   └── route.ts    # File upload handling
│       │   └── [id]/
│       │       └── route.ts    # Individual data operations
│       │
│       ├── execute/            # Algorithm execution APIs
│       │   ├── route.ts        # Execute algorithms
│       │   └── validate/
│       │       └── route.ts    # Validate execution parameters
│       │
│       ├── infrastructure/     # System monitoring APIs
│       │   └── route.ts        # Health checks and metrics
│       │
│       ├── notifications/      # Notification APIs
│       │   └── route.ts        # Real-time notifications
│       │
│       └── sample-data/        # Sample data APIs
│           ├── route.ts        # Generate sample datasets
│           ├── public/
│           │   └── route.ts    # Public sample data
│           └── schema/
│               └── route.ts    # Schema definitions
│
├── components/                   # Reusable React components
│   ├── ui/                      # Base UI components (shadcn/ui)
│   │   ├── badge.tsx           # Status badges and labels
│   │   ├── button.tsx          # Interactive buttons
│   │   ├── card.tsx            # Container cards
│   │   ├── progress.tsx        # Progress indicators
│   │   ├── scroll-area.tsx     # Scrollable containers
│   │   └── tabs.tsx            # Tabbed interfaces
│   │
│   ├── layout/                  # Layout components
│   │   ├── DashboardLayout.tsx # Main dashboard wrapper
│   │   ├── Header.tsx          # Top navigation header
│   │   ├── Sidebar.tsx         # Sidebar navigation
│   │   ├── Footer.tsx          # Page footer
│   │   ├── Navbar.tsx          # Main navigation bar
│   │   └── ThemeToggle.tsx     # Dark/light theme switcher
│   │
│   ├── auth/                    # Authentication components
│   │   ├── AuthGuard.tsx       # Route protection wrapper
│   │   └── WalletConnect.tsx   # Web3 wallet connection
│   │
│   ├── algorithms/              # User-defined algorithm components
│   │   ├── AlgorithmList.tsx   # Algorithm listing/browsing
│   │   ├── AlgorithmManagementDashboard.tsx # Full algorithm management
│   │   ├── AlgorithmUploadForm.tsx # Upload new algorithms
│   │   └── AuditorWorkflow.tsx # Algorithm approval workflow
│   │
│   ├── analytics/               # Analytics and monitoring components
│   │   └── DataProviderAnalytics.tsx # Provider performance analytics
│   │
│   ├── auditor/                 # Auditor-specific components
│   │   ├── AuditorDashboard.tsx # Main auditor interface
│   │   ├── AuditTrailInterface.tsx # Audit history viewer
│   │   ├── ComplianceVerificationInterface.tsx # Compliance checking
│   │   └── NotificationSystem.tsx # Auditor notifications
│   │
│   ├── data-consumer/           # Data consumer components
│   │   ├── ComputationRequestBuilder.tsx # Request creation interface
│   │   ├── DataDiscoveryInterface.tsx # Browse available datasets
│   │   ├── RequestManagementDashboard.tsx # Manage requests
│   │   └── ResultsViewerInterface.tsx # View computation results
│   │
│   ├── data-provider/           # Data provider components
│   │   ├── DataCatalog.tsx     # Data browsing interface
│   │   ├── DataProviderDashboard.tsx # Provider main dashboard
│   │   ├── EnhancedDataUploadForm.tsx # Advanced upload interface
│   │   ├── PrivacyComplianceManager.tsx # Privacy controls
│   │   └── RevenueTrackingDashboard.tsx # Revenue analytics
│   │
│   ├── execution/               # Algorithm execution components
│   │   └── AlgorithmExecutionInterface.tsx # Execute algorithms
│   │
│   ├── infrastructure/          # System monitoring components
│   │   └── InfrastructureMonitoringDashboard.tsx # System health
│   │
│   ├── mobile/                  # Mobile-specific components
│   │   ├── MobileDashboardLayout.tsx # Mobile dashboard wrapper
│   │   ├── MobileForms.tsx     # Mobile-optimized forms
│   │   ├── MobileNavigation.tsx # Mobile navigation
│   │   ├── MobileUtils.tsx     # Mobile utility functions
│   │   ├── PWAInstaller.tsx    # Progressive web app installer
│   │   └── index.ts            # Mobile exports
│   │
│   ├── notifications/           # Notification system components
│   │   ├── NotificationBadge.tsx # Notification counter badge
│   │   └── NotificationCenter.tsx # Notification management
│   │
│   ├── providers/               # React context providers
│   │   └── WagmiProvider.tsx   # Web3 provider wrapper
│   │
│   ├── realtime/                # Real-time monitoring components
│   │   ├── ComputationTracker.tsx # Track computation progress
│   │   ├── DataProviderMonitor.tsx # Monitor provider activities
│   │   ├── SystemHealthMonitor.tsx # System status monitoring
│   │   └── WebSocketManager.tsx # WebSocket connection manager
│   │
│   ├── sample-data/             # Sample data components
│   │   └── SampleDataExplorer.tsx # Explore sample datasets
│   │
│   ├── widgets/                 # Dashboard widget system
│   │   ├── DashboardGrid.tsx   # Widget container grid
│   │   ├── WidgetContainer.tsx # Individual widget wrapper
│   │   ├── types.ts            # Widget type definitions
│   │   └── widgets/            # Specific widget implementations
│   │       ├── ChartWidget.tsx # Chart visualization widget
│   │       ├── ListWidget.tsx  # List display widget
│   │       └── StatsWidget.tsx # Statistics display widget
│   │
│   ├── DataConsumerInterface.tsx # Main consumer interface
│   ├── DataProviderDashboard.tsx # Main provider dashboard
│   ├── DataUploadForm.tsx      # Basic data upload form
│   ├── DashboardClient.tsx     # Client-side dashboard wrapper
│   ├── ErrorBoundary.tsx       # Error handling boundary
│   ├── EventMonitor.tsx        # Event monitoring component
│   ├── NotificationSystem.tsx  # Global notification system
│   ├── RoleSwitcher.tsx        # User role switching
│   ├── SMPCComputationEngine.tsx # SMPC computation engine
│   ├── ThemeSwitcher.tsx       # Theme switching component
│   ├── WalletConnection.tsx    # Wallet connection manager
│   └── WalletConnector.tsx     # Alternative wallet connector
│
├── lib/                         # Utility libraries and configurations
│   ├── api/                     # API utilities
│   │   ├── middleware.ts       # API middleware functions
│   │   ├── types.ts            # API type definitions
│   │   └── utils.ts            # API helper utilities
│   │
│   ├── contracts/               # Smart contract interaction layer
│   │   ├── computing-request-service.ts # Computing request contract service
│   │   ├── contract-client.ts  # Base contract client
│   │   ├── data-registry-service.ts # Data registry contract service
│   │   ├── gas-optimizer.ts    # Gas optimization utilities
│   │   ├── hooks.ts            # Contract interaction hooks
│   │   ├── index.ts            # Contract utilities and formatters
│   │   └── transaction-monitor.ts # Transaction monitoring
│   │
│   ├── crypto/                  # Cryptographic utilities
│   │   ├── algorithm-encryption.ts # Algorithm-specific encryption
│   │   └── encryption.ts       # General encryption utilities
│   │
│   ├── database/                # Database utilities
│   │   ├── algorithm-schemas.ts # Algorithm database schemas
│   │   └── redis-client.ts     # Redis client configuration
│   │
│   ├── execution/               # Algorithm execution utilities
│   │   ├── algorithm-executor.ts # Execute user-defined algorithms
│   │   └── computation-router.ts # Route computations to appropriate engines
│   │
│   ├── mkfhe/                   # Multi-Key Fully Homomorphic Encryption
│   │   ├── config.ts           # MKFHE configuration
│   │   ├── engine.ts           # Main MKFHE engine
│   │   ├── index.ts            # MKFHE exports
│   │   ├── smpc-processor.ts   # SMPC computation processor
│   │   ├── types.ts            # MKFHE type definitions
│   │   └── dkg/                # Distributed Key Generation
│   │       ├── dkg-manager.ts  # DKG orchestration
│   │       ├── index.ts        # DKG exports
│   │       ├── key-storage.ts  # Secure key storage
│   │       ├── shamir.ts       # Shamir secret sharing
│   │       ├── threshold-decryption.ts # Threshold decryption
│   │       └── types.ts        # DKG type definitions
│   │
│   ├── notifications/           # Notification system
│   │   └── notification-service.ts # Notification handling service
│   │
│   ├── schemas/                 # Data validation schemas
│   │   └── validation.ts       # Zod validation schemas
│   │
│   ├── services/                # Business logic services
│   │   ├── algorithm-service.ts # Algorithm management service
│   │   └── synthetic-data-generator.ts # Generate synthetic test data
│   │
│   ├── storage/                 # Storage utilities
│   │   └── ipfs-client.ts      # IPFS client for decentralized storage
│   │
│   ├── auth.ts                  # Authentication configuration
│   ├── crypto.ts                # Core cryptographic functions
│   ├── redis.ts                 # Redis configuration
│   ├── wagmi.ts                 # Wagmi Web3 configuration
│   └── web3.ts                  # Web3 utilities and helpers
│
├── hooks/                       # Custom React hooks
│   └── useDataRegistry.ts      # Data registry contract hooks
│
├── stores/                      # State management (Zustand)
│   ├── auth-store.ts           # Authentication state management
│   └── web3-store.ts           # Web3 connection state management
│
├── contexts/                    # React context providers
│   ├── RoleContext.tsx         # User role context (Provider/Consumer/Auditor)
│   └── ThemeContext.tsx        # Theme context (Dark/Light mode)
│
├── types/                       # TypeScript type definitions
│   ├── contracts.ts            # Smart contract type definitions
│   └── index.ts                # Main type exports and interfaces
│
├── scripts/                     # Utility scripts
│   ├── generate-sample-data.ts # Generate sample datasets for testing
│   └── generate-sample-data-json.ts # Generate JSON sample data
│
├── styles/                      # Additional stylesheets
│   └── mobile.css              # Mobile-specific styles
│
└── test/                        # Testing infrastructure
    ├── accessibility/           # Accessibility testing
    │   └── a11y.test.tsx       # A11y compliance tests
    ├── e2e/                    # End-to-end tests
    │   └── smpc-platform.e2e.ts # Platform workflow tests
    ├── integration/             # Integration tests
    │   └── workflows.test.tsx  # Multi-component workflow tests
    └── test-utils.tsx          # Testing utilities and helpers
│
└── middleware.ts                # Next.js middleware for authentication routing
```

## Current Key Features by Directory

### Core Platform Features
- **🔐 Web3 Authentication**: MetaMask integration with nonce-based authentication
- **👥 Multi-Role System**: Data Provider, Data Consumer, and Auditor roles
- **🏗️ Smart Contracts**: Complete blockchain infrastructure for data trading
- **🎨 Modern UI/UX**: Responsive design with dark/light themes
- **📱 Mobile Support**: Mobile-optimized interfaces and PWA capabilities

### User-Defined Algorithm System (`/algorithms`)
- **📝 Algorithm Management**: Upload, edit, and manage custom algorithms
- **🔍 Algorithm Discovery**: Browse and search available algorithms
- **✅ Approval Workflow**: Auditor review and approval process
- **🔒 Encrypted Storage**: Secure algorithm source code storage
- **📊 Analytics**: Algorithm performance tracking and metrics

### Data Management (`/data-provider`, `/data-consumer`)
- **📤 Enhanced Upload**: Advanced data upload with encryption options
- **🔍 Data Discovery**: Browse available datasets with filtering
- **💰 Revenue Tracking**: Monitor earnings and data usage
- **🛡️ Privacy Controls**: GDPR/CCPA compliance management
- **📈 Analytics**: Usage statistics and performance metrics

### Secure Multi-Party Computation (`/lib/mkfhe`)
- **🔑 Multi-Key FHE**: Fully homomorphic encryption support
- **🤝 Distributed Key Generation**: Secure key sharing protocols
- **🔐 Threshold Cryptography**: Multi-party threshold decryption
- **⚡ SMPC Processing**: Privacy-preserving computation engine
```

## Smart Contracts Structure (`contracts/`)
```
contracts/
├── src/
│   ├── core/
│   │   ├── DataRegistry.sol
│   │   ├── ComputingRequest.sol
│   │   ├── FeeManagement.sol
│   │   ├── ApprovalManager.sol
│   │   └── PrivacyCompliance.sol
│   │
│   ├── utils/
│   │   ├── AccessControl.sol
│   │   ├── Pausable.sol
│   │   └── SafeMath.sol
│   │
│   └── interfaces/
│       ├── IDataRegistry.sol
│       ├── IComputingRequest.sol
│       └── IFeeManagement.sol
│
├── test/
│   ├── DataRegistry.test.js
│   ├── ComputingRequest.test.js
│   ├── FeeManagement.test.js
│   └── integration/
│       └── full-workflow.test.js
│
├── scripts/
│   ├── deploy.js
│   ├── verify.js
│   └── upgrade.js
│
├── hardhat.config.js
└── package.json
```

## Testing Structure (`tests/`)
```
tests/
├── unit/
│   ├── components/
│   ├── services/
│   ├── crypto/
│   └── utils/
│
├── integration/
│   ├── api/
│   ├── database/
│   ├── blockchain/
│   └── smpc/
│
├── e2e/
│   ├── auth.spec.ts
│   ├── data-trading.spec.ts
│   ├── computation.spec.ts
│   └── audit.spec.ts
│
├── security/
│   ├── auth-tests.ts
│   ├── crypto-tests.ts
│   ├── contract-security.ts
│   └── penetration-tests.ts
│
├── performance/
│   ├── load-tests.ts
│   ├── stress-tests.ts
│   └── benchmark.ts
│
└── fixtures/
    ├── test-data.json
    ├── mock-contracts.ts
    └── test-users.json
```

## Documentation Structure (`docs/`)
```
docs/
├── development-phases.md
├── phase1-foundation.md
├── phase2-blockchain.md
├── phase3-smpc-core.md
├── phase4-user-interface.md
├── phase5-security-testing.md
├── project-structure.md
├── technical-specification.md
├── api-documentation.md
├── user-guides/
│   ├── data-provider-guide.md
│   ├── auditor-guide.md
│   └── data-consumer-guide.md
├── deployment/
│   ├── local-setup.md
│   ├── production-deployment.md
│   └── monitoring.md
├── security/
│   ├── security-framework.md
│   ├── compliance-guide.md
│   └── audit-reports/
└── The Protocol of Privacy Data Trading and Computing with Web3.pdf
```

## Configuration Files

### Package.json Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "next-auth": "^4.24.0",
    "redis": "^4.6.0",
    "ethers": "^6.8.0",
    "wagmi": "^1.4.0",
    "viem": "^1.16.0",
    "zustand": "^4.4.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "react-hook-form": "^7.47.0",
    "zod": "^3.22.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.292.0"
  },
  "devDependencies": {
    "@types/node": "^20.8.0",
    "@types/react": "^18.2.0",
    "eslint": "^8.52.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^13.4.0",
    "playwright": "^1.39.0",
    "hardhat": "^2.18.0"
  }
}
```

### Environment Variables (.env.example)
```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Database
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/smpc_protocol

# Blockchain
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
PRIVATE_KEY=your-private-key-here

# IPFS
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# Encryption
ENCRYPTION_KEY=your-encryption-key-here
NEXT_PUBLIC_ENCRYPTION_ALGORITHM=AES-256-GCM

# Monitoring
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
SENTRY_DSN=your-sentry-dsn
```

## Key Features by Directory

### `/src/app` - Next.js App Router
- File-based routing with layout nesting
- Server and client components
- API routes with TypeScript
- Role-based route organization

### `/src/components` - Component Library
- Reusable UI components with Tailwind CSS
- Role-specific dashboard components
- Form components with validation
- Real-time status components

### `/src/crypto` - Cryptographic Implementation
- Multi-key fully homomorphic encryption
- Secret sharing protocols
- Zero-knowledge proof systems
- Post-quantum cryptography

### `/contracts` - Smart Contracts
- Solidity contracts for data trading
- Hardhat development environment
- Comprehensive testing suite
- Deployment and verification scripts

### `/tests` - Testing Framework
- Unit tests for all components
- Integration tests for workflows
- End-to-end testing with Playwright
- Security and performance testing

## Development Workflow

1. **Local Development**:
   ```bash
   npm install
   npm run dev
   ```

2. **Testing**:
   ```bash
   npm run test:unit
   npm run test:integration
   npm run test:e2e
   ```

3. **Smart Contract Development**:
   ```bash
   cd contracts
   npm install
   npx hardhat compile
   npx hardhat test
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

## Notes
- Follows Next.js 14 App Router conventions
- TypeScript throughout for type safety
- Modular architecture for scalability
- Comprehensive testing strategy
- Production-ready deployment configuration
- Security-first design approach