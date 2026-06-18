// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PaymentDistributor
 * @dev Handles automated payment distribution according to SMPC protocol economic model
 * @notice Distributes payments: 70% data providers, 25% compute providers, 4% validators, 1% protocol
 */
contract PaymentDistributor is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROTOCOL_ROLE = keccak256("PROTOCOL_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    // Fee distribution structure (in basis points, 10000 = 100%)
    struct FeeStructure {
        uint256 dataProviderRate;      // 7000 = 70%
        uint256 computeProviderRate;   // 2500 = 25%
        uint256 validatorRate;         // 400 = 4%
        uint256 protocolRate;          // 100 = 1%
    }

    // Payment record structure
    struct PaymentRecord {
        bytes32 jobId;
        address consumer;
        uint256 totalAmount;
        uint256 timestamp;
        bool isETH;                    // true for ETH, false for ERC20
        address tokenAddress;          // ERC20 token address (if applicable)
        
        // Distribution details
        address[] dataProviders;
        address[] computeProviders;
        address[] validators;
        uint256[] dataProviderAmounts;
        uint256[] computeProviderAmounts;
        uint256[] validatorAmounts;
        uint256 protocolAmount;
        
        bool isDistributed;
    }

    // Pending withdrawal structure
    struct PendingWithdrawal {
        uint256 ethAmount;
        mapping(address => uint256) tokenAmounts; // token => amount
        uint256 lastUpdated;
    }

    // Storage
    FeeStructure public feeStructure;
    address public protocolTreasury;
    
    mapping(bytes32 => PaymentRecord) public paymentRecords;
    mapping(address => PendingWithdrawal) private pendingWithdrawals;
    mapping(address => bool) public supportedTokens;
    
    // Statistics
    uint256 public totalPaymentsProcessed;
    uint256 public totalETHDistributed;
    mapping(address => uint256) public totalTokenDistributed;
    
    // Arrays for iteration
    bytes32[] public allPaymentIds;
    address[] public allProviders;
    
    // Events
    event PaymentReceived(
        bytes32 indexed jobId,
        address indexed consumer,
        uint256 amount,
        bool isETH,
        address tokenAddress
    );

    event PaymentDistributed(
        bytes32 indexed jobId,
        uint256 dataProviderTotal,
        uint256 computeProviderTotal,
        uint256 validatorTotal,
        uint256 protocolAmount
    );

    event WithdrawalProcessed(
        address indexed provider,
        uint256 ethAmount,
        address[] tokens,
        uint256[] tokenAmounts
    );

    event FeeStructureUpdated(
        uint256 dataProviderRate,
        uint256 computeProviderRate,
        uint256 validatorRate,
        uint256 protocolRate
    );

    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event TokenSupportUpdated(address token, bool supported);

    // Modifiers
    modifier onlyProtocol() {
        require(hasRole(PROTOCOL_ROLE, msg.sender), "PaymentDistributor: Only protocol contract");
        _;
    }

    modifier validJobId(bytes32 jobId) {
        require(jobId != bytes32(0), "PaymentDistributor: Invalid job ID");
        _;
    }

    /**
     * @dev Constructor
     * @param _protocolTreasury Address of protocol treasury
     */
    constructor(address _protocolTreasury) {
        require(_protocolTreasury != address(0), "PaymentDistributor: Invalid treasury address");
        
        protocolTreasury = _protocolTreasury;
        
        // Set default fee structure (70/25/4/1)
        feeStructure = FeeStructure({
            dataProviderRate: 7000,     // 70%
            computeProviderRate: 2500,  // 25%
            validatorRate: 400,         // 4%
            protocolRate: 100           // 1%
        });
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, _protocolTreasury);
        _setRoleAdmin(PROTOCOL_ROLE, ADMIN_ROLE);
        _setRoleAdmin(TREASURY_ROLE, ADMIN_ROLE);
    }

    /**
     * @dev Receive ETH payment for job and distribute according to fee structure
     * @param jobId Unique job identifier
     * @param dataProviders Array of data provider addresses
     * @param computeProviders Array of compute provider addresses
     * @param validators Array of validator addresses
     */
    function distributeETHPayment(
        bytes32 jobId,
        address[] calldata dataProviders,
        address[] calldata computeProviders,
        address[] calldata validators
    ) external payable onlyProtocol validJobId(jobId) whenNotPaused nonReentrant {
        require(msg.value > 0, "PaymentDistributor: No ETH sent");
        require(dataProviders.length > 0, "PaymentDistributor: No data providers");
        require(computeProviders.length > 0, "PaymentDistributor: No compute providers");
        
        uint256 totalAmount = msg.value;
        
        // Calculate distribution amounts
        uint256 dataProviderTotal = (totalAmount * feeStructure.dataProviderRate) / 10000;
        uint256 computeProviderTotal = (totalAmount * feeStructure.computeProviderRate) / 10000;
        uint256 validatorTotal = (totalAmount * feeStructure.validatorRate) / 10000;
        uint256 protocolAmount = (totalAmount * feeStructure.protocolRate) / 10000;
        
        // Calculate individual amounts
        uint256[] memory dataProviderAmounts = new uint256[](dataProviders.length);
        uint256[] memory computeProviderAmounts = new uint256[](computeProviders.length);
        uint256[] memory validatorAmounts = new uint256[](validators.length);
        
        // Distribute evenly among data providers
        uint256 perDataProvider = dataProviderTotal / dataProviders.length;
        for (uint i = 0; i < dataProviders.length; i++) {
            dataProviderAmounts[i] = perDataProvider;
            pendingWithdrawals[dataProviders[i]].ethAmount += perDataProvider;
            pendingWithdrawals[dataProviders[i]].lastUpdated = block.timestamp;
            _addProviderIfNew(dataProviders[i]);
        }
        
        // Distribute evenly among compute providers
        uint256 perComputeProvider = computeProviderTotal / computeProviders.length;
        for (uint i = 0; i < computeProviders.length; i++) {
            computeProviderAmounts[i] = perComputeProvider;
            pendingWithdrawals[computeProviders[i]].ethAmount += perComputeProvider;
            pendingWithdrawals[computeProviders[i]].lastUpdated = block.timestamp;
            _addProviderIfNew(computeProviders[i]);
        }
        
        // Distribute evenly among validators
        if (validators.length > 0) {
            uint256 perValidator = validatorTotal / validators.length;
            for (uint i = 0; i < validators.length; i++) {
                validatorAmounts[i] = perValidator;
                pendingWithdrawals[validators[i]].ethAmount += perValidator;
                pendingWithdrawals[validators[i]].lastUpdated = block.timestamp;
                _addProviderIfNew(validators[i]);
            }
        }
        
        // Send protocol fee to treasury immediately
        if (protocolAmount > 0) {
            payable(protocolTreasury).transfer(protocolAmount);
        }
        
        // Create payment record
        PaymentRecord storage record = paymentRecords[jobId];
        record.jobId = jobId;
        record.consumer = tx.origin; // Original transaction sender
        record.totalAmount = totalAmount;
        record.timestamp = block.timestamp;
        record.isETH = true;
        record.dataProviders = dataProviders;
        record.computeProviders = computeProviders;
        record.validators = validators;
        record.dataProviderAmounts = dataProviderAmounts;
        record.computeProviderAmounts = computeProviderAmounts;
        record.validatorAmounts = validatorAmounts;
        record.protocolAmount = protocolAmount;
        record.isDistributed = true;
        
        allPaymentIds.push(jobId);
        totalPaymentsProcessed++;
        totalETHDistributed += totalAmount;
        
        emit PaymentReceived(jobId, tx.origin, totalAmount, true, address(0));
        emit PaymentDistributed(jobId, dataProviderTotal, computeProviderTotal, validatorTotal, protocolAmount);
    }

    /**
     * @dev Distribute ERC20 token payment for job
     * @param jobId Unique job identifier
     * @param tokenAddress ERC20 token contract address
     * @param amount Token amount to distribute
     * @param dataProviders Array of data provider addresses
     * @param computeProviders Array of compute provider addresses
     * @param validators Array of validator addresses
     */
    function distributeTokenPayment(
        bytes32 jobId,
        address tokenAddress,
        uint256 amount,
        address[] calldata dataProviders,
        address[] calldata computeProviders,
        address[] calldata validators
    ) external onlyProtocol validJobId(jobId) whenNotPaused nonReentrant {
        require(tokenAddress != address(0), "PaymentDistributor: Invalid token address");
        require(supportedTokens[tokenAddress], "PaymentDistributor: Token not supported");
        require(amount > 0, "PaymentDistributor: Invalid amount");
        require(dataProviders.length > 0, "PaymentDistributor: No data providers");
        require(computeProviders.length > 0, "PaymentDistributor: No compute providers");
        
        IERC20 token = IERC20(tokenAddress);
        
        // Transfer tokens from protocol contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate distribution amounts
        uint256 dataProviderTotal = (amount * feeStructure.dataProviderRate) / 10000;
        uint256 computeProviderTotal = (amount * feeStructure.computeProviderRate) / 10000;
        uint256 validatorTotal = (amount * feeStructure.validatorRate) / 10000;
        uint256 protocolAmount = (amount * feeStructure.protocolRate) / 10000;
        
        // Calculate individual amounts
        uint256[] memory dataProviderAmounts = new uint256[](dataProviders.length);
        uint256[] memory computeProviderAmounts = new uint256[](computeProviders.length);
        uint256[] memory validatorAmounts = new uint256[](validators.length);
        
        // Distribute evenly among data providers
        uint256 perDataProvider = dataProviderTotal / dataProviders.length;
        for (uint i = 0; i < dataProviders.length; i++) {
            dataProviderAmounts[i] = perDataProvider;
            pendingWithdrawals[dataProviders[i]].tokenAmounts[tokenAddress] += perDataProvider;
            pendingWithdrawals[dataProviders[i]].lastUpdated = block.timestamp;
            _addProviderIfNew(dataProviders[i]);
        }
        
        // Distribute evenly among compute providers
        uint256 perComputeProvider = computeProviderTotal / computeProviders.length;
        for (uint i = 0; i < computeProviders.length; i++) {
            computeProviderAmounts[i] = perComputeProvider;
            pendingWithdrawals[computeProviders[i]].tokenAmounts[tokenAddress] += perComputeProvider;
            pendingWithdrawals[computeProviders[i]].lastUpdated = block.timestamp;
            _addProviderIfNew(computeProviders[i]);
        }
        
        // Distribute evenly among validators
        if (validators.length > 0) {
            uint256 perValidator = validatorTotal / validators.length;
            for (uint i = 0; i < validators.length; i++) {
                validatorAmounts[i] = perValidator;
                pendingWithdrawals[validators[i]].tokenAmounts[tokenAddress] += perValidator;
                pendingWithdrawals[validators[i]].lastUpdated = block.timestamp;
                _addProviderIfNew(validators[i]);
            }
        }
        
        // Send protocol fee to treasury immediately
        if (protocolAmount > 0) {
            token.safeTransfer(protocolTreasury, protocolAmount);
        }
        
        // Create payment record
        PaymentRecord storage record = paymentRecords[jobId];
        record.jobId = jobId;
        record.consumer = tx.origin;
        record.totalAmount = amount;
        record.timestamp = block.timestamp;
        record.isETH = false;
        record.tokenAddress = tokenAddress;
        record.dataProviders = dataProviders;
        record.computeProviders = computeProviders;
        record.validators = validators;
        record.dataProviderAmounts = dataProviderAmounts;
        record.computeProviderAmounts = computeProviderAmounts;
        record.validatorAmounts = validatorAmounts;
        record.protocolAmount = protocolAmount;
        record.isDistributed = true;
        
        allPaymentIds.push(jobId);
        totalPaymentsProcessed++;
        totalTokenDistributed[tokenAddress] += amount;
        
        emit PaymentReceived(jobId, tx.origin, amount, false, tokenAddress);
        emit PaymentDistributed(jobId, dataProviderTotal, computeProviderTotal, validatorTotal, protocolAmount);
    }

    /**
     * @dev Withdraw pending ETH and token earnings
     * @param tokens Array of token addresses to withdraw (empty for ETH only)
     */
    function withdraw(address[] calldata tokens) external nonReentrant whenNotPaused {
        PendingWithdrawal storage pending = pendingWithdrawals[msg.sender];
        
        uint256 ethAmount = pending.ethAmount;
        uint256[] memory tokenAmounts = new uint256[](tokens.length);
        
        // Prepare withdrawal data
        for (uint i = 0; i < tokens.length; i++) {
            tokenAmounts[i] = pending.tokenAmounts[tokens[i]];
        }
        
        require(ethAmount > 0 || _hasTokenAmounts(tokenAmounts), "PaymentDistributor: No pending withdrawals");
        
        // Reset pending amounts
        if (ethAmount > 0) {
            pending.ethAmount = 0;
            payable(msg.sender).transfer(ethAmount);
        }
        
        // Transfer tokens
        for (uint i = 0; i < tokens.length; i++) {
            if (tokenAmounts[i] > 0) {
                pending.tokenAmounts[tokens[i]] = 0;
                IERC20(tokens[i]).safeTransfer(msg.sender, tokenAmounts[i]);
            }
        }
        
        pending.lastUpdated = block.timestamp;
        
        emit WithdrawalProcessed(msg.sender, ethAmount, tokens, tokenAmounts);
    }

    /**
     * @dev Get pending withdrawal amounts for a provider
     * @param provider Provider address
     * @param tokens Array of token addresses to check
     * @return ethAmount Pending ETH amount
     * @return tokenAmounts Array of pending token amounts
     */
    function getPendingWithdrawals(address provider, address[] calldata tokens) 
        external 
        view 
        returns (uint256 ethAmount, uint256[] memory tokenAmounts) 
    {
        PendingWithdrawal storage pending = pendingWithdrawals[provider];
        ethAmount = pending.ethAmount;
        
        tokenAmounts = new uint256[](tokens.length);
        for (uint i = 0; i < tokens.length; i++) {
            tokenAmounts[i] = pending.tokenAmounts[tokens[i]];
        }
        
        return (ethAmount, tokenAmounts);
    }

    /**
     * @dev Get payment record details
     * @param jobId Job identifier
     */
    function getPaymentRecord(bytes32 jobId) external view returns (
        bytes32 returnJobId,
        address consumer,
        uint256 totalAmount,
        uint256 timestamp,
        bool isETH,
        address tokenAddress,
        address[] memory dataProviders,
        address[] memory computeProviders,
        address[] memory validators,
        uint256[] memory dataProviderAmounts,
        uint256[] memory computeProviderAmounts,
        uint256[] memory validatorAmounts,
        uint256 protocolAmount,
        bool isDistributed
    ) {
        PaymentRecord storage record = paymentRecords[jobId];
        return (
            record.jobId,
            record.consumer,
            record.totalAmount,
            record.timestamp,
            record.isETH,
            record.tokenAddress,
            record.dataProviders,
            record.computeProviders,
            record.validators,
            record.dataProviderAmounts,
            record.computeProviderAmounts,
            record.validatorAmounts,
            record.protocolAmount,
            record.isDistributed
        );
    }

    /**
     * @dev Update fee structure (admin only)
     * @param _dataProviderRate New data provider rate (basis points)
     * @param _computeProviderRate New compute provider rate (basis points)
     * @param _validatorRate New validator rate (basis points)
     * @param _protocolRate New protocol rate (basis points)
     */
    function updateFeeStructure(
        uint256 _dataProviderRate,
        uint256 _computeProviderRate,
        uint256 _validatorRate,
        uint256 _protocolRate
    ) external onlyRole(ADMIN_ROLE) {
        require(_dataProviderRate + _computeProviderRate + _validatorRate + _protocolRate == 10000,
                "PaymentDistributor: Rates must sum to 100%");
        
        feeStructure.dataProviderRate = _dataProviderRate;
        feeStructure.computeProviderRate = _computeProviderRate;
        feeStructure.validatorRate = _validatorRate;
        feeStructure.protocolRate = _protocolRate;
        
        emit FeeStructureUpdated(_dataProviderRate, _computeProviderRate, _validatorRate, _protocolRate);
    }

    /**
     * @dev Update protocol treasury address
     * @param _newTreasury New treasury address
     */
    function updateTreasury(address _newTreasury) external onlyRole(ADMIN_ROLE) {
        require(_newTreasury != address(0), "PaymentDistributor: Invalid treasury address");
        
        address oldTreasury = protocolTreasury;
        protocolTreasury = _newTreasury;
        
        // Update treasury role
        _revokeRole(TREASURY_ROLE, oldTreasury);
        _grantRole(TREASURY_ROLE, _newTreasury);
        
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    /**
     * @dev Add or remove support for ERC20 token
     * @param token Token contract address
     * @param supported Whether token is supported
     */
    function setSupportedToken(address token, bool supported) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "PaymentDistributor: Invalid token address");
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /**
     * @dev Internal function to check if any token amounts > 0
     */
    function _hasTokenAmounts(uint256[] memory amounts) internal pure returns (bool) {
        for (uint i = 0; i < amounts.length; i++) {
            if (amounts[i] > 0) return true;
        }
        return false;
    }

    /**
     * @dev Internal function to add provider to allProviders if new
     */
    function _addProviderIfNew(address provider) internal {
        // Simple check - in production should use more efficient method
        for (uint i = 0; i < allProviders.length; i++) {
            if (allProviders[i] == provider) return;
        }
        allProviders.push(provider);
    }

    /**
     * @dev Get contract statistics
     * @return totalPayments Total number of payments processed
     * @return totalETH Total ETH distributed
     * @return totalProviders Total number of unique providers
     */
    function getStatistics() external view returns (
        uint256 totalPayments,
        uint256 totalETH,
        uint256 totalProviders
    ) {
        return (totalPaymentsProcessed, totalETHDistributed, allProviders.length);
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
     * @dev Emergency withdrawal for admin (only in extreme cases)
     */
    function emergencyWithdraw() external onlyRole(ADMIN_ROLE) whenPaused {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(protocolTreasury).transfer(balance);
        }
    }

    /**
     * @dev Receive ETH (fallback for emergencies)
     */
    receive() external payable {
        // Accept ETH but emit event for tracking
        emit PaymentReceived(bytes32(0), msg.sender, msg.value, true, address(0));
    }
}