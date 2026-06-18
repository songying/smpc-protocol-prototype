# Testing Guide for SMPC Protocol

This document provides comprehensive information about the testing infrastructure and practices for the SMPC Protocol project.

## Overview

The SMPC Protocol project uses Jest as the primary testing framework with support for:
- Unit tests for individual components and services
- Integration tests for API endpoints and workflows
- Component tests for React components
- Mock implementations for external dependencies

## Test Structure

```
__tests__/                          # Main test directory
├── simple.test.ts                  # Basic test verification
├── lib/                           # Library/service tests
│   ├── database/
│   │   └── algorithm-schemas.test.ts
│   ├── execution/
│   │   └── algorithm-executor.test.ts
│   └── notifications/
│       └── notification-service.test.ts
├── app/api/                       # API endpoint tests
│   └── algorithms/
│       └── route.test.ts
└── components/                    # Component tests
    └── notifications/
        └── NotificationCenter.test.tsx

__mocks__/                         # Global mocks
└── wagmi.ts                       # Wagmi hooks mock

jest.config.cjs                   # Jest configuration
jest.setup.cjs                    # Test setup and global mocks
```

## Test Configuration

### Jest Configuration (jest.config.cjs)

The Jest configuration is set up to:
- Use CommonJS format to avoid ES module issues
- Support TypeScript and TSX files
- Handle Next.js imports and absolute paths
- Mock external dependencies like Redis and Web3 libraries
- Provide code coverage reporting
- Transform ES modules from node_modules when needed

### Test Setup (jest.setup.cjs)

Global test setup includes:
- Testing Library Jest DOM matchers
- Mock implementations for browser APIs (IntersectionObserver, ResizeObserver, localStorage, etc.)
- Console warning suppression for known issues
- Extended timeout for async operations

## Available Test Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only frontend tests
npm run test:frontend

# Run contract tests (Hardhat)
npm run test:contracts

# Run all tests (contracts + Jest)
npm run test:all
```

## Test Categories

### 1. Unit Tests

Testing individual functions, classes, and services in isolation.

**Example: Algorithm Database Tests**
```typescript
describe('AlgorithmDatabase', () => {
  it('should create a new algorithm successfully', async () => {
    // Test algorithm creation with mocked Redis
  })
})
```

**Coverage Areas:**
- Database schema operations (CRUD)
- Encryption/decryption services
- Algorithm validation logic
- Notification service functions
- Utility functions

### 2. Integration Tests

Testing the interaction between different components and services.

**Example: API Route Tests**
```typescript
describe('/api/algorithms API Routes', () => {
  it('should return list of algorithms for authenticated user', async () => {
    // Test full API request/response cycle
  })
})
```

**Coverage Areas:**
- API endpoint functionality
- Authentication middleware
- Database integration
- External service communication

### 3. Component Tests

Testing React components with mock dependencies.

**Example: Notification Center Tests**
```typescript
describe('NotificationCenter', () => {
  it('renders notification center when connected', async () => {
    // Test component rendering and user interactions
  })
})
```

**Coverage Areas:**
- Component rendering
- User interactions
- State management
- Props validation
- Error handling

### 4. Contract Tests

Testing smart contracts using Hardhat's testing framework.

```bash
npm run test:contracts
```

**Coverage Areas:**
- Contract deployment
- Function execution
- Event emission
- Access control
- Gas optimization

## Mocking Strategy

### External Dependencies

**Redis Client Mock**
```javascript
jest.mock('./src/lib/database/redis-client', () => ({
  get: jest.fn(),
  set: jest.fn(),
  // ... other Redis methods
}))
```

**Wagmi Hooks Mock**
```typescript
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: undefined,
    isConnected: false,
    // ... default values
  }))
}))
```

**Next.js Router Mock**
```javascript
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    // ... router methods
  })
}))
```

### Browser APIs

Mocked in jest.setup.cjs:
- `IntersectionObserver`
- `ResizeObserver`
- `window.matchMedia`
- `localStorage` / `sessionStorage`
- `window.ethereum` (MetaMask)

## Testing Best Practices

### 1. Test Structure

```typescript
describe('Component/Service Name', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup after each test
    jest.resetAllMocks()
  })

  describe('specific functionality', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test input'
      
      // Act
      const result = functionUnderTest(input)
      
      // Assert
      expect(result).toBe('expected output')
    })
  })
})
```

### 2. Async Testing

```typescript
it('should handle async operations', async () => {
  const mockResponse = { data: 'test' }
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResponse)
  })

  const result = await asyncFunction()
  
  await waitFor(() => {
    expect(result).toEqual(mockResponse)
  })
})
```

### 3. Error Handling

```typescript
it('should handle errors gracefully', async () => {
  mockService.mockRejectedValue(new Error('Test error'))
  
  await expect(functionUnderTest()).rejects.toThrow('Test error')
})
```

### 4. Mock Verification

```typescript
it('should call service with correct parameters', () => {
  const testData = { id: '123', name: 'test' }
  
  serviceFunction(testData)
  
  expect(mockService).toHaveBeenCalledWith(testData)
  expect(mockService).toHaveBeenCalledTimes(1)
})
```

## Coverage Requirements

The project aims for the following coverage thresholds:
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text:** Console output during test runs
- **LCOV:** For IDE integration
- **HTML:** Detailed browser-viewable report in `coverage/` directory
- **JSON Summary:** For CI/CD integration

## Running Tests

### Local Development

```bash
# Quick test run
npm test

