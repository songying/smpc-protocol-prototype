// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DataRegistry
 * @dev Registry for managing data entries in the SMPC protocol
 * @notice This contract handles data registration, metadata management, and access control
 */
contract DataRegistry is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Data entry status enumeration
    enum DataStatus {
        Pending,        // Submitted but not verified
        Active,         // Verified and available
        Suspended,      // Temporarily unavailable
        Deactivated     // Permanently removed
    }
    
    // Data category enumeration
    enum DataCategory {
        Personal,       // Personal information
        Financial,      // Financial data
        Health,         // Health records
        Behavioral,     // User behavior data
        Commercial,     // Business data
        Other          // Other categories
    }
    
    // Data entry structure
    struct DataEntry {
        bytes32 dataHash;           // Unique hash of the data
        address provider;           // Data provider address
        string metadataURI;         // IPFS URI for metadata
        uint256 price;              // Price in wei
        DataStatus status;          // Current status
        DataCategory category;      // Data category
        uint256 timestamp;          // Registration timestamp
        uint256 lastUpdated;        // Last update timestamp
        string[] tags;              // Search tags
        bool isEncrypted;           // Whether data is encrypted
        uint256 accessCount;        // Number of times accessed
        uint256 dataSize;           // Data size in bytes
    }
    
    // Counters for tracking
    uint256 private _dataIdCounter;
    
    // Storage mappings
    mapping(bytes32 => DataEntry) public dataEntries;
    mapping(address => bytes32[]) public providerData;
    mapping(DataCategory => bytes32[]) public categorizedData;
    mapping(bytes32 => bool) public dataExists;
    
    // Statistics
    mapping(address => uint256) public providerCount;
    mapping(DataCategory => uint256) public categoryCount;
    uint256 public totalDataEntries;
    uint256 public totalActiveEntries;
    
    // Events
    event DataRegistered(
        bytes32 indexed dataHash,
        address indexed provider,
        DataCategory category,
        uint256 price,
        uint256 timestamp
    );
    
    event DataUpdated(
        bytes32 indexed dataHash,
        address indexed provider,
        uint256 newPrice,
        uint256 timestamp
    );
    
    event DataStatusChanged(
        bytes32 indexed dataHash,
        DataStatus oldStatus,
        DataStatus newStatus,
        address changedBy
    );
    
    event DataAccessed(
        bytes32 indexed dataHash,
        address indexed accessor,
        uint256 timestamp
    );
    
    event ProviderRoleGranted(address indexed provider, address indexed grantedBy);
    event ConsumerRoleGranted(address indexed consumer, address indexed grantedBy);
    event AuditorRoleGranted(address indexed auditor, address indexed grantedBy);
    
    // Modifiers
    modifier dataHashExists(bytes32 dataHash) {
        require(dataExists[dataHash], "DataRegistry: Data does not exist");
        _;
    }
    
    modifier onlyDataProvider(bytes32 dataHash) {
        require(
            dataEntries[dataHash].provider == msg.sender,
            "DataRegistry: Only data provider can perform this action"
        );
        _;
    }
    
    /**
     * @dev Constructor sets up roles and initial configuration
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(DATA_PROVIDER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CONSUMER_ROLE, ADMIN_ROLE);
    }
    
    /**
     * @dev Register new data entry
     * @param dataHash Unique hash of the data
     * @param metadataURI IPFS URI containing metadata
     * @param price Price in wei for accessing the data
     * @param category Data category
     * @param tags Array of search tags
     * @param isEncrypted Whether the data is encrypted
     * @param dataSize Size of the data in bytes
     */
    function registerData(
        bytes32 dataHash,
        string calldata metadataURI,
        uint256 price,
        DataCategory category,
        string[] calldata tags,
        bool isEncrypted,
        uint256 dataSize
    ) external onlyRole(DATA_PROVIDER_ROLE) whenNotPaused nonReentrant {
        require(dataHash != bytes32(0), "DataRegistry: Invalid data hash");
        require(!dataExists[dataHash], "DataRegistry: Data already registered");
        require(bytes(metadataURI).length > 0, "DataRegistry: Metadata URI required");
        require(price > 0, "DataRegistry: Price must be greater than zero");
        require(dataSize > 0, "DataRegistry: Data size must be greater than zero");
        
        // Create data entry
        DataEntry storage entry = dataEntries[dataHash];
        entry.dataHash = dataHash;
        entry.provider = msg.sender;
        entry.metadataURI = metadataURI;
        entry.price = price;
        entry.status = DataStatus.Pending;
        entry.category = category;
        entry.timestamp = block.timestamp;
        entry.lastUpdated = block.timestamp;
        entry.tags = tags;
        entry.isEncrypted = isEncrypted;
        entry.accessCount = 0;
        entry.dataSize = dataSize;
        
        // Update mappings and counters
        dataExists[dataHash] = true;
        providerData[msg.sender].push(dataHash);
        categorizedData[category].push(dataHash);
        
        // Update statistics
        providerCount[msg.sender]++;
        categoryCount[category]++;
        totalDataEntries++;
        _dataIdCounter++;
        
        emit DataRegistered(dataHash, msg.sender, category, price, block.timestamp);
    }
    
    /**
     * @dev Update data entry (price and metadata)
     * @param dataHash Hash of the data to update
     * @param newPrice New price in wei
     * @param newMetadataURI New metadata URI
     */
    function updateData(
        bytes32 dataHash,
        uint256 newPrice,
        string calldata newMetadataURI
    ) external dataHashExists(dataHash) onlyDataProvider(dataHash) whenNotPaused {
        require(newPrice > 0, "DataRegistry: Price must be greater than zero");
        require(bytes(newMetadataURI).length > 0, "DataRegistry: Metadata URI required");
        
        DataEntry storage entry = dataEntries[dataHash];
        entry.price = newPrice;
        entry.metadataURI = newMetadataURI;
        entry.lastUpdated = block.timestamp;
        
        emit DataUpdated(dataHash, msg.sender, newPrice, block.timestamp);
    }
    
    /**
     * @dev Change data status (admin or auditor only)
     * @param dataHash Hash of the data
     * @param newStatus New status to set
     */
    function changeDataStatus(
        bytes32 dataHash,
        DataStatus newStatus
    ) external dataHashExists(dataHash) {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(AUDITOR_ROLE, msg.sender),
            "DataRegistry: Insufficient permissions"
        );
        
        DataEntry storage entry = dataEntries[dataHash];
        DataStatus oldStatus = entry.status;
        entry.status = newStatus;
        entry.lastUpdated = block.timestamp;
        
        // Update active entries counter
        if (oldStatus == DataStatus.Active && newStatus != DataStatus.Active) {
            totalActiveEntries--;
        } else if (oldStatus != DataStatus.Active && newStatus == DataStatus.Active) {
            totalActiveEntries++;
        }
        
        emit DataStatusChanged(dataHash, oldStatus, newStatus, msg.sender);
    }
    
    /**
     * @dev Record data access (for analytics)
     * @param dataHash Hash of the accessed data
     */
    function recordDataAccess(bytes32 dataHash) 
        external 
        dataHashExists(dataHash) 
        onlyRole(CONSUMER_ROLE) 
        whenNotPaused 
    {
        require(
            dataEntries[dataHash].status == DataStatus.Active,
            "DataRegistry: Data not available"
        );
        
        dataEntries[dataHash].accessCount++;
        
        emit DataAccessed(dataHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get data entry details
     * @param dataHash Hash of the data
     * @return DataEntry struct
     */
    function getDataEntry(bytes32 dataHash) 
        external 
        view 
        dataHashExists(dataHash) 
        returns (DataEntry memory) 
    {
        return dataEntries[dataHash];
    }
    
    /**
     * @dev Get data entries by provider
     * @param provider Provider address
     * @return Array of data hashes
     */
    function getProviderData(address provider) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return providerData[provider];
    }
    
    /**
     * @dev Get data entries by category
     * @param category Data category
     * @return Array of data hashes
     */
    function getDataByCategory(DataCategory category) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return categorizedData[category];
    }
    
    /**
     * @dev Get active data entries by category
     * @param category Data category
     * @return Array of active data hashes
     */
    function getActiveDataByCategory(DataCategory category) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        bytes32[] memory categoryData = categorizedData[category];
        bytes32[] memory activeData = new bytes32[](categoryData.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < categoryData.length; i++) {
            if (dataEntries[categoryData[i]].status == DataStatus.Active) {
                activeData[activeCount] = categoryData[i];
                activeCount++;
            }
        }
        
        // Resize array to actual active count
        bytes32[] memory result = new bytes32[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeData[i];
        }
        
        return result;
    }
    
    /**
     * @dev Grant data provider role
     * @param provider Address to grant role to
     */
    function grantProviderRole(address provider) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        grantRole(DATA_PROVIDER_ROLE, provider);
        emit ProviderRoleGranted(provider, msg.sender);
    }
    
    /**
     * @dev Grant consumer role
     * @param consumer Address to grant role to
     */
    function grantConsumerRole(address consumer) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        grantRole(CONSUMER_ROLE, consumer);
        emit ConsumerRoleGranted(consumer, msg.sender);
    }
    
    /**
     * @dev Grant auditor role
     * @param auditor Address to grant role to
     */
    function grantAuditorRole(address auditor) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        grantRole(AUDITOR_ROLE, auditor);
        emit AuditorRoleGranted(auditor, msg.sender);
    }
    
    /**
     * @dev Pause contract (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Get contract statistics
     * @return totalData Total number of data entries
     * @return activeData Number of active data entries
     * @return totalProviders Number of unique providers
     */
    function getStatistics() 
        external 
        view 
        returns (
            uint256 totalData,
            uint256 activeData,
            uint256 totalProviders
        ) 
    {
        return (totalDataEntries, totalActiveEntries, _dataIdCounter);
    }
}