# MetaMask Local Development Setup

This guide helps you configure MetaMask for local blockchain development.

## 1. Add Local Network to MetaMask

### Network Configuration
- **Network Name**: Localhost 8545
- **New RPC URL**: http://127.0.0.1:8545
- **Chain ID**: 1337
- **Currency Symbol**: ETH
- **Block Explorer URL**: (leave empty)

### Steps to Add Network
1. Open MetaMask extension
2. Click the network dropdown (top of MetaMask)
3. Click "Add network"
4. Click "Add a network manually"
5. Enter the configuration above
6. Click "Save"

## 2. Import Test Accounts

### Available Test Accounts (from Ganache)
```
Account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

### Steps to Import Account
1. Click MetaMask account icon (top right)
2. Click "Import Account"
3. Select "Private Key"
4. Paste one of the private keys above
5. Click "Import"
6. The account should now appear with 1000 ETH

## 3. Switch to Local Network

1. Open MetaMask
2. Click network dropdown
3. Select "Localhost 8545"
4. Verify you see 1000 ETH balance

## 4. Testing Connection

### Verify Setup
- Network shows "Localhost 8545"
- Chain ID shows 1337
- Account balance shows 1000 ETH
- RPC URL points to http://127.0.0.1:8545

### Test Transaction
1. Visit http://localhost:3000
2. Click "Connect Wallet"
3. MetaMask should prompt for connection
4. Approve the connection
5. Sign the authentication message
6. Select your role in SMPC Protocol

## 5. Troubleshooting

### Common Issues

**MetaMask not connecting:**
- Ensure Ganache is running on port 8545
- Check that network is set to "Localhost 8545"
- Verify Chain ID is 1337

**No ETH balance:**
- Make sure you imported the correct private key
- Verify you're on the correct network
- Check that Ganache is running with test accounts

**Transaction failures:**
- Reset account in MetaMask (Settings > Advanced > Reset Account)
- Ensure sufficient ETH balance for gas fees
- Check that contract addresses are correct

### Reset MetaMask Account
If you encounter nonce issues:
1. Go to MetaMask Settings
2. Click "Advanced"
3. Click "Reset Account"
4. Confirm the reset

## 6. Development Workflow

### Daily Development Setup
1. Start Ganache: `ganache --host 127.0.0.1 --port 8545 --mnemonic "test test test test test test test test test test test junk" --accounts 10 --chain.chainId 1337`
2. Start Next.js: `npm run dev`
3. Switch MetaMask to "Localhost 8545"
4. Import test account if needed
5. Begin development and testing

### Contract Deployment Testing
1. Deploy contracts: `npx hardhat run scripts/deploy.ts --network localhost`
2. Note contract addresses from output
3. Update frontend with new contract addresses
4. Test contract interactions through the UI

## 7. Security Notes

⚠️ **WARNING**: Never use these test private keys on mainnet or with real funds!

- Test private keys are public and should only be used for local development
- Always use separate accounts for mainnet development
- Never commit private keys to version control
- Use environment variables for production configurations

## 8. Next Steps

Once MetaMask is configured:
- ✅ Test wallet connection on http://localhost:3000
- ✅ Verify role selection works
- ✅ Test authentication flow
- ✅ Deploy and interact with smart contracts
- ✅ Begin Phase 2 smart contract development