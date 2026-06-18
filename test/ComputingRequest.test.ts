import { expect } from "chai";
import hre from "hardhat";
import { ComputingRequest, DataRegistry, FeeManagement, ApprovalManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("ComputingRequest", function () {
  let computingRequest: ComputingRequest;
  let dataRegistry: DataRegistry;
  let feeManagement: FeeManagement;
  let approvalManager: ApprovalManager;
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
  const testComputingScript = "def compute(data): return sum(data)";
  const testBudget = ethers.parseEther("1.0");

  beforeEach(async function () {
    // Get signers
    [owner, provider, consumer, auditor] = await ethers.getSigners();

    // Deploy DataRegistry contract
    const DataRegistry = await ethers.getContractFactory("DataRegistry");
    dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();

    // Deploy FeeManagement contract
    const FeeManagement = await ethers.getContractFactory("FeeManagement");
    feeManagement = await FeeManagement.deploy(owner.address);
    await feeManagement.waitForDeployment();

    // Deploy ApprovalManager contract
    const ApprovalManager = await ethers.getContractFactory("ApprovalManager");
    approvalManager = await ApprovalManager.deploy();
    await approvalManager.waitForDeployment();

    // Deploy ComputingRequest contract
    const ComputingRequest = await ethers.getContractFactory("ComputingRequest");
    computingRequest = await ComputingRequest.deploy(
      await dataRegistry.getAddress()
    );
    await computingRequest.waitForDeployment();

    // Setup roles
    await dataRegistry.grantProviderRole(provider.address);
    await dataRegistry.grantConsumerRole(consumer.address);
    await dataRegistry.grantAuditorRole(auditor.address);
    
    await approvalManager.grantProviderRole(provider.address);
    await approvalManager.grantConsumerRole(consumer.address);
    await approvalManager.grantAuditorRole(auditor.address);

    // Grant computing request role to the contract
    const COMPUTING_REQUEST_ROLE = await feeManagement.COMPUTING_REQUEST_ROLE();
    await feeManagement.grantRole(COMPUTING_REQUEST_ROLE, await computingRequest.getAddress());

    // Register test data
    await dataRegistry.connect(provider).registerData(
      testDataHash,
      testMetadataURI,
      testPrice,
      0, // DataCategory.Personal
      testTags,
      true,
      testDataSize
    );
    await dataRegistry.connect(owner).changeDataStatus(testDataHash, 1); // Activate
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await computingRequest.hasRole(await computingRequest.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should set contract addresses correctly", async function () {
      expect(await computingRequest.dataRegistry()).to.equal(await dataRegistry.getAddress());
      expect(await computingRequest.feeManager()).to.equal(await feeManagement.getAddress());
      expect(await computingRequest.approvalManager()).to.equal(await approvalManager.getAddress());
    });

    it("Should have correct initial statistics", async function () {
      const [totalRequests, activeRequests] = await computingRequest.getStatistics();
      expect(totalRequests).to.equal(0);
      expect(activeRequests).to.equal(0);
    });
  });

  describe("Request Creation", function () {
    it("Should create computing request successfully", async function () {
      const dataHashes = [testDataHash];
      
      await expect(
        computingRequest.connect(consumer).createRequest(
          dataHashes,
          testComputingScript,
          testBudget,
          { value: testBudget }
        )
      ).to.emit(computingRequest, "RequestCreated");

      // Check request details
      const requestId = 0;
      const request = await computingRequest.getRequest(requestId);
      expect(request.consumer).to.equal(consumer.address);
      expect(request.dataHashes).to.deep.equal(dataHashes);
      expect(request.computingScript).to.equal(testComputingScript);
      expect(request.budget).to.equal(testBudget);
      expect(request.status).to.equal(0); // Pending
    });

    it("Should not allow empty data hashes", async function () {
      await expect(
        computingRequest.connect(consumer).createRequest(
          [],
          testComputingScript,
          testBudget,
          { value: testBudget }
        )
      ).to.be.revertedWith("ComputingRequest: No data specified");
    });

    it("Should not allow empty computing script", async function () {
      await expect(
        computingRequest.connect(consumer).createRequest(
          [testDataHash],
          "",
          testBudget,
          { value: testBudget }
        )
      ).to.be.revertedWith("ComputingRequest: Computing script required");
    });

    it("Should not allow zero budget", async function () {
      await expect(
        computingRequest.connect(consumer).createRequest(
          [testDataHash],
          testComputingScript,
          0,
          { value: 0 }
        )
      ).to.be.revertedWith("ComputingRequest: Budget must be greater than zero");
    });

    it("Should not allow insufficient payment", async function () {
      await expect(
        computingRequest.connect(consumer).createRequest(
          [testDataHash],
          testComputingScript,
          testBudget,
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWith("ComputingRequest: Insufficient payment");
    });

    it("Should not allow non-existent data", async function () {
      const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));
      
      await expect(
        computingRequest.connect(consumer).createRequest(
          [nonExistentHash],
          testComputingScript,
          testBudget,
          { value: testBudget }
        )
      ).to.be.revertedWith("ComputingRequest: Data not found");
    });
  });

  describe("Request Status Management", function () {
    let requestId: number;

    beforeEach(async function () {
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );
      requestId = 0;
    });

    it("Should allow consumer to cancel pending request", async function () {
      await expect(
        computingRequest.connect(consumer).cancelRequest(requestId)
      ).to.emit(computingRequest, "RequestStatusChanged")
        .withArgs(requestId, 4); // Cancelled

      const request = await computingRequest.getRequest(requestId);
      expect(request.status).to.equal(4); // Cancelled
    });

    it("Should not allow cancellation of non-pending request", async function () {
      // Change status to approved
      await computingRequest.connect(owner).updateRequestStatus(requestId, 1);

      await expect(
        computingRequest.connect(consumer).cancelRequest(requestId)
      ).to.be.revertedWith("ComputingRequest: Can only cancel pending requests");
    });

    it("Should not allow non-consumer to cancel request", async function () {
      await expect(
        computingRequest.connect(provider).cancelRequest(requestId)
      ).to.be.revertedWith("ComputingRequest: Only consumer can cancel");
    });

    it("Should allow admin to update request status", async function () {
      await expect(
        computingRequest.connect(owner).updateRequestStatus(requestId, 1) // Approved
      ).to.emit(computingRequest, "RequestStatusChanged");

      const request = await computingRequest.getRequest(requestId);
      expect(request.status).to.equal(1); // Approved
    });
  });

  describe("Request Assignment", function () {
    let requestId: number;

    beforeEach(async function () {
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );
      requestId = 0;
      
      // Approve the request
      await computingRequest.connect(owner).updateRequestStatus(requestId, 1);
    });

    it("Should allow admin to assign provider", async function () {
      await expect(
        computingRequest.connect(owner).assignProvider(requestId, provider.address)
      ).to.emit(computingRequest, "ProviderAssigned")
        .withArgs(requestId, provider.address);

      const request = await computingRequest.getRequest(requestId);
      expect(request.assignedProvider).to.equal(provider.address);
      expect(request.status).to.equal(2); // InProgress
    });

    it("Should not assign provider to non-approved request", async function () {
      // Create another request but don't approve it
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );
      const newRequestId = 1;

      await expect(
        computingRequest.connect(owner).assignProvider(newRequestId, provider.address)
      ).to.be.revertedWith("ComputingRequest: Request must be approved");
    });
  });

  describe("Result Submission", function () {
    let requestId: number;
    const testResult = "computed_result_hash";

    beforeEach(async function () {
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );
      requestId = 0;
      
      // Approve and assign
      await computingRequest.connect(owner).updateRequestStatus(requestId, 1);
      await computingRequest.connect(owner).assignProvider(requestId, provider.address);
    });

    it("Should allow assigned provider to submit result", async function () {
      await expect(
        computingRequest.connect(provider).submitResult(requestId, testResult)
      ).to.emit(computingRequest, "ResultSubmitted")
        .withArgs(requestId, provider.address, testResult);

      const request = await computingRequest.getRequest(requestId);
      expect(request.result).to.equal(testResult);
      expect(request.status).to.equal(3); // Completed
    });

    it("Should not allow non-assigned provider to submit result", async function () {
      await expect(
        computingRequest.connect(auditor).submitResult(requestId, testResult)
      ).to.be.revertedWith("ComputingRequest: Only assigned provider can submit result");
    });

    it("Should not allow empty result", async function () {
      await expect(
        computingRequest.connect(provider).submitResult(requestId, "")
      ).to.be.revertedWith("ComputingRequest: Result cannot be empty");
    });
  });

  describe("Budget Management", function () {
    let requestId: number;

    beforeEach(async function () {
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );
      requestId = 0;
    });

    it("Should refund budget when request is cancelled", async function () {
      const balanceBefore = await ethers.provider.getBalance(consumer.address);
      
      const tx = await computingRequest.connect(consumer).cancelRequest(requestId);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(consumer.address);
      
      // Should get refund minus gas costs
      expect(balanceAfter).to.be.closeTo(balanceBefore + testBudget - gasUsed, ethers.parseEther("0.001"));
    });

    it("Should process payment when result is submitted", async function () {
      // Approve and assign
      await computingRequest.connect(owner).updateRequestStatus(requestId, 1);
      await computingRequest.connect(owner).assignProvider(requestId, provider.address);
      
      // Submit result
      await computingRequest.connect(provider).submitResult(requestId, "result_hash");
      
      const request = await computingRequest.getRequest(requestId);
      expect(request.paymentProcessed).to.be.true;
    });
  });

  describe("Data Queries", function () {
    beforeEach(async function () {
      // Create multiple requests
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );
      
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        "another_script",
        ethers.parseEther("0.5"),
        { value: ethers.parseEther("0.5") }
      );
    });

    it("Should get consumer requests correctly", async function () {
      const consumerRequests = await computingRequest.getConsumerRequests(consumer.address);
      expect(consumerRequests.length).to.equal(2);
    });

    it("Should get provider requests correctly", async function () {
      // Assign provider to first request
      await computingRequest.connect(owner).updateRequestStatus(0, 1);
      await computingRequest.connect(owner).assignProvider(0, provider.address);
      
      const providerRequests = await computingRequest.getProviderRequests(provider.address);
      expect(providerRequests.length).to.equal(1);
      expect(providerRequests[0]).to.equal(0);
    });

    it("Should get requests by status correctly", async function () {
      const pendingRequests = await computingRequest.getRequestsByStatus(0); // Pending
      expect(pendingRequests.length).to.equal(2);
    });
  });

  describe("Contract Pause Functionality", function () {
    it("Should allow admin to pause and unpause", async function () {
      await computingRequest.connect(owner).pause();
      
      await expect(
        computingRequest.connect(consumer).createRequest(
          [testDataHash],
          testComputingScript,
          testBudget,
          { value: testBudget }
        )
      ).to.be.revertedWithCustomError(computingRequest, "EnforcedPause");

      await computingRequest.connect(owner).unpause();
      
      // Should work again after unpause
      await expect(
        computingRequest.connect(consumer).createRequest(
          [testDataHash],
          testComputingScript,
          testBudget,
          { value: testBudget }
        )
      ).to.emit(computingRequest, "RequestCreated");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle multiple data sources correctly", async function () {
      // Register another data source
      const secondDataHash = ethers.keccak256(ethers.toUtf8Bytes("second-data"));
      await dataRegistry.connect(provider).registerData(
        secondDataHash,
        "ipfs://QmSecond123",
        ethers.parseEther("0.2"),
        1, // Financial
        ["finance", "trading"],
        true,
        2048n
      );
      await dataRegistry.connect(owner).changeDataStatus(secondDataHash, 1);

      const dataHashes = [testDataHash, secondDataHash];
      
      await expect(
        computingRequest.connect(consumer).createRequest(
          dataHashes,
          testComputingScript,
          testBudget,
          { value: testBudget }
        )
      ).to.emit(computingRequest, "RequestCreated");

      const request = await computingRequest.getRequest(0);
      expect(request.dataHashes).to.deep.equal(dataHashes);
    });

    it("Should prevent duplicate result submission", async function () {
      await computingRequest.connect(consumer).createRequest(
        [testDataHash],
        testComputingScript,
        testBudget,
        { value: testBudget }
      );
      
      // Approve and assign
      await computingRequest.connect(owner).updateRequestStatus(0, 1);
      await computingRequest.connect(owner).assignProvider(0, provider.address);
      
      // Submit result first time
      await computingRequest.connect(provider).submitResult(0, "result_hash");
      
      // Try to submit again
      await expect(
        computingRequest.connect(provider).submitResult(0, "different_result")
      ).to.be.revertedWith("ComputingRequest: Result already submitted");
    });

    it("Should handle large budgets correctly", async function () {
      const largeBudget = ethers.parseEther("100.0");
      
      await expect(
        computingRequest.connect(consumer).createRequest(
          [testDataHash],
          testComputingScript,
          largeBudget,
          { value: largeBudget }
        )
      ).to.emit(computingRequest, "RequestCreated");

      const request = await computingRequest.getRequest(0);
      expect(request.budget).to.equal(largeBudget);
    });
  });
});