# Development with file watching
npm run test:watch

# Full test suite with coverage
npm run test:coverage
```

### CI/CD Environment

```bash
# Production test run
CI=true npm run test:coverage

# Contracts + Frontend
npm run test:all
```

## Troubleshooting

### Common Issues

**1. ES Module Import Errors**
- Solution: Check jest.config.cjs transformIgnorePatterns
- Add problematic packages to transform list

**2. Redis Connection Errors**
- Solution: Tests use mocked Redis client
- Ensure mocks are properly configured in jest.setup.cjs

**3. Wagmi Hook Errors**
- Solution: Use the __mocks__/wagmi.ts mock
- Configure return values in test setup

**4. Async Test Timeouts**
- Solution: Increase timeout or use proper async/await patterns
- Use waitFor() for DOM updates

### Debug Mode

```bash
# Run tests with debug output
npm test -- --verbose

# Run specific test file
npm test -- __tests__/simple.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"
```

## Test Data Utilities

Global test utilities are available via `global.testUtils`:

```typescript
// Create mock algorithm data
const mockAlgorithm = global.testUtils.createMockAlgorithm({
  name: 'Custom Algorithm',
  computationType: 'zk'
})

// Create mock notification
const mockNotification = global.testUtils.createMockNotification({
  type: 'algorithm_approved',
  read: false
})

// Wait for async operations
await global.testUtils.waitForAsync(100)
```

## Custom Matchers

Extended Jest matchers for domain-specific assertions:

```typescript
// Validate Ethereum addresses
expect(address).toBeValidAddress()

// Validate algorithm IDs
expect(algorithmId).toBeValidAlgorithmId()

// Validate notification IDs
expect(notificationId).toBeValidNotificationId()
```

## Future Improvements

1. **E2E Testing:** Add Playwright or Cypress for end-to-end testing
2. **Visual Regression:** Add visual testing for UI components
3. **Performance Testing:** Add load testing for API endpoints
4. **Contract Coverage:** Improve smart contract test coverage
5. **Accessibility Testing:** Add automated accessibility testing with jest-axe

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate mocks for external dependencies
3. Ensure tests are deterministic and don't rely on external services
4. Include both positive and negative test cases
5. Update this documentation for new testing patterns or tools

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Hardhat Testing](https://hardhat.org/tutorial/testing-contracts)