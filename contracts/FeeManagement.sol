// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FeeManagement
 * @dev Manages fee calculation, collection, and distribution for SMPC protocol
 * @notice Handles automatic fee distribution to providers, auditors, and platform
 */
contract FeeManagement is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant COMPUTING_REQUEST_ROLE = keccak256("COMPUTING_REQUEST_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    
    // Fee configuration structure
    struct FeeConfig {
        uint256 platformFeePercentage;    // Platform fee (basis points, 100 = 1%)
        uint256 auditorFeePercentage;     // Auditor fee (basis points)
        uint256 providerFeePercentage;    // Data provider fee (basis points)
        uint256 computingNodeFeePercentage; // Computing node fee (basis points)
        uint256 minimumFee;               // Minimum fee in wei
        uint256 maximumFee;               // Maximum fee in wei (0 = no limit)
    }
    
    // Fee breakdown structure
    struct FeeBreakdown {
        uint256 totalAmount;
        uint256 platformFee;
        uint256 auditorFee;
        uint256 providerFee;
        uint256 computingNodeFee;
        uint256 remainingAmount;
    }
    
    // Transaction record structure
    struct TransactionRecord {
        bytes32 transactionId;
        address payer;
        uint256 totalAmount;
        FeeBreakdown breakdown;
        uint256 timestamp;
        bool isDistributed;
        string purpose;
    }
    
    // Current fee configuration
    FeeConfig public feeConfig;
    
    // Balances tracking
    mapping(address => uint256) public providerBalances;
    mapping(address => uint256) public auditorBalances;
    mapping(address => uint256) public computingNodeBalances;
    uint256 public platformBalance;
    uint256 public totalCollectedFees;
    
    // Transaction records
    mapping(bytes32 => TransactionRecord) public transactions;
    mapping(address => bytes32[]) public userTransactions;
    bytes32[] public allTransactions;
    
    // Statistics
    mapping(address => uint256) public providerTotalEarnings;
    mapping(address => uint256) public auditorTotalEarnings;
    mapping(address => uint256) public computingNodeTotalEarnings;
    mapping(address => uint256) public userTotalPayments;
    
    // Withdrawal tracking
    mapping(address => uint256) public lastWithdrawalTime;
    mapping(address => uint256) public totalWithdrawn;
    uint256 public withdrawalCooldown = 1 hours;
    
    // Events
    event FeesCalculated(
        bytes32 indexed transactionId,
        uint256 totalAmount,
        uint256 platformFee,
        uint256 auditorFee,
        uint256 providerFee,
        uint256 computingNodeFee
    );
    
    event FeesDistributed(
        bytes32 indexed transactionId,
        address[] providers,
        address[] auditors,
        address computingNode,
        uint256 timestamp
    );
    
    event FeeConfigUpdated(
        uint256 platformFee,
        uint256 auditorFee,
        uint256 providerFee,
        uint256 computingNodeFee,
        address updatedBy
    );
    
    event BalanceWithdrawn(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event EmergencyWithdrawal(
        address indexed admin,
        uint256 amount,
        string reason
    );
    
    // Modifiers
    modifier validPercentage(uint256 percentage) {
        require(percentage <= 10000, "FeeManagement: Percentage cannot exceed 100%");
        _;
    }
    
    modifier cooldownPassed(address user) {
        require(
            block.timestamp >= lastWithdrawalTime[user]+(withdrawalCooldown),
            "FeeManagement: Withdrawal cooldown not passed"
        );
        _;
    }
    
    /**
     * @dev Constructor sets initial fee configuration
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, msg.sender);
        
        // Canonical thesis split (Ch.4 §4.6), in basis points (100 = 1%):
        // 70% provider / 25% computing nodes / 4% validators / 1% treasury.
        // The FeeConfig struct reuses platformFee=treasury and auditorFee=validators.
        feeConfig = FeeConfig({
            platformFeePercentage: 100,       // 1%  -> treasury
            auditorFeePercentage: 400,        // 4%  -> validators
            providerFeePercentage: 7000,      // 70% -> data provider
            computingNodeFeePercentage: 2500, // 25% -> computing nodes
            minimumFee: 0.001 ether,          // Minimum 0.001 ETH
            maximumFee: 0                     // No maximum limit
        });
    }
    
    /**
     * @dev Calculate fee breakdown for a given amount
     * @param totalAmount Total amount to calculate fees for
     * @return FeeBreakdown struct with calculated fees
     */
    function calculateFees(uint256 totalAmount) 
        external 
        view 
        returns (FeeBreakdown memory) 
    {
        require(totalAmount >= feeConfig.minimumFee, "FeeManagement: Amount below minimum fee");
        
        if (feeConfig.maximumFee > 0) {
            require(totalAmount <= feeConfig.maximumFee, "FeeManagement: Amount exceeds maximum fee");
        }
        
        uint256 platformFee = (totalAmount * feeConfig.platformFeePercentage) / 10000;
        uint256 auditorFee = (totalAmount * feeConfig.auditorFeePercentage) / 10000;
        uint256 providerFee = (totalAmount * feeConfig.providerFeePercentage) / 10000;
        uint256 computingNodeFee = (totalAmount * feeConfig.computingNodeFeePercentage) / 10000;
        
        uint256 totalDistributed = platformFee + auditorFee + providerFee + computingNodeFee;
        uint256 remaining = totalAmount - totalDistributed;
        
        return FeeBreakdown({
            totalAmount: totalAmount,
            platformFee: platformFee,
            auditorFee: auditorFee,
            providerFee: providerFee,
            computingNodeFee: computingNodeFee,
            remainingAmount: remaining
        });
    }
    
    /**
     * @dev Process fee payment and record transaction
     * @param transactionId Unique transaction identifier
     * @param payer Address of the fee payer
     * @param purpose Purpose of the payment
     * @return FeeBreakdown struct with calculated fees
     */
    function processFeePayment(
        bytes32 transactionId,
        address payer,
        string calldata purpose
    ) 
        external 
        payable 
        onlyRole(COMPUTING_REQUEST_ROLE) 
        whenNotPaused 
        nonReentrant 
        returns (FeeBreakdown memory) 
    {
        require(msg.value > 0, "FeeManagement: Payment amount must be greater than zero");
        require(transactionId != bytes32(0), "FeeManagement: Invalid transaction ID");
        require(transactions[transactionId].transactionId == bytes32(0), "FeeManagement: Transaction already exists");
        
        FeeBreakdown memory breakdown = this.calculateFees(msg.value);
        
        // Record transaction
        TransactionRecord storage transaction = transactions[transactionId];
        transaction.transactionId = transactionId;
        transaction.payer = payer;
        transaction.totalAmount = msg.value;
        transaction.breakdown = breakdown;
        transaction.timestamp = block.timestamp;
        transaction.isDistributed = false;
        transaction.purpose = purpose;
        
        // Update tracking arrays
        userTransactions[payer].push(transactionId);
        allTransactions.push(transactionId);
        
        // Update statistics
        userTotalPayments[payer] = userTotalPayments[payer] + msg.value;
        totalCollectedFees = totalCollectedFees + msg.value;
        
        emit FeesCalculated(
            transactionId,
            breakdown.totalAmount,
            breakdown.platformFee,
            breakdown.auditorFee,
            breakdown.providerFee,
            breakdown.computingNodeFee
        );
        
        return breakdown;
    }
    
    /**
     * @dev Distribute fees to providers, auditors, and computing node
     * @param transactionId Transaction ID to distribute fees for
     * @param providers Array of data provider addresses
     * @param auditors Array of auditor addresses
     * @param computingNode Computing node address
     */
    function distributeFees(
        bytes32 transactionId,
        address[] calldata providers,
        address[] calldata auditors,
        address computingNode
    ) 
        external 
        onlyRole(COMPUTING_REQUEST_ROLE) 
        whenNotPaused 
        nonReentrant 
    {
        require(transactions[transactionId].transactionId != bytes32(0), "FeeManagement: Transaction not found");
        require(!transactions[transactionId].isDistributed, "FeeManagement: Fees already distributed");
        require(providers.length > 0, "FeeManagement: At least one provider required");
        require(auditors.length > 0, "FeeManagement: At least one auditor required");
        require(computingNode != address(0), "FeeManagement: Invalid computing node address");
        
        TransactionRecord storage transaction = transactions[transactionId];
        FeeBreakdown memory breakdown = transaction.breakdown;
        
        // Distribute to platform
        platformBalance = platformBalance+(breakdown.platformFee);
        
        // Distribute to providers (split equally)
        uint256 providerShare = breakdown.providerFee/(providers.length);
        for (uint256 i = 0; i < providers.length; i++) {
            providerBalances[providers[i]] = providerBalances[providers[i]]+(providerShare);
            providerTotalEarnings[providers[i]] = providerTotalEarnings[providers[i]]+(providerShare);
        }
        
        // Distribute to auditors (split equally)
        uint256 auditorShare = breakdown.auditorFee/(auditors.length);
        for (uint256 i = 0; i < auditors.length; i++) {
            auditorBalances[auditors[i]] = auditorBalances[auditors[i]]+(auditorShare);
            auditorTotalEarnings[auditors[i]] = auditorTotalEarnings[auditors[i]]+(auditorShare);
        }
        
        // Distribute to computing node
        computingNodeBalances[computingNode] = computingNodeBalances[computingNode]+(breakdown.computingNodeFee);
        computingNodeTotalEarnings[computingNode] = computingNodeTotalEarnings[computingNode]+(breakdown.computingNodeFee);
        
        // Mark as distributed
        transaction.isDistributed = true;
        
        emit FeesDistributed(transactionId, providers, auditors, computingNode, block.timestamp);
    }
    
    /**
     * @dev Withdraw available balance (providers, auditors, computing nodes)
     * @param amount Amount to withdraw (0 = withdraw all)
     */
    function withdrawBalance(uint256 amount) 
        external 
        cooldownPassed(msg.sender) 
        whenNotPaused 
        nonReentrant 
    {
        uint256 availableBalance = getAvailableBalance(msg.sender);
        require(availableBalance > 0, "FeeManagement: No balance available");
        
        uint256 withdrawAmount = amount;
        if (amount == 0 || amount > availableBalance) {
            withdrawAmount = availableBalance;
        }
        
        // Update balances
        if (providerBalances[msg.sender] > 0) {
            uint256 providerAmount = withdrawAmount > providerBalances[msg.sender] 
                ? providerBalances[msg.sender] 
                : withdrawAmount;
            providerBalances[msg.sender] = providerBalances[msg.sender]-(providerAmount);
            withdrawAmount = withdrawAmount-(providerAmount);
        }
        
        if (withdrawAmount > 0 && auditorBalances[msg.sender] > 0) {
            uint256 auditorAmount = withdrawAmount > auditorBalances[msg.sender] 
                ? auditorBalances[msg.sender] 
                : withdrawAmount;
            auditorBalances[msg.sender] = auditorBalances[msg.sender]-(auditorAmount);
            withdrawAmount = withdrawAmount-(auditorAmount);
        }
        
        if (withdrawAmount > 0 && computingNodeBalances[msg.sender] > 0) {
            uint256 nodeAmount = withdrawAmount > computingNodeBalances[msg.sender] 
                ? computingNodeBalances[msg.sender] 
                : withdrawAmount;
            computingNodeBalances[msg.sender] = computingNodeBalances[msg.sender]-(nodeAmount);
        }
        
        uint256 finalWithdrawAmount = availableBalance-(getAvailableBalance(msg.sender));
        
        // Update withdrawal tracking
        lastWithdrawalTime[msg.sender] = block.timestamp;
        totalWithdrawn[msg.sender] = totalWithdrawn[msg.sender]+(finalWithdrawAmount);
        
        // Transfer funds
        (bool success, ) = msg.sender.call{value: finalWithdrawAmount}("");
        require(success, "FeeManagement: Withdrawal transfer failed");
        
        emit BalanceWithdrawn(msg.sender, finalWithdrawAmount, block.timestamp);
    }
    
    /**
     * @dev Get available balance for a user
     * @param user User address
     * @return Total available balance
     */
    function getAvailableBalance(address user) public view returns (uint256) {
        return providerBalances[user]
            +(auditorBalances[user])
            +(computingNodeBalances[user]);
    }
    
    /**
     * @dev Get detailed balance breakdown for a user
     * @param user User address
     * @return provider Provider balance
     * @return auditor Auditor balance
     * @return computingNode Computing node balance
     * @return total Total balance
     */
    function getBalanceBreakdown(address user) 
        external 
        view 
        returns (
            uint256 provider,
            uint256 auditor,
            uint256 computingNode,
            uint256 total
        ) 
    {
        return (
            providerBalances[user],
            auditorBalances[user],
            computingNodeBalances[user],
            getAvailableBalance(user)
        );
    }
    
    /**
     * @dev Get user transaction history
     * @param user User address
     * @return Array of transaction IDs
     */
    function getUserTransactions(address user) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userTransactions[user];
    }
    
    /**
     * @dev Get transaction details
     * @param transactionId Transaction ID
     * @return TransactionRecord struct
     */
    function getTransaction(bytes32 transactionId) 
        external 
        view 
        returns (TransactionRecord memory) 
    {
        return transactions[transactionId];
    }
    
    /**
     * @dev Update fee configuration (admin only)
     * @param platformFee New platform fee percentage (basis points)
     * @param auditorFee New auditor fee percentage (basis points)
     * @param providerFee New provider fee percentage (basis points)
     * @param computingNodeFee New computing node fee percentage (basis points)
     * @param minimumFee New minimum fee in wei
     * @param maximumFee New maximum fee in wei (0 = no limit)
     */
    function updateFeeConfiguration(
        uint256 platformFee,
        uint256 auditorFee,
        uint256 providerFee,
        uint256 computingNodeFee,
        uint256 minimumFee,
        uint256 maximumFee
    ) 
        external 
        onlyRole(ADMIN_ROLE) 
        validPercentage(platformFee)
        validPercentage(auditorFee)
        validPercentage(providerFee)
        validPercentage(computingNodeFee)
    {
        require(
            platformFee+(auditorFee)+(providerFee)+(computingNodeFee) <= 10000,
            "FeeManagement: Total fees cannot exceed 100%"
        );
        
        feeConfig.platformFeePercentage = platformFee;
        feeConfig.auditorFeePercentage = auditorFee;
        feeConfig.providerFeePercentage = providerFee;
        feeConfig.computingNodeFeePercentage = computingNodeFee;
        feeConfig.minimumFee = minimumFee;
        feeConfig.maximumFee = maximumFee;
        
        emit FeeConfigUpdated(platformFee, auditorFee, providerFee, computingNodeFee, msg.sender);
    }
    
    /**
     * @dev Withdraw platform fees (treasury only)
     * @param amount Amount to withdraw (0 = withdraw all)
     */
    function withdrawPlatformFees(uint256 amount) 
        external 
        onlyRole(TREASURY_ROLE) 
        nonReentrant 
    {
        require(platformBalance > 0, "FeeManagement: No platform balance available");
        
        uint256 withdrawAmount = amount;
        if (amount == 0 || amount > platformBalance) {
            withdrawAmount = platformBalance;
        }
        
        platformBalance = platformBalance-(withdrawAmount);
        
        (bool success, ) = msg.sender.call{value: withdrawAmount}("");
        require(success, "FeeManagement: Platform withdrawal failed");
    }
    
    /**
     * @dev Emergency withdrawal (admin only)
     * @param amount Amount to withdraw
     * @param reason Reason for emergency withdrawal
     */
    function emergencyWithdrawal(uint256 amount, string calldata reason) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
    {
        require(amount <= address(this).balance, "FeeManagement: Insufficient contract balance");
        require(bytes(reason).length > 0, "FeeManagement: Reason required");
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "FeeManagement: Emergency withdrawal failed");
        
        emit EmergencyWithdrawal(msg.sender, amount, reason);
    }
    
    /**
     * @dev Grant computing request role
     * @param computingRequest Address of the computing request contract
     */
    function grantComputingRequestRole(address computingRequest) external onlyRole(ADMIN_ROLE) {
        grantRole(COMPUTING_REQUEST_ROLE, computingRequest);
    }
    
    /**
     * @dev Update withdrawal cooldown period
     * @param newCooldown New cooldown period in seconds
     */
    function updateWithdrawalCooldown(uint256 newCooldown) external onlyRole(ADMIN_ROLE) {
        require(newCooldown <= 7 days, "FeeManagement: Cooldown too long");
        withdrawalCooldown = newCooldown;
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
            uint256 totalFees,
            uint256 platformFees,
            uint256 totalTransactions,
            uint256 contractBalance
        ) 
    {
        return (
            totalCollectedFees,
            platformBalance,
            allTransactions.length,
            address(this).balance
        );
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow contract to receive ETH
    }
}