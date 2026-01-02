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

/**
 * x402 V2 Payment Required Response
 */
interface X402PaymentRequiredV2 {
  x402Version: 2;
  accepts: Array<{
    scheme: string;
    network: string;
    price?: string;
    amount?: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds?: number;
    extra?: {
      name?: string;
      version?: string;
    };
  }>;
  resource?: string;
  description?: string;
  mimeType?: string;
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
 * PAYMENT-REQUIREDヘッダーをパース (v2)
 */
function parsePaymentRequired(header: string): X402PaymentRequiredV2 {
  const decoded = Buffer.from(header, 'base64').toString('utf-8');
  return JSON.parse(decoded) as X402PaymentRequiredV2;
}

/**
 * EIP-3009署名を作成してPAYMENT-SIGNATUREヘッダーを生成 (v2)
 */
async function createPaymentSignatureHeader(
  walletId: string,
  walletAddress: string,
  requirement: X402PaymentRequiredV2['accepts'][0]
): Promise<string> {
  logger.payment.info('Creating EIP-3009 signature via Privy', {
    payTo: requirement.payTo,
    amount: requirement.amount,
  });

  // nonce生成
  const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}`;
  const validAfter = 0;
  const validBefore = Math.floor(Date.now() / 1000) + 3600;

  // EIP-712 Typed Data
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
      to: requirement.payTo as `0x${string}`,
      value: BigInt(requirement.amount || '0'),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce: nonce as `0x${string}`,
    },
  };

  // Privy経由でEIP-712署名
  const signResult = await privyClient.walletApi.ethereum.signTypedData({
    walletId,
    typedData: typedData,
  });

  // PAYMENT-SIGNATUREペイロード (v2)
  const payload = {
    x402Version: 2,
    scheme: requirement.scheme,
    network: requirement.network,
    payload: {
      signature: signResult.signature,
      authorization: {
        from: walletAddress,
        to: requirement.payTo,
        value: requirement.amount || '0',
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };

  const paymentHeader = Buffer.from(JSON.stringify(payload)).toString('base64');
  logger.payment.success('Payment signature header created');

  return paymentHeader;
}

/**
 * エージェントにA2Aリクエストを送信 (v2対応)
 */
async function sendA2ARequest(
  endpoint: string,
  task: string,
  paymentSignature?: string
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

  if (paymentSignature) {
    headers['PAYMENT-SIGNATURE'] = paymentSignature;
  }

  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30000),
  });
}

/**
 * execute_agent ツール実装 (v2対応)
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

    const paymentRequiredHeader = response.headers.get('PAYMENT-REQUIRED');
    if (!paymentRequiredHeader) {
      return {
        success: false,
        error: 'HTTP 402 received but no PAYMENT-REQUIRED header',
      };
    }

    let paymentRequired: X402PaymentRequiredV2;
    try {
      paymentRequired = parsePaymentRequired(paymentRequiredHeader);
    } catch (error) {
      logger.payment.error('Failed to parse PAYMENT-REQUIRED header', { error });
      return {
        success: false,
        error: 'Invalid PAYMENT-REQUIRED header format',
      };
    }

    if (paymentRequired.x402Version !== 2) {
      logger.payment.error('Unsupported x402 version', { version: paymentRequired.x402Version });
    }

    // 最初のaccept optionを選択 (複数ある場合は選択ロジックを追加可能)
    const requirement = paymentRequired.accepts[0];
    if (!requirement) {
      return {
        success: false,
        error: 'No payment options available',
      };
    }

    // 価格チェック
    let amountUsdc = 0;
    if (requirement.price) {
      // "$0.01" 形式
      amountUsdc = parseFloat(requirement.price.replace('$', ''));
    } else if (requirement.amount) {
      // トークン単位 (USDC: 6 decimals)
      amountUsdc = Number(requirement.amount) / 1_000_000;
    }

    logger.payment.info('Payment required', {
      amount: amountUsdc,
      payTo: requirement.payTo,
      network: requirement.network,
    });

    if (amountUsdc > maxPrice) {
      logger.payment.error('Price exceeds maxPrice', { amountUsdc, maxPrice });
      return {
        success: false,
        error: `Price $${amountUsdc} exceeds maxPrice $${maxPrice}`,
      };
    }

    // 4. PAYMENT-SIGNATUREヘッダーを作成して再送
    const paymentSignature = await createPaymentSignatureHeader(
      walletId,
      walletAddress,
      requirement
    );
    response = await sendA2ARequest(endpoint, task, paymentSignature);

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

  // 5. 通常のレスポンス
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
