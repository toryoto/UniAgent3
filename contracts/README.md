# Contracts Package

スマートコントラクトの開発・デプロイパッケージ。

## デプロイ済みコントラクト

### AgentRegistry (Sepolia)
- **Address**: `0x814e90Cc586Ad01515C521C7e7bCF5560049550F`
- **Network**: Sepolia Testnet
- **Etherscan**: https://sepolia.etherscan.io/address/0x814e90Cc586Ad01515C521C7e7bCF5560049550F

## 構造

```
packages/contracts/
├── contracts/      # Solidityコントラクト
├── scripts/        # デプロイスクリプト
├── test/          # テストファイル
├── hardhat.config.ts
└── package.json
```

## セットアップ

### 環境変数の設定

このディレクトリに`.env`ファイルを作成：

```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## コマンド

### 基本コマンド

```bash
# コンパイル
npm run compile

# テスト実行
npm run test

# テストカバレッジ
npx hardhat coverage

# ガス使用量レポート
REPORT_GAS=true npm run test

# デプロイ（Sepolia）
npm run deploy:sepolia
```

### サンプルエージェント登録

```bash
# デプロイ後、サンプルエージェントを登録
AGENT_REGISTRY_ADDRESS=0x... npx hardhat run scripts/register-sample-agents.ts --network sepolia

# デプロイ検証
AGENT_REGISTRY_ADDRESS=0x... npx hardhat run scripts/verify-deployment.ts --network sepolia
```

### コントラクト検証

```bash
# Etherscanでソースコードを検証
npx hardhat verify --network sepolia <contract-address>
```

## 環境変数

環境変数はルートディレクトリの`.env`ファイルから読み込まれます。