import { expect } from "chai";
import hre from "hardhat";
import { 
  DataRegistry, 
  ComputingRequest, 
  FeeManagement, 
  ApprovalManager, 
  PrivacyCompliance 
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("SMPC Protocol Integration Tests", function () {
  let dataRegistry: DataRegistry;
  let computingRequest: ComputingRequest;
  let feeManagement: FeeManagement;
  let approvalManager: ApprovalManager;
  let privacyCompliance: PrivacyCompliance;
  
  let owner: HardhatEthersSigner;
  let provider: HardhatEthersSigner;
  let consumer: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;

  // Test data
  const testDataHash = ethers.keccak256(ethers.toUtf8Bytes("sensitive-health-data"));
  const testMetadataURI = "ipfs://QmHealthData123";
  const testPrice = ethers.parseEther("0.5");
  const testDataSize = 2048n;
  const testTags = ["health", "medical", "research"];
  const testComputingScript = "def analyze_health_data(data): return compute_statistics(data)";
  const testBudget = ethers.parseEther("2.0");

  beforeEach(async function () {
    // Get signers
    [owner, provider, consumer, auditor, treasury] = await ethers.getSigners();

    // Deploy all contracts
    const DataRegistry = await ethers.getContractFactory("DataRegistry");
    dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();

    const FeeManagement = await ethers.getContractFactory("FeeManagement");
    feeManagement = await FeeManagement.deploy(treasury.address);
    await feeManagement.waitForDeployment();

    const ApprovalManager = await ethers.getContractFactory("ApprovalManager");
    approvalManager = await ApprovalManager.deploy();
    await approvalManager.waitForDeployment();

    const PrivacyCompliance = await ethers.getContractFactory("PrivacyCompliance");
    privacyCompliance = await PrivacyCompliance.deploy();
    await privacyCompliance.waitForDeployment();

    const ComputingRequest = await ethers.getContractFactory("ComputingRequest");
    computingRequest = await ComputingRequest.deploy(
      await dataRegistry.getAddress()
    );
    await computingRequest.waitForDeployment();

    // Setup roles across all contracts
    await setupRoles();
    
    // Grant computing request role to the computing contract
    const COMPUTING_REQUEST_ROLE = await feeManagement.COMPUTING_REQUEST_ROLE();
    await feeManagement.grantRole(COMPUTING_REQUEST_ROLE, await computingRequest.getAddress());
  });

  async function setupRoles() {
    // DataRegistry roles
    await dataRegistry.grantProviderRole(provider.address);
    await dataRegistry.grantConsumerRole(consumer.address);
    await dataRegistry.grantAuditorRole(auditor.address);

    // ApprovalManager roles
    await approvalManager.grantProviderRole(provider.address);
    await approvalManager.grantConsumerRole(consumer.address);
    await approvalManager.grantAuditorRole(auditor.address);

    // PrivacyCompliance roles
    await privacyCompliance.grantProviderRole(provider.address);
    await privacyCompliance.grantConsumerRole(consumer.address);
    await privacyCompliance.grantAuditorRole(auditor.address);
  }

  describe("End-to-End Data Trading Workflow", function () {
    it("Should complete full data trading lifecycle", async function () {
      // Step 1: Provider registers data
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        2, // Health category
        testTags,
        true,
        testDataSize
      );

      // Step 2: Activate data (admin approval)
      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1);

      // Step 3: Create privacy policy
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("health-privacy-policy")),
        "ipfs://QmHealthPrivacyPolicy",
        ["gdpr_compliant", "anonymization_required", "no_sharing"],
        90 * 24 * 60 * 60 // 90 days retention
      );

      // Step 4: Consumer requests data access
      await approvalManager.connect(consumer).requestDataAccess(
        testDataHash,
        provider.address,
        "Medical research study on diabetes patterns"
      );

      // Step 5: Provider approves data access
      await approvalManager.connect(provider).approveDataAccess(0);

      // Step 6: Consumer gives consent to privacy policy
      await privacyCompliance.connect(consumer).giveConsent(
        0, // policyId
        1, // requestId
        "ipfs://QmConsentProof"
      );

      // Step 7: Create computing request
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );

      // Step 8: Admin approves computing request
      await computingRequest.connect(owner).updateRequestStatus(0, 1); // Approved

      // Step 9: Assign provider to computing request
      await computingRequest.connect(owner).assignProvider(0, provider.address);

      // Step 10: Provider submits computing result
      await computingRequest.connect(provider).submitResult(0, "computed_health_insights_hash");

      // Step 11: Record data access in registry
      await dataRegistry.connect(consumer).recordDataAccess(testDataHash);

      // Step 12: Audit log the transaction
      await privacyCompliance.connect(auditor).recordAuditLog(
        testDataHash,
        consumer.address,
        1, // Access action
        "Consumer accessed health data for approved research"
      );

      // Verify final state
      const dataEntry = await dataRegistry.getDataEntry(testDataHash);
      const request = await computingRequest.getRequest(0);
      const consent = await privacyCompliance.getConsent(0);
      const isCompliant = await privacyCompliance.verifyCompliance(testDataHash, consumer.address, 1);

      expect(dataEntry.accessCount).to.equal(1);
      expect(request.status).to.equal(3); // Completed
      expect(request.paymentProcessed).to.be.true;
      expect(consent.isActive).to.be.true;
      expect(isCompliant).to.be.true;
    });

    it("Should handle rejection scenarios properly", async function () {
      // Register data and create privacy policy
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        0, // Personal category
        testTags,
        true,
        testDataSize
      );

      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1);

      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("strict-privacy-policy")),
        "ipfs://QmStrictPrivacyPolicy",
        ["no_sharing", "no_processing"],
        30 * 24 * 60 * 60
      );

      // Consumer requests access
      await approvalManager.connect(consumer).requestDataAccess(
        testDataHash,
        provider.address,
        "Commercial data mining"
      );

      // Provider rejects due to commercial use
      await approvalManager.connect(provider).rejectDataAccess(0, "Commercial use not permitted");

      // Consumer still tries to create computing request
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );

      // Admin rejects computing request due to lack of data access approval
      await computingRequest.connect(owner).updateRequestStatus(0, 4); // Cancelled

      // Verify rejection state
      const dataAccessApproval = await approvalManager.getDataAccessApproval(0);
      const request = await computingRequest.getRequest(0);

      expect(dataAccessApproval.status).to.equal(2); // Rejected
      expect(request.status).to.equal(4); // Cancelled
    });
  });

  describe("Multi-Data Source Computing", function () {
    let secondDataHash: string;
    let thirdDataHash: string;

    beforeEach(async function () {
      secondDataHash = ethers.keccak256(ethers.toUtf8Bytes("financial-data"));
      thirdDataHash = ethers.keccak256(ethers.toUtf8Bytes("social-data"));

      // Register multiple data sources
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        2, // Health
        ["health", "medical"],
        true,
        testDataSize
      );

      await dataRegistry.connect(provider).registerData(
        secondDataHash,
        "ipfs://QmFinancialData",
        ethers.parseEther("0.3"),
        1, // Financial
        ["finance", "banking"],
        true,
        1024n
      );

      await dataRegistry.connect(provider).registerData(
        thirdDataHash,
        "ipfs://QmSocialData",
        ethers.parseEther("0.2"),
        0, // Personal
        ["social", "demographics"],
        true,
        512n
      );

      // Activate all data
      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1);
      await dataRegistry.connect(owner).changeDataStatus(secondDataHash, 1);
      await dataRegistry.connect(owner).changeDataStatus(thirdDataHash, 1);
    });

    it("Should handle multi-source computing request", async function () {
      const multiDataHashes = [testDataHash, secondDataHash, thirdDataHash];
      const largeBudget = ethers.parseEther("5.0");

      // Create computing request with multiple data sources
      await computingRequest.connect(consumer).createRequest(
        multiDataHashes,
        "def cross_domain_analysis(health, finance, social): return correlate_data(health, finance, social)",
        largeBudget,
        { value: largeBudget }
      );

      // Approve and assign
      await computingRequest.connect(owner).updateRequestStatus(0, 1);
      await computingRequest.connect(owner).assignProvider(0, provider.address);

      // Submit result
      await computingRequest.connect(provider).submitResult(0, "cross_domain_insights_hash");

      const request = await computingRequest.getRequest(0);
      expect(request.dataHashes).to.deep.equal(multiDataHashes);
      expect(request.status).to.equal(3); // Completed
    });

    it("Should distribute fees correctly for multi-source data", async function () {
      const multiDataHashes = [testDataHash, secondDataHash, thirdDataHash];
      const largeBudget = ethers.parseEther("3.0");

      // Get initial balances
      const initialProviderBalance = await feeManagement.getUserBalance(provider.address);

      // Complete the computing request
      await computingRequest.connect(consumer).createRequest(
        multiDataHashes,
        testComputingScript,
        largeBudget,
        { value: largeBudget }
      );

      await computingRequest.connect(owner).updateRequestStatus(0, 1);
      await computingRequest.connect(owner).assignProvider(0, provider.address);
      await computingRequest.connect(provider).submitResult(0, "multi_source_result");

      // Check that fees were distributed
      const finalProviderBalance = await feeManagement.getUserBalance(provider.address);
      expect(finalProviderBalance).to.be.greaterThan(initialProviderBalance);
    });
  });

  describe("Privacy Compliance Integration", function () {
    beforeEach(async function () {
      // Setup data with privacy policy
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        2, // Health
        testTags,
        true,
        testDataSize
      );

      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1);

      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("gdpr-policy")),
        "ipfs://QmGDPRPolicy",
        ["gdpr_compliant", "right_to_erasure", "data_portability"],
        365 * 24 * 60 * 60 // 1 year
      );
    });

    it("Should enforce privacy compliance in computing requests", async function () {
      // Give consent
      await privacyCompliance.connect(consumer).giveConsent(
        0, // policyId
        1, // requestId
        "ipfs://QmGDPRConsent"
      );

      // Verify compliance before processing
      const isCompliant = await privacyCompliance.verifyCompliance(testDataHash, consumer.address, 1);
      expect(isCompliant).to.be.true;

      // Create and process computing request
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );

      await computingRequest.connect(owner).updateRequestStatus(0, 1);
      await computingRequest.connect(owner).assignProvider(0, provider.address);
      await computingRequest.connect(provider).submitResult(0, "compliant_result");

      // Record compliance audit
      await privacyCompliance.connect(auditor).recordAuditLog(
        testDataHash,
        consumer.address,
        1, // Access
        "GDPR compliant data processing completed"
      );

      const auditHistory = await privacyCompliance.getDataAuditHistory(testDataHash);
      expect(auditHistory.length).to.equal(1);
    });

    it("Should handle consent revocation gracefully", async function () {
      // Give consent then revoke
      await privacyCompliance.connect(consumer).giveConsent(0, 1, "ipfs://QmConsent");
      await privacyCompliance.connect(consumer).revokeConsent(0);

      // Verify compliance is now false
      const isCompliant = await privacyCompliance.verifyCompliance(testDataHash, consumer.address, 1);
      expect(isCompliant).to.be.false;

      // Should not be able to process requests without valid consent
      // This would be enforced at the application level using verifyCompliance
    });
  });

  describe("Fee Management Integration", function () {
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

      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1);
    });

    it("Should calculate and distribute fees correctly", async function () {
      const initialTreasuryBalance = await feeManagement.getPlatformBalance();
      const initialProviderBalance = await feeManagement.getUserBalance(provider.address);

      // Create and complete computing request
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );

      await computingRequest.connect(owner).updateRequestStatus(0, 1);
      await computingRequest.connect(owner).assignProvider(0, provider.address);
      await computingRequest.connect(provider).submitResult(0, "fee_test_result");

      // Check fee distribution
      const finalTreasuryBalance = await feeManagement.getPlatformBalance();
      const finalProviderBalance = await feeManagement.getUserBalance(provider.address);

      expect(finalTreasuryBalance).to.be.greaterThan(initialTreasuryBalance);
      expect(finalProviderBalance).to.be.greaterThan(initialProviderBalance);

      // Verify total fees add up correctly
      const feeBreakdown = await feeManagement.calculateFees(testBudget);
      const expectedTotalFees = feeBreakdown.platformFee + feeBreakdown.providerFee + feeBreakdown.auditorFee;
      
      // The total distributed should be less than or equal to budget
      expect(expectedTotalFees).to.be.lessThanOrEqual(testBudget);
    });

    it("Should handle fee withdrawals correctly", async function () {
      // Complete a transaction to generate fees
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );

      await computingRequest.connect(owner).updateRequestStatus(0, 1);
      await computingRequest.connect(owner).assignProvider(0, provider.address);
      await computingRequest.connect(provider).submitResult(0, "withdrawal_test_result");

      // Provider withdraws earned fees
      const providerBalance = await feeManagement.getUserBalance(provider.address);
      if (providerBalance > 0) {
        const initialEthBalance = await ethers.provider.getBalance(provider.address);
        
        await feeManagement.connect(provider).withdrawBalance(providerBalance);
        
        const finalEthBalance = await ethers.provider.getBalance(provider.address);
        expect(finalEthBalance).to.be.greaterThan(initialEthBalance);
      }
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("Should handle partial failures gracefully", async function () {
      // Register data but don't activate it
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        0,
        testTags,
        true,
        testDataSize
      );
      // Note: Not activating the data

      // Try to create computing request with inactive data
      await expect(
        computingRequest.connect(consumer).createRequest(
          [testDataHash],
          testComputingScript,
          testBudget,
          { value: testBudget }
        )
      ).to.be.revertedWith("ComputingRequest: Data not found");
    });

    it("Should maintain system integrity during concurrent operations", async function () {
      // Setup data
      await dataRegistry.connect(provider).registerData(
        testDataHash,
        testMetadataURI,
        testPrice,
        0,
        testTags,
        true,
        testDataSize
      );
      await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1);

      // Create multiple concurrent requests
      const numRequests = 5;
      const promises = [];

      for (let i = 0; i < numRequests; i++) {
        promises.push(
          computingRequest.connect(consumer).createRequest(
            [testDataHash],
            `script_${i}`,
            ethers.parseEther("0.5"),
            { value: ethers.parseEther("0.5") }
          )
        );
      }

      // All requests should succeed
      await Promise.all(promises);

      // Verify all requests were created
      const [totalRequests] = await computingRequest.getStatistics();
      expect(totalRequests).to.equal(numRequests);
    });

    it("Should handle large-scale operations efficiently", async function () {
      // Register multiple data sources
      const numDataSources = 10;
      const dataHashes = [];

      for (let i = 0; i < numDataSources; i++) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`data-source-${i}`));
        dataHashes.push(hash);
        
        await dataRegistry.connect(provider).registerData(
          hash,
          `ipfs://QmData${i}`,
          ethers.parseEther("0.1"),
          i % 3, // Cycle through categories
          [`tag${i}`],
          true,
          BigInt(1024 * (i + 1))
        );
        
        await dataRegistry.connect(owner).changeDataStatus(hash, 1);
      }

      // Create computing request with all data sources
      const largeBudget = ethers.parseEther("10.0");
      
      await computingRequest.connect(consumer).createRequest(
        dataHashes,
        "def process_all_data(data_array): return aggregate_analysis(data_array)",
        largeBudget,
        { value: largeBudget }
      );

      // Complete the request
      await computingRequest.connect(owner).updateRequestStatus(0, 1);
      await computingRequest.connect(owner).assignProvider(0, provider.address);
      await computingRequest.connect(provider).submitResult(0, "large_scale_result");

      const request = await computingRequest.getRequest(0);
      expect(request.dataHashes.length).to.equal(numDataSources);
      expect(request.status).to.equal(3); // Completed
    });
  });

  describe("System Statistics and Monitoring", function () {
    beforeEach(async function () {
      // Setup multiple data sources and complete some transactions
      for (let i = 0; i < 3; i++) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`monitoring-data-${i}`));
        
        await dataRegistry.connect(provider).registerData(
          hash,
          `ipfs://QmMonitoring${i}`,
          ethers.parseEther("0.2"),
          i % 3,
          [`monitoring${i}`],
          true,
          BigInt(1024 * (i + 1))
        );
        
        await dataRegistry.connect(owner).changeDataStatus(hash, 1);
        
        await computingRequest.connect(consumer).createRequest(
          [hash],
          `script_${i}`,
          ethers.parseEther("0.5"),
          { value: ethers.parseEther("0.5") }
        );
        
        await computingRequest.connect(owner).updateRequestStatus(i, 1);
        await computingRequest.connect(owner).assignProvider(i, provider.address);
        await computingRequest.connect(provider).submitResult(i, `result_${i}`);
      }
    });

    it("Should provide accurate system statistics", async function () {
      // Check DataRegistry statistics
      const [totalData, activeData] = await dataRegistry.getStatistics();
      expect(totalData).to.equal(3);
      expect(activeData).to.equal(3);

      // Check ComputingRequest statistics  
      const [totalRequests, activeRequests] = await computingRequest.getStatistics();
      expect(totalRequests).to.equal(3);
      expect(activeRequests).to.equal(0); // All completed

      // Check FeeManagement statistics
      const feeStats = await feeManagement.getStatistics();
      expect(feeStats.totalTransactions).to.equal(3);
      expect(feeStats.totalVolumeProcessed).to.be.greaterThan(0);
    });

    it("Should track user activity correctly", async function () {
      const consumerRequests = await computingRequest.getConsumerRequests(consumer.address);
      const providerRequests = await computingRequest.getProviderRequests(provider.address);
      const providerData = await dataRegistry.getProviderData(provider.address);

      expect(consumerRequests.length).to.equal(3);
      expect(providerRequests.length).to.equal(3);
      expect(providerData.length).to.equal(3);
    });
  });
});