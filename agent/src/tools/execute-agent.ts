/**
 * Execute Agent Tool
 *
 * x402決済を使用して外部エージェントを実行するLangChainツール
 * - HTTP 402応答を受け取った場合、Privy経由でEIP-3009署名を作成
 * - X-PAYMENTヘッダーを付与して再送信
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { PrivyClient } from '@privy-io/server-auth';
import type { AgentJson, JsonRpcRequest, JsonRpcResponse } from '@agent-marketplace/shared';
import { logger } from '../utils/logger.js';

// Privy client initialization
const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID || '',
  process.env.PRIVY_APP_SECRET || ''
);

const USDC_ADDRESS = process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const CHAIN_ID = 84532;

// x402 Facilitator
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

interface X402PaymentRequired {
  x402Version: number;
  scheme: string;
  network: string;
  payTo: string;
  maxAmountRequired: string;
  asset: string;
  resource: string;
  description?: string;
  mimeType?: string;
  facilitator?: string;
}

interface ExecuteAgentInput {
  agentUrl: string;
  task: string;
  maxPrice: number;
  walletId: string;
  walletAddress: string;
}

interface ExecuteAgentResult {
  success: boolean;
  result?: unknown;
  paymentAmount?: number;
  error?: string;
}

/**
 * .well-known/agent.json を取得
 */
