# MCP Server

A2A Discovery MCP Server - Claude API MCP Connector用のエージェント検索MCPサーバー

## 概要

ブロックチェーン上のAgentRegistryからエージェントを検索し、各エージェントの`.well-known/agent.json`から取得したA2Aエンドポイント情報を併せて返すMCPサーバーです。

## セットアップ

```bash
# 依存関係のインストール（ルートから）
npm install

# または、MCPディレクトリ内で
cd mcp
npm install
```

## 環境変数

以下の環境変数を設定してください：

- `AGENT_REGISTRY_ADDRESS`: AgentRegistryコントラクトのアドレス
- `RPC_URL`: ブロックチェーンRPCエンドポイント
- `MCP_PORT`: MCPサーバーのポート番号（デフォルト: 3001）

## 実行

```bash
# 開発モード
npm run dev --workspace=mcp

# または、MCPディレクトリ内で
npm run dev

# 本番モード
npm run start --workspace=mcp
```

## エンドポイント

- SSE: `http://localhost:3001/sse`
- HTTP: `http://localhost:3001/mcp`

## ツール

### discover_agents

ブロックチェーン上のAgentRegistryからエージェントを検索します。

**パラメータ:**
- `category` (optional): 検索するカテゴリ
- `skillName` (optional): 検索するスキル名（部分一致）
- `maxPrice` (optional): 最大価格（USDC）
- `minRating` (optional): 最小評価（0-5）

**返却値:**
- `agents`: 検索されたエージェントの配列
- `total`: 検索結果の総数
- `source`: データソース（'on-chain'）

