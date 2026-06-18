// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PaymentDistributor.sol";

/**
 * @title SMPCProtocol
 * @dev Core SMPC protocol contract with auction mechanism and payment distribution
 * @notice Manages privacy-preserving data trading with auction-based pricing
 */
contract SMPCProtocol is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");
    bytes32 public constant DATA_CONSUMER_ROLE = keccak256("DATA_CONSUMER_ROLE");
    bytes32 public constant COMPUTE_PROVIDER_ROLE = keccak256("COMPUTE_PROVIDER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Job status enumeration
    enum JobStatus {
        Created,        // Job created, awaiting data provider participation
        Bidding,        // Auction in progress
        Assigned,       // Winning bids selected, awaiting computation
        Computing,      // SMPC computation in progress
        Completed,      // Successfully completed
        Failed,         // Computation failed
        Disputed,       // Under dispute resolution
        Cancelled       // Cancelled before completion
    }

    // Data category enumeration
    enum DataCategory {
        Healthcare,     // Medical/health data
        Financial,      // Financial records
        Communication,  // Chat/communication data
        IoT,           // IoT sensor data
        Custom         // Custom data type
    }

    // Computation job structure
    struct Job {
        bytes32 jobId;
        address consumer;
        DataCategory category;
        string description;
        uint256 reservePrice;       // Minimum acceptable price
        uint256 buyNowPrice;        // Instant purchase price (2x reserve)
        uint256 deadline;           // Auction deadline
        uint256 maxComputeTime;     // Maximum computation time
        JobStatus status;
        uint256 totalBids;
        uint256 createdAt;
        
        // Winner information
        address[] selectedProviders;
        address[] selectedComputers;
        uint256 finalPrice;
        
        // Computation results
        bytes32 resultHash;
        string resultURI;           // IPFS URI for results
        bytes32 zkProof;           // Zero-knowledge proof
    }

    // Bid structure for auctions
    struct Bid {
        bytes32 jobId;
        address bidder;
        uint256 amount;
        bool isDataProvider;        // true for data provider, false for compute provider
        string commitment;          // IPFS hash of bid details
        uint256 timestamp;
        bool isWinner;
    }

    // Provider profile structure
    struct ProviderProfile {
        bool isActive;
        uint256 reputation;         // 0-1000 reputation score
        uint256 totalJobs;
        uint256 successfulJobs;
        uint256 totalEarnings;
        string profileURI;          // IPFS hash of profile details
    }

    // Storage
    mapping(bytes32 => Job) public jobs;
    mapping(bytes32 => Bid[]) public jobBids;
    mapping(address => ProviderProfile) public providers;
    mapping(address => bytes32[]) public consumerJobs;
    mapping(address => bytes32[]) public providerJobs;
    mapping(DataCategory => bytes32[]) public jobsByCategory;
    mapping(JobStatus => bytes32[]) public jobsByStatus;

    // Configuration
    uint256 public minimumBidIncrement = 50; // 5% minimum bid increment (in basis points)
    uint256 public auctionDuration = 24 hours; // Default auction duration
    uint256 public maxComputeTime = 7 days; // Maximum computation time
    uint256 public platformFeeRate = 100; // 1% platform fee (in basis points)
    
    // Contract references
    PaymentDistributor public paymentDistributor;
    IERC20 public usdtToken; // USDT contract address

    // Statistics
    uint256 public totalJobs;
    uint256 public completedJobs;
    uint256 public totalVolume; // Total ETH/USDT volume
    uint256 private _jobIdCounter;

    // Events
    event JobCreated(
        bytes32 indexed jobId,
        address indexed consumer,
        DataCategory category,
        uint256 reservePrice,
        uint256 deadline
    );

    event BidPlaced(
        bytes32 indexed jobId,
        address indexed bidder,
        uint256 amount,
        bool isDataProvider
    );

    event AuctionCompleted(
        bytes32 indexed jobId,
        address[] dataProviders,
        address[] computeProviders,
        uint256 totalPrice
    );

    event ComputationStarted(
        bytes32 indexed jobId,
        address[] computeProviders
    );

    event ComputationCompleted(
        bytes32 indexed jobId,
        bytes32 resultHash,
        bytes32 zkProof
    );

    event PaymentDistributed(
        bytes32 indexed jobId,
        uint256 dataProviderShare,
        uint256 computeProviderShare,
        uint256 validatorShare,
        uint256 platformShare
    );

    // Modifiers
    modifier jobExists(bytes32 jobId) {
        require(jobs[jobId].jobId != bytes32(0), "SMPCProtocol: Job does not exist");
        _;
    }

    modifier onlyJobConsumer(bytes32 jobId) {
        require(jobs[jobId].consumer == msg.sender, "SMPCProtocol: Only job consumer");
        _;
    }

    modifier validJobStatus(bytes32 jobId, JobStatus expectedStatus) {
        require(jobs[jobId].status == expectedStatus, "SMPCProtocol: Invalid job status");
        _;
    }

    /**
     * @dev Constructor
     * @param _paymentDistributor Address of PaymentDistributor contract
     * @param _usdtToken Address of USDT token contract
     */
    constructor(address _paymentDistributor, address _usdtToken) {
        require(_paymentDistributor != address(0), "SMPCProtocol: Invalid payment distributor");
        
        paymentDistributor = PaymentDistributor(payable(_paymentDistributor));
        usdtToken = IERC20(_usdtToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(DATA_PROVIDER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(DATA_CONSUMER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(COMPUTE_PROVIDER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(VALIDATOR_ROLE, ADMIN_ROLE);
    }

    /**
     * @dev Create a new SMPC computation job with auction mechanism
     * @param category Data category required
     * @param description Job description
     * @param reservePrice Minimum acceptable price (in wei or USDT units)
     * @param auctionDurationOverride Custom auction duration (0 for default)
     * @param maxComputeTimeOverride Custom max compute time (0 for default)
     * @param useUSDT Whether to use USDT instead of ETH
     */
    function createJob(
        DataCategory category,
        string calldata description,
        uint256 reservePrice,
        uint256 auctionDurationOverride,
        uint256 maxComputeTimeOverride,
        bool useUSDT
    ) external onlyRole(DATA_CONSUMER_ROLE) whenNotPaused nonReentrant returns (bytes32) {
        require(bytes(description).length > 0, "SMPCProtocol: Description required");
        require(reservePrice > 0, "SMPCProtocol: Reserve price must be positive");

        // Generate unique job ID
        _jobIdCounter++;
        bytes32 jobId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                _jobIdCounter
            )
        );

        uint256 jobDeadline = block.timestamp + 
            (auctionDurationOverride > 0 ? auctionDurationOverride : auctionDuration);
        uint256 jobMaxComputeTime = maxComputeTimeOverride > 0 ? 
            maxComputeTimeOverride : maxComputeTime;

        // Create job
        Job storage job = jobs[jobId];
        job.jobId = jobId;
        job.consumer = msg.sender;
        job.category = category;
        job.description = description;
        job.reservePrice = reservePrice;
        job.buyNowPrice = reservePrice * 2; // 2x reserve price for instant purchase
        job.deadline = jobDeadline;
        job.maxComputeTime = jobMaxComputeTime;
        job.status = JobStatus.Created;
        job.createdAt = block.timestamp;

        // Update mappings
        consumerJobs[msg.sender].push(jobId);
        jobsByCategory[category].push(jobId);
        jobsByStatus[JobStatus.Created].push(jobId);
        totalJobs++;

        emit JobCreated(jobId, msg.sender, category, reservePrice, jobDeadline);
        
        return jobId;
    }

    /**
     * @dev Place a bid on a job auction
     * @param jobId ID of the job to bid on
     * @param isDataProvider Whether bidder is data provider (true) or compute provider (false)
     * @param commitment IPFS hash containing bid details and data/compute specifications
     */
    function placeBid(
        bytes32 jobId,
        bool isDataProvider,
        string calldata commitment
    ) external payable jobExists(jobId) whenNotPaused nonReentrant {
        Job storage job = jobs[jobId];
        require(block.timestamp < job.deadline, "SMPCProtocol: Auction expired");
        require(job.status == JobStatus.Created || job.status == JobStatus.Bidding, 
                "SMPCProtocol: Invalid job status for bidding");
        require(bytes(commitment).length > 0, "SMPCProtocol: Commitment required");

        // Verify bidder role
        if (isDataProvider) {
            require(hasRole(DATA_PROVIDER_ROLE, msg.sender), "SMPCProtocol: Not a data provider");
        } else {
            require(hasRole(COMPUTE_PROVIDER_ROLE, msg.sender), "SMPCProtocol: Not a compute provider");
        }

        // Validate bid amount
        require(msg.value >= job.reservePrice, "SMPCProtocol: Bid below reserve price");
        
        // Check minimum increment against current highest bid
        Bid[] storage bids = jobBids[jobId];
        if (bids.length > 0) {
            uint256 highestBid = _getHighestBid(jobId, isDataProvider);
            uint256 minIncrement = (highestBid * minimumBidIncrement) / 10000;
            require(msg.value >= highestBid + minIncrement, "SMPCProtocol: Insufficient bid increment");
        }

        // Create bid
        Bid memory newBid = Bid({
            jobId: jobId,
            bidder: msg.sender,
            amount: msg.value,
            isDataProvider: isDataProvider,
            commitment: commitment,
            timestamp: block.timestamp,
            isWinner: false
        });

        bids.push(newBid);
        job.totalBids++;

        // Update job status to bidding if first bid
        if (job.status == JobStatus.Created) {
            _updateJobStatus(jobId, JobStatus.Bidding);
        }

        // Check for instant purchase (buy now price)
        if (msg.value >= job.buyNowPrice) {
            _selectWinners(jobId);
        }

        emit BidPlaced(jobId, msg.sender, msg.value, isDataProvider);
    }

    /**
     * @dev Finalize auction and select winning bids
     * @param jobId ID of the job auction to finalize
     */
    function finalizeAuction(bytes32 jobId) 
        external 
        jobExists(jobId) 
        validJobStatus(jobId, JobStatus.Bidding) 
        whenNotPaused 
    {
        Job storage job = jobs[jobId];
        require(block.timestamp >= job.deadline, "SMPCProtocol: Auction still active");
        require(job.totalBids > 0, "SMPCProtocol: No bids received");

        _selectWinners(jobId);
    }

    /**
     * @dev Start SMPC computation (called by compute providers)
     * @param jobId ID of the job to start computing
     */
    function startComputation(bytes32 jobId) 
        external 
        jobExists(jobId) 
        validJobStatus(jobId, JobStatus.Assigned) 
        onlyRole(COMPUTE_PROVIDER_ROLE) 
    {
        Job storage job = jobs[jobId];
        
        // Verify caller is selected compute provider
        bool isSelected = false;
        for (uint i = 0; i < job.selectedComputers.length; i++) {
            if (job.selectedComputers[i] == msg.sender) {
                isSelected = true;
                break;
            }
        }
        require(isSelected, "SMPCProtocol: Not selected compute provider");

        _updateJobStatus(jobId, JobStatus.Computing);
        
        emit ComputationStarted(jobId, job.selectedComputers);
    }

    /**
     * @dev Submit computation results with zero-knowledge proof
     * @param jobId ID of the completed job
     * @param resultHash Hash of computation results
     * @param resultURI IPFS URI containing encrypted results
     * @param zkProof Zero-knowledge proof of correct computation
     */
    function submitResults(
        bytes32 jobId,
        bytes32 resultHash,
        string calldata resultURI,
        bytes32 zkProof
    ) 
        external 
        jobExists(jobId) 
        validJobStatus(jobId, JobStatus.Computing) 
        onlyRole(COMPUTE_PROVIDER_ROLE) 
    {
        Job storage job = jobs[jobId];
        
        // Verify caller is selected compute provider
        bool isSelected = false;
        for (uint i = 0; i < job.selectedComputers.length; i++) {
            if (job.selectedComputers[i] == msg.sender) {
                isSelected = true;
                break;
            }
        }
        require(isSelected, "SMPCProtocol: Not selected compute provider");
        require(resultHash != bytes32(0), "SMPCProtocol: Invalid result hash");
        require(bytes(resultURI).length > 0, "SMPCProtocol: Result URI required");
        require(zkProof != bytes32(0), "SMPCProtocol: ZK proof required");

        // Store results
        job.resultHash = resultHash;
        job.resultURI = resultURI;
        job.zkProof = zkProof;

        _updateJobStatus(jobId, JobStatus.Completed);
        completedJobs++;

        // Distribute payments
        _distributePayments(jobId);

        emit ComputationCompleted(jobId, resultHash, zkProof);
    }

    /**
     * @dev Internal function to select winning bids
     */
    function _selectWinners(bytes32 jobId) internal {
        Job storage job = jobs[jobId];
        Bid[] storage bids = jobBids[jobId];

        // Find highest data provider bid
        address bestDataProvider = address(0);
        uint256 bestDataBid = 0;
        
        // Find highest compute provider bid
        address bestComputeProvider = address(0);
        uint256 bestComputeBid = 0;

        for (uint i = 0; i < bids.length; i++) {
            if (bids[i].isDataProvider && bids[i].amount > bestDataBid) {
                bestDataProvider = bids[i].bidder;
                bestDataBid = bids[i].amount;
            } else if (!bids[i].isDataProvider && bids[i].amount > bestComputeBid) {
                bestComputeProvider = bids[i].bidder;
                bestComputeBid = bids[i].amount;
            }
        }

        require(bestDataProvider != address(0), "SMPCProtocol: No data provider bid");
        require(bestComputeProvider != address(0), "SMPCProtocol: No compute provider bid");

        // Mark winners and store selections
        for (uint i = 0; i < bids.length; i++) {
            if ((bids[i].isDataProvider && bids[i].bidder == bestDataProvider && bids[i].amount == bestDataBid) ||
                (!bids[i].isDataProvider && bids[i].bidder == bestComputeProvider && bids[i].amount == bestComputeBid)) {
                bids[i].isWinner = true;
            }
        }

        job.selectedProviders.push(bestDataProvider);
        job.selectedComputers.push(bestComputeProvider);
        job.finalPrice = bestDataBid + bestComputeBid;

        _updateJobStatus(jobId, JobStatus.Assigned);
        
        emit AuctionCompleted(jobId, job.selectedProviders, job.selectedComputers, job.finalPrice);
    }

    /**
     * @dev Internal function to distribute payments according to economic model
     */
    function _distributePayments(bytes32 jobId) internal {
        Job storage job = jobs[jobId];
        uint256 totalAmount = job.finalPrice;

        // Calculate shares based on economic model
        // 70% to data providers, 25% to compute providers, 4% to validators, 1% to protocol
        uint256 dataProviderShare = (totalAmount * 7000) / 10000; // 70%
        uint256 computeProviderShare = (totalAmount * 2500) / 10000; // 25%
        uint256 validatorShare = (totalAmount * 400) / 10000; // 4%
        uint256 platformShare = (totalAmount * 100) / 10000; // 1%

        // Distribute to data providers
        for (uint i = 0; i < job.selectedProviders.length; i++) {
            uint256 providerAmount = dataProviderShare / job.selectedProviders.length;
            payable(job.selectedProviders[i]).transfer(providerAmount);
            
            // Update provider stats
            providers[job.selectedProviders[i]].totalEarnings += providerAmount;
            providers[job.selectedProviders[i]].successfulJobs++;
        }

        // Distribute to compute providers
        for (uint i = 0; i < job.selectedComputers.length; i++) {
            uint256 computerAmount = computeProviderShare / job.selectedComputers.length;
            payable(job.selectedComputers[i]).transfer(computerAmount);
            
            // Update provider stats
            providers[job.selectedComputers[i]].totalEarnings += computerAmount;
            providers[job.selectedComputers[i]].successfulJobs++;
        }

        // TODO: Implement validator distribution mechanism
        // TODO: Send platform share to treasury

        totalVolume += totalAmount;

        emit PaymentDistributed(jobId, dataProviderShare, computeProviderShare, validatorShare, platformShare);
    }

    /**
     * @dev Get highest bid for specific provider type
     */
    function _getHighestBid(bytes32 jobId, bool isDataProvider) internal view returns (uint256) {
        Bid[] storage bids = jobBids[jobId];
        uint256 highest = 0;
        
        for (uint i = 0; i < bids.length; i++) {
            if (bids[i].isDataProvider == isDataProvider && bids[i].amount > highest) {
                highest = bids[i].amount;
            }
        }
        
        return highest;
    }

    /**
     * @dev Internal function to update job status
     */
    function _updateJobStatus(bytes32 jobId, JobStatus newStatus) internal {
        JobStatus oldStatus = jobs[jobId].status;
        jobs[jobId].status = newStatus;
        
        jobsByStatus[newStatus].push(jobId);
    }

    /**
     * @dev Get job information
     */
    function getJobInfo(bytes32 jobId) external view jobExists(jobId) returns (Job memory) {
        return jobs[jobId];
    }

    /**
     * @dev Get job bids
     */
    function getJobBids(bytes32 jobId) external view jobExists(jobId) returns (Bid[] memory) {
        return jobBids[jobId];
    }

    /**
     * @dev Get jobs by consumer
     */
    function getConsumerJobs(address consumer) external view returns (bytes32[] memory) {
        return consumerJobs[consumer];
    }

    /**
     * @dev Register as data provider
     */
    function registerDataProvider(string calldata profileURI) external {
        grantRole(DATA_PROVIDER_ROLE, msg.sender);
        providers[msg.sender] = ProviderProfile({
            isActive: true,
            reputation: 500, // Start with neutral reputation
            totalJobs: 0,
            successfulJobs: 0,
            totalEarnings: 0,
            profileURI: profileURI
        });
    }

    /**
     * @dev Register as compute provider
     */
    function registerComputeProvider(string calldata profileURI) external {
        grantRole(COMPUTE_PROVIDER_ROLE, msg.sender);
        providers[msg.sender] = ProviderProfile({
            isActive: true,
            reputation: 500, // Start with neutral reputation
            totalJobs: 0,
            successfulJobs: 0,
            totalEarnings: 0,
            profileURI: profileURI
        });
    }

    /**
     * @dev Update configuration (admin only)
     */
    function updateConfiguration(
        uint256 _minimumBidIncrement,
        uint256 _auctionDuration,
        uint256 _maxComputeTime,
        uint256 _platformFeeRate
    ) external onlyRole(ADMIN_ROLE) {
        minimumBidIncrement = _minimumBidIncrement;
        auctionDuration = _auctionDuration;
        maxComputeTime = _maxComputeTime;
        platformFeeRate = _platformFeeRate;
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Get protocol statistics
     */
    function getStatistics() external view returns (
        uint256 total,
        uint256 completed,
        uint256 volume,
        uint256 activeProviders
    ) {
        return (totalJobs, completedJobs, totalVolume, 0); // TODO: Calculate active providers
    }
}