# Vercelデプロイ手順

このモノレポの`web`ディレクトリと`agent`ディレクトリをそれぞれVercelにデプロイする手順です。

## 前提条件

- Vercelアカウントを持っていること
- GitHubリポジトリにコードがプッシュされていること
- 必要な環境変数が設定されていること

## 1. webディレクトリのデプロイ

### 手順

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. 「Add New Project」をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定で以下を指定：
   - **Framework Preset**: Next.js（自動検出される場合があります）
   - **Root Directory**: `web` を選択
   - **Build Command**: `npm run build`（自動設定される場合があります）
   - **Output Directory**: `.next`（自動設定される場合があります）
   - **Install Command**: `npm install`（自動設定される場合があります）

5. 環境変数を設定（必要に応じて）：
   - `NEXT_PUBLIC_PRIVY_APP_ID`
   - `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_USDC_ADDRESS`
   - `NEXT_PUBLIC_CHAIN`
   - `NEXT_PUBLIC_RPC_URL`
   - `RPC_URL`
   - `CLAUDE_API_KEY`
   - その他必要な環境変数

6. 「Deploy」をクリック

### 注意事項

- モノレポの場合、Vercelは自動的にルートディレクトリの`package.json`を検出しますが、`web`ディレクトリを指定することで、正しいビルドが実行されます
- `web/vercel.json`に設定が含まれていますが、Vercelダッシュボードでの`Root Directory`設定が優先されます

## 2. agentディレクトリのデプロイ

### 手順

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. 「Add New Project」をクリック
3. 同じGitHubリポジトリを選択（または新しいプロジェクトとして追加）
4. プロジェクト設定で以下を指定：
   - **Framework Preset**: Other
   - **Root Directory**: `agent` を選択
   - **Build Command**: `npm run build`
   - **Output Directory**: （空欄のまま）
   - **Install Command**: `npm install`

5. 環境変数を設定（必要に応じて）：
   - `AGENT_PORT`（通常は設定不要、Vercelが自動設定）
   - `CLAUDE_API_KEY`
   - `PRIVY_APP_ID`
   - `PRIVY_APP_SECRET`
   - その他必要な環境変数

6. 「Deploy」をクリック

### 注意事項

- `agent`ディレクトリはExpressサーバーをVercelのServerless Functionsとして実行します
- `agent/api/index.ts`がVercelのServerless Functionエントリーポイントです
- `agent/vercel.json`にルーティング設定が含まれています
- すべてのリクエストは`/api/index.ts`にルーティングされます

## 環境変数の設定

### webディレクトリ用

Vercelダッシュボードの「Settings」→「Environment Variables」で以下を設定：

```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_CHAIN=base-sepolia
NEXT_PUBLIC_RPC_URL=https://...
RPC_URL=https://...
CLAUDE_API_KEY=your_claude_api_key
```

### agentディレクトリ用

```
CLAUDE_API_KEY=your_claude_api_key
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
```

## デプロイ後の確認

### webディレクトリ

- デプロイされたURLにアクセスして、アプリケーションが正常に動作することを確認
- ブラウザのコンソールでエラーがないか確認

### agentディレクトリ

- `https://your-agent-project.vercel.app/health` にアクセスして、`{"status":"ok","service":"agent"}`が返ることを確認
- `https://your-agent-project.vercel.app/api/agent` にPOSTリクエストを送信して、エージェントが正常に動作することを確認

## トラブルシューティング

### ビルドエラー

- モノレポの場合、ルートディレクトリの`package.json`が正しく認識されているか確認
- `Root Directory`が正しく設定されているか確認
- 環境変数が正しく設定されているか確認

### ランタイムエラー

- Vercelのログを確認（「Deployments」→「View Function Logs」）
- 環境変数が正しく設定されているか確認
- 依存関係が正しくインストールされているか確認

## 参考リンク

- [Vercel Monorepo Documentation](https://vercel.com/docs/monorepos)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)

