const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting SMPC Protocol deployment...");
  console.log("=" + "=".repeat(50));
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`📋 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("");

  const deploymentResults = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    totalGasUsed: "0",
    contracts: {}
  };

  let totalGasUsed = BigInt(0);

  // Helper function for contract deployment
  async function deployContract(
    contractName,
    constructorArgs = [],
    dependencies
  ) {
    console.log(`📦 Deploying ${contractName}...`);
    
    const ContractFactory = await ethers.getContractFactory(contractName);
    
    if (constructorArgs.length > 0) {
      console.log(`   Constructor args: ${JSON.stringify(constructorArgs)}`);
    }
    
    // Deploy contract
    const contract = await ContractFactory.deploy(...constructorArgs);
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    // Get deployment transaction details
    const deploymentTx = contract.deploymentTransaction();
    if (deploymentTx) {
      const receipt = await deploymentTx.wait();
      const gasUsed = receipt?.gasUsed || BigInt(0);
      totalGasUsed += gasUsed;
      
      deploymentResults.contracts[contractName] = {
        address,
        transactionHash: deploymentTx.hash,
        gasUsed: gasUsed.toString(),
        constructorArgs: constructorArgs.length > 0 ? constructorArgs : undefined,
        dependencies
      };
    }
    
    console.log(`✅ ${contractName} deployed to: ${address}`);
    console.log("");
    
    return address;
  }

  // 1. Deploy DataRegistry
  const dataRegistryAddress = await deployContract("DataRegistry");

  // 2. Deploy FeeManagement
  const feeManagementAddress = await deployContract("FeeManagement");

  // 3. Deploy ApprovalManager
  const approvalManagerAddress = await deployContract("ApprovalManager");

  // 4. Deploy PrivacyCompliance
  const privacyComplianceAddress = await deployContract("PrivacyCompliance");

  // 5. Deploy ComputingRequest (with dependencies)
  const computingRequestAddress = await deployContract(
    "ComputingRequest",
    [dataRegistryAddress],
    { dataRegistry: dataRegistryAddress }
  );

  // 6. Deploy PaymentDistributor (treasury = deployer for the demo)
  const paymentDistributorAddress = await deployContract(
    "PaymentDistributor",
    [deployer.address]
  );

  // 7. Deploy Groth16Verifier (snarkjs-generated; verifies aggregation proofs
  //    on-chain — measured ≈213,720 gas, constant in statement size).
  const groth16VerifierAddress = await deployContract("Groth16Verifier");

  // Configure contract roles and permissions
  console.log("⚙️  Configuring contract permissions...");
  
  try {
    // Get contract instances for configuration
    const DataRegistry = await ethers.getContractFactory("DataRegistry");
    const dataRegistry = DataRegistry.attach(dataRegistryAddress);
    
    const FeeManagement = await ethers.getContractFactory("FeeManagement");
    const feeManagement = FeeManagement.attach(feeManagementAddress);
    
    const ComputingRequest = await ethers.getContractFactory("ComputingRequest");
    const computingRequest = ComputingRequest.attach(computingRequestAddress);
    
    // Grant COMPUTING_REQUEST_ROLE to ComputingRequest contract in FeeManagement
    console.log("   Setting up FeeManagement permissions...");
    await feeManagement.grantComputingRequestRole(computingRequestAddress);
    console.log("   ✅ Granted COMPUTING_REQUEST_ROLE to ComputingRequest");

    // Also grant it to the deployer so the backend relayer can settle fees directly.
    await feeManagement.grantComputingRequestRole(deployer.address);
    console.log("   ✅ Granted COMPUTING_REQUEST_ROLE to deployer (backend relayer)");
    
    // Setup initial roles for deployer (for testing purposes)
    console.log("   Setting up initial test roles...");
    await dataRegistry.grantProviderRole(deployer.address);
    await dataRegistry.grantConsumerRole(deployer.address);
    await dataRegistry.grantAuditorRole(deployer.address);
    console.log("   ✅ Granted initial DataRegistry roles to deployer");
    
    await computingRequest.grantConsumerRole(deployer.address);
    await computingRequest.grantAuditorRole(deployer.address);
    await computingRequest.grantComputingNodeRole(deployer.address);
    console.log("   ✅ Granted initial ComputingRequest roles to deployer");
    
    console.log("✅ Contract configuration completed");
    
  } catch (error) {
    console.warn("⚠️  Some configuration steps failed:", error);
  }

  // Finalize deployment results
  deploymentResults.totalGasUsed = totalGasUsed.toString();
  
  // Save deployment results
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save comprehensive deployment config
  const deploymentPath = path.join(deploymentsDir, `${network.name}-deployment.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentResults, null, 2));
  
  // Save addresses for easy reference
  const addressesPath = path.join(deploymentsDir, `${network.name}-addresses.json`);
  const addresses = Object.entries(deploymentResults.contracts).reduce((acc, [name, details]) => {
    acc[name] = details.address;
    return acc;
  }, {});
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  // Export ABIs so the backend contract client can bind to the deployed contracts.
  // This file (<network>-abis.json) was previously never generated, which is why
  // the API layer could never actually call the contracts.
  const abis = {};
  for (const contractName of Object.keys(deploymentResults.contracts)) {
    const artifact = await hre.artifacts.readArtifact(contractName);
    abis[contractName] = artifact.abi;
  }
  const abisPath = path.join(deploymentsDir, `${network.name}-abis.json`);
  fs.writeFileSync(abisPath, JSON.stringify(abis, null, 2));
  console.log(`   ABIs: ${abisPath}`);
  
  console.log("");
  console.log("📄 Deployment files saved:");
  console.log(`   Full deployment: ${deploymentPath}`);
  console.log(`   Addresses only: ${addressesPath}`);

  // Calculate total ETH spent
  const gasPrice = await ethers.provider.getFeeData();
  const totalCost = totalGasUsed * (gasPrice.gasPrice || BigInt(0));
  
  console.log("");
  console.log("🎉 SMPC Protocol deployment completed successfully!");
  console.log("📊 Deployment Statistics:");
  console.log("=" + "=".repeat(60));
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Total Gas Used: ${totalGasUsed.toString()}`);
  console.log(`Estimated Cost: ${ethers.formatEther(totalCost)} ETH`);
  console.log("");
  console.log("📋 Contract Addresses:");
  Object.entries(addresses).forEach(([name, address]) => {
    console.log(`${name}: ${address}`);
  });
  console.log("=" + "=".repeat(60));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});