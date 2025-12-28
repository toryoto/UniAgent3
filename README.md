# Agent Marketplace

A2A、x402、ブロックチェーンを融合した AI エージェント向け分散型マーケットプレイス。

## デプロイ情報

### AgentRegistry Contract
- **Network**: Sepolia Testnet
- **Address**: `0x1a4Ec58FE22aFe2624eaE8B5085aeBf85BCEB4e3`
- **Deployer**: `0x25b61126EED206F6470533C073DDC3B4157bb6d1`
- **Etherscan**: https://sepolia.etherscan.io/address/0x1a4Ec58FE22aFe2624eaE8B5085aeBf85BCEB4e3

### Registered Sample Agents (with images)

#### 1. FlightFinderPro
- **Agent ID**: `0x0bddd164b1ba44c2b7bd2960cce576de2de93bd1da0b5621d6b8ffcffa91b75e`
- **Category**: travel
- **Price**: 0.01 USDC per call
- **Description**: 最安値フライト検索エージェント
- **Image**: Blue placeholder

#### 2. HotelBookerPro
- **Agent ID**: `0x70fc477d5b587eed5078b44c890bae89e6497d5b1b9e115074eddbb3eb46dd0e`
- **Category**: travel
- **Price**: 0.015 USDC per call
- **Description**: ホテル予約エージェント
- **Image**: Red placeholder

#### 3. TourismGuide
- **Agent ID**: `0xc1de1b2fcec91001afacbf4acc007ff0b96e84c2f9c7ca785cba05102234b0fc`
- **Category**: travel
- **Price**: 0.02 USDC per call
- **Description**: 観光ガイドエージェント
- **Image**: Green placeholder

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