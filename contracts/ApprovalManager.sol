// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ApprovalManager
 * @dev Manages multi-party approval workflows for SMPC protocol
 * @notice Handles approval processes for data access, computations, and governance
 */
contract ApprovalManager is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    
    // Approval type enumeration
    enum ApprovalType {
        DataAccess,         // Access to specific data
        ComputingRequest,   // Computing operation approval
        PolicyChange,       // Policy or configuration change
        Emergency,          // Emergency actions
        Governance         // Governance decisions
    }
    
    // Approval status enumeration
    enum ApprovalStatus {
        Pending,           // Waiting for approvals
        Approved,          // Sufficient approvals received
        Rejected,          // Explicitly rejected
        Expired,           // Deadline passed
        Executed          // Action has been executed
    }
    
    // Approval requirement structure
    struct ApprovalRequirement {
        uint256 minApprovals;           // Minimum number of approvals needed
        uint256 minAuditorApprovals;    // Minimum auditor approvals needed
        uint256 minProviderApprovals;   // Minimum provider approvals needed
        uint256 totalRequiredStake;     // Total stake required for approval
        uint256 timeoutDuration;        // Timeout in seconds
        bool requiresUnanimity;         // Whether unanimous approval is required
        bool allowSelfApproval;         // Whether requestor can approve their own request
    }
    
    // Approval request structure
    struct ApprovalRequest {
        bytes32 requestId;              // Unique request identifier
        address requestor;              // Who initiated the request
        ApprovalType approvalType;      // Type of approval needed
        bytes32 targetHash;             // Hash of target resource/action
        string description;             // Human-readable description
        bytes metaData;                 // Additional metadata
        ApprovalStatus status;          // Current status
        uint256 createdAt;              // Creation timestamp
        uint256 deadline;               // Approval deadline
        uint256 approvalCount;          // Number of approvals received
        uint256 rejectionCount;         // Number of rejections received
        mapping(address => bool) hasApproved;    // Who has approved
        mapping(address => bool) hasRejected;    // Who has rejected
        mapping(address => uint256) approverStake; // Stake per approver
        address[] approvers;            // List of approvers
        address[] rejectors;            // List of rejectors
        uint256 totalStake;             // Total stake accumulated
        bool isExecuted;                // Whether action has been executed
        bytes32 executionResult;        // Result of execution
    }
    
    // Approval request info for external access
    struct ApprovalRequestInfo {
        bytes32 requestId;
        address requestor;
        ApprovalType approvalType;
        bytes32 targetHash;
        string description;
        bytes metaData;
        ApprovalStatus status;
        uint256 createdAt;
        uint256 deadline;
        uint256 approvalCount;
        uint256 rejectionCount;
        address[] approvers;
        address[] rejectors;
        uint256 totalStake;
        bool isExecuted;
        bytes32 executionResult;
    }
    
    // Storage
    mapping(ApprovalType => ApprovalRequirement) public approvalRequirements;
    mapping(bytes32 => ApprovalRequest) public approvalRequests;
    mapping(address => bytes32[]) public userRequests;
    mapping(address => bytes32[]) public userApprovals;
    mapping(ApprovalType => bytes32[]) public requestsByType;
    mapping(ApprovalStatus => bytes32[]) public requestsByStatus;
    
    // Counters
    uint256 private _requestIdCounter;
    
    // Stakeholder stake tracking
    mapping(address => uint256) public stakeholderStake;
    mapping(address => uint256) public lockedStake;
    
    // Statistics
    uint256 public totalRequests;
    uint256 public approvedRequests;
    uint256 public rejectedRequests;
    uint256 public expiredRequests;
    mapping(address => uint256) public userApprovalCount;
    mapping(address => uint256) public userRejectionCount;
    
    // Events
    event ApprovalRequestCreated(
        bytes32 indexed requestId,
        address indexed requestor,
        ApprovalType approvalType,
        bytes32 targetHash,
        uint256 deadline
    );
    
    event ApprovalGiven(
        bytes32 indexed requestId,
        address indexed approver,
        uint256 stake,
        uint256 totalApprovals
    );
    
    event ApprovalRejected(
        bytes32 indexed requestId,
        address indexed rejector,
        string reason,
        uint256 totalRejections
    );
    
    event ApprovalStatusChanged(
        bytes32 indexed requestId,
        ApprovalStatus oldStatus,
        ApprovalStatus newStatus,
        address changedBy
    );
    
    event ApprovalExecuted(
        bytes32 indexed requestId,
        address executor,
        bytes32 result
    );
    
    event StakeDeposited(
        address indexed stakeholder,
        uint256 amount,
        uint256 totalStake
    );
    
    event StakeWithdrawn(
        address indexed stakeholder,
        uint256 amount,
        uint256 remainingStake
    );
    
    event ApprovalRequirementUpdated(
        ApprovalType approvalType,
        uint256 minApprovals,
        uint256 minAuditorApprovals,
        address updatedBy
    );
    
    // Modifiers
    modifier requestExists(bytes32 requestId) {
        require(approvalRequests[requestId].requestId != bytes32(0), "ApprovalManager: Request does not exist");
        _;
    }
    
    modifier validStatus(bytes32 requestId, ApprovalStatus expectedStatus) {
        require(
            approvalRequests[requestId].status == expectedStatus,
            "ApprovalManager: Invalid request status"
        );
        _;
    }
    
    modifier notExpired(bytes32 requestId) {
        require(
            block.timestamp <= approvalRequests[requestId].deadline,
            "ApprovalManager: Request has expired"
        );
        _;
    }
    
    modifier hasNotActed(bytes32 requestId) {
        require(
            !approvalRequests[requestId].hasApproved[msg.sender] &&
            !approvalRequests[requestId].hasRejected[msg.sender],
            "ApprovalManager: Already acted on this request"
        );
        _;
    }
    
    /**
     * @dev Constructor sets up roles and default approval requirements
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(DATA_PROVIDER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CONSUMER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(GOVERNANCE_ROLE, ADMIN_ROLE);
        
        // Set default approval requirements
        _setDefaultApprovalRequirements();
    }
    
    /**
     * @dev Set default approval requirements for different types
     */
    function _setDefaultApprovalRequirements() internal {
        // Data Access approvals
        approvalRequirements[ApprovalType.DataAccess] = ApprovalRequirement({
            minApprovals: 2,
            minAuditorApprovals: 1,
            minProviderApprovals: 1,
            totalRequiredStake: 0.1 ether,
            timeoutDuration: 24 hours,
            requiresUnanimity: false,
            allowSelfApproval: false
        });
        
        // Computing Request approvals
        approvalRequirements[ApprovalType.ComputingRequest] = ApprovalRequirement({
            minApprovals: 3,
            minAuditorApprovals: 2,
            minProviderApprovals: 1,
            totalRequiredStake: 0.5 ether,
            timeoutDuration: 48 hours,
            requiresUnanimity: false,
            allowSelfApproval: false
        });
        
        // Policy Change approvals
        approvalRequirements[ApprovalType.PolicyChange] = ApprovalRequirement({
            minApprovals: 5,
            minAuditorApprovals: 3,
            minProviderApprovals: 2,
            totalRequiredStake: 1.0 ether,
            timeoutDuration: 7 days,
            requiresUnanimity: false,
            allowSelfApproval: false
        });
        
        // Emergency approvals
        approvalRequirements[ApprovalType.Emergency] = ApprovalRequirement({
            minApprovals: 2,
            minAuditorApprovals: 2,
            minProviderApprovals: 0,
            totalRequiredStake: 0.05 ether,
            timeoutDuration: 2 hours,
            requiresUnanimity: false,
            allowSelfApproval: false
        });
        
        // Governance approvals
        approvalRequirements[ApprovalType.Governance] = ApprovalRequirement({
            minApprovals: 7,
            minAuditorApprovals: 3,
            minProviderApprovals: 2,
            totalRequiredStake: 2.0 ether,
            timeoutDuration: 14 days,
            requiresUnanimity: false,
            allowSelfApproval: false
        });
    }
    
    /**
     * @dev Create a new approval request
     * @param approvalType Type of approval needed
     * @param targetHash Hash of target resource or action
     * @param description Human-readable description
     * @param metaData Additional metadata
     * @return requestId Generated request ID
     */
    function createApprovalRequest(
        ApprovalType approvalType,
        bytes32 targetHash,
        string calldata description,
        bytes calldata metaData
    ) external whenNotPaused nonReentrant returns (bytes32) {
        require(targetHash != bytes32(0), "ApprovalManager: Invalid target hash");
        require(bytes(description).length > 0, "ApprovalManager: Description required");
        
        // Generate unique request ID
        _requestIdCounter++;
        bytes32 requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                _requestIdCounter,
                targetHash
            )
        );
        
        ApprovalRequirement memory requirement = approvalRequirements[approvalType];
        require(requirement.minApprovals > 0, "ApprovalManager: Invalid approval type");
        
        // Create approval request
        ApprovalRequest storage request = approvalRequests[requestId];
        request.requestId = requestId;
        request.requestor = msg.sender;
        request.approvalType = approvalType;
        request.targetHash = targetHash;
        request.description = description;
        request.metaData = metaData;
        request.status = ApprovalStatus.Pending;
        request.createdAt = block.timestamp;
        request.deadline = block.timestamp + requirement.timeoutDuration;
        request.approvalCount = 0;
        request.rejectionCount = 0;
        request.totalStake = 0;
        request.isExecuted = false;
        
        // Update mappings
        userRequests[msg.sender].push(requestId);
        requestsByType[approvalType].push(requestId);
        requestsByStatus[ApprovalStatus.Pending].push(requestId);
        
        // Update statistics
        totalRequests++;
        
        emit ApprovalRequestCreated(
            requestId,
            msg.sender,
            approvalType,
            targetHash,
            request.deadline
        );
        
        return requestId;
    }
    
    /**
     * @dev Approve a request
     * @param requestId ID of the request to approve
     * @param stakeAmount Amount of stake to contribute
     */
    function approveRequest(bytes32 requestId, uint256 stakeAmount) 
        external 
        requestExists(requestId) 
        validStatus(requestId, ApprovalStatus.Pending)
        notExpired(requestId)
        hasNotActed(requestId)
        whenNotPaused 
        nonReentrant 
    {
        ApprovalRequest storage request = approvalRequests[requestId];
        ApprovalRequirement memory requirement = approvalRequirements[request.approvalType];
        
        // Check self-approval restriction
        if (!requirement.allowSelfApproval) {
            require(request.requestor != msg.sender, "ApprovalManager: Self-approval not allowed");
        }
        
        // Validate stake amount
        require(
            stakeholderStake[msg.sender] >= stakeAmount,
            "ApprovalManager: Insufficient stake balance"
        );
        
        // Lock stake
        if (stakeAmount > 0) {
            stakeholderStake[msg.sender] -= stakeAmount;
            lockedStake[msg.sender] += stakeAmount;
            request.approverStake[msg.sender] = stakeAmount;
            request.totalStake += stakeAmount;
        }
        
        // Record approval
        request.hasApproved[msg.sender] = true;
        request.approvers.push(msg.sender);
        request.approvalCount++;
        
        // Update statistics
        userApprovalCount[msg.sender]++;
        userApprovals[msg.sender].push(requestId);
        
        emit ApprovalGiven(requestId, msg.sender, stakeAmount, request.approvalCount);
        
        // Check if approval criteria is met
        _checkApprovalCriteria(requestId);
    }
    
    /**
     * @dev Reject a request
     * @param requestId ID of the request to reject
     * @param reason Reason for rejection
     */
    function rejectRequest(bytes32 requestId, string calldata reason) 
        external 
        requestExists(requestId) 
        validStatus(requestId, ApprovalStatus.Pending)
        notExpired(requestId)
        hasNotActed(requestId)
        whenNotPaused 
    {
        require(bytes(reason).length > 0, "ApprovalManager: Rejection reason required");
        
        ApprovalRequest storage request = approvalRequests[requestId];
        
        // Record rejection
        request.hasRejected[msg.sender] = true;
        request.rejectors.push(msg.sender);
        request.rejectionCount++;
        
        // Update statistics
        userRejectionCount[msg.sender]++;
        
        emit ApprovalRejected(requestId, msg.sender, reason, request.rejectionCount);
        
        // Check if enough rejections to auto-reject
        if (request.rejectionCount >= approvalRequirements[request.approvalType].minApprovals) {
            _changeRequestStatus(requestId, ApprovalStatus.Rejected);
            rejectedRequests++;
        }
    }
    
    /**
     * @dev Check if approval criteria is met and update status
     * @param requestId ID of the request to check
     */
    function _checkApprovalCriteria(bytes32 requestId) internal {
        ApprovalRequest storage request = approvalRequests[requestId];
        ApprovalRequirement memory requirement = approvalRequirements[request.approvalType];
        
        // Count role-specific approvals
        uint256 auditorApprovals = 0;
        uint256 providerApprovals = 0;
        
        for (uint256 i = 0; i < request.approvers.length; i++) {
            if (hasRole(AUDITOR_ROLE, request.approvers[i])) {
                auditorApprovals++;
            }
            if (hasRole(DATA_PROVIDER_ROLE, request.approvers[i])) {
                providerApprovals++;
            }
        }
        
        // Check if all criteria are met
        bool criteriaMetBasic = request.approvalCount >= requirement.minApprovals;
        bool criteriaMetAuditor = auditorApprovals >= requirement.minAuditorApprovals;
        bool criteriaMetProvider = providerApprovals >= requirement.minProviderApprovals;
        bool criteriaMetStake = request.totalStake >= requirement.totalRequiredStake;
        
        if (criteriaMetBasic && criteriaMetAuditor && criteriaMetProvider && criteriaMetStake) {
            _changeRequestStatus(requestId, ApprovalStatus.Approved);
            approvedRequests++;
        }
    }
    
    /**
     * @dev Execute an approved request
     * @param requestId ID of the approved request
     * @return success Whether execution was successful
     */
    function executeRequest(bytes32 requestId) 
        external 
        requestExists(requestId) 
        validStatus(requestId, ApprovalStatus.Approved)
        whenNotPaused 
        nonReentrant 
        returns (bool success) 
    {
        ApprovalRequest storage request = approvalRequests[requestId];
        require(!request.isExecuted, "ApprovalManager: Request already executed");
        
        // Mark as executed
        request.isExecuted = true;
        request.executionResult = keccak256(abi.encodePacked("EXECUTED", block.timestamp));
        
        _changeRequestStatus(requestId, ApprovalStatus.Executed);
        
        // Release stakes back to approvers
        _releaseStakes(requestId);
        
        emit ApprovalExecuted(requestId, msg.sender, request.executionResult);
        
        return true;
    }
    
    /**
     * @dev Release stakes for completed/expired requests
     * @param requestId ID of the request
     */
    function _releaseStakes(bytes32 requestId) internal {
        ApprovalRequest storage request = approvalRequests[requestId];
        
        for (uint256 i = 0; i < request.approvers.length; i++) {
            address approver = request.approvers[i];
            uint256 stake = request.approverStake[approver];
            
            if (stake > 0) {
                lockedStake[approver] -= stake;
                stakeholderStake[approver] += stake;
                request.approverStake[approver] = 0;
            }
        }
        
        request.totalStake = 0;
    }
    
    /**
     * @dev Handle expired requests
     * @param requestId ID of the expired request
     */
    function handleExpiredRequest(bytes32 requestId) 
        external 
        requestExists(requestId) 
        validStatus(requestId, ApprovalStatus.Pending) 
    {
        require(
            block.timestamp > approvalRequests[requestId].deadline,
            "ApprovalManager: Request not yet expired"
        );
        
        _changeRequestStatus(requestId, ApprovalStatus.Expired);
        _releaseStakes(requestId);
        expiredRequests++;
    }
    
    /**
     * @dev Deposit stake
     */
    function depositStake() external payable whenNotPaused {
        require(msg.value > 0, "ApprovalManager: Must deposit positive amount");
        
        stakeholderStake[msg.sender] += msg.value;
        
        emit StakeDeposited(msg.sender, msg.value, stakeholderStake[msg.sender]);
    }
    
    /**
     * @dev Withdraw available stake
     * @param amount Amount to withdraw (0 = withdraw all)
     */
    function withdrawStake(uint256 amount) external nonReentrant {
        uint256 availableStake = stakeholderStake[msg.sender];
        require(availableStake > 0, "ApprovalManager: No stake available");
        
        uint256 withdrawAmount = amount;
        if (amount == 0 || amount > availableStake) {
            withdrawAmount = availableStake;
        }
        
        stakeholderStake[msg.sender] -= withdrawAmount;
        
        (bool success, ) = msg.sender.call{value: withdrawAmount}("");
        require(success, "ApprovalManager: Withdrawal failed");
        
        emit StakeWithdrawn(msg.sender, withdrawAmount, stakeholderStake[msg.sender]);
    }
    
    /**
     * @dev Get request information
     * @param requestId ID of the request
     * @return ApprovalRequestInfo struct
     */
    function getRequestInfo(bytes32 requestId) 
        external 
        view 
        requestExists(requestId) 
        returns (ApprovalRequestInfo memory) 
    {
        ApprovalRequest storage request = approvalRequests[requestId];
        
        return ApprovalRequestInfo({
            requestId: request.requestId,
            requestor: request.requestor,
            approvalType: request.approvalType,
            targetHash: request.targetHash,
            description: request.description,
            metaData: request.metaData,
            status: request.status,
            createdAt: request.createdAt,
            deadline: request.deadline,
            approvalCount: request.approvalCount,
            rejectionCount: request.rejectionCount,
            approvers: request.approvers,
            rejectors: request.rejectors,
            totalStake: request.totalStake,
            isExecuted: request.isExecuted,
            executionResult: request.executionResult
        });
    }
    
    /**
     * @dev Change request status
     * @param requestId ID of the request
     * @param newStatus New status to set
     */
    function _changeRequestStatus(bytes32 requestId, ApprovalStatus newStatus) internal {
        ApprovalStatus oldStatus = approvalRequests[requestId].status;
        approvalRequests[requestId].status = newStatus;
        
        requestsByStatus[newStatus].push(requestId);
        
        emit ApprovalStatusChanged(requestId, oldStatus, newStatus, msg.sender);
    }
    
    /**
     * @dev Update approval requirements (governance only)
     * @param approvalType Type to update requirements for
     * @param requirement New approval requirement
     */
    function updateApprovalRequirement(
        ApprovalType approvalType,
        ApprovalRequirement calldata requirement
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(requirement.minApprovals > 0, "ApprovalManager: Invalid minimum approvals");
        require(requirement.timeoutDuration > 0, "ApprovalManager: Invalid timeout duration");
        
        approvalRequirements[approvalType] = requirement;
        
        emit ApprovalRequirementUpdated(
            approvalType,
            requirement.minApprovals,
            requirement.minAuditorApprovals,
            msg.sender
        );
    }
    
    /**
     * @dev Grant roles
     */
    function grantAuditorRole(address auditor) external onlyRole(ADMIN_ROLE) {
        grantRole(AUDITOR_ROLE, auditor);
    }
    
    function grantProviderRole(address provider) external onlyRole(ADMIN_ROLE) {
        grantRole(DATA_PROVIDER_ROLE, provider);
    }
    
    function grantConsumerRole(address consumer) external onlyRole(ADMIN_ROLE) {
        grantRole(CONSUMER_ROLE, consumer);
    }
    
    function grantGovernanceRole(address governance) external onlyRole(ADMIN_ROLE) {
        grantRole(GOVERNANCE_ROLE, governance);
    }
    
    /**
     * @dev Pause/unpause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
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
            uint256 approved,
            uint256 rejected,
            uint256 expired,
            uint256 pending
        ) 
    {
        return (
            totalRequests,
            approvedRequests,
            rejectedRequests,
            expiredRequests,
            requestsByStatus[ApprovalStatus.Pending].length
        );
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        require(msg.value > 0, "ApprovalManager: Must send positive amount");
        stakeholderStake[msg.sender] += msg.value;
        emit StakeDeposited(msg.sender, msg.value, stakeholderStake[msg.sender]);
    }
}