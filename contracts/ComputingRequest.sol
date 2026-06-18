// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./DataRegistry.sol";

/**
 * @title ComputingRequest
 * @dev Manages secure multi-party computation requests
 * @notice This contract handles computation request lifecycle and approval workflows
 */
contract ComputingRequest is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant COMPUTING_NODE_ROLE = keccak256("COMPUTING_NODE_ROLE");
    
    // Request status enumeration
    enum ComputingStatus {
        Pending,        // Submitted but not approved
        Approved,       // Approved by auditors
        Computing,      // Currently being computed
        Completed,      // Computation finished successfully
        Failed,         // Computation failed
        Cancelled,      // Cancelled by requester
        Disputed        // Under dispute resolution
    }
    
    // Computation type enumeration
    enum ComputationType {
        Aggregation,    // Statistical aggregation
        MachineLearning, // ML model training/inference
        Analytics,      // Data analytics
        Comparison,     // Data comparison
        Custom         // Custom computation
    }
    
    // Computing request structure
    struct Request {
        bytes32 requestId;              // Unique request identifier
        address consumer;               // Request initiator
        bytes32[] dataHashes;          // Array of required data hashes
        uint256 totalFee;              // Total fee for computation
        ComputingStatus status;         // Current status
        ComputationType computationType; // Type of computation
        string computingScript;         // IPFS hash of computation script
        string resultURI;              // IPFS hash of results
        bytes32 resultHash;            // Hash of computation result
        uint256 timestamp;             // Request creation time
        uint256 deadline;              // Computation deadline
        uint256 approvalCount;         // Number of approvals received
        uint256 requiredApprovals;     // Required number of approvals
        mapping(address => bool) approvals; // Auditor approvals
        address[] approvers;           // List of approvers
        string[] requirements;         // Special requirements
        bool isUrgent;                 // Urgent computation flag
        uint256 maxComputingTime;      // Maximum allowed computing time
        address assignedNode;          // Assigned computing node
    }
    
    // Request metadata structure (for external access)
    struct RequestInfo {
        bytes32 requestId;
        address consumer;
        bytes32[] dataHashes;
        uint256 totalFee;
        ComputingStatus status;
        ComputationType computationType;
        string computingScript;
        string resultURI;
        bytes32 resultHash;
        uint256 timestamp;
        uint256 deadline;
        uint256 approvalCount;
        uint256 requiredApprovals;
        address[] approvers;
        string[] requirements;
        bool isUrgent;
        uint256 maxComputingTime;
        address assignedNode;
    }
    
    // Counters
    uint256 private _requestIdCounter;
    
    // Storage
    mapping(bytes32 => Request) public requests;
    mapping(address => bytes32[]) public consumerRequests;
    mapping(address => bytes32[]) public auditorAssignments;
    mapping(address => bytes32[]) public nodeAssignments;
    mapping(ComputingStatus => bytes32[]) public requestsByStatus;
    mapping(ComputationType => bytes32[]) public requestsByType;
    
    // Contract references
    DataRegistry public dataRegistry;
    
    // Configuration
    uint256 public defaultRequiredApprovals = 2;
    uint256 public maxComputingDuration = 7 days;
    uint256 public minComputingFee = 0.001 ether;
    
    // Statistics
    uint256 public totalRequests;
    uint256 public completedRequests;
    uint256 public failedRequests;
    mapping(address => uint256) public consumerRequestCount;
    mapping(address => uint256) public auditorApprovalCount;
    
    // Events
    event RequestSubmitted(
        bytes32 indexed requestId,
        address indexed consumer,
        bytes32[] dataHashes,
        uint256 totalFee,
        ComputationType computationType
    );
    
    event RequestApproved(
        bytes32 indexed requestId,
        address indexed auditor,
        uint256 approvalCount,
        uint256 requiredApprovals
    );
    
    event RequestStatusChanged(
        bytes32 indexed requestId,
        ComputingStatus oldStatus,
        ComputingStatus newStatus,
        address changedBy
    );
    
    event ComputingStarted(
        bytes32 indexed requestId,
        address indexed computingNode,
        uint256 startTime
    );
    
    event ComputingCompleted(
        bytes32 indexed requestId,
        bytes32 resultHash,
        string resultURI,
        uint256 completionTime
    );
    
    event RequestCancelled(
        bytes32 indexed requestId,
        address indexed consumer,
        string reason
    );
    
    event ComputingNodeAssigned(
        bytes32 indexed requestId,
        address indexed node
    );
    
    // Modifiers
    modifier requestExists(bytes32 requestId) {
        require(requests[requestId].requestId != bytes32(0), "ComputingRequest: Request does not exist");
        _;
    }
    
    modifier onlyConsumer(bytes32 requestId) {
        require(
            requests[requestId].consumer == msg.sender,
            "ComputingRequest: Only request consumer can perform this action"
        );
        _;
    }
    
    modifier validStatus(bytes32 requestId, ComputingStatus expectedStatus) {
        require(
            requests[requestId].status == expectedStatus,
            "ComputingRequest: Invalid request status"
        );
        _;
    }
    
    /**
     * @dev Constructor
     * @param _dataRegistry Address of the DataRegistry contract
     */
    constructor(address _dataRegistry) {
        require(_dataRegistry != address(0), "ComputingRequest: Invalid DataRegistry address");
        
        dataRegistry = DataRegistry(_dataRegistry);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(CONSUMER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(COMPUTING_NODE_ROLE, ADMIN_ROLE);
    }
    
    /**
     * @dev Submit a new computing request
     * @param dataHashes Array of data hashes required for computation
     * @param computationType Type of computation to perform
     * @param computingScript IPFS hash of the computation script
     * @param deadline Deadline for computation completion
     * @param requirements Special requirements for the computation
     * @param isUrgent Whether this is an urgent request
     * @param maxComputingTime Maximum allowed computing time
     */
    function submitRequest(
        bytes32[] calldata dataHashes,
        ComputationType computationType,
        string calldata computingScript,
        uint256 deadline,
        string[] calldata requirements,
        bool isUrgent,
        uint256 maxComputingTime
    ) external payable onlyRole(CONSUMER_ROLE) whenNotPaused nonReentrant returns (bytes32) {
        require(dataHashes.length > 0, "ComputingRequest: At least one data hash required");
        require(bytes(computingScript).length > 0, "ComputingRequest: Computing script required");
        require(deadline > block.timestamp, "ComputingRequest: Deadline must be in the future");
        require(msg.value >= minComputingFee, "ComputingRequest: Insufficient fee");
        require(maxComputingTime <= maxComputingDuration, "ComputingRequest: Computing time too long");
        
        // Validate that all data hashes exist and are active
        for (uint256 i = 0; i < dataHashes.length; i++) {
            DataRegistry.DataEntry memory dataEntry = dataRegistry.getDataEntry(dataHashes[i]);
            require(
                dataEntry.status == DataRegistry.DataStatus.Active,
                "ComputingRequest: Inactive data requested"
            );
        }
        
        // Generate unique request ID
        _requestIdCounter++;
        bytes32 requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                _requestIdCounter
            )
        );
        
        // Create request
        Request storage request = requests[requestId];
        request.requestId = requestId;
        request.consumer = msg.sender;
        request.dataHashes = dataHashes;
        request.totalFee = msg.value;
        request.status = ComputingStatus.Pending;
        request.computationType = computationType;
        request.computingScript = computingScript;
        request.timestamp = block.timestamp;
        request.deadline = deadline;
        request.approvalCount = 0;
        request.requiredApprovals = isUrgent ? 1 : defaultRequiredApprovals;
        request.requirements = requirements;
        request.isUrgent = isUrgent;
        request.maxComputingTime = maxComputingTime;
        
        // Update mappings
        consumerRequests[msg.sender].push(requestId);
        requestsByStatus[ComputingStatus.Pending].push(requestId);
        requestsByType[computationType].push(requestId);
        
        // Update statistics
        totalRequests++;
        consumerRequestCount[msg.sender]++;
        
        emit RequestSubmitted(
            requestId,
            msg.sender,
            dataHashes,
            msg.value,
            computationType
        );
        
        return requestId;
    }
    
    /**
     * @dev Approve a computing request (auditor only)
     * @param requestId ID of the request to approve
     */
    function approveRequest(bytes32 requestId) 
        external 
        requestExists(requestId) 
        validStatus(requestId, ComputingStatus.Pending)
        onlyRole(AUDITOR_ROLE) 
        whenNotPaused 
    {
        Request storage request = requests[requestId];
        require(!request.approvals[msg.sender], "ComputingRequest: Already approved by this auditor");
        require(block.timestamp <= request.deadline, "ComputingRequest: Request deadline passed");
        
        // Record approval
        request.approvals[msg.sender] = true;
        request.approvers.push(msg.sender);
        request.approvalCount++;
        
        // Update auditor statistics
        auditorApprovalCount[msg.sender]++;
        auditorAssignments[msg.sender].push(requestId);
        
        emit RequestApproved(
            requestId,
            msg.sender,
            request.approvalCount,
            request.requiredApprovals
        );
        
        // Check if sufficient approvals received
        if (request.approvalCount >= request.requiredApprovals) {
            _changeRequestStatus(requestId, ComputingStatus.Approved);
        }
    }
    
    /**
     * @dev Assign computing node to approved request
     * @param requestId ID of the request
     * @param computingNode Address of the computing node
     */
    function assignComputingNode(bytes32 requestId, address computingNode) 
        external 
        requestExists(requestId) 
        validStatus(requestId, ComputingStatus.Approved)
        onlyRole(ADMIN_ROLE) 
    {
        require(
            hasRole(COMPUTING_NODE_ROLE, computingNode),
            "ComputingRequest: Invalid computing node"
        );
        
        Request storage request = requests[requestId];
        request.assignedNode = computingNode;
        nodeAssignments[computingNode].push(requestId);
        
        emit ComputingNodeAssigned(requestId, computingNode);
    }
    
    /**
     * @dev Start computing (computing node only)
     * @param requestId ID of the request to start computing
     */
    function startComputing(bytes32 requestId) 
        external 
        requestExists(requestId) 
        validStatus(requestId, ComputingStatus.Approved)
        onlyRole(COMPUTING_NODE_ROLE) 
    {
        Request storage request = requests[requestId];
        require(
            request.assignedNode == msg.sender,
            "ComputingRequest: Not assigned to this node"
        );
        require(block.timestamp <= request.deadline, "ComputingRequest: Request deadline passed");
        
        _changeRequestStatus(requestId, ComputingStatus.Computing);
        
        emit ComputingStarted(requestId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Submit computation results
     * @param requestId ID of the completed request
     * @param resultHash Hash of the computation result
     * @param resultURI IPFS URI of the result data
     */
    function submitResults(
        bytes32 requestId,
        bytes32 resultHash,
        string calldata resultURI
    ) 
        external 
        requestExists(requestId) 
        validStatus(requestId, ComputingStatus.Computing)
        onlyRole(COMPUTING_NODE_ROLE) 
    {
        Request storage request = requests[requestId];
        require(
            request.assignedNode == msg.sender,
            "ComputingRequest: Not assigned to this node"
        );
        require(resultHash != bytes32(0), "ComputingRequest: Invalid result hash");
        require(bytes(resultURI).length > 0, "ComputingRequest: Result URI required");
        
        // Store results
        request.resultHash = resultHash;
        request.resultURI = resultURI;
        
        _changeRequestStatus(requestId, ComputingStatus.Completed);
        completedRequests++;
        
        emit ComputingCompleted(requestId, resultHash, resultURI, block.timestamp);
    }
    
    /**
     * @dev Mark request as failed
     * @param requestId ID of the failed request
     * @param reason Reason for failure
     */
    function markRequestFailed(
        bytes32 requestId,
        string calldata reason
    ) 
        external 
        requestExists(requestId) 
        onlyRole(ADMIN_ROLE) 
    {
        require(
            requests[requestId].status == ComputingStatus.Computing ||
            requests[requestId].status == ComputingStatus.Approved,
            "ComputingRequest: Invalid status for failure"
        );
        
        _changeRequestStatus(requestId, ComputingStatus.Failed);
        failedRequests++;
        
        // TODO: Implement refund mechanism
    }
    
    /**
     * @dev Cancel request (consumer only, before computing starts)
     * @param requestId ID of the request to cancel
     * @param reason Reason for cancellation
     */
    function cancelRequest(
        bytes32 requestId,
        string calldata reason
    ) 
        external 
        requestExists(requestId) 
        onlyConsumer(requestId) 
    {
        ComputingStatus currentStatus = requests[requestId].status;
        require(
            currentStatus == ComputingStatus.Pending || currentStatus == ComputingStatus.Approved,
            "ComputingRequest: Cannot cancel after computing started"
        );
        
        _changeRequestStatus(requestId, ComputingStatus.Cancelled);
        
        emit RequestCancelled(requestId, msg.sender, reason);
        
        // TODO: Implement partial refund mechanism
    }
    
    /**
     * @dev Get request information
     * @param requestId ID of the request
     * @return RequestInfo struct with request details
     */
    function getRequestInfo(bytes32 requestId) 
        external 
        view 
        requestExists(requestId) 
        returns (RequestInfo memory) 
    {
        Request storage request = requests[requestId];
        
        return RequestInfo({
            requestId: request.requestId,
            consumer: request.consumer,
            dataHashes: request.dataHashes,
            totalFee: request.totalFee,
            status: request.status,
            computationType: request.computationType,
            computingScript: request.computingScript,
            resultURI: request.resultURI,
            resultHash: request.resultHash,
            timestamp: request.timestamp,
            deadline: request.deadline,
            approvalCount: request.approvalCount,
            requiredApprovals: request.requiredApprovals,
            approvers: request.approvers,
            requirements: request.requirements,
            isUrgent: request.isUrgent,
            maxComputingTime: request.maxComputingTime,
            assignedNode: request.assignedNode
        });
    }
    
    /**
     * @dev Get requests by consumer
     * @param consumer Consumer address
     * @return Array of request IDs
     */
    function getConsumerRequests(address consumer) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return consumerRequests[consumer];
    }
    
    /**
     * @dev Get requests by status
     * @param status Request status
     * @return Array of request IDs
     */
    function getRequestsByStatus(ComputingStatus status) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return requestsByStatus[status];
    }
    
    /**
     * @dev Internal function to change request status
     * @param requestId ID of the request
     * @param newStatus New status to set
     */
    function _changeRequestStatus(bytes32 requestId, ComputingStatus newStatus) internal {
        ComputingStatus oldStatus = requests[requestId].status;
        requests[requestId].status = newStatus;
        
        // Update status arrays
        requestsByStatus[newStatus].push(requestId);
        
        emit RequestStatusChanged(requestId, oldStatus, newStatus, msg.sender);
    }
    
    /**
     * @dev Grant consumer role
     * @param consumer Address to grant role to
     */
    function grantConsumerRole(address consumer) external onlyRole(ADMIN_ROLE) {
        grantRole(CONSUMER_ROLE, consumer);
    }
    
    /**
     * @dev Grant auditor role
     * @param auditor Address to grant role to
     */
    function grantAuditorRole(address auditor) external onlyRole(ADMIN_ROLE) {
        grantRole(AUDITOR_ROLE, auditor);
    }
    
    /**
     * @dev Grant computing node role
     * @param node Address to grant role to
     */
    function grantComputingNodeRole(address node) external onlyRole(ADMIN_ROLE) {
        grantRole(COMPUTING_NODE_ROLE, node);
    }
    
    /**
     * @dev Update configuration
     * @param _defaultRequiredApprovals New default required approvals
     * @param _maxComputingDuration New maximum computing duration
     * @param _minComputingFee New minimum computing fee
     */
    function updateConfiguration(
        uint256 _defaultRequiredApprovals,
        uint256 _maxComputingDuration,
        uint256 _minComputingFee
    ) external onlyRole(ADMIN_ROLE) {
        defaultRequiredApprovals = _defaultRequiredApprovals;
        maxComputingDuration = _maxComputingDuration;
        minComputingFee = _minComputingFee;
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
     * @dev Get contract statistics
     */
    function getStatistics() 
        external 
        view 
        returns (
            uint256 total,
            uint256 completed,
            uint256 failed,
            uint256 pending
        ) 
    {
        return (
            totalRequests,
            completedRequests,
            failedRequests,
            requestsByStatus[ComputingStatus.Pending].length
        );
    }
}