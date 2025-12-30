# Dummy AI Agent + x402決済 設計書

## 概要

PoC用に、x402決済を実装した3つのDummy Travel AI Agentを構築する。エージェント機能はモック（事前定義された値をランダム返却）だが、x402決済フローとPrivy Delegate Walletによる自動署名は完全実装する。

**実装方式**: Next.js App Router（API Routes）で一元管理

---

## システム構成

```
┌─────────────────┐
│   ユーザー      │
└────────┬────────┘
         │ ① Privy認証 + Delegate Wallet承認（初回のみ）
         ↓
┌─────────────────┐
│   Web UI        │ フロントエンド
│   (Next.js)     │
└────────┬────────┘
         │ ② チャット入力
         ↓
┌─────────────────┐
│   Claude API    │ エージェント本体
└────────┬────────┘
         │ ③ MCP Tools呼び出し
         ↓
┌─────────────────┐
│   MCP Host      │ バックエンド（Next.js API）
│                 │
│ ・discover_agents
│ ・execute_agent │ ← Privy Delegate Wallet署名
│ ・record_tx     │
└────────┬────────┘
         │ ④ x402決済付きリクエスト
         ↓
┌─────────────────────────────────┐
│   Next.js API Routes            │ 同一Next.jsアプリ内
│                                 │
│  /api/agents/flight             │
│  /api/agents/hotel              │
│  /api/agents/tourism            │
│                                 │
│  /api/agents/[agent]/.well-known│
│  /api/agents/[agent]/openapi    │
│                                 │
│  ← x402検証 + モック返却        │
│  ← 1リクエスト=1実行（ステートレス）
└─────────────────────────────────┘
```

### 実行モデル

- **Next.js API Routes**: 各リクエストごとにRoute Handlerが実行
- **完全ステートレス**: メモリ内状態を保持しない
- **x402との相性**: 完璧（各リクエストが独立）
- **一元管理**: 全てのエージェントが同一Next.jsアプリ内で動作

---

## Privy Delegate Wallet統合

### 仕組み

**初回セットアップ**（ユーザー同意が必要）:

```typescript
// フロントエンド
await privy.delegateWallet({
  address: user.wallet.address,
  chainType: 'ethereum',
});
```

**以降の自動署名**（ユーザー介入なし）:

```typescript
// MCP Host（サーバー）
const signature = await privy.delegatedActions.signTypedData({
  address: userWalletAddress,
  message: eip3009Message,
  domain: EIP3009_DOMAIN,
  types: EIP3009_TYPES,
});
```

### UXフロー

```
1. 初回ログイン後、ウォレット画面で「自動決済を有効化」
   ↓
2. Privyモーダル表示「このアプリの自動署名を許可しますか？」
   ↓
3. ユーザーが「許可」
   ↓
4. 完了！以降は全て自動
```

---

## x402 v2決済フロー

### 1. 初回リクエスト（決済なし）

```http
POST /api/agents/flight
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": { "origin": "NRT", "destination": "CDG", "date": "2025-06-15" }
}
```

### 2. HTTP 402レスポンス（x402 v2）

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "version": "2",
  "paymentRequired": true,
  "amount": "10000",  // 0.01 USDC (6 decimals)
  "receiver": "0x...",
  "tokenAddress": "0x7F594ABa4E1B6e137606a8fBAb5387B90C8DEEa9",
  "network": "eip155:11155111"  // CAIP-2 identifier
}
```

### 3. MCP Hostが自動決済

```typescript
// EIP-3009署名作成（Privy Delegate Wallet）
const signature = await privy.delegatedActions.signTypedData({...});

// X-PAYMENTヘッダー構築（x402 v2）
const paymentHeader = Buffer.from(JSON.stringify({
  version: '2',
  from: userAddress,
  to: receiverAddress,
  value: "10000",
  validAfter: 0,
  validBefore: now + 3600,
  nonce: randomNonce,
  signature,
  v, r, s,
  network: 'eip155:11155111',
})).toString('base64');
```

### 4. 決済付き再送

```http
POST /api/agents/flight
Content-Type: application/json
X-PAYMENT: <base64 encoded payment>

{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": { "origin": "NRT", "destination": "CDG", "date": "2025-06-15" }
}
```

### 5. 成功レスポンス

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-PAYMENT-RESPONSE: <base64 encoded response>

{
  "jsonrpc": "2.0",
  "result": {
    "flights": [{
      "carrier": "Air France",
      "flightNo": "AF275",
      "price": 85000,
      "departure": {...},
      "arrival": {...}
    }]
  }
}
```