async function fetchAgentJson(baseUrl: string): Promise<AgentJson | null> {
  try {
    const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const agentJsonUrl = `${normalizedUrl}`;

    logger.logic.info(`Fetching agent.json`, { url: agentJsonUrl });

    const response = await fetch(agentJsonUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.logic.warn(`agent.json not found`, { status: response.status });
      return null;
    }

    const agentJson = (await response.json()) as AgentJson;
    logger.logic.success(`Got agent.json`, { endpoint: agentJson.endpoints?.[0]?.url });
    return agentJson;
  } catch (error) {
    logger.logic.warn(`Failed to fetch agent.json`, {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * EIP-3009署名を作成してX-PAYMENTヘッダーを生成
 */
async function createX402PaymentHeader(
  walletId: string,
  walletAddress: string,
  paymentInfo: X402PaymentRequired
): Promise<string> {
  logger.payment.info('Creating EIP-3009 signature via Privy', {
    payTo: paymentInfo.payTo,
    amount: paymentInfo.maxAmountRequired,
  });

  // nonce生成
  const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}`;
  const validAfter = 0;
  const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1時間有効

  // EIP-712 Typed Data for TransferWithAuthorization
  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization' as const,
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: CHAIN_ID,
      verifyingContract: USDC_ADDRESS as `0x${string}`,
    },
    message: {
      from: walletAddress as `0x${string}`,
      to: paymentInfo.payTo as `0x${string}`,
      value: BigInt(paymentInfo.maxAmountRequired),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce: nonce as `0x${string}`,
    },
  };

  // Privy経由でEIP-712署名

  const signResult = await privyClient.walletApi.ethereum.signTypedData({
    walletId,
    typedData: typedData as any,
  });

  const signature = signResult.signature;

  // X-PAYMENTペイロードを構築
  const payload = {
    x402Version: 2,
    scheme: 'exact',
    network: `eip155:${CHAIN_ID}`,
    payload: {
      signature,
      authorization: {
        from: walletAddress,
        to: paymentInfo.payTo,
        value: paymentInfo.maxAmountRequired,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };

  const paymentHeader = Buffer.from(JSON.stringify(payload)).toString('base64');
  logger.payment.success('Payment header created');

  return paymentHeader;
}

/**
 * エージェントにA2Aリクエストを送信
 */
async function sendA2ARequest(
  endpoint: string,
  task: string,
  paymentHeader?: string
): Promise<Response> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'message/send',
    params: {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: task }],
      },
    },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (paymentHeader) {
    headers['X-PAYMENT'] = paymentHeader;
  }

  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30000),
  });
}

/**
 * execute_agent ツール実装
 */
async function executeAgentImpl(input: ExecuteAgentInput): Promise<ExecuteAgentResult> {
  const { agentUrl, task, maxPrice, walletId, walletAddress } = input;

  logger.agent.info('Executing agent', { agentUrl, task, maxPrice });

  // 1. agent.jsonを取得してエンドポイントを特定
  const agentJson = await fetchAgentJson(agentUrl);
  const endpoint = agentJson?.endpoints?.[0]?.url || `${agentUrl}/api/v1/agent`;

  logger.logic.info('Using endpoint', { endpoint });

  // 2. 初回リクエスト送信
  let response = await sendA2ARequest(endpoint, task);

  // 3. HTTP 402 Payment Required の処理
  if (response.status === 402) {
    logger.payment.info('Received HTTP 402 - Payment Required');

    // 402レスポンスからpayment情報を取得
    const paymentInfoHeader = response.headers.get('X-PAYMENT-REQUIRED');
    if (!paymentInfoHeader) {
      return {
        success: false,
        error: 'HTTP 402 received but no X-PAYMENT-REQUIRED header',
      };
    }

    let paymentInfo: X402PaymentRequired;
    try {
      paymentInfo = JSON.parse(Buffer.from(paymentInfoHeader, 'base64').toString('utf-8'));
    } catch {
      // ヘッダーがbase64でない場合は直接JSONとして解析
      paymentInfo = JSON.parse(paymentInfoHeader);
    }

    // 価格チェック
    const amountUsdc = Number(paymentInfo.maxAmountRequired) / 1_000_000;
    logger.payment.info('Payment info', { amount: amountUsdc, payTo: paymentInfo.payTo });

    if (amountUsdc > maxPrice) {
      logger.payment.error('Price exceeds maxPrice', { amountUsdc, maxPrice });
      return {
        success: false,
        error: `Price $${amountUsdc} exceeds maxPrice $${maxPrice}`,
      };
    }

    // 4. X-PAYMENTヘッダーを作成して再送
    const paymentHeader = await createX402PaymentHeader(walletId, walletAddress, paymentInfo);
    response = await sendA2ARequest(endpoint, task, paymentHeader);

    if (!response.ok) {
      const errorText = await response.text();
      logger.payment.error('Payment failed', { status: response.status, error: errorText });
      return {
        success: false,
        error: `Payment request failed: ${response.status} - ${errorText}`,
      };
    }

    logger.payment.success('Payment successful', { amount: amountUsdc });

    // レスポンスを解析
    const result = (await response.json()) as JsonRpcResponse;
    return {
      success: true,
      result: result.result,
      paymentAmount: amountUsdc,
    };
  }

  // 5. 通常のレスポンス（決済不要の場合）
  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `Agent request failed: ${response.status} - ${errorText}`,
    };
  }

  const result = (await response.json()) as JsonRpcResponse;
  return {
    success: true,
    result: result.result,
  };
}

/**
 * execute_agent ツール定義
 */
export const executeAgentTool = tool(
  async (input) => {
    try {
      const result = await executeAgentImpl(input);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.agent.error('execute_agent failed', { error: message });
      return JSON.stringify({
        success: false,
        error: message,
      });
    }
  },
  {
    name: 'execute_agent',
    description: `外部エージェントをx402決済付きで実行します。
discover_agentsで取得したエージェントのURLを指定してタスクを依頼できます。
HTTP 402が返された場合、自動的にx402決済を行い再送します。
maxPriceを超える場合は実行を拒否します。`,
    schema: z.object({
      agentUrl: z.string().describe('エージェントのBase URL'),
      task: z.string().describe('エージェントに依頼するタスク'),
      maxPrice: z.number().describe('この呼び出しで許容する最大価格 (USDC)'),
      walletId: z.string().describe('決済に使用するPrivyウォレットID'),
      walletAddress: z.string().describe('決済に使用するウォレットアドレス'),
    }),
  }
);
