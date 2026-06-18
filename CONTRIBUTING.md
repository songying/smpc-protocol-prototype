# Contributing to SMPC Protocol

Thank you for your interest in contributing to the SMPC Protocol! This document provides guidelines and information for contributors.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Git
- MetaMask browser extension
- Basic understanding of:
  - React/Next.js
  - TypeScript
  - Solidity
  - Web3/Ethereum

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/smpc-protocol.git
   cd smpc-protocol
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 📋 How to Contribute

### 🐛 Reporting Bugs

1. **Check existing issues** first to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Include relevant information**:
   - OS and browser version
   - Node.js version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### ✨ Requesting Features

1. **Check existing feature requests**
2. **Use the feature request template**
3. **Provide clear description**:
   - Use case and motivation
   - Proposed solution
   - Alternative solutions considered
   - Additional context

### 🔧 Code Contributions

#### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

#### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature
   
   - Implement feature X
   - Add tests for feature X
   - Update documentation
   
   Closes #123"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Create Pull Request**
   - Use the PR template
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure CI passes

## 📝 Coding Standards

### TypeScript/React Guidelines

- **Use TypeScript** for all new code
- **Follow React Hooks** patterns
- **Use functional components** over class components
- **Implement proper error boundaries**
- **Use semantic HTML** and accessibility features

```typescript
// ✅ Good
interface UserProps {
  name: string;
  email: string;
}

export function UserProfile({ name, email }: UserProps) {
  return (
    <div className="user-profile">
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// ❌ Avoid
export function UserProfile(props: any) {
  return (
    <div>
      <h2>{props.name}</h2>
      <p>{props.email}</p>
    </div>
  );
}
```

### Solidity Guidelines

- **Follow OpenZeppelin standards**
- **Use latest Solidity version** (0.8.19+)
- **Implement proper access controls**
- **Add comprehensive NatSpec documentation**
- **Write thorough tests**

```solidity
// ✅ Good
/**
 * @title DataRegistry
 * @dev Contract for managing encrypted data registrations
 * @author SMPC Protocol Team
 */
contract DataRegistry is AccessControl, Pausable {
    /// @notice Emitted when new data is registered
    event DataRegistered(
        bytes32 indexed dataHash,
        address indexed provider,
        string metadataURI
    );
    
    /**
     * @notice Register encrypted data with metadata
     * @param _dataHash Hash of the encrypted data
     * @param _metadataURI URI pointing to data metadata
     * @param _price Price in wei for data access
     */
    function registerData(
        bytes32 _dataHash,
        string memory _metadataURI,
        uint256 _price
    ) external whenNotPaused {
        // Implementation
    }
}
```

### CSS/Styling Guidelines

- **Use Tailwind CSS** utility classes
- **Follow mobile-first** responsive design
- **Implement dark mode** support
- **Use semantic color names**

```tsx
// ✅ Good
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
    Title
  </h2>
</div>

// ❌ Avoid
<div style={{ backgroundColor: '#ffffff', padding: '24px' }}>
  <h2>Title</h2>
</div>
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run frontend tests
npm run test:frontend

# Run contract tests  
npm run test:contracts

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

#### Frontend Tests (Jest + React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfile } from '../UserProfile';

describe('UserProfile', () => {
  test('renders user information', () => {
    render(<UserProfile name="John Doe" email="john@example.com" />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

#### Smart Contract Tests (Hardhat + Chai)

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('DataRegistry', () => {
  it('should register data correctly', async () => {
    const DataRegistry = await ethers.getContractFactory('DataRegistry');
    const registry = await DataRegistry.deploy();
    
    const dataHash = ethers.utils.id('test-data');
    await registry.registerData(dataHash, 'ipfs://metadata', 100);
    
    const data = await registry.getData(dataHash);
    expect(data.price).to.equal(100);
  });
});
```

## 📖 Documentation

### Code Documentation

- **Add JSDoc comments** for all public functions
- **Document complex algorithms**
- **Include usage examples**
- **Update README** for new features

### API Documentation

- **Document all API endpoints**
- **Include request/response examples**
- **Specify error codes and messages**
- **Update OpenAPI specifications**

## 🔍 Code Review Process

### Before Requesting Review

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No console.log or debug code
- [ ] Accessible UI components
- [ ] Performance implications considered

### Review Criteria

Reviewers will check for:

- **Functionality**: Does the code work as intended?
- **Security**: Are there any security vulnerabilities?
- **Performance**: Is the code optimized?
- **Maintainability**: Is the code readable and well-structured?
- **Testing**: Are there adequate tests?
- **Documentation**: Is the code properly documented?

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Types

- **Alpha**: Early development versions
- **Beta**: Feature-complete pre-releases
- **RC**: Release candidates
- **Stable**: Production-ready releases

## 🎯 Areas for Contribution

### High Priority
- [ ] Smart contract security audits
- [ ] MKFHE performance optimizations
- [ ] Mobile responsive improvements
- [ ] Accessibility enhancements

### Medium Priority
- [ ] Additional chart types for analytics
- [ ] Batch data processing features
- [ ] Advanced filtering options
- [ ] Internationalization (i18n)

### Documentation
- [ ] API reference improvements
- [ ] Tutorial videos
- [ ] Architecture diagrams
- [ ] Integration examples

## 🆘 Getting Help

### Communication Channels

- **GitHub Discussions**: For general questions and ideas
- **GitHub Issues**: For bug reports and feature requests
- **Discord** (coming soon): Real-time chat with maintainers

### Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Ethereum Development](https://ethereum.org/developers/)
- [Microsoft SEAL](https://github.com/Microsoft/SEAL)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🏆 Recognition

Contributors will be recognized in:
- **README.md** acknowledgments
- **Release notes** for significant contributions
- **Hall of Fame** (coming soon)

## 📞 Contact

- **Project Maintainer**: [@songying](https://github.com/songying)
- **Email**: maintainer@smpc-protocol.org
- **Issues**: [GitHub Issues](https://github.com/songying/smpc-protocol/issues)

---

Thank you for contributing to SMPC Protocol! 🚀