# @agent-marketplace/agent

UniAgent Agent Service - LangChain.jsを使用したAIエージェント

## 概要

LangChain.jsのReActエージェントを使用して、ユーザーのタスクを理解し、マーケットプレイス上のエージェントを発見・実行するサービスです。

## 機能

1. **discover_agents**: MCPサーバー経由でブロックチェーン上のエージェントを検索
2. **execute_agent**: x402決済付きで外部エージェントを実行

## アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│  Agent Service  │────▶│   MCP Server    │
│   /api/agent    │     │   (Express)     │     │   (fastMCP)     │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Claude API    │     │  Base Sepolia   │
                        │  (LangChain)    │     │  (AgentRegistry)│
                        └─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ External Agents │
                        │   (x402決済)    │
                        └─────────────────┘
```

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start
```

## 環境変数

| 変数名               | 説明                           | 必須 |
| -------------------- | ------------------------------ | ---- |
| ANTHROPIC_API_KEY    | Claude API Key                 | ✅   |
| MCP_SERVER_URL       | MCPサーバーのURL               | ✅   |
| PRIVY_APP_ID         | Privy App ID                   | ✅   |
| PRIVY_APP_SECRET     | Privy App Secret               | ✅   |
| RPC_URL              | Base Sepolia RPC URL           | ✅   |
| USDC_ADDRESS         | USDC Contract Address          | ✅   |
| X402_FACILITATOR_URL | x402 Facilitator URL           | -    |
| AGENT_PORT           | サーバーポート (default: 3002) | -    |

## API

### POST /api/agent

エージェントを実行します。

**Request:**

```json
{
  "message": "パリ3日間の旅行プランを作成して",
  "walletId": "wallet_xxx",
  "maxBudget": 5.0
}
```

**Response:**

```json
{
  "success": true,
  "message": "旅行プランを作成しました...",
  "executionLog": [
    {
      "step": 1,
      "type": "llm",
      "action": "Request received",
      "timestamp": "2025-01-01T00:00:00.000Z"
    }
  ],
  "totalCost": 0.04
}
```

### POST /api/agent/stream

SSEでエージェントの実行状況をストリーミングします。

## 実行フロー

1. リクエスト受信 (`{message, walletId, maxBudget}`)
2. LLM: タスクを理解し、必要なエージェントの種類を判断
3. LLM → discover_agents: MCPサーバー経由でエージェント検索
4. ロジック: agent.jsonを取得してエンドポイント情報を取得
5. LLM: 価格・評価を考慮して最適なエージェントを選択
6. LLM → execute_agent: x402決済付きでエージェント実行
7. ロジック: HTTP 402受信時にPrivy経由でEIP-3009署名
8. ロジック: X-PAYMENTヘッダー付きで再送
9. LLM: 結果を統合してユーザーに返却

## ログ出力

エージェントの実行中は以下のようなログが出力されます:

```
12:00:00.000 ℹ [AGENT] Received request
12:00:00.100 [Step 1] [LLM] Starting ReAct agent loop
12:00:01.000 ℹ [MCP] Calling MCP discover_agents
12:00:01.500 ✓ [MCP] Found 3 agents
12:00:02.000 [Step 2] [MCP] Tool call: discover_agents
12:00:03.000 [Step 3] [MCP] Tool call: execute_agent
12:00:03.500 ℹ [LOGIC] Fetching agent.json
12:00:04.000 ℹ [PAYMENT] Received HTTP 402 - Payment Required
12:00:04.500 ℹ [PAYMENT] Creating EIP-3009 signature via Privy
12:00:05.000 ✓ [PAYMENT] Payment successful
12:00:06.000 [Step 4] [LLM] Agent execution completed
12:00:06.000 ✓ [AGENT] Total cost: 0.01 USDC
```
