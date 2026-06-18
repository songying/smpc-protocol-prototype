import { expect } from "chai";
import hre from "hardhat";
import { FeeManagement } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("FeeManagement", function () {
  let feeManagement: FeeManagement;
  let owner: HardhatEthersSigner;
  let provider: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;
  let computingNode: HardhatEthersSigner;
  let consumer: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;

  const testTransactionId = ethers.keccak256(ethers.toUtf8Bytes("test-transaction-1"));
  const testAmount = ethers.parseEther("1.0");

  beforeEach(async function () {
    // Get signers
    [owner, provider, auditor, computingNode, consumer, treasury] = await ethers.getSigners();

    // Deploy FeeManagement contract
    const FeeManagement = await ethers.getContractFactory("FeeManagement");
    feeManagement = await FeeManagement.deploy();
    await feeManagement.waitForDeployment();

    // Grant roles
    const COMPUTING_REQUEST_ROLE = await feeManagement.COMPUTING_REQUEST_ROLE();
    await feeManagement.grantRole(COMPUTING_REQUEST_ROLE, owner.address); // For testing
    await feeManagement.grantRole(await feeManagement.TREASURY_ROLE(), treasury.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner and roles", async function () {
      expect(await feeManagement.hasRole(await feeManagement.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await feeManagement.hasRole(await feeManagement.ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should have correct default fee configuration", async function () {
      const feeConfig = await feeManagement.feeConfig();
      expect(feeConfig.platformFeePercentage).to.equal(500); // 5%
      expect(feeConfig.auditorFeePercentage).to.equal(200); // 2%
      expect(feeConfig.providerFeePercentage).to.equal(7000); // 70%
      expect(feeConfig.computingNodeFeePercentage).to.equal(2300); // 23%
    });
  });

  describe("Fee Calculation", function () {
    it("Should calculate fees correctly", async function () {
      const breakdown = await feeManagement.calculateFees(testAmount);
      
      // Expected calculations (based on 1 ETH)
      const expectedPlatformFee = (testAmount * 500n) / 10000n; // 5% = 0.05 ETH
      const expectedAuditorFee = (testAmount * 200n) / 10000n; // 2% = 0.02 ETH
      const expectedProviderFee = (testAmount * 7000n) / 10000n; // 70% = 0.7 ETH
      const expectedComputingNodeFee = (testAmount * 2300n) / 10000n; // 23% = 0.23 ETH

      expect(breakdown.totalAmount).to.equal(testAmount);
      expect(breakdown.platformFee).to.equal(expectedPlatformFee);
      expect(breakdown.auditorFee).to.equal(expectedAuditorFee);
      expect(breakdown.providerFee).to.equal(expectedProviderFee);
      expect(breakdown.computingNodeFee).to.equal(expectedComputingNodeFee);
    });

    it("Should reject amounts below minimum fee", async function () {
      const tooSmallAmount = ethers.parseEther("0.0001"); // Below 0.001 ETH minimum
      await expect(
        feeManagement.calculateFees(tooSmallAmount)
      ).to.be.revertedWith("FeeManagement: Amount below minimum fee");
    });
  });

  describe("Fee Payment Processing", function () {
    it("Should process fee payment correctly", async function () {
      await expect(
        feeManagement.processFeePayment(
          testTransactionId,
          consumer.address,
          "Data access payment",
          { value: testAmount }
        )
      ).to.emit(feeManagement, "FeesCalculated")
        .withArgs(
          testTransactionId,
          testAmount,
          anyValue, anyValue, anyValue, anyValue
        );

      // Check transaction record
      const transaction = await feeManagement.getTransaction(testTransactionId);
      expect(transaction.transactionId).to.equal(testTransactionId);
      expect(transaction.payer).to.equal(consumer.address);
      expect(transaction.totalAmount).to.equal(testAmount);
      expect(transaction.isDistributed).to.be.false;
      expect(transaction.purpose).to.equal("Data access payment");
    });

    it("Should not allow duplicate transaction IDs", async function () {
      // Process first payment
      await feeManagement.processFeePayment(
        testTransactionId,
        consumer.address,
        "First payment",
        { value: testAmount }
      );

      // Try to process with same transaction ID
      await expect(
        feeManagement.processFeePayment(
          testTransactionId,
          consumer.address,
          "Second payment",
          { value: testAmount }
        )
      ).to.be.revertedWith("FeeManagement: Transaction already exists");
    });

    it("Should not allow zero payment", async function () {
      await expect(
        feeManagement.processFeePayment(
          testTransactionId,
          consumer.address,
          "Zero payment",
          { value: 0 }
        )
      ).to.be.revertedWith("FeeManagement: Payment amount must be greater than zero");
    });

    it("Should not allow non-computing-request role to process payments", async function () {
      await expect(
        feeManagement.connect(consumer).processFeePayment(
          testTransactionId,
          consumer.address,
          "Unauthorized payment",
          { value: testAmount }
        )
      ).to.be.reverted;
    });
  });

  describe("Fee Distribution", function () {
    beforeEach(async function () {
      // Process a payment first
      await feeManagement.processFeePayment(
        testTransactionId,
        consumer.address,
        "Test payment",
        { value: testAmount }
      );
    });

    it("Should distribute fees correctly", async function () {
      const providers = [provider.address];
      const auditors = [auditor.address];

      await expect(
        feeManagement.distributeFees(
          testTransactionId,
          providers,
          auditors,
          computingNode.address
        )
      ).to.emit(feeManagement, "FeesDistributed")
        .withArgs(testTransactionId, providers, auditors, computingNode.address, anyValue);

      // Check balances
      const providerBalance = await feeManagement.providerBalances(provider.address);
      const auditorBalance = await feeManagement.auditorBalances(auditor.address);
      const computingNodeBalance = await feeManagement.computingNodeBalances(computingNode.address);
      const platformBalance = await feeManagement.platformBalance();

      expect(providerBalance).to.be.gt(0);
      expect(auditorBalance).to.be.gt(0);
      expect(computingNodeBalance).to.be.gt(0);
      expect(platformBalance).to.be.gt(0);

      // Check transaction is marked as distributed
      const transaction = await feeManagement.getTransaction(testTransactionId);
      expect(transaction.isDistributed).to.be.true;
    });

    it("Should split provider fees equally among multiple providers", async function () {
      const providers = [provider.address, treasury.address]; // Using treasury as second provider
      const auditors = [auditor.address];

      await feeManagement.distributeFees(
        testTransactionId,
        providers,
        auditors,
        computingNode.address
      );

      const provider1Balance = await feeManagement.providerBalances(provider.address);
      const provider2Balance = await feeManagement.providerBalances(treasury.address);

      // Should be equal (or very close due to potential rounding)
      expect(provider1Balance).to.equal(provider2Balance);
    });

    it("Should not allow distribution without required participants", async function () {
      // No providers
      await expect(
        feeManagement.distributeFees(
          testTransactionId,
          [],
          [auditor.address],
          computingNode.address
        )
      ).to.be.revertedWith("FeeManagement: At least one provider required");

      // No auditors
      await expect(
        feeManagement.distributeFees(
          testTransactionId,
          [provider.address],
          [],
          computingNode.address
        )
      ).to.be.revertedWith("FeeManagement: At least one auditor required");

      // Invalid computing node
      await expect(
        feeManagement.distributeFees(
          testTransactionId,
          [provider.address],
          [auditor.address],
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("FeeManagement: Invalid computing node address");
    });

    it("Should not allow double distribution", async function () {
      const providers = [provider.address];
      const auditors = [auditor.address];

      // First distribution
      await feeManagement.distributeFees(
        testTransactionId,
        providers,
        auditors,
        computingNode.address
      );

      // Second distribution should fail
      await expect(
        feeManagement.distributeFees(
          testTransactionId,
          providers,
          auditors,
          computingNode.address
        )
      ).to.be.revertedWith("FeeManagement: Fees already distributed");
    });
  });

  describe("Balance Withdrawal", function () {
    beforeEach(async function () {
      // Process payment and distribute fees
      await feeManagement.processFeePayment(
        testTransactionId,
        consumer.address,
        "Test payment",
        { value: testAmount }
      );

      await feeManagement.distributeFees(
        testTransactionId,
        [provider.address],
        [auditor.address],
        computingNode.address
      );
    });

    it("Should allow users to withdraw their balance", async function () {
      const initialBalance = await ethers.provider.getBalance(provider.address);
      const availableBalance = await feeManagement.getAvailableBalance(provider.address);

      expect(availableBalance).to.be.gt(0);

      await expect(
        feeManagement.connect(provider).withdrawBalance(0) // 0 = withdraw all
      ).to.emit(feeManagement, "BalanceWithdrawn")
        .withArgs(provider.address, availableBalance, anyValue);

      const finalBalance = await ethers.provider.getBalance(provider.address);
      expect(finalBalance).to.be.gt(initialBalance);

      // Check balance is now zero
      const remainingBalance = await feeManagement.getAvailableBalance(provider.address);
      expect(remainingBalance).to.equal(0);
    });

    it("Should allow partial withdrawal", async function () {
      const availableBalance = await feeManagement.getAvailableBalance(provider.address);
      const withdrawAmount = availableBalance / 2n;

      await feeManagement.connect(provider).withdrawBalance(withdrawAmount);

      const remainingBalance = await feeManagement.getAvailableBalance(provider.address);
      expect(remainingBalance).to.be.approximately(withdrawAmount, ethers.parseEther("0.001"));
    });

    it("Should not allow withdrawal without balance", async function () {
      await expect(
        feeManagement.connect(consumer).withdrawBalance(ethers.parseEther("0.1"))
      ).to.be.revertedWith("FeeManagement: No balance available");
    });
  });

  describe("Fee Configuration Updates", function () {
    it("Should allow admin to update fee configuration", async function () {
      const newPlatformFee = 600n; // 6%
      const newAuditorFee = 300n; // 3%
      const newProviderFee = 6800n; // 68%
      const newComputingNodeFee = 2300n; // 23%
      const newMinFee = ethers.parseEther("0.002");
      const newMaxFee = ethers.parseEther("100");

      await expect(
        feeManagement.updateFeeConfiguration(
          newPlatformFee,
          newAuditorFee,
          newProviderFee,
          newComputingNodeFee,
          newMinFee,
          newMaxFee
        )
      ).to.emit(feeManagement, "FeeConfigUpdated")
        .withArgs(newPlatformFee, newAuditorFee, newProviderFee, newComputingNodeFee, owner.address);

      const feeConfig = await feeManagement.feeConfig();
      expect(feeConfig.platformFeePercentage).to.equal(newPlatformFee);
      expect(feeConfig.auditorFeePercentage).to.equal(newAuditorFee);
      expect(feeConfig.providerFeePercentage).to.equal(newProviderFee);
      expect(feeConfig.computingNodeFeePercentage).to.equal(newComputingNodeFee);
      expect(feeConfig.minimumFee).to.equal(newMinFee);
      expect(feeConfig.maximumFee).to.equal(newMaxFee);
    });

    it("Should not allow total fees to exceed 100%", async function () {
      await expect(
        feeManagement.updateFeeConfiguration(
          5000n, // 50%
          3000n, // 30%
          3000n, // 30%
          2000n, // 20% - Total = 130%
          ethers.parseEther("0.001"),
          0
        )
      ).to.be.revertedWith("FeeManagement: Total fees cannot exceed 100%");
    });

    it("Should not allow non-admin to update configuration", async function () {
      await expect(
        feeManagement.connect(consumer).updateFeeConfiguration(
          600n, 300n, 6800n, 2300n,
          ethers.parseEther("0.002"),
          0
        )
      ).to.be.reverted;
    });
  });

  describe("Platform Fee Withdrawal", function () {
    beforeEach(async function () {
      // Process and distribute fees to generate platform balance
      await feeManagement.processFeePayment(
        testTransactionId,
        consumer.address,
        "Test payment",
        { value: testAmount }
      );

      await feeManagement.distributeFees(
        testTransactionId,
        [provider.address],
        [auditor.address],
        computingNode.address
      );
    });

    it("Should allow treasury to withdraw platform fees", async function () {
      const platformBalance = await feeManagement.platformBalance();
      expect(platformBalance).to.be.gt(0);

      const initialBalance = await ethers.provider.getBalance(treasury.address);

      await feeManagement.connect(treasury).withdrawPlatformFees(0); // 0 = withdraw all

      const finalBalance = await ethers.provider.getBalance(treasury.address);
      expect(finalBalance).to.be.gt(initialBalance);

      const remainingPlatformBalance = await feeManagement.platformBalance();
      expect(remainingPlatformBalance).to.equal(0);
    });

    it("Should not allow non-treasury to withdraw platform fees", async function () {
      await expect(
        feeManagement.connect(consumer).withdrawPlatformFees(ethers.parseEther("0.1"))
      ).to.be.reverted;
    });
  });

  describe("Statistics and Queries", function () {
    beforeEach(async function () {
      await feeManagement.processFeePayment(
        testTransactionId,
        consumer.address,
        "Test payment",
        { value: testAmount }
      );
    });

    it("Should return correct statistics", async function () {
      const [totalFees, platformFees, totalTransactions, contractBalance] = 
        await feeManagement.getStatistics();

      expect(totalFees).to.equal(testAmount);
      expect(totalTransactions).to.equal(1);
      expect(contractBalance).to.equal(testAmount);
    });

    it("Should return user transactions correctly", async function () {
      const userTransactions = await feeManagement.getUserTransactions(consumer.address);
      expect(userTransactions.length).to.equal(1);
      expect(userTransactions[0]).to.equal(testTransactionId);
    });

    it("Should return balance breakdown correctly", async function () {
      await feeManagement.distributeFees(
        testTransactionId,
        [provider.address],
        [auditor.address],
        computingNode.address
      );

      const [providerBal, auditorBal, computingNodeBal, total] = 
        await feeManagement.getBalanceBreakdown(provider.address);

      expect(providerBal).to.be.gt(0);
      expect(total).to.equal(providerBal + auditorBal + computingNodeBal);
    });
  });

  // Helper function for anyValue matcher
  function anyValue() {
    return true;
  }
});