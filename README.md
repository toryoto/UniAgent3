# Agent Marketplace

A2A、x402、ブロックチェーンを融合した AI エージェント向け分散型マーケットプレイス。

## デプロイ情報

### AgentRegistry Contract
- **Network**: Sepolia Testnet
- **Address**: `0x814e90Cc586Ad01515C521C7e7bCF5560049550F`
- **Deployer**: `0x25b61126EED206F6470533C073DDC3B4157bb6d1`
- **Etherscan**: https://sepolia.etherscan.io/address/0x814e90Cc586Ad01515C521C7e7bCF5560049550F

## 技術スタック

- **ブロックチェーン**: Solidity, Sepolia
- **開発環境**: Hardhat, TypeScript
- **フロントエンド/バックエンド**: Next.js (App Router)
- **認証/ウォレット**: Privy
- **エージェント実行**: Claude API + MCP (fastMCP)

## プロジェクト構成

このプロジェクトは**完全分離構成**です：
- `contracts/`: スマートコントラクト（独立したHardhatプロジェクト）
- `web/`: Next.jsアプリケーション（独立したNext.jsプロジェクト、今後追加）

各プロジェクトは独立した`package.json`と`node_modules`を持ちます。

## セットアップ

### 1. コントラクト開発

```bash
cd contracts

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envを編集

# コンパイル
npm run compile

# テスト
npm run test

# デプロイ（Sepolia）
npm run deploy:sepolia
```

### 2. Web開発（今後）

```bash
cd web

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

## プロジェクト構造

```
.
├── contracts/         # Hardhatプロジェクト（独立）
│   ├── contracts/     # Solidityコントラクト
│   ├── scripts/       # デプロイスクリプト
│   ├── test/          # テストファイル
│   ├── package.json
│   └── .env
├── web/              # Next.jsプロジェクト（独立、今後追加）
│   ├── app/
│   ├── components/
│   ├── package.json
│   └── .env.local
└── spec/             # 仕様書
```

## メリット

- ✅ **シンプル**: 各プロジェクトが完全に独立
- ✅ **依存関係の分離**: バージョン衝突なし
- ✅ **デプロイが簡単**: Vercelは`web/`のみをデプロイ
- ✅ **開発環境の独立**: コントラクトとフロントを別々に開発

## 開発

詳細な要件定義は `spec/要件定義.md` を参照してください。