## 目的
- PoCで使用するAgentCardやSmartContractの構造定義を行う

## AgentCardのjson形式
```json
{
  "agentId": "0x1234567890abcdef...",
  
  "name": "FlightFinderPro",
  "description": "最安値フライト検索エージェント",
  "url": "https://flight-agent.example.com",
  "version": "1.0.0",
  
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["application/json"],
  
  "skills": [
    {
      "id": "search-flights",
      "name": "Flight Search",
      "description": "2地点間のフライトを検索"
    },
    {
      "id": "compare-prices",
      "name": "Price Comparison",
      "description": "複数航空会社の価格比較"
    }
  ],
  
  "capabilities": {
    "streaming": false,
    "multiModal": false,
    "extensions": [
      {
        "uri": "urn:a2a-blockchain-x402:extensions:x402:v1",
        "name": "x402-payment",
        "payment": {
          "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          "network": "base",
          "amount": "0.01",
          "payTo": "0xABCDEF1234567890..."
        }
      }
    ]
  },
  
  "owner": "0x9876543210fedcba...",
  "isActive": true,
  "createdAt": 1735286400,
  
  "category": "travel",
  
  "rating": {
    "average": 4.50,
    "totalRatings": 45,
    "ratingCount": 10
  }
}
```

## Solidityデータ構造
```solidity
struct Skill {
    string id;
    string name;
    string description;
}

struct PaymentInfo {
    address tokenAddress;      // USDC contract address
    address receiverAddress;   // エージェントの受取アドレス
    uint256 pricePerCall;      // 1回あたりの価格（USDC、6 decimals）
    string chain;              // "base" or "arbitrum"
}

struct AgentCard {
    // === A2A標準フィールド ===
    bytes32 agentId;
    string name;
    string description;
    string url;
    string version;
    Skill[] skills;
    
    // === ブロックチェーン拡張 ===
    address owner;
    bool isActive;
    uint256 createdAt;
    
    // === シンプル評価システム ===
    uint256 totalRatings;      // 評価の合計（例: 1+5+4 = 10）
    uint256 ratingCount;       // 評価回数（例: 3回）
    // 平均評価 = totalRatings / ratingCount
    
    // === x402決済情報 ===
    PaymentInfo payment;
    
    // === カテゴリ ===
    string category;
}

struct Transaction {
    bytes32 txId;
    bytes32 agentId;
    address caller;
    uint8 rating;              // 1-5の評価
    uint256 amount;            // 支払額
    uint256 timestamp;
}

// ストレージ
mapping(bytes32 => AgentCard) public agentCards;
mapping(bytes32 => Transaction) public transactions;

bytes32[] public allAgentIds;
mapping(string => bytes32[]) public agentsByCategory;
bytes32[] public transactionIds;

// イベント
event AgentRegistered(bytes32 indexed agentId, string name, address owner);
event TransactionRecorded(bytes32 indexed txId, bytes32 indexed agentId, uint8 rating);
```