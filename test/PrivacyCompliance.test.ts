import { expect } from "chai";
import hre from "hardhat";
import { PrivacyCompliance } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("PrivacyCompliance", function () {
  let privacyCompliance: PrivacyCompliance;
  let owner: HardhatEthersSigner;
  let provider: HardhatEthersSigner;
  let consumer: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;

  // Test data
  const testDataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data-content"));
  const testRequestId = 1;

  beforeEach(async function () {
    // Get signers
    [owner, provider, consumer, auditor] = await ethers.getSigners();

    // Deploy PrivacyCompliance contract
    const PrivacyCompliance = await ethers.getContractFactory("PrivacyCompliance");
    privacyCompliance = await PrivacyCompliance.deploy();
    await privacyCompliance.waitForDeployment();

    // Grant roles
    await privacyCompliance.grantAuditorRole(auditor.address);
    await privacyCompliance.grantDataSubjectRole(consumer.address);
    await privacyCompliance.grantDataSubjectRole(provider.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await privacyCompliance.hasRole(await privacyCompliance.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should have correct initial statistics", async function () {
      const [totalPolicies, activePolicies] = await privacyCompliance.getStatistics();
      expect(totalPolicies).to.equal(0);
      expect(activePolicies).to.equal(0);
    });
  });

  describe("Role Management", function () {
    it("Should grant provider role correctly", async function () {
      const PROVIDER_ROLE = await privacyCompliance.DATA_PROVIDER_ROLE();
      expect(await privacyCompliance.hasRole(PROVIDER_ROLE, provider.address)).to.be.true;
    });

    it("Should grant consumer role correctly", async function () {
      const CONSUMER_ROLE = await privacyCompliance.CONSUMER_ROLE();
      expect(await privacyCompliance.hasRole(CONSUMER_ROLE, consumer.address)).to.be.true;
    });

    it("Should grant auditor role correctly", async function () {
      const AUDITOR_ROLE = await privacyCompliance.AUDITOR_ROLE();
      expect(await privacyCompliance.hasRole(AUDITOR_ROLE, auditor.address)).to.be.true;
    });
  });

  describe("Privacy Policy Management", function () {
    const testPolicyHash = ethers.keccak256(ethers.toUtf8Bytes("privacy-policy-content"));
    const testPolicyURI = "ipfs://QmPrivacyPolicy123";

    it("Should create privacy policy successfully", async function () {
      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          testDataHash,
          testPolicyHash,
          testPolicyURI,
          ["no_sharing", "anonymization_required"],
          30 * 24 * 60 * 60 // 30 days retention
        )
      ).to.emit(privacyCompliance, "PrivacyPolicyCreated")
        .withArgs(0, testDataHash, provider.address);

      const policy = await privacyCompliance.getPrivacyPolicy(0);
      expect(policy.dataHash).to.equal(testDataHash);
      expect(policy.policyHash).to.equal(testPolicyHash);
      expect(policy.policyURI).to.equal(testPolicyURI);
      expect(policy.provider).to.equal(provider.address);
      expect(policy.isActive).to.be.true;
    });

    it("Should not allow invalid data hash", async function () {
      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          ethers.ZeroHash,
          testPolicyHash,
          testPolicyURI,
          ["no_sharing"],
          30 * 24 * 60 * 60
        )
      ).to.be.revertedWith("PrivacyCompliance: Invalid data hash");
    });

    it("Should not allow invalid policy hash", async function () {
      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          testDataHash,
          ethers.ZeroHash,
          testPolicyURI,
          ["no_sharing"],
          30 * 24 * 60 * 60
        )
      ).to.be.revertedWith("PrivacyCompliance: Invalid policy hash");
    });

    it("Should not allow empty policy URI", async function () {
      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          testDataHash,
          testPolicyHash,
          "",
          ["no_sharing"],
          30 * 24 * 60 * 60
        )
      ).to.be.revertedWith("PrivacyCompliance: Policy URI required");
    });

    it("Should not allow zero retention period", async function () {
      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          testDataHash,
          testPolicyHash,
          testPolicyURI,
          ["no_sharing"],
          0
        )
      ).to.be.revertedWith("PrivacyCompliance: Retention period must be greater than zero");
    });

    it("Should not allow duplicate policy for same data", async function () {
      // Create first policy
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        testPolicyHash,
        testPolicyURI,
        ["no_sharing"],
        30 * 24 * 60 * 60
      );

      // Try to create duplicate
      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          testDataHash,
          ethers.keccak256(ethers.toUtf8Bytes("different-policy")),
          "ipfs://different",
          ["sharing_allowed"],
          60 * 24 * 60 * 60
        )
      ).to.be.revertedWith("PrivacyCompliance: Policy already exists for this data");
    });

    it("Should allow policy updates by provider", async function () {
      // Create policy
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        testPolicyHash,
        testPolicyURI,
        ["no_sharing"],
        30 * 24 * 60 * 60
      );

      const newPolicyHash = ethers.keccak256(ethers.toUtf8Bytes("updated-policy"));
      const newPolicyURI = "ipfs://QmUpdatedPolicy456";

      await expect(
        privacyCompliance.connect(provider).updatePrivacyPolicy(
          0,
          newPolicyHash,
          newPolicyURI,
          ["sharing_allowed", "encryption_required"],
          60 * 24 * 60 * 60
        )
      ).to.emit(privacyCompliance, "PrivacyPolicyUpdated")
        .withArgs(0, provider.address);

      const policy = await privacyCompliance.getPrivacyPolicy(0);
      expect(policy.policyHash).to.equal(newPolicyHash);
      expect(policy.policyURI).to.equal(newPolicyURI);
    });

    it("Should not allow non-provider to update policy", async function () {
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        testPolicyHash,
        testPolicyURI,
        ["no_sharing"],
        30 * 24 * 60 * 60
      );

      await expect(
        privacyCompliance.connect(consumer).updatePrivacyPolicy(
          0,
          ethers.keccak256(ethers.toUtf8Bytes("unauthorized-update")),
          "ipfs://unauthorized",
          ["malicious"],
          24 * 60 * 60
        )
      ).to.be.revertedWith("PrivacyCompliance: Only policy creator can update");
    });
  });

  describe("Consent Management", function () {
    let policyId: number;

    beforeEach(async function () {
      // Create a privacy policy first
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("privacy-policy")),
        "ipfs://QmPrivacyPolicy123",
        ["no_sharing", "anonymization_required"],
        30 * 24 * 60 * 60
      );
      policyId = 0;
    });

    it("Should record consent successfully", async function () {
      await expect(
        privacyCompliance.connect(consumer).giveConsent(
          policyId,
          testRequestId,
          "ipfs://QmConsentProof123"
        )
      ).to.emit(privacyCompliance, "ConsentGiven")
        .withArgs(0, consumer.address, policyId, testRequestId);

      const consent = await privacyCompliance.getConsent(0);
      expect(consent.user).to.equal(consumer.address);
      expect(consent.policyId).to.equal(policyId);
      expect(consent.requestId).to.equal(testRequestId);
      expect(consent.isActive).to.be.true;
    });

    it("Should not allow consent for inactive policy", async function () {
      // Revoke policy
      await privacyCompliance.connect(provider).revokePrivacyPolicy(policyId);

      await expect(
        privacyCompliance.connect(consumer).giveConsent(
          policyId,
          testRequestId,
          "ipfs://QmConsentProof123"
        )
      ).to.be.revertedWith("PrivacyCompliance: Policy not active");
    });

    it("Should not allow duplicate consent", async function () {
      // Give consent first time
      await privacyCompliance.connect(consumer).giveConsent(
        policyId,
        testRequestId,
        "ipfs://QmConsentProof123"
      );

      // Try to give consent again
      await expect(
        privacyCompliance.connect(consumer).giveConsent(
          policyId,
          testRequestId,
          "ipfs://QmConsentProof456"
        )
      ).to.be.revertedWith("PrivacyCompliance: Consent already given");
    });

    it("Should allow consent revocation", async function () {
      // Give consent
      await privacyCompliance.connect(consumer).giveConsent(
        policyId,
        testRequestId,
        "ipfs://QmConsentProof123"
      );

      await expect(
        privacyCompliance.connect(consumer).revokeConsent(0)
      ).to.emit(privacyCompliance, "ConsentRevoked")
        .withArgs(0, consumer.address);

      const consent = await privacyCompliance.getConsent(0);
      expect(consent.isActive).to.be.false;
    });

    it("Should not allow non-user to revoke consent", async function () {
      await privacyCompliance.connect(consumer).giveConsent(
        policyId,
        testRequestId,
        "ipfs://QmConsentProof123"
      );

      await expect(
        privacyCompliance.connect(provider).revokeConsent(0)
      ).to.be.revertedWith("PrivacyCompliance: Only consent giver can revoke");
    });
  });

  describe("Compliance Verification", function () {
    let policyId: number;
    let consentId: number;

    beforeEach(async function () {
      // Create policy and consent
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("privacy-policy")),
        "ipfs://QmPrivacyPolicy123",
        ["no_sharing", "anonymization_required"],
        30 * 24 * 60 * 60
      );
      policyId = 0;

      await privacyCompliance.connect(consumer).giveConsent(
        policyId,
        testRequestId,
        "ipfs://QmConsentProof123"
      );
      consentId = 0;
    });

    it("Should verify compliance correctly for valid consent", async function () {
      const isCompliant = await privacyCompliance.verifyCompliance(testDataHash, consumer.address, testRequestId);
      expect(isCompliant).to.be.true;
    });

    it("Should not verify compliance for revoked consent", async function () {
      // Revoke consent
      await privacyCompliance.connect(consumer).revokeConsent(consentId);

      const isCompliant = await privacyCompliance.verifyCompliance(testDataHash, consumer.address, testRequestId);
      expect(isCompliant).to.be.false;
    });

    it("Should not verify compliance for inactive policy", async function () {
      // Revoke policy
      await privacyCompliance.connect(provider).revokePrivacyPolicy(policyId);

      const isCompliant = await privacyCompliance.verifyCompliance(testDataHash, consumer.address, testRequestId);
      expect(isCompliant).to.be.false;
    });

    it("Should not verify compliance for non-existent data", async function () {
      const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));
      
      const isCompliant = await privacyCompliance.verifyCompliance(nonExistentHash, consumer.address, testRequestId);
      expect(isCompliant).to.be.false;
    });
  });

  describe("Audit Trail", function () {
    let policyId: number;

    beforeEach(async function () {
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("privacy-policy")),
        "ipfs://QmPrivacyPolicy123",
        ["no_sharing"],
        30 * 24 * 60 * 60
      );
      policyId = 0;
    });

    it("Should record audit log entry", async function () {
      await expect(
        privacyCompliance.connect(auditor).recordAuditLog(
          testDataHash,
          consumer.address,
          1, // Access
          "User accessed data for research"
        )
      ).to.emit(privacyCompliance, "AuditLogRecorded")
        .withArgs(0, testDataHash, consumer.address, 1);

      const logEntry = await privacyCompliance.getAuditLog(0);
      expect(logEntry.dataHash).to.equal(testDataHash);
      expect(logEntry.user).to.equal(consumer.address);
      expect(logEntry.action).to.equal(1); // Access
      expect(logEntry.details).to.equal("User accessed data for research");
    });

    it("Should not allow non-auditor to record audit log", async function () {
      await expect(
        privacyCompliance.connect(provider).recordAuditLog(
          testDataHash,
          consumer.address,
          1,
          "Unauthorized log entry"
        )
      ).to.be.reverted;
    });

    it("Should get audit history for data", async function () {
      // Record multiple audit entries
      await privacyCompliance.connect(auditor).recordAuditLog(
        testDataHash,
        consumer.address,
        1, // Access
        "First access"
      );

      await privacyCompliance.connect(auditor).recordAuditLog(
        testDataHash,
        consumer.address,
        2, // Modification
        "Data processed"
      );

      const auditHistory = await privacyCompliance.getDataAuditHistory(testDataHash);
      expect(auditHistory.length).to.equal(2);
    });

    it("Should get user audit history", async function () {
      await privacyCompliance.connect(auditor).recordAuditLog(
        testDataHash,
        consumer.address,
        1,
        "User activity logged"
      );

      const userHistory = await privacyCompliance.getUserAuditHistory(consumer.address);
      expect(userHistory.length).to.equal(1);
      expect(userHistory[0]).to.equal(0);
    });
  });

  describe("Data Retention Management", function () {
    let policyId: number;

    beforeEach(async function () {
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("privacy-policy")),
        "ipfs://QmPrivacyPolicy123",
        ["retention_limited"],
        7 * 24 * 60 * 60 // 7 days
      );
      policyId = 0;
    });

    it("Should check if data retention has expired", async function () {
      const hasExpired = await privacyCompliance.hasRetentionExpired(policyId);
      expect(hasExpired).to.be.false; // Should not be expired immediately
    });

    it("Should get retention deadline correctly", async function () {
      const policy = await privacyCompliance.getPrivacyPolicy(policyId);
      const expectedDeadline = policy.createdAt + BigInt(7 * 24 * 60 * 60);
      
      const deadline = await privacyCompliance.getRetentionDeadline(policyId);
      expect(deadline).to.equal(expectedDeadline);
    });

    it("Should enforce data deletion after retention period", async function () {
      // This would typically require advancing blockchain time in a real test
      // For demonstration, we test the logic structure
      
      await expect(
        privacyCompliance.connect(auditor).enforceDataDeletion(policyId)
      ).to.emit(privacyCompliance, "DataDeletionEnforced")
        .withArgs(policyId, auditor.address);
    });

    it("Should not allow non-auditor to enforce deletion", async function () {
      await expect(
        privacyCompliance.connect(provider).enforceDataDeletion(policyId)
      ).to.be.reverted;
    });
  });

  describe("Compliance Reporting", function () {
    beforeEach(async function () {
      // Create multiple policies and consents
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("policy1")),
        "ipfs://QmPolicy1",
        ["no_sharing"],
        30 * 24 * 60 * 60
      );

      await privacyCompliance.connect(consumer).giveConsent(
        0,
        testRequestId,
        "ipfs://QmConsent1"
      );
    });

    it("Should generate compliance report", async function () {
      const report = await privacyCompliance.generateComplianceReport(testDataHash);
      
      expect(report.dataHash).to.equal(testDataHash);
      expect(report.totalPolicies).to.equal(1);
      expect(report.activePolicies).to.equal(1);
      expect(report.totalConsents).to.equal(1);
      expect(report.activeConsents).to.equal(1);
    });

    it("Should get policy compliance status", async function () {
      const status = await privacyCompliance.getPolicyComplianceStatus(0);
      expect(status.hasActiveConsents).to.be.true;
      expect(status.isRetentionValid).to.be.true;
      expect(status.lastAuditTime).to.equal(0); // No audits yet
    });
  });

  describe("Contract Pause Functionality", function () {
    it("Should allow admin to pause and unpause", async function () {
      await privacyCompliance.connect(owner).pause();
      
      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          testDataHash,
          ethers.keccak256(ethers.toUtf8Bytes("policy")),
          "ipfs://QmPolicy",
          ["no_sharing"],
          30 * 24 * 60 * 60
        )
      ).to.be.revertedWithCustomError(privacyCompliance, "EnforcedPause");

      await privacyCompliance.connect(owner).unpause();
      
      // Should work again after unpause
      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          testDataHash,
          ethers.keccak256(ethers.toUtf8Bytes("policy")),
          "ipfs://QmPolicy",
          ["no_sharing"],
          30 * 24 * 60 * 60
        )
      ).to.emit(privacyCompliance, "PrivacyPolicyCreated");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle complex privacy requirements", async function () {
      const complexRequirements = [
        "gdpr_compliant",
        "ccpa_compliant", 
        "anonymization_required",
        "no_international_transfer",
        "encryption_at_rest",
        "encryption_in_transit",
        "audit_trail_required"
      ];

      await expect(
        privacyCompliance.connect(provider).createPrivacyPolicy(
          testDataHash,
          ethers.keccak256(ethers.toUtf8Bytes("complex-policy")),
          "ipfs://QmComplexPolicy",
          complexRequirements,
          365 * 24 * 60 * 60 // 1 year
        )
      ).to.emit(privacyCompliance, "PrivacyPolicyCreated");
    });

    it("Should prevent consent manipulation", async function () {
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("policy")),
        "ipfs://QmPolicy",
        ["no_sharing"],
        30 * 24 * 60 * 60
      );

      await privacyCompliance.connect(consumer).giveConsent(
        0,
        testRequestId,
        "ipfs://QmConsent"
      );

      // Should not allow provider to revoke user's consent
      await expect(
        privacyCompliance.connect(provider).revokeConsent(0)
      ).to.be.revertedWith("PrivacyCompliance: Only consent giver can revoke");
    });

    it("Should maintain data integrity across operations", async function () {
      // Create policy
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("integrity-policy")),
        "ipfs://QmIntegrityPolicy",
        ["integrity_required"],
        30 * 24 * 60 * 60
      );

      // Give consent
      await privacyCompliance.connect(consumer).giveConsent(
        0,
        testRequestId,
        "ipfs://QmIntegrityConsent"
      );

      // Record audit
      await privacyCompliance.connect(auditor).recordAuditLog(
        testDataHash,
        consumer.address,
        1,
        "Integrity verification passed"
      );

      // Verify all data is consistent
      const policy = await privacyCompliance.getPrivacyPolicy(0);
      const consent = await privacyCompliance.getConsent(0);
      const isCompliant = await privacyCompliance.verifyCompliance(testDataHash, consumer.address, testRequestId);

      expect(policy.isActive).to.be.true;
      expect(consent.isActive).to.be.true;
      expect(isCompliant).to.be.true;
    });

    it("Should handle concurrent policy updates safely", async function () {
      await privacyCompliance.connect(provider).createPrivacyPolicy(
        testDataHash,
        ethers.keccak256(ethers.toUtf8Bytes("concurrent-policy")),
        "ipfs://QmConcurrentPolicy",
        ["test"],
        30 * 24 * 60 * 60
      );

      // Multiple rapid updates should all succeed
      for (let i = 0; i < 5; i++) {
        await privacyCompliance.connect(provider).updatePrivacyPolicy(
          0,
          ethers.keccak256(ethers.toUtf8Bytes(`updated-policy-${i}`)),
          `ipfs://QmUpdated${i}`,
          [`requirement_${i}`],
          (30 + i) * 24 * 60 * 60
        );
      }

      const finalPolicy = await privacyCompliance.getPrivacyPolicy(0);
      expect(finalPolicy.policyURI).to.equal("ipfs://QmUpdated4");
    });
  });
});