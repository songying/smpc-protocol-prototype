const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting SMPC Protocol deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const network = await ethers.provider.getNetwork();
  const deploymentResults = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  // 1. Deploy DataRegistry
  console.log("\n1. Deploying DataRegistry...");
  const DataRegistry = await ethers.getContractFactory("DataRegistry");
  const dataRegistry = await DataRegistry.deploy();
  await dataRegistry.waitForDeployment();
  
  const dataRegistryAddress = await dataRegistry.getAddress();
  console.log(`✅ DataRegistry deployed to: ${dataRegistryAddress}`);
  deploymentResults.contracts.DataRegistry = {
    address: dataRegistryAddress,
    transactionHash: dataRegistry.deploymentTransaction()?.hash
  };

  // 2. Deploy FeeManagement
  console.log("\n2. Deploying FeeManagement...");
  const FeeManagement = await ethers.getContractFactory("FeeManagement");
  const feeManagement = await FeeManagement.deploy();
  await feeManagement.waitForDeployment();
  
  const feeManagementAddress = await feeManagement.getAddress();
  console.log(`✅ FeeManagement deployed to: ${feeManagementAddress}`);
  deploymentResults.contracts.FeeManagement = {
    address: feeManagementAddress,
    transactionHash: feeManagement.deploymentTransaction()?.hash
  };

  // 3. Deploy ApprovalManager
  console.log("\n3. Deploying ApprovalManager...");
  const ApprovalManager = await ethers.getContractFactory("ApprovalManager");
  const approvalManager = await ApprovalManager.deploy();
  await approvalManager.waitForDeployment();
  
  const approvalManagerAddress = await approvalManager.getAddress();
  console.log(`✅ ApprovalManager deployed to: ${approvalManagerAddress}`);
  deploymentResults.contracts.ApprovalManager = {
    address: approvalManagerAddress,
    transactionHash: approvalManager.deploymentTransaction()?.hash
  };

  // 4. Deploy PrivacyCompliance
  console.log("\n4. Deploying PrivacyCompliance...");
  const PrivacyCompliance = await ethers.getContractFactory("PrivacyCompliance");
  const privacyCompliance = await PrivacyCompliance.deploy();
  await privacyCompliance.waitForDeployment();
  
  const privacyComplianceAddress = await privacyCompliance.getAddress();
  console.log(`✅ PrivacyCompliance deployed to: ${privacyComplianceAddress}`);
  deploymentResults.contracts.PrivacyCompliance = {
    address: privacyComplianceAddress,
    transactionHash: privacyCompliance.deploymentTransaction()?.hash
  };

  // 5. Deploy ComputingRequest (with dependencies)
  console.log("\n5. Deploying ComputingRequest...");
  const ComputingRequest = await ethers.getContractFactory("ComputingRequest");
  const computingRequest = await ComputingRequest.deploy(dataRegistryAddress);
  await computingRequest.waitForDeployment();
  
  const computingRequestAddress = await computingRequest.getAddress();
  console.log(`✅ ComputingRequest deployed to: ${computingRequestAddress}`);
  deploymentResults.contracts.ComputingRequest = {
    address: computingRequestAddress,
    transactionHash: computingRequest.deploymentTransaction()?.hash,
    dependencies: {
      dataRegistry: dataRegistryAddress
    }
  };

  // Configure contract roles and permissions
  console.log("\n6. Configuring contract permissions...");
  
  try {
    // Grant COMPUTING_REQUEST_ROLE to ComputingRequest contract in FeeManagement
    await feeManagement.grantComputingRequestRole(computingRequestAddress);
    console.log("✅ Granted COMPUTING_REQUEST_ROLE to ComputingRequest in FeeManagement");
  } catch (error) {
    console.warn("⚠️  Role configuration failed:", error.message);
  }

  // Save deployment results
  const deploymentPath = path.join(__dirname, "..", "deployments", `deployment-${network.chainId}.json`);
  const deploymentDir = path.dirname(deploymentPath);
  
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentResults, null, 2));
  
  // Also save just addresses for easy reference
  const addresses = Object.entries(deploymentResults.contracts).reduce((acc, [name, details]) => {
    acc[name] = details.address;
    return acc;
  }, {});
  const addressesPath = path.join(__dirname, "..", "deployments", "localhost-addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  
  console.log(`\n📄 Deployment details saved to: ${deploymentPath}`);
  console.log(`📄 Contract addresses saved to: ${addressesPath}`);

  console.log("\n🎉 SMPC Protocol deployment completed successfully!");
  console.log("📋 Deployment Summary:");
  console.log("=".repeat(60));
  Object.entries(deploymentResults.contracts).forEach(([name, details]) => {
    console.log(`${name}: ${details.address}`);
  });
  console.log("=".repeat(60));
}

// Execute deployment
main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});