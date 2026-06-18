import nextJest from 'next/jest.js'

// Providing the path to your Next.js app which will enable loading next.config.js and .env files
const createJestConfig = nextJest({ dir: './' })

// Custom Jest configuration
const customJestConfig = {
  // Setup files to run before each test
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test environment
  testEnvironment: 'jest-environment-jsdom',
  
  // Module name mapping for absolute imports and assets
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/test/(.*)$': '<rootDir>/src/test/$1',
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/test/**/*',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  
  // Enhanced coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Coverage reporting
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true
    }]
  },
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Transform node_modules that use ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(viem|@wagmi|wagmi)/)'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/src/test/e2e/',
  ],
  
  // Watch plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Custom test environments for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/components/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/test/integration/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'accessibility',
      testMatch: ['<rootDir>/src/test/accessibility/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testEnvironment: 'jsdom',
    },
  ],
  
  // Performance settings
  maxWorkers: '50%', // Use half of available CPU cores
  
  // Verbose output for CI
  verbose: process.env.CI ? true : false,
}

// Export Jest configuration
export default createJestConfig(customJestConfig)