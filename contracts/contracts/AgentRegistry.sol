// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentRegistry
 * @notice On-chain registry for AI Agent Cards with A2A protocol support
 * @dev Manages agent registration, discovery, transactions, and reputation system
 */
contract AgentRegistry {
    struct Skill {
        string id;
        string name;
        string description;
    }

    struct PaymentInfo {
        address tokenAddress;
        address receiverAddress;
        uint256 pricePerCall;
        string chain;
    }

    struct AgentCard {
        bytes32 agentId;
        string name;
        string description;
        string url;
        string version;
        string[] defaultInputModes;
        string[] defaultOutputModes;
        Skill[] skills;
        
        address owner;
        bool isActive;
        uint256 createdAt;
        
        uint256 totalRatings;
        uint256 ratingCount;
        
        PaymentInfo payment;
        
        string category;
        string imageUrl;
    }

    struct Transaction {
        bytes32 txId;
        bytes32 agentId;
        address caller;
        uint8 rating;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(bytes32 => AgentCard) public agentCards;
    mapping(bytes32 => Transaction) public transactions;
    mapping(bytes32 => bool) private _agentExists;

    bytes32[] public allAgentIds;
    mapping(string => bytes32[]) public agentsByCategory;
    bytes32[] public transactionIds;


    event AgentRegistered(
        bytes32 indexed agentId,
        string name,
        address indexed owner,
        string category
    );

    event AgentUpdated(
        bytes32 indexed agentId,
        address indexed owner
    );

    event AgentActivated(
        bytes32 indexed agentId,
        address indexed owner
    );

    event AgentDeactivated(
        bytes32 indexed agentId,
        address indexed owner
    );

    event TransactionRecorded(
        bytes32 indexed txId,
        bytes32 indexed agentId,
        address indexed caller,
        uint8 rating,
        uint256 amount
    );

    event RatingUpdated(
        bytes32 indexed agentId,
        uint256 newTotalRatings,
        uint256 newRatingCount,
        uint256 averageRating
    );

    modifier onlyAgentOwner(bytes32 agentId) {
        require(agentCards[agentId].owner == msg.sender, "AgentRegistry: not owner");
        _;
    }

    modifier agentExists(bytes32 agentId) {
        require(_agentExists[agentId], "AgentRegistry: agent does not exist");
        _;
    }

    /**
     * @notice Register a new agent card
     * @param agentId Unique identifier for the agent (bytes32)
     * @param name Agent name
     * @param description Agent description
     * @param url A2A endpoint URL
     * @param version Agent version
     * @param defaultInputModes Array of input MIME types
     * @param defaultOutputModes Array of output MIME types
     * @param skills Array of agent skills
     * @param payment Payment information for x402
     * @param category Agent category
     * @param imageUrl Agent image URL
     */
    function registerAgent(
        bytes32 agentId,
        string memory name,
        string memory description,
        string memory url,
        string memory version,
        string[] memory defaultInputModes,
        string[] memory defaultOutputModes,
        Skill[] memory skills,
        PaymentInfo memory payment,
        string memory category,
        string memory imageUrl
    ) external {
        require(!_agentExists[agentId], "AgentRegistry: agent already exists");
        require(bytes(name).length > 0, "AgentRegistry: name required");
        require(bytes(url).length > 0, "AgentRegistry: url required");
        require(payment.receiverAddress != address(0), "AgentRegistry: invalid receiver address");
        require(payment.pricePerCall > 0, "AgentRegistry: price must be greater than 0");

        AgentCard storage agent = agentCards[agentId];
        agent.agentId = agentId;
        agent.name = name;
        agent.description = description;
        agent.url = url;
        agent.version = version;
        agent.owner = msg.sender;
        agent.isActive = true;
        agent.createdAt = block.timestamp;
        agent.category = category;
        agent.payment = payment;
        agent.imageUrl = imageUrl;

        for (uint256 i = 0; i < defaultInputModes.length; i++) {
            agent.defaultInputModes.push(defaultInputModes[i]);
        }
        for (uint256 i = 0; i < defaultOutputModes.length; i++) {
            agent.defaultOutputModes.push(defaultOutputModes[i]);
        }
        for (uint256 i = 0; i < skills.length; i++) {
            agent.skills.push(skills[i]);
        }

        _agentExists[agentId] = true;
        allAgentIds.push(agentId);
        agentsByCategory[category].push(agentId);

        emit AgentRegistered(agentId, name, msg.sender, category);
    }

    /**
     * @notice Update agent information (only owner)
     * @param agentId Agent identifier
     * @param name New name (empty string to keep current)
     * @param description New description (empty string to keep current)
     * @param url New URL (empty string to keep current)
     * @param version New version (empty string to keep current)
     * @param payment New payment info (zero address to keep current)
     * @param imageUrl New image URL (empty string to keep current)
     */
    function updateAgent(
        bytes32 agentId,
        string memory name,
        string memory description,
        string memory url,
        string memory version,
        PaymentInfo memory payment,
        string memory imageUrl
    ) external onlyAgentOwner(agentId) agentExists(agentId) {
        AgentCard storage agent = agentCards[agentId];

        if (bytes(name).length > 0) {
            agent.name = name;
        }
        if (bytes(description).length > 0) {
            agent.description = description;
        }
        if (bytes(url).length > 0) {
            agent.url = url;
        }
        if (bytes(version).length > 0) {
            agent.version = version;
        }
        if (payment.receiverAddress != address(0)) {
            require(payment.pricePerCall > 0, "AgentRegistry: price must be greater than 0");
            agent.payment = payment;
        }
        if (bytes(imageUrl).length > 0) {
            agent.imageUrl = imageUrl;
        }

        emit AgentUpdated(agentId, msg.sender);
    }

    /**
     * @notice Deactivate an agent (only owner)
     * @param agentId Agent identifier
     */
    function deactivateAgent(bytes32 agentId) external onlyAgentOwner(agentId) agentExists(agentId) {
        agentCards[agentId].isActive = false;
        emit AgentDeactivated(agentId, msg.sender);
    }

    /**
     * @notice Activate an agent (only owner)
     * @param agentId Agent identifier
     */
    function activateAgent(bytes32 agentId) external onlyAgentOwner(agentId) agentExists(agentId) {
        agentCards[agentId].isActive = true;
        emit AgentActivated(agentId, msg.sender);
    }

    /**
     * @notice Record a transaction (usage history)
     * @param txId Unique transaction identifier
     * @param agentId Agent identifier
     * @param amount Payment amount
     */
    function recordTransaction(
        bytes32 txId,
        bytes32 agentId,
        uint256 amount
    ) external agentExists(agentId) {
        require(!_transactionExists(txId), "AgentRegistry: transaction already exists");

        Transaction memory txRecord = Transaction({
            txId: txId,
            agentId: agentId,
            caller: msg.sender,
            rating: 0, // Rating not provided yet
            amount: amount,
            timestamp: block.timestamp
        });

        transactions[txId] = txRecord;
        transactionIds.push(txId);

        emit TransactionRecorded(txId, agentId, msg.sender, 0, amount);
    }

    /**
     * @notice Update rating for an existing transaction
     * @param txId Transaction identifier
     * @param rating New rating (1-5)
     */
    function updateTransactionRating(
        bytes32 txId,
        uint8 rating
    ) external {
        require(rating >= 1 && rating <= 5, "AgentRegistry: rating must be 1-5");
        Transaction storage txRecord = transactions[txId];
        require(txRecord.caller == msg.sender, "AgentRegistry: only caller can update rating");
        require(txRecord.timestamp > 0, "AgentRegistry: transaction does not exist");

        bytes32 agentId = txRecord.agentId;
        uint8 oldRating = txRecord.rating;

        // Remove old rating if it was set
        if (oldRating > 0) {
            AgentCard storage agent = agentCards[agentId];
            agent.totalRatings = agent.totalRatings - oldRating;
            agent.ratingCount = agent.ratingCount - 1;
        }

        // Add new rating
        txRecord.rating = rating;
        _updateRating(agentId, rating);

        emit TransactionRecorded(txId, agentId, msg.sender, rating, txRecord.amount);
    }

    /**
     * @notice Get agent card by ID
     * @param agentId Agent identifier
     * @return AgentCard struct
     */
    function getAgentCard(bytes32 agentId) external view returns (AgentCard memory) {
        require(_agentExists[agentId], "AgentRegistry: agent does not exist");
        return agentCards[agentId];
    }

    /**
     * @notice Get all agent IDs
     * @return Array of agent IDs
     */
    function getAllAgentIds() external view returns (bytes32[] memory) {
        return allAgentIds;
    }

    /**
     * @notice Get agent IDs by category
     * @param category Category name
     * @return Array of agent IDs
     */
    function getAgentsByCategory(string memory category) external view returns (bytes32[] memory) {
        return agentsByCategory[category];
    }

    /**
     * @notice Get active agents by category
     * @param category Category name
     * @return Array of active agent IDs
     */
    function getActiveAgentsByCategory(string memory category) external view returns (bytes32[] memory) {
        bytes32[] memory categoryAgents = agentsByCategory[category];
        uint256 activeCount = 0;

        // Count active agents
        for (uint256 i = 0; i < categoryAgents.length; i++) {
            if (agentCards[categoryAgents[i]].isActive) {
                activeCount++;
            }
        }

        // Build result array
        bytes32[] memory activeAgents = new bytes32[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < categoryAgents.length; i++) {
            if (agentCards[categoryAgents[i]].isActive) {
                activeAgents[index] = categoryAgents[i];
                index++;
            }
        }

        return activeAgents;
    }

    /**
     * @notice Get transaction by ID
     * @param txId Transaction identifier
     * @return Transaction struct
     */
    function getTransaction(bytes32 txId) external view returns (Transaction memory) {
        require(transactions[txId].timestamp > 0, "AgentRegistry: transaction does not exist");
        return transactions[txId];
    }

    /**
     * @notice Get all transaction IDs
     * @return Array of transaction IDs
     */
    function getAllTransactionIds() external view returns (bytes32[] memory) {
        return transactionIds;
    }

    /**
     * @notice Get average rating for an agent
     * @param agentId Agent identifier
     * @return Average rating (scaled by 100, e.g., 450 = 4.50)
     */
    function getAverageRating(bytes32 agentId) external view returns (uint256) {
        AgentCard memory agent = agentCards[agentId];
        if (agent.ratingCount == 0) {
            return 0;
        }
        // Return rating * 100 for precision (e.g., 450 = 4.50)
        return (agent.totalRatings * 100) / agent.ratingCount;
    }

    /**
     * @notice Get total number of agents
     * @return Total count
     */
    function getTotalAgentCount() external view returns (uint256) {
        return allAgentIds.length;
    }

    /**
     * @notice Get total number of transactions
     * @return Total count
     */
    function getTotalTransactionCount() external view returns (uint256) {
        return transactionIds.length;
    }

    /**
     * @notice Update agent rating
     * @param agentId Agent identifier
     * @param rating New rating (1-5)
     */
    function _updateRating(bytes32 agentId, uint8 rating) internal {
        AgentCard storage agent = agentCards[agentId];
        agent.totalRatings = agent.totalRatings + rating;
        agent.ratingCount = agent.ratingCount + 1;

        uint256 averageRating = agent.ratingCount > 0 
            ? (agent.totalRatings * 100) / agent.ratingCount 
            : 0;

        emit RatingUpdated(agentId, agent.totalRatings, agent.ratingCount, averageRating);
    }

    /**
     * @notice Check if transaction exists
     * @param txId Transaction identifier
     * @return True if exists
     */
    function _transactionExists(bytes32 txId) internal view returns (bool) {
        return transactions[txId].timestamp > 0;
    }
}