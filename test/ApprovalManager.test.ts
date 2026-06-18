import { expect } from "chai";
import hre from "hardhat";
import { ApprovalManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("ApprovalManager", function () {
  let approvalManager: ApprovalManager;
  let owner: HardhatEthersSigner;
  let provider: HardhatEthersSigner;
  let consumer: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;

  // Test data
  const testDataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data-content"));

  beforeEach(async function () {
    // Get signers
    [owner, provider, consumer, auditor] = await ethers.getSigners();

    // Deploy ApprovalManager contract
    const ApprovalManager = await ethers.getContractFactory("ApprovalManager");
    approvalManager = await ApprovalManager.deploy();
    await approvalManager.waitForDeployment();

    // Grant roles
    await approvalManager.grantProviderRole(provider.address);
    await approvalManager.grantConsumerRole(consumer.address);
    await approvalManager.grantAuditorRole(auditor.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await approvalManager.hasRole(await approvalManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should have correct initial statistics", async function () {
      const stats = await approvalManager.getStatistics();
      expect(stats.total).to.equal(0);
      expect(stats.pending).to.equal(0);
    });
  });

  describe("Role Management", function () {
    it("Should grant provider role correctly", async function () {
      const PROVIDER_ROLE = await approvalManager.DATA_PROVIDER_ROLE();
      expect(await approvalManager.hasRole(PROVIDER_ROLE, provider.address)).to.be.true;
    });

    it("Should grant consumer role correctly", async function () {
      const CONSUMER_ROLE = await approvalManager.CONSUMER_ROLE();
      expect(await approvalManager.hasRole(CONSUMER_ROLE, consumer.address)).to.be.true;
    });

    it("Should grant auditor role correctly", async function () {
      const AUDITOR_ROLE = await approvalManager.AUDITOR_ROLE();
      expect(await approvalManager.hasRole(AUDITOR_ROLE, auditor.address)).to.be.true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(
        approvalManager.connect(provider).grantProviderRole(consumer.address)
      ).to.be.reverted;
    });
  });

  describe("Approval Request Creation", function () {
    it("Should create data access approval request successfully", async function () {
      await expect(
        approvalManager.connect(consumer).createApprovalRequest(
          0, // DataAccess type
          testDataHash,
          "Research purposes for medical study",
          "0x"
        )
      ).to.emit(approvalManager, "ApprovalRequestCreated");

      const stats = await approvalManager.getStatistics();
      expect(stats.total).to.equal(1);
      expect(stats.pending).to.equal(1);
    });

    it("Should not allow empty description", async function () {
      await expect(
        approvalManager.connect(consumer).createApprovalRequest(
          0, // DataAccess type
          testDataHash,
          "",
          "0x"
        )
      ).to.be.revertedWith("ApprovalManager: Description required");
    });

    it("Should not allow invalid target hash", async function () {
      await expect(
        approvalManager.connect(consumer).createApprovalRequest(
          0, // DataAccess type
          ethers.ZeroHash,
          "Research purposes",
          "0x"
        )
      ).to.be.revertedWith("ApprovalManager: Invalid target hash");
    });

    it("Should create computing request approval successfully", async function () {
      const metadata = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "uint256"],
        ["def compute(data): return analyze(data)", ethers.parseEther("1.0")]
      );

      await expect(
        approvalManager.connect(consumer).createApprovalRequest(
          1, // ComputingRequest type
          testDataHash,
          "Data analysis computing request",
          metadata
        )
      ).to.emit(approvalManager, "ApprovalRequestCreated");
    });
  });

  describe("Stake Management", function () {
    beforeEach(async function () {
      // Deposit stake for testing
      await approvalManager.connect(provider).depositStake({ value: ethers.parseEther("1.0") });
      await approvalManager.connect(auditor).depositStake({ value: ethers.parseEther("0.5") });
    });

    it("Should allow stake deposits", async function () {
      const stakeAmount = ethers.parseEther("0.5");
      
      await expect(
        approvalManager.connect(consumer).depositStake({ value: stakeAmount })
      ).to.emit(approvalManager, "StakeDeposited")
        .withArgs(consumer.address, stakeAmount, stakeAmount);

      expect(await approvalManager.stakeholderStake(consumer.address)).to.equal(stakeAmount);
    });

    it("Should allow stake withdrawals", async function () {
      const withdrawAmount = ethers.parseEther("0.2");
      
      await expect(
        approvalManager.connect(provider).withdrawStake(withdrawAmount)
      ).to.emit(approvalManager, "StakeWithdrawn");

      expect(await approvalManager.stakeholderStake(provider.address)).to.equal(
        ethers.parseEther("1.0") - withdrawAmount
      );
    });

    it("Should not allow withdrawal without balance", async function () {
      await expect(
        approvalManager.connect(consumer).withdrawStake(ethers.parseEther("1.0"))
      ).to.be.revertedWith("ApprovalManager: No stake available");
    });
  });

  describe("Approval Process", function () {
    let requestId: string;

    beforeEach(async function () {
      // Deposit stakes
      await approvalManager.connect(provider).depositStake({ value: ethers.parseEther("1.0") });
      await approvalManager.connect(auditor).depositStake({ value: ethers.parseEther("0.5") });
      
      // Create an approval request
      const tx = await approvalManager.connect(consumer).createApprovalRequest(
        0, // DataAccess type
        testDataHash,
        "Medical research data access request",
        "0x"
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = approvalManager.interface.parseLog(log);
          return parsed?.name === 'ApprovalRequestCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = approvalManager.interface.parseLog(event);
        requestId = parsed?.args?.requestId;
      }
    });

    it("Should allow approval with stake", async function () {
      const stakeAmount = ethers.parseEther("0.1");
      
      await expect(
        approvalManager.connect(provider).approveRequest(requestId, stakeAmount)
      ).to.emit(approvalManager, "ApprovalGiven");

      const requestInfo = await approvalManager.getRequestInfo(requestId);
      expect(requestInfo.approvalCount).to.equal(1);
    });

    it("Should allow rejection with reason", async function () {
      await expect(
        approvalManager.connect(provider).rejectRequest(requestId, "Privacy concerns")
      ).to.emit(approvalManager, "ApprovalRejected")
        .withArgs(requestId, provider.address, "Privacy concerns", 1);

      const requestInfo = await approvalManager.getRequestInfo(requestId);
      expect(requestInfo.rejectionCount).to.equal(1);
    });

    it("Should not allow empty rejection reason", async function () {
      await expect(
        approvalManager.connect(provider).rejectRequest(requestId, "")
      ).to.be.revertedWith("ApprovalManager: Rejection reason required");
    });

    it("Should not allow double approval by same user", async function () {
      await approvalManager.connect(provider).approveRequest(requestId, ethers.parseEther("0.1"));
      
      await expect(
        approvalManager.connect(provider).approveRequest(requestId, ethers.parseEther("0.1"))
      ).to.be.revertedWith("ApprovalManager: Already acted on this request");
    });

    it("Should not allow insufficient stake", async function () {
      await expect(
        approvalManager.connect(provider).approveRequest(requestId, ethers.parseEther("2.0"))
      ).to.be.revertedWith("ApprovalManager: Insufficient stake balance");
    });
  });

  describe("Request Execution", function () {
    let requestId: string;

    beforeEach(async function () {
      // Setup stakes
      await approvalManager.connect(provider).depositStake({ value: ethers.parseEther("1.0") });
      await approvalManager.connect(auditor).depositStake({ value: ethers.parseEther("1.0") });
      
      // Create request
      const tx = await approvalManager.connect(consumer).createApprovalRequest(
        0, // DataAccess type
        testDataHash,
        "Test approval request",
        "0x"
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = approvalManager.interface.parseLog(log);
          return parsed?.name === 'ApprovalRequestCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = approvalManager.interface.parseLog(event);
        requestId = parsed?.args?.requestId;
      }

      // Get enough approvals to meet criteria
      await approvalManager.connect(provider).approveRequest(requestId, ethers.parseEther("0.1"));
      await approvalManager.connect(auditor).approveRequest(requestId, ethers.parseEther("0.1"));
    });

    it("Should execute approved request", async function () {
      await expect(
        approvalManager.connect(owner).executeRequest(requestId)
      ).to.emit(approvalManager, "ApprovalExecuted");

      const requestInfo = await approvalManager.getRequestInfo(requestId);
      expect(requestInfo.isExecuted).to.be.true;
      expect(requestInfo.status).to.equal(4); // Executed
    });

    it("Should not allow double execution", async function () {
      await approvalManager.connect(owner).executeRequest(requestId);
      
      await expect(
        approvalManager.connect(owner).executeRequest(requestId)
      ).to.be.revertedWith("ApprovalManager: Request already executed");
    });
  });

  describe("Expired Requests", function () {
    it("Should handle expired requests", async function () {
      // Create a request that will expire quickly
      const tx = await approvalManager.connect(consumer).createApprovalRequest(
        3, // Emergency type (short timeout)
        testDataHash,
        "Emergency request",
        "0x"
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = approvalManager.interface.parseLog(log);
          return parsed?.name === 'ApprovalRequestCreated';
        } catch {
          return false;
        }
      });
      
      let requestId;
      if (event) {
        const parsed = approvalManager.interface.parseLog(event);
        requestId = parsed?.args?.requestId;
      }

      // Fast forward time by increasing block timestamp
      await ethers.provider.send("evm_increaseTime", [2 * 60 * 60 + 1]); // 2 hours + 1 second
      await ethers.provider.send("evm_mine", []);

      await expect(
        approvalManager.connect(owner).handleExpiredRequest(requestId)
      ).to.emit(approvalManager, "ApprovalStatusChanged");
    });
  });

  describe("Contract Pause Functionality", function () {
    it("Should allow admin to pause and unpause", async function () {
      await approvalManager.connect(owner).pause();
      
      await expect(
        approvalManager.connect(consumer).createApprovalRequest(
          0,
          testDataHash,
          "Test request during pause",
          "0x"
        )
      ).to.be.revertedWithCustomError(approvalManager, "EnforcedPause");

      await approvalManager.connect(owner).unpause();
      
      // Should work again after unpause
      await expect(
        approvalManager.connect(consumer).createApprovalRequest(
          0,
          testDataHash,
          "Test request after unpause",
          "0x"
        )
      ).to.emit(approvalManager, "ApprovalRequestCreated");
    });
  });

  describe("Statistics and Queries", function () {
    beforeEach(async function () {
      // Create multiple requests
      await approvalManager.connect(consumer).createApprovalRequest(
        0, // DataAccess
        testDataHash,
        "First request",
        "0x"
      );
      
      await approvalManager.connect(consumer).createApprovalRequest(
        1, // ComputingRequest
        ethers.keccak256(ethers.toUtf8Bytes("another-data")),
        "Second request",
        "0x"
      );
    });

    it("Should return correct statistics", async function () {
      const stats = await approvalManager.getStatistics();
      expect(stats.total).to.equal(2);
      expect(stats.pending).to.equal(2);
      expect(stats.approved).to.equal(0);
      expect(stats.rejected).to.equal(0);
    });

    it("Should track user requests correctly", async function () {
      const userRequestCount = await approvalManager.userRequests(consumer.address, 0);
      expect(userRequestCount).to.not.be.undefined;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle large metadata correctly", async function () {
      const largeMetadata = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["Very long description ".repeat(100)]
      );

      await expect(
        approvalManager.connect(consumer).createApprovalRequest(
          0,
          testDataHash,
          "Request with large metadata",
          largeMetadata
        )
      ).to.emit(approvalManager, "ApprovalRequestCreated");
    });

    it("Should prevent self-approval when not allowed", async function () {
      // Create request as consumer
      const tx = await approvalManager.connect(consumer).createApprovalRequest(
        0,
        testDataHash,
        "Self-approval test",
        "0x"
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = approvalManager.interface.parseLog(log);
          return parsed?.name === 'ApprovalRequestCreated';
        } catch {
          return false;
        }
      });
      
      let requestId;
      if (event) {
        const parsed = approvalManager.interface.parseLog(event);
        requestId = parsed?.args?.requestId;
      }

      // Deposit stake for consumer
      await approvalManager.connect(consumer).depositStake({ value: ethers.parseEther("0.5") });

      // Try to approve own request
      await expect(
        approvalManager.connect(consumer).approveRequest(requestId, ethers.parseEther("0.1"))
      ).to.be.revertedWith("ApprovalManager: Self-approval not allowed");
    });
  });
});