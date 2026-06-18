import { expect } from "chai";
import hre from "hardhat";
import { DataRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("DataRegistry", function () {
  let dataRegistry: DataRegistry;
  let owner: HardhatEthersSigner;
  let provider: HardhatEthersSigner;
  let consumer: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;

  // Test data
  const testDataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data-content"));
  const testMetadataURI = "ipfs://QmTest123";
  const testPrice = ethers.parseEther("0.1");
  const testDataSize = 1024n;
  const testTags = ["health", "anonymous", "research"];

  beforeEach(async function () {
    // Get signers
    [owner, provider, consumer, auditor] = await ethers.getSigners();

    // Deploy DataRegistry contract
    const DataRegistry = await ethers.getContractFactory("DataRegistry");
    dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();

    // Grant roles
    await dataRegistry.grantProviderRole(provider.address);
    await dataRegistry.grantConsumerRole(consumer.address);
    await dataRegistry.grantAuditorRole(auditor.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await dataRegistry.hasRole(await dataRegistry.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should have correct initial statistics", async function () {
      const [totalData, activeData] = await dataRegistry.getStatistics();
      expect(totalData).to.equal(0);
      expect(activeData).to.equal(0);
    });
  });

  describe("Role Management", function () {
    it("Should grant provider role correctly", async function () {
      const PROVIDER_ROLE = await dataRegistry.DATA_PROVIDER_ROLE();
      expect(await dataRegistry.hasRole(PROVIDER_ROLE, provider.address)).to.be.true;
    });

    it("Should grant consumer role correctly", async function () {
      const CONSUMER_ROLE = await dataRegistry.CONSUMER_ROLE();
      expect(await dataRegistry.hasRole(CONSUMER_ROLE, consumer.address)).to.be.true;
    });

    it("Should grant auditor role correctly", async function () {
      const AUDITOR_ROLE = await dataRegistry.AUDITOR_ROLE();
      expect(await dataRegistry.hasRole(AUDITOR_ROLE, auditor.address)).to.be.true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(
        dataRegistry.connect(provider).grantProviderRole(consumer.address)
      ).to.be.reverted;
    });
  });

  describe("Data Registration", function () {
    it("Should register data successfully", async function () {
      await expect(
        dataRegistry.connect(provider).registerData(
          testDataHash,
          testMetadataURI,
          testPrice,
          0, // DataCategory.Personal
          testTags,
          true,
          testDataSize
        )
      ).to.emit(dataRegistry, "DataRegistered")
        .withArgs(testDataHash, provider.address, 0, testPrice, anyValue);

      // Verify data exists
      expect(await dataRegistry.dataExists(testDataHash)).to.be.true;

      // Check data entry
      const dataEntry = await dataRegistry.getDataEntry(testDataHash);
      expect(dataEntry.provider).to.equal(provider.address);
      expect(dataEntry.metadataURI).to.equal(testMetadataURI);
      expect(dataEntry.price).to.equal(testPrice);
      expect(dataEntry.isEncrypted).to.be.true;
      expect(dataEntry.dataSize).to.equal(testDataSize);
    });

    it("Should not allow duplicate data registration", async function () {
      // Register data first time
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        0,
        testTags,
        true,
        testDataSize
      );

      // Try to register same data hash again
      await expect(
        dataRegistry.connect(provider).registerData(
          testDataHash,
          "ipfs://different",
          testPrice,
          0,
          testTags,
          false,
          testDataSize
        )
      ).to.be.revertedWith("DataRegistry: Data already registered");
    });

    it("Should not allow non-provider to register data", async function () {
      await expect(
        dataRegistry.connect(consumer).registerData(
          testDataHash,
          testMetadataURI,
          testPrice,
          0,
          testTags,
          true,
          testDataSize
        )
      ).to.be.reverted;
    });

    it("Should not allow registration with invalid parameters", async function () {
      // Invalid data hash
      await expect(
        dataRegistry.connect(provider).registerData(
          ethers.ZeroHash,
          testMetadataURI,
          testPrice,
          0,
          testTags,
          true,
          testDataSize
        )
      ).to.be.revertedWith("DataRegistry: Invalid data hash");

      // Empty metadata URI
      await expect(
        dataRegistry.connect(provider).registerData(
          testDataHash,
          "",
          testPrice,
          0,
          testTags,
          true,
          testDataSize
        )
      ).to.be.revertedWith("DataRegistry: Metadata URI required");

      // Zero price
      await expect(
        dataRegistry.connect(provider).registerData(
          testDataHash,
          testMetadataURI,
          0,
          0,
          testTags,
          true,
          testDataSize
        )
      ).to.be.revertedWith("DataRegistry: Price must be greater than zero");

      // Zero data size
      await expect(
        dataRegistry.connect(provider).registerData(
          testDataHash,
          testMetadataURI,
          testPrice,
          0,
          testTags,
          true,
          0
        )
      ).to.be.revertedWith("DataRegistry: Data size must be greater than zero");
    });
  });

  describe("Data Updates", function () {
    beforeEach(async function () {
      // Register test data
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        0,
        testTags,
        true,
        testDataSize
      );
    });

    it("Should update data successfully", async function () {
      const newPrice = ethers.parseEther("0.2");
      const newMetadataURI = "ipfs://QmNewTest456";

      await expect(
        dataRegistry.connect(provider).updateData(
          testDataHash,
          newPrice,
          newMetadataURI
        )
      ).to.emit(dataRegistry, "DataUpdated")
        .withArgs(testDataHash, provider.address, newPrice, anyValue);

      const dataEntry = await dataRegistry.getDataEntry(testDataHash);
      expect(dataEntry.price).to.equal(newPrice);
      expect(dataEntry.metadataURI).to.equal(newMetadataURI);
    });

    it("Should not allow non-provider to update data", async function () {
      await expect(
        dataRegistry.connect(consumer).updateData(
          testDataHash,
          ethers.parseEther("0.2"),
          "ipfs://QmNewTest456"
        )
      ).to.be.revertedWith("DataRegistry: Only data provider can perform this action");
    });
  });

  describe("Data Status Management", function () {
    beforeEach(async function () {
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        0,
        testTags,
        true,
        testDataSize
      );
    });

    it("Should allow admin to change data status", async function () {
      await expect(
        dataRegistry.connect(owner).changeDataStatus(testDataHash, 1) // Active
      ).to.emit(dataRegistry, "DataStatusChanged");

      const dataEntry = await dataRegistry.getDataEntry(testDataHash);
      expect(dataEntry.status).to.equal(1);
    });

    it("Should allow auditor to change data status", async function () {
      await expect(
        dataRegistry.connect(auditor).changeDataStatus(testDataHash, 1) // Active
      ).to.emit(dataRegistry, "DataStatusChanged");
    });

    it("Should not allow unauthorized users to change status", async function () {
      await expect(
        dataRegistry.connect(consumer).changeDataStatus(testDataHash, 1)
      ).to.be.revertedWith("DataRegistry: Insufficient permissions");
    });
  });

  describe("Data Access", function () {
    beforeEach(async function () {
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        0,
        testTags,
        true,
        testDataSize
      );
      // Activate the data
      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1);
    });

    it("Should record data access", async function () {
      await expect(
        dataRegistry.connect(consumer).recordDataAccess(testDataHash)
      ).to.emit(dataRegistry, "DataAccessed")
        .withArgs(testDataHash, consumer.address, anyValue);

      const dataEntry = await dataRegistry.getDataEntry(testDataHash);
      expect(dataEntry.accessCount).to.equal(1);
    });

    it("Should not allow access to inactive data", async function () {
      // Change status to suspended
      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 2);

      await expect(
        dataRegistry.connect(consumer).recordDataAccess(testDataHash)
      ).to.be.revertedWith("DataRegistry: Data not available");
    });

    it("Should not allow non-consumer to record access", async function () {
      await expect(
        dataRegistry.connect(provider).recordDataAccess(testDataHash)
      ).to.be.reverted;
    });
  });

  describe("Data Queries", function () {
    beforeEach(async function () {
      // Register multiple data entries
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        0, // Personal
        testTags,
        true,
        testDataSize
      );

      const healthDataHash = ethers.keccak256(ethers.toUtf8Bytes("health-data"));
      await dataRegistry.connect(provider).registerData(
        healthDataHash,
        "ipfs://QmHealth123",
        ethers.parseEther("0.3"),
        2, // Health
        ["health", "medical"],
        true,
        2048n
      );
    });

    it("Should get provider data correctly", async function () {
      const providerData = await dataRegistry.getProviderData(provider.address);
      expect(providerData.length).to.equal(2);
    });

    it("Should get data by category correctly", async function () {
      const personalData = await dataRegistry.getDataByCategory(0); // Personal
      const healthData = await dataRegistry.getDataByCategory(2); // Health
      
      expect(personalData.length).to.equal(1);
      expect(healthData.length).to.equal(1);
    });

    it("Should get active data by category correctly", async function () {
      // Activate one data entry
      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1);

      const activePersonalData = await dataRegistry.getActiveDataByCategory(0);
      expect(activePersonalData.length).to.equal(1);
      expect(activePersonalData[0]).to.equal(testDataHash);
    });
  });

  describe("Contract Pause Functionality", function () {
    it("Should allow admin to pause and unpause", async function () {
      await dataRegistry.connect(owner).pause();
      
      await expect(
        dataRegistry.connect(provider).registerData(
          testDataHash,
          testMetadataURI,
          testPrice,
          0,
          testTags,
          true,
          testDataSize
        )
      ).to.be.revertedWithCustomError(dataRegistry, "EnforcedPause");

      await dataRegistry.connect(owner).unpause();
      
      // Should work again after unpause
      await expect(
        dataRegistry.connect(provider).registerData(
          testDataHash,
          testMetadataURI,
          testPrice,
          0,
          testTags,
          true,
          testDataSize
        )
      ).to.emit(dataRegistry, "DataRegistered");
    });
  });

  // Helper function for anyValue matcher
  function anyValue() {
    return true;
  }
});