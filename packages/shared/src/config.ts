/**
 * Blockchain Configuration (Shared)
 *
 * web、mcp両方で使用する共通設定
 */

// 環境変数から設定を取得
// 各プロジェクトで異なる環境変数名を使用できるように柔軟に設計
export const CONTRACT_ADDRESSES = {
  AGENT_REGISTRY:
    process.env.AGENT_REGISTRY_ADDRESS ||
    process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS ||
    '',
  USDC: process.env.USDC_ADDRESS || process.env.NEXT_PUBLIC_USDC_ADDRESS || '',
} as const;

// RPCエンドポイント
export const RPC_URL =
  process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || '';

// USDC設定（6 decimals）
export const USDC_DECIMALS = 6;
export const USDC_UNIT = 1_000_000; // 1 USDC = 1,000,000 units

/**
 * USDCの金額をwei単位に変換
 */
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * USDC_UNIT));
}

/**
 * wei単位のUSDCを数値に変換
 */
export function formatUSDCAmount(amount: bigint): number {
  return Number(amount) / USDC_UNIT;
}