---

## Dummy AI Agent仕様

### エージェント一覧

| Agent           | ID         | Price      | API Route             |
| --------------- | ---------- | ---------- | --------------------- |
| FlightFinderPro | 0x0bddd... | 0.01 USDC  | `/api/agents/flight`  |
| HotelBookerPro  | 0x70fc4... | 0.015 USDC | `/api/agents/hotel`   |
| TourismGuide    | 0xc1de1... | 0.02 USDC  | `/api/agents/tourism` |

### ディレクトリ構造

```
agent-marketplace/
├── web/                              # Next.js アプリ
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── agents/
│   │   │   │   │   ├── flight/
│   │   │   │   │   │   ├── route.ts              # POST /api/agents/flight
│   │   │   │   │   │   ├── .well-known/
│   │   │   │   │   │   │   └── agent.json/
│   │   │   │   │   │   │       └── route.ts      # GET /.well-known/agent.json
│   │   │   │   │   │   └── openapi.json/
│   │   │   │   │   │       └── route.ts          # GET /openapi.json
│   │   │   │   │   │
│   │   │   │   │   ├── hotel/
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   ├── .well-known/agent.json/route.ts
│   │   │   │   │   │   └── openapi.json/route.ts
│   │   │   │   │   │
│   │   │   │   │   └── tourism/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       ├── .well-known/agent.json/route.ts
│   │   │   │   │       └── openapi.json/route.ts
│   │   │   │   │
│   │   │   │   ├── chat/route.ts
│   │   │   │   └── discovery/agents/route.ts
│   │   │   │
│   │   │   └── ...
│   │   │
│   │   └── lib/
│   │       ├── agents/               # エージェント実装
│   │       │   ├── base-agent.ts     # BaseAgentクラス
│   │       │   ├── flight/
│   │       │   │   ├── agent.ts     # FlightAgentクラス
│   │       │   │   ├── mock-data.ts
│   │       │   │   └── specs.ts     # agent.json, OpenAPI定義
│   │       │   ├── hotel/
│   │       │   │   ├── agent.ts
│   │       │   │   ├── mock-data.ts
│   │       │   │   └── specs.ts
│   │       │   └── tourism/
│   │       │       ├── agent.ts
│   │       │       ├── mock-data.ts
│   │       │       └── specs.ts
│   │       │
│   │       └── x402/                 # x402 v2共通ロジック
│   │           ├── verify.ts
│   │           ├── types.ts
│   │           └── constants.ts
│   │
│   └── package.json
│
├── packages/
│   └── shared/                # 共通ライブラリ（オプション）
│       └── src/
│           ├── x402/
│           └── base-agent.ts
│
├── mcp/                              # ユーザーエージェント
├── contracts/
└── package.json                      # ルートworkspace
```

### デプロイ先

- **単一Next.jsアプリ**: `https://your-domain.vercel.app`
- 全てのエージェントが同一ドメインで動作

### agent.json例

```json
{
  "agent_id": "0x0bddd164b1ba44c2b7bd2960cce576de2de93bd1da0b5621d6b8ffcffa91b75e",
  "endpoints": [
    {
      "url": "https://your-domain.vercel.app/api/agents/flight",
      "spec": "https://your-domain.vercel.app/api/agents/flight/openapi.json"
    }
  ]
}
```

### モックデータ例

```typescript
// web/src/lib/agents/flight/mock-data.ts
export const MOCK_FLIGHTS = [
  {
    carrier: 'Air France',
    flightNo: 'AF275',
    price: 85000,
    currency: 'JPY',
    departure: { airport: 'NRT', time: '10:30', date: '2025-06-15' },
    arrival: { airport: 'CDG', time: '15:45', date: '2025-06-15' },
  },
  // ... 2-3個のバリエーション
];

export function selectFlight(params: { destination?: string }) {
  // パラメータに基づいて選択（簡易ロジック）
  if (params.destination?.includes('Paris')) {
    return MOCK_FLIGHTS[0]; // Air France優先
  }
  return MOCK_FLIGHTS[Math.floor(Math.random() * MOCK_FLIGHTS.length)];
}
```

---

## Next.js API Route実装例

### Flight Agent Route Handler

