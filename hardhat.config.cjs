require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: {
        mnemonic: process.env.TEST_MNEMONIC || "test test test test test test test test test test test junk",
        count: 20,
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: {
        mnemonic: process.env.TEST_MNEMONIC || "test test test test test test test test test test test junk",
        count: 20,
      },
    },
    // L2 target for measured gas (B0). Needs a funded key in .env:
    //   ARBITRUM_SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY
    //   npx hardhat run scripts/deploy.cjs --network arbitrumSepolia
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};