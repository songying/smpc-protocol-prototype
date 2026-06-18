// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PrivacyCompliance
 * @dev Manages privacy compliance and regulatory requirements for SMPC protocol
 * @notice Handles privacy policies, data subject rights, and compliance tracking
 */
contract PrivacyCompliance is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PRIVACY_OFFICER_ROLE = keccak256("PRIVACY_OFFICER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant DATA_SUBJECT_ROLE = keccak256("DATA_SUBJECT_ROLE");
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");
    
    // Compliance framework enumeration
    enum ComplianceFramework {
        GDPR,           // General Data Protection Regulation
        CCPA,           // California Consumer Privacy Act
        HIPAA,          // Health Insurance Portability and Accountability Act
        PCI_DSS,        // Payment Card Industry Data Security Standard
        SOX,            // Sarbanes-Oxley Act
        Custom          // Custom compliance framework
    }
    
    // Privacy policy status enumeration
    enum PolicyStatus {
        Draft,          // Policy in draft state
        Active,         // Currently active policy
        Deprecated,     // No longer active but referenced
        Archived        // Completely archived
    }
    
    // Data subject request type enumeration
    enum RequestType {
        Access,         // Right to access personal data
        Rectification,  // Right to rectify inaccurate data
        Erasure,        // Right to be forgotten
        Portability,    // Right to data portability
        Restriction,    // Right to restrict processing
        Objection,      // Right to object to processing
        Withdraw        // Withdraw consent
    }
    
    // Request status enumeration
    enum RequestStatus {
        Submitted,      // Request submitted
        UnderReview,    // Being reviewed
        Approved,       // Approved for execution
        Rejected,       // Rejected with reason
        Completed,      // Successfully completed
        Failed          // Failed to complete
    }
    
    // Privacy policy structure
    struct PrivacyPolicy {
        bytes32 policyId;               // Unique policy identifier
        string title;                   // Policy title
        string version;                 // Policy version
        string contentURI;              // IPFS URI for policy content
        bytes32 contentHash;            // Hash of policy content
        ComplianceFramework framework;  // Compliance framework
        PolicyStatus status;            // Current status
        uint256 effectiveDate;          // When policy becomes effective
        uint256 expirationDate;         // When policy expires
        address approvedBy;             // Who approved the policy
        uint256 createdAt;              // Creation timestamp
        uint256 lastUpdated;            // Last update timestamp
        mapping(address => bool) acknowledgments; // User acknowledgments
        mapping(address => uint256) acknowledgmentDates; // Acknowledgment dates
    }
    
    // Privacy policy info for external access
    struct PrivacyPolicyInfo {
        bytes32 policyId;
        string title;
        string version;
        string contentURI;
        bytes32 contentHash;
        ComplianceFramework framework;
        PolicyStatus status;
        uint256 effectiveDate;
        uint256 expirationDate;
        address approvedBy;
        uint256 createdAt;
        uint256 lastUpdated;
    }
    
    // Data subject request structure
    struct DataSubjectRequest {
        bytes32 requestId;              // Unique request identifier
        address dataSubject;            // Subject making the request
        RequestType requestType;        // Type of request
        RequestStatus status;           // Current status
        string description;             // Request description
        bytes32[] affectedDataHashes;   // Data affected by request
        string reason;                  // Reason for request
        uint256 submittedAt;            // Submission timestamp
        uint256 deadline;               // Response deadline
        address assignedOfficer;        // Assigned privacy officer
        string responseURI;             // IPFS URI for response
        bytes32 responseHash;           // Hash of response
        uint256 completedAt;            // Completion timestamp
        bool isUrgent;                  // Whether request is urgent
    }
    
    // Compliance audit record
    struct ComplianceAudit {
        bytes32 auditId;                // Unique audit identifier
        address auditor;                // Auditor conducting the audit
        ComplianceFramework framework;  // Framework being audited
        uint256 startDate;              // Audit start date
        uint256 endDate;                // Audit end date
        string findingsURI;             // IPFS URI for findings
        bytes32 findingsHash;           // Hash of findings
        bool isCompliant;               // Overall compliance status
        string[] recommendations;       // Audit recommendations
        uint256 createdAt;              // Creation timestamp
    }
    
    // Storage
    mapping(bytes32 => PrivacyPolicy) public privacyPolicies;
    mapping(bytes32 => DataSubjectRequest) public dataSubjectRequests;
    mapping(bytes32 => ComplianceAudit) public complianceAudits;
    
    // Mappings for organization
    mapping(ComplianceFramework => bytes32[]) public policiesByFramework;
    mapping(PolicyStatus => bytes32[]) public policiesByStatus;
    mapping(address => bytes32[]) public userPolicyAcknowledgments;
    mapping(address => bytes32[]) public userDataRequests;
    mapping(RequestType => bytes32[]) public requestsByType;
    mapping(RequestStatus => bytes32[]) public requestsByStatus;
    mapping(address => bytes32[]) public officerAssignments;
    mapping(ComplianceFramework => bytes32[]) public auditsByFramework;
    
    // Active policies
    mapping(ComplianceFramework => bytes32) public activePolicies;
    
    // Counters
    uint256 private _policyIdCounter;
    uint256 private _requestIdCounter;
    uint256 private _auditIdCounter;
    
    // Configuration
    uint256 public defaultResponseDeadline = 30 days; // Default response time
    uint256 public urgentResponseDeadline = 72 hours; // Urgent response time
    
    // Statistics
    uint256 public totalPolicies;
    uint256 public totalRequests;
    uint256 public totalAudits;
    uint256 public completedRequests;
    mapping(ComplianceFramework => uint256) public frameworkPolicyCount;
    mapping(RequestType => uint256) public requestTypeCount;
    
    // Events
    event PrivacyPolicyCreated(
        bytes32 indexed policyId,
        ComplianceFramework framework,
        string title,
        uint256 effectiveDate
    );
    
    event PrivacyPolicyUpdated(
        bytes32 indexed policyId,
        string newVersion,
        address updatedBy
    );
    
    event PrivacyPolicyAcknowledged(
        bytes32 indexed policyId,
        address indexed user,
        uint256 acknowledgedAt
    );
    
    event DataSubjectRequestSubmitted(
        bytes32 indexed requestId,
        address indexed dataSubject,
        RequestType requestType,
        uint256 deadline
    );
    
    event DataSubjectRequestStatusChanged(
        bytes32 indexed requestId,
        RequestStatus oldStatus,
        RequestStatus newStatus,
        address changedBy
    );
    
    event DataSubjectRequestCompleted(
        bytes32 indexed requestId,
        address officer,
        string responseURI
    );
    
    event ComplianceAuditCreated(
        bytes32 indexed auditId,
        address indexed auditor,
        ComplianceFramework framework,
        uint256 startDate
    );
    
    event ComplianceAuditCompleted(
        bytes32 indexed auditId,
        bool isCompliant,
        string findingsURI
    );
    
    // Modifiers
    modifier policyExists(bytes32 policyId) {
        require(privacyPolicies[policyId].policyId != bytes32(0), "PrivacyCompliance: Policy does not exist");
        _;
    }
    
    modifier requestExists(bytes32 requestId) {
        require(dataSubjectRequests[requestId].requestId != bytes32(0), "PrivacyCompliance: Request does not exist");
        _;
    }
    
    modifier auditExists(bytes32 auditId) {
        require(complianceAudits[auditId].auditId != bytes32(0), "PrivacyCompliance: Audit does not exist");
        _;
    }
    
    modifier onlyDataSubject(bytes32 requestId) {
        require(
            dataSubjectRequests[requestId].dataSubject == msg.sender,
            "PrivacyCompliance: Only data subject can perform this action"
        );
        _;
    }
    
    /**
     * @dev Constructor sets up roles and default configuration
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PRIVACY_OFFICER_ROLE, msg.sender);
        
        _setRoleAdmin(PRIVACY_OFFICER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(DATA_SUBJECT_ROLE, PRIVACY_OFFICER_ROLE);
        _setRoleAdmin(REGULATOR_ROLE, ADMIN_ROLE);
    }
    
    /**
     * @dev Create a new privacy policy
     * @param title Policy title
     * @param version Policy version
     * @param contentURI IPFS URI for policy content
     * @param contentHash Hash of policy content
     * @param framework Compliance framework
     * @param effectiveDate When policy becomes effective
     * @param expirationDate When policy expires (0 = no expiration)
     * @return policyId Generated policy ID
     */
    function createPrivacyPolicy(
        string calldata title,
        string calldata version,
        string calldata contentURI,
        bytes32 contentHash,
        ComplianceFramework framework,
        uint256 effectiveDate,
        uint256 expirationDate
    ) external onlyRole(PRIVACY_OFFICER_ROLE) whenNotPaused returns (bytes32) {
        require(bytes(title).length > 0, "PrivacyCompliance: Title required");
        require(bytes(version).length > 0, "PrivacyCompliance: Version required");
        require(bytes(contentURI).length > 0, "PrivacyCompliance: Content URI required");
        require(contentHash != bytes32(0), "PrivacyCompliance: Content hash required");
        require(effectiveDate >= block.timestamp, "PrivacyCompliance: Effective date must be in future");
        
        if (expirationDate > 0) {
            require(expirationDate > effectiveDate, "PrivacyCompliance: Expiration must be after effective date");
        }
        
        // Generate unique policy ID
        _policyIdCounter++;
        bytes32 policyId = keccak256(
            abi.encodePacked(
                "POLICY",
                framework,
                _policyIdCounter,
                block.timestamp
            )
        );
        
        // Create policy
        PrivacyPolicy storage policy = privacyPolicies[policyId];
        policy.policyId = policyId;
        policy.title = title;
        policy.version = version;
        policy.contentURI = contentURI;
        policy.contentHash = contentHash;
        policy.framework = framework;
        policy.status = PolicyStatus.Draft;
        policy.effectiveDate = effectiveDate;
        policy.expirationDate = expirationDate;
        policy.createdAt = block.timestamp;
        policy.lastUpdated = block.timestamp;
        
        // Update mappings
        policiesByFramework[framework].push(policyId);
        policiesByStatus[PolicyStatus.Draft].push(policyId);
        
        // Update statistics
        totalPolicies++;
        frameworkPolicyCount[framework]++;
        
        emit PrivacyPolicyCreated(policyId, framework, title, effectiveDate);
        
        return policyId;
    }
    
    /**
     * @dev Activate a privacy policy
     * @param policyId ID of the policy to activate
     */
    function activatePrivacyPolicy(bytes32 policyId) 
        external 
        policyExists(policyId) 
        onlyRole(ADMIN_ROLE) 
    {
        PrivacyPolicy storage policy = privacyPolicies[policyId];
        require(policy.status == PolicyStatus.Draft, "PrivacyCompliance: Policy not in draft status");
        require(block.timestamp >= policy.effectiveDate, "PrivacyCompliance: Policy not yet effective");
        
        // Deprecate current active policy if exists
        bytes32 currentActivePolicy = activePolicies[policy.framework];
        if (currentActivePolicy != bytes32(0)) {
            privacyPolicies[currentActivePolicy].status = PolicyStatus.Deprecated;
            policiesByStatus[PolicyStatus.Deprecated].push(currentActivePolicy);
        }
        
        // Activate new policy
        policy.status = PolicyStatus.Active;
        policy.approvedBy = msg.sender;
        policy.lastUpdated = block.timestamp;
        
        activePolicies[policy.framework] = policyId;
        policiesByStatus[PolicyStatus.Active].push(policyId);
    }
    
    /**
     * @dev Acknowledge a privacy policy
     * @param policyId ID of the policy to acknowledge
     */
    function acknowledgePrivacyPolicy(bytes32 policyId) 
        external 
        policyExists(policyId) 
        whenNotPaused 
    {
        PrivacyPolicy storage policy = privacyPolicies[policyId];
        require(policy.status == PolicyStatus.Active, "PrivacyCompliance: Policy not active");
        require(!policy.acknowledgments[msg.sender], "PrivacyCompliance: Already acknowledged");
        
        // Record acknowledgment
        policy.acknowledgments[msg.sender] = true;
        policy.acknowledgmentDates[msg.sender] = block.timestamp;
        userPolicyAcknowledgments[msg.sender].push(policyId);
        
        emit PrivacyPolicyAcknowledged(policyId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Submit a data subject request
     * @param requestType Type of request
     * @param description Request description
     * @param affectedDataHashes Data affected by request
     * @param reason Reason for request
     * @param isUrgent Whether request is urgent
     * @return requestId Generated request ID
     */
    function submitDataSubjectRequest(
        RequestType requestType,
        string calldata description,
        bytes32[] calldata affectedDataHashes,
        string calldata reason,
        bool isUrgent
    ) external onlyRole(DATA_SUBJECT_ROLE) whenNotPaused returns (bytes32) {
        require(bytes(description).length > 0, "PrivacyCompliance: Description required");
        require(bytes(reason).length > 0, "PrivacyCompliance: Reason required");
        
        // Generate unique request ID
        _requestIdCounter++;
        bytes32 requestId = keccak256(
            abi.encodePacked(
                "REQUEST",
                msg.sender,
                requestType,
                _requestIdCounter,
                block.timestamp
            )
        );
        
        uint256 deadline = block.timestamp + (isUrgent ? urgentResponseDeadline : defaultResponseDeadline);
        
        // Create request
        DataSubjectRequest storage request = dataSubjectRequests[requestId];
        request.requestId = requestId;
        request.dataSubject = msg.sender;
        request.requestType = requestType;
        request.status = RequestStatus.Submitted;
        request.description = description;
        request.affectedDataHashes = affectedDataHashes;
        request.reason = reason;
        request.submittedAt = block.timestamp;
        request.deadline = deadline;
        request.isUrgent = isUrgent;
        
        // Update mappings
        userDataRequests[msg.sender].push(requestId);
        requestsByType[requestType].push(requestId);
        requestsByStatus[RequestStatus.Submitted].push(requestId);
        
        // Update statistics
        totalRequests++;
        requestTypeCount[requestType]++;
        
        emit DataSubjectRequestSubmitted(requestId, msg.sender, requestType, deadline);
        
        return requestId;
    }
    
    /**
     * @dev Assign a privacy officer to a request
     * @param requestId ID of the request
     * @param officer Privacy officer to assign
     */
    function assignPrivacyOfficer(bytes32 requestId, address officer) 
        external 
        requestExists(requestId) 
        onlyRole(ADMIN_ROLE) 
    {
        require(hasRole(PRIVACY_OFFICER_ROLE, officer), "PrivacyCompliance: Invalid privacy officer");
        
        DataSubjectRequest storage request = dataSubjectRequests[requestId];
        require(request.status == RequestStatus.Submitted, "PrivacyCompliance: Invalid request status");
        
        request.assignedOfficer = officer;
        request.status = RequestStatus.UnderReview;
        
        officerAssignments[officer].push(requestId);
        requestsByStatus[RequestStatus.UnderReview].push(requestId);
        
        emit DataSubjectRequestStatusChanged(
            requestId,
            RequestStatus.Submitted,
            RequestStatus.UnderReview,
            msg.sender
        );
    }
    
    /**
     * @dev Process a data subject request
     * @param requestId ID of the request
     * @param approved Whether request is approved
     * @param responseURI IPFS URI for response
     * @param responseHash Hash of response
     */
    function processDataSubjectRequest(
        bytes32 requestId,
        bool approved,
        string calldata responseURI,
        bytes32 responseHash
    ) external requestExists(requestId) onlyRole(PRIVACY_OFFICER_ROLE) {
        DataSubjectRequest storage request = dataSubjectRequests[requestId];
        require(
            request.assignedOfficer == msg.sender,
            "PrivacyCompliance: Not assigned officer"
        );
        require(
            request.status == RequestStatus.UnderReview,
            "PrivacyCompliance: Invalid request status"
        );
        require(bytes(responseURI).length > 0, "PrivacyCompliance: Response URI required");
        require(responseHash != bytes32(0), "PrivacyCompliance: Response hash required");
        
        RequestStatus newStatus = approved ? RequestStatus.Approved : RequestStatus.Rejected;
        
        request.status = newStatus;
        request.responseURI = responseURI;
        request.responseHash = responseHash;
        
        requestsByStatus[newStatus].push(requestId);
        
        emit DataSubjectRequestStatusChanged(
            requestId,
            RequestStatus.UnderReview,
            newStatus,
            msg.sender
        );
        
        if (approved) {
            // Auto-complete simple requests
            if (request.requestType == RequestType.Access || request.requestType == RequestType.Portability) {
                _completeDataSubjectRequest(requestId);
            }
        }
    }
    
    /**
     * @dev Complete a data subject request
     * @param requestId ID of the request
     */
    function completeDataSubjectRequest(bytes32 requestId) 
        external 
        requestExists(requestId) 
        onlyRole(PRIVACY_OFFICER_ROLE) 
    {
        _completeDataSubjectRequest(requestId);
    }
    
    /**
     * @dev Internal function to complete a request
     * @param requestId ID of the request
     */
    function _completeDataSubjectRequest(bytes32 requestId) internal {
        DataSubjectRequest storage request = dataSubjectRequests[requestId];
        require(
            request.status == RequestStatus.Approved,
            "PrivacyCompliance: Request not approved"
        );
        
        request.status = RequestStatus.Completed;
        request.completedAt = block.timestamp;
        
        requestsByStatus[RequestStatus.Completed].push(requestId);
        completedRequests++;
        
        emit DataSubjectRequestCompleted(
            requestId,
            request.assignedOfficer,
            request.responseURI
        );
    }
    
    /**
     * @dev Create a compliance audit
     * @param framework Framework to audit
     * @param startDate Audit start date
     * @param endDate Audit end date
     * @return auditId Generated audit ID
     */
    function createComplianceAudit(
        ComplianceFramework framework,
        uint256 startDate,
        uint256 endDate
    ) external onlyRole(AUDITOR_ROLE) returns (bytes32) {
        require(startDate >= block.timestamp, "PrivacyCompliance: Start date must be in future");
        require(endDate > startDate, "PrivacyCompliance: End date must be after start date");
        
        // Generate unique audit ID
        _auditIdCounter++;
        bytes32 auditId = keccak256(
            abi.encodePacked(
                "AUDIT",
                framework,
                msg.sender,
                _auditIdCounter,
                block.timestamp
            )
        );
        
        // Create audit
        ComplianceAudit storage audit = complianceAudits[auditId];
        audit.auditId = auditId;
        audit.auditor = msg.sender;
        audit.framework = framework;
        audit.startDate = startDate;
        audit.endDate = endDate;
        audit.createdAt = block.timestamp;
        
        // Update mappings
        auditsByFramework[framework].push(auditId);
        
        // Update statistics
        totalAudits++;
        
        emit ComplianceAuditCreated(auditId, msg.sender, framework, startDate);
        
        return auditId;
    }
    
    /**
     * @dev Complete a compliance audit
     * @param auditId ID of the audit
     * @param isCompliant Overall compliance status
     * @param findingsURI IPFS URI for findings
     * @param findingsHash Hash of findings
     * @param recommendations Audit recommendations
     */
    function completeComplianceAudit(
        bytes32 auditId,
        bool isCompliant,
        string calldata findingsURI,
        bytes32 findingsHash,
        string[] calldata recommendations
    ) external auditExists(auditId) onlyRole(AUDITOR_ROLE) {
        ComplianceAudit storage audit = complianceAudits[auditId];
        require(audit.auditor == msg.sender, "PrivacyCompliance: Not assigned auditor");
        require(bytes(audit.findingsURI).length == 0, "PrivacyCompliance: Audit already completed");
        require(bytes(findingsURI).length > 0, "PrivacyCompliance: Findings URI required");
        require(findingsHash != bytes32(0), "PrivacyCompliance: Findings hash required");
        
        audit.isCompliant = isCompliant;
        audit.findingsURI = findingsURI;
        audit.findingsHash = findingsHash;
        audit.recommendations = recommendations;
        
        emit ComplianceAuditCompleted(auditId, isCompliant, findingsURI);
    }
    
    /**
     * @dev Get privacy policy information
     * @param policyId ID of the policy
     * @return PrivacyPolicyInfo struct
     */
    function getPrivacyPolicyInfo(bytes32 policyId) 
        external 
        view 
        policyExists(policyId) 
        returns (PrivacyPolicyInfo memory) 
    {
        PrivacyPolicy storage policy = privacyPolicies[policyId];
        
        return PrivacyPolicyInfo({
            policyId: policy.policyId,
            title: policy.title,
            version: policy.version,
            contentURI: policy.contentURI,
            contentHash: policy.contentHash,
            framework: policy.framework,
            status: policy.status,
            effectiveDate: policy.effectiveDate,
            expirationDate: policy.expirationDate,
            approvedBy: policy.approvedBy,
            createdAt: policy.createdAt,
            lastUpdated: policy.lastUpdated
        });
    }
    
    /**
     * @dev Check if user has acknowledged a policy
     * @param policyId ID of the policy
     * @param user User address
     * @return acknowledged Whether user has acknowledged
     * @return acknowledgedAt When user acknowledged (0 if not acknowledged)
     */
    function hasAcknowledgedPolicy(bytes32 policyId, address user) 
        external 
        view 
        policyExists(policyId) 
        returns (bool acknowledged, uint256 acknowledgedAt) 
    {
        PrivacyPolicy storage policy = privacyPolicies[policyId];
        return (
            policy.acknowledgments[user],
            policy.acknowledgmentDates[user]
        );
    }
    
    /**
     * @dev Update configuration
     * @param _defaultResponseDeadline New default response deadline
     * @param _urgentResponseDeadline New urgent response deadline
     */
    function updateConfiguration(
        uint256 _defaultResponseDeadline,
        uint256 _urgentResponseDeadline
    ) external onlyRole(ADMIN_ROLE) {
        require(_defaultResponseDeadline > _urgentResponseDeadline, "PrivacyCompliance: Invalid deadlines");
        
        defaultResponseDeadline = _defaultResponseDeadline;
        urgentResponseDeadline = _urgentResponseDeadline;
    }
    
    /**
     * @dev Grant roles
     */
    function grantPrivacyOfficerRole(address officer) external onlyRole(ADMIN_ROLE) {
        grantRole(PRIVACY_OFFICER_ROLE, officer);
    }
    
    function grantAuditorRole(address auditor) external onlyRole(ADMIN_ROLE) {
        grantRole(AUDITOR_ROLE, auditor);
    }
    
    function grantDataSubjectRole(address dataSubject) external onlyRole(PRIVACY_OFFICER_ROLE) {
        grantRole(DATA_SUBJECT_ROLE, dataSubject);
    }
    
    function grantRegulatorRole(address regulator) external onlyRole(ADMIN_ROLE) {
        grantRole(REGULATOR_ROLE, regulator);
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
            uint256 policies,
            uint256 requests,
            uint256 audits,
            uint256 completed
        ) 
    {
        return (
            totalPolicies,
            totalRequests,
            totalAudits,
            completedRequests
        );
    }
}