```typescript
// web/src/app/api/agents/flight/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { FlightAgent } from '@/lib/agents/flight/agent';

const agent = new FlightAgent();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paymentHeader = req.headers.get('x-payment');

    // BaseAgentのhandleRequestを呼び出し
    const response = await agent.handleRequest({
      body,
      headers: { 'x-payment': paymentHeader || undefined },
    } as any);

    const nextResponse = NextResponse.json(response.body, {
      status: response.status,
    });

    if (response.headers?.['X-PAYMENT-RESPONSE']) {
      nextResponse.headers.set('X-PAYMENT-RESPONSE', response.headers['X-PAYMENT-RESPONSE']);
    }

    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal Server Error',
        },
      },
      { status: 500 }
    );
  }
}
```

### Discovery Endpoint

```typescript
// web/src/app/api/agents/flight/.well-known/agent.json/route.ts
import { NextResponse } from 'next/server';
import { getAgentJson } from '@/lib/agents/flight/specs';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return NextResponse.json(getAgentJson(baseUrl));
}
```

### OpenAPI Endpoint

```typescript
// web/src/app/api/agents/flight/openapi.json/route.ts
import { NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/agents/flight/specs';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return NextResponse.json(getOpenApiSpec(baseUrl));
}
```

---

## 共通ロジック

### 1. EIP-3009署名検証（x402 v2対応）

```typescript
// web/src/lib/x402/verify.ts

export async function verifyX402Payment(
  paymentHeaderBase64: string,
  expectedReceiver: string,
  expectedAmount: string
): Promise<{ success: boolean; signer?: string; error?: string }> {
  // 1. Base64デコード
  const payment = JSON.parse(Buffer.from(paymentHeaderBase64, 'base64').toString());

  // 2. バージョンチェック（v2）
  if (payment.version !== '2') {
    return { success: false, error: `Unsupported x402 version: ${payment.version}` };
  }

  // 3. ネットワークチェック（CAIP-2）
  if (payment.network && payment.network !== SEPOLIA_NETWORK_ID) {
    return {
      success: false,
      error: `Invalid network: expected ${SEPOLIA_NETWORK_ID}, got ${payment.network}`,
    };
  }

  // 4. 基本検証（金額、受取者、有効期限）
  if (payment.to !== expectedReceiver || payment.value !== expectedAmount) {
    return { success: false, error: 'Invalid payment params' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < payment.validAfter || now > payment.validBefore) {
    return { success: false, error: 'Payment expired or not yet valid' };
  }

  // 5. EIP-3009署名検証
  const recoveredAddress = ethers.verifyTypedData(
    EIP3009_DOMAIN,
    EIP3009_TYPES,
    {
      from: payment.from,
      to: payment.to,
      value: ethers.parseUnits(payment.value, 6),
      validAfter: payment.validAfter,
      validBefore: payment.validBefore,
      nonce: payment.nonce,
    },
    payment.signature
  );

  if (recoveredAddress.toLowerCase() !== payment.from.toLowerCase()) {
    return { success: false, error: 'Invalid signature' };
  }

  // PoC: nonce重複チェックはスキップ
  // 本番環境では、nonceをデータベース（Vercel KV等）に記録して重複使用を防止

  return { success: true, signer: recoveredAddress };
}
```

**PoC制約**:

- ✅ EIP-3009署名検証: 完全実装
- ✅ 金額・受取者・有効期限チェック: 完全実装
- ✅ x402 v2対応（CAIP-2 network ID）: 完全実装
- ❌ nonce重複チェック: スキップ（署名検証のみ）
- ❌ 実際のUSDC transferWithAuthorization実行: スキップ（モックtxHash）

### 2. ベースエージェントクラス

```typescript
// web/src/lib/agents/base-agent.ts
import type { NextRequest } from 'next/server';
import { verifyX402Payment, executePayment } from '@/lib/x402/verify';
import { USDC_SEPOLIA_ADDRESS, SEPOLIA_NETWORK_ID } from '@/lib/x402/constants';
import type { X402PaymentInfo, X402PaymentResponse } from '@/lib/x402/types';

export abstract class BaseAgent {
  abstract agentId: string;
  abstract name: string;
  abstract pricePerCall: string; // USDC 6 decimals (e.g., "10000" = 0.01 USDC)
  abstract receiverAddress: string;

  protected abstract generateMockResponse(params: any): any;

  async handleRequest(req: { body: any; headers: { 'x-payment'?: string } }): Promise<{
    status: number;
    body: any;
    headers?: Record<string, string>;
  }> {
    const body = req.body;

    // JSON-RPC 2.0 検証
    if (body.jsonrpc !== '2.0' || body.method !== 'message/send') {
      return {
        status: 400,
        body: {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: Expected JSON-RPC 2.0 with method "message/send"',
          },
        },
      };
    }

    // x402 決済チェック
    const paymentHeader = req.headers['x-payment'];
    if (!paymentHeader) {
      return this.requirePayment();
    }

    // 署名検証
    const verification = await verifyX402Payment(
      paymentHeader,
      this.receiverAddress,
      this.pricePerCall
    );

    if (!verification.success) {
      return {
        status: 403,
        body: {
          jsonrpc: '2.0',
          error: {
            code: 403,
            message: `Payment verification failed: ${verification.error}`,
          },
        },
      };
    }

    // 決済実行（PoC: モック）
    const paymentResult = await executePayment(
      JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'))
    );

    if (!paymentResult.success) {
      return {
        status: 500,
        body: {
          jsonrpc: '2.0',
          error: {
            code: 500,
            message: 'Payment execution failed',
          },
        },
      };
    }

    // モックレスポンス生成
    const params = body.params || {};
    const result = this.generateMockResponse(params);

    // レスポンス返却（X-PAYMENT-RESPONSE付き）
    const paymentResponse: X402PaymentResponse = {
      version: '2',
      txHash: paymentResult.txHash || null,
      amount: this.pricePerCall,
      timestamp: Math.floor(Date.now() / 1000),
      network: SEPOLIA_NETWORK_ID,
    };

    return {
      status: 200,
      body: {
        jsonrpc: '2.0',
        id: body.id,
        result,
      },
      headers: {
        'X-PAYMENT-RESPONSE': Buffer.from(JSON.stringify(paymentResponse)).toString('base64'),
      },
    };
  }

  private requirePayment(): {
    status: number;
    body: X402PaymentInfo;
  } {
    const paymentInfo: X402PaymentInfo = {
      version: '2',
      paymentRequired: true,
      amount: this.pricePerCall,
      receiver: this.receiverAddress,
      tokenAddress: USDC_SEPOLIA_ADDRESS,
      network: SEPOLIA_NETWORK_ID,
    };

    return {
      status: 402,
      body: paymentInfo,
    };
  }
}
```

---

## セキュリティ

### 予算制限

```typescript
// Delegate Walletのポリシー
const PAYMENT_POLICY = {
  maxPerTransaction: '0.1', // 0.1 USDC
  dailyLimit: '5.0', // 5 USDC/日
  allowedReceivers: [
    // エージェントのみ許可
    FLIGHT_AGENT_RECEIVER,
    HOTEL_AGENT_RECEIVER,
    TOURISM_AGENT_RECEIVER,
  ],
};
```

### 検証フロー

```
1. maxPriceチェック（Claude判断）
2. dailyLimitチェック（DB）
3. allowedReceiversチェック
4. 署名検証（EIP-3009）
   ✅ 金額検証
   ✅ 受取者検証
   ✅ 有効期限検証
   ✅ 署名者検証
   ✅ x402 v2バージョンチェック
   ✅ CAIP-2ネットワークチェック
   ❌ nonce重複チェック（PoC: スキップ）
5. 決済実行（PoC: モック）
```

### PoC制約とリスク

**スキップする機能**:

- ❌ nonce重複使用チェック
  - リスク: 理論上、同じnonceで複数回リクエスト可能
  - 軽減策: 署名に有効期限（1時間）があるため、影響は限定的
  - 本番対応: Vercel KV（Redis）にnonceを記録

- ❌ 実際のUSDC transferWithAuthorization実行
  - リスク: 実際の決済は行われない
  - PoC目的: x402フローとPrivy自動署名の実証のみ

**実装済みセキュリティ**:

- ✅ EIP-3009署名検証（完全実装）
- ✅ x402 v2対応（CAIP-2 network ID）
- ✅ Privy Delegate Wallet（完全実装）
- ✅ 予算制限（MCP Host側で実装）
- ✅ HTTPS通信
- ✅ 環境変数による秘密情報管理

---

## 環境変数

```bash
# Privy
PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_app_secret
PRIVY_SIGNING_KEY=your_signing_key  # Delegate Actions用

# USDC Sepolia
USDC_SEPOLIA_ADDRESS=0x7F594ABa4E1B6e137606a8fBAb5387B90C8DEEa9

# エージェント受取アドレス（共通）
AGENT_RECEIVER_ADDRESS=0x25b61126EED206F6470533C073DDC3B4157bb6d1

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

---

## 実装ステップ

### Phase 1: x402基盤

1. ✅ EIP-3009署名検証実装 (`lib/x402/verify.ts`)
2. ✅ ベースエージェントクラス (`lib/agents/base-agent.ts`)
3. ✅ 環境変数設定

### Phase 2: Dummy Agents

4. ✅ FlightAgent実装（モック + x402）
5. ✅ HotelAgent実装（モック + x402）
6. ✅ TourismAgent実装（モック + x402）
7. ✅ Next.js API Routes実装
8. ✅ agent.json / openapi.json エンドポイント

### Phase 3: Privy統合

9. ✅ Privy Delegate Wallet設定（Dashboard）
10. ✅ フロントエンド: 承認UI実装
11. ✅ サーバー: Delegate Wallet署名実装

### Phase 4: MCP Tools

12. ✅ `discover_agents` Tool（agent.json取得含む）
13. ✅ `execute_agent_capability` Tool（自動署名 + x402）
14. ✅ `record_transaction` Tool

### Phase 5: テスト & デモ

15. ✅ 統合テスト
16. ✅ デモシナリオ検証

---

## デモシナリオ

```
ユーザー: 「パリ3日間の旅行プラン作成して」

[Claude] タスク分解中...
[MCP: discover_agents] travel カテゴリ検索
[MCP: discover_agents] 3件発見（Flight, Hotel, Tourism）
[Claude] 価格確認: 合計 $0.045 < 日次上限 $5 → OK
[MCP: execute_agent_capability] FlightAgent実行
  → Privy Delegate Walletで自動署名
  → x402決済（$0.01）
  → モックフライト情報取得
[MCP: execute_agent_capability] HotelAgent実行
  → 自動署名 + 決済（$0.015）
[MCP: execute_agent_capability] TourismAgent実行
  → 自動署名 + 決済（$0.02）
[Claude] 結果統合
  → 「パリ3日間プラン完成！総費用 $0.045」
```

**ユーザー介入なし、完全自動で決済・実行！**

---

## 制約事項（PoC）

### スキップする機能

- ❌ 実際のフライト検索APIは呼ばない（モックのみ）
- ❌ EIP-3009の`transferWithAuthorization`は実行しない（署名検証のみ）
- ❌ トランザクションハッシュはモック
- ❌ nonce重複使用チェックはスキップ（署名検証のみ）

### 完全実装する機能

- ✅ x402 v2プロトコル（HTTP 402 → 決済 → 再送）
- ✅ Privy Delegate Wallet（サーバーサイド自動署名）
- ✅ EIP-3009署名検証（金額・受取者・有効期限・署名者）
- ✅ Next.js API Routes（1リクエスト=1実行）
- ✅ A2A JSON-RPC 2.0プロトコル
- ✅ .well-known/agent.json（Discovery標準）
- ✅ OpenAPI仕様

### 本番環境への移行パス

```typescript
// nonce重複チェックの追加（本番用）
import { kv } from '@vercel/kv';

async function checkNonceUsed(nonce: string): Promise<boolean> {
  const key = `nonce:${nonce}`;
  const exists = await kv.exists(key);
  if (exists) return true;

  // 24時間で自動削除
  await kv.set(key, '1', { ex: 86400 });
  return false;
}

// 実際のUSDC決済実行（本番用）
import { USDC_ABI } from './abi';

async function executePayment(payment: EIP3009Authorization) {
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
  const tx = await usdc.transferWithAuthorization(
    payment.from,
    payment.to,
    payment.value,
    payment.validAfter,
    payment.validBefore,
    payment.nonce,
    payment.v,
    payment.r,
    payment.s
  );
  await tx.wait();
  return tx.hash;
}
```

---

## 参考資料

- [Privy Delegated Actions](https://docs.privy.io/guide/delegated-actions)
- [EIP-3009: Transfer With Authorization](https://eips.ethereum.org/EIPS/eip-3009)
- [x402 Protocol Specification v2](https://github.com/coinbase/x402)
- [A2A Protocol](https://modelcontextprotocol.io/docs/concepts/agents)
- [Next.js App Router](https://nextjs.org/docs/app)
