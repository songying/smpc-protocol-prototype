const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Simple SMPC Protocol deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  console.log("");

  const deployedContracts = {};

  // 1. Deploy DataRegistry
  console.log("📦 Deploying DataRegistry...");
  const DataRegistry = await ethers.getContractFactory("DataRegistry");
  const dataRegistry = await DataRegistry.deploy();
  await dataRegistry.waitForDeployment();
  const dataRegistryAddress = await dataRegistry.getAddress();
  deployedContracts.DataRegistry = dataRegistryAddress;
  console.log("✅ DataRegistry deployed to:", dataRegistryAddress);

  // 2. Deploy FeeManagement
  console.log("📦 Deploying FeeManagement...");
  const FeeManagement = await ethers.getContractFactory("FeeManagement");
  const feeManagement = await FeeManagement.deploy();
  await feeManagement.waitForDeployment();
  const feeManagementAddress = await feeManagement.getAddress();
  deployedContracts.FeeManagement = feeManagementAddress;
  console.log("✅ FeeManagement deployed to:", feeManagementAddress);

  // 3. Deploy ComputingRequest
  console.log("📦 Deploying ComputingRequest...");
  const ComputingRequest = await ethers.getContractFactory("ComputingRequest");
  const computingRequest = await ComputingRequest.deploy(dataRegistryAddress);
  await computingRequest.waitForDeployment();
  const computingRequestAddress = await computingRequest.getAddress();
  deployedContracts.ComputingRequest = computingRequestAddress;
  console.log("✅ ComputingRequest deployed to:", computingRequestAddress);

  console.log("");
  console.log("🎉 Basic deployment completed!");
  console.log("📋 Contract Addresses:");
  console.log("=" + "=".repeat(60));
  Object.entries(deployedContracts).forEach(([name, address]) => {
    console.log(`${name}: ${address}`);
  });
  console.log("=" + "=".repeat(60));
  
  // Save addresses
  const fs = require("fs");
  const path = require("path");
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const addressesPath = path.join(deploymentsDir, "localhost-addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(deployedContracts, null, 2));
  console.log("📄 Addresses saved to:", addressesPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });