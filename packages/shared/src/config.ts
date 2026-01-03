/**
 * Blockchain Configuration (Shared)
 *
 * web、mcp両方で使用する共通設定
 *
 * NOTE: Contract Addresses と USDC utilities は別モジュールに移動しました
 * - Contract Addresses: ./contracts.ts
 * - USDC Utilities: ./utils/usdc.ts
 */

// RPCエンドポイント
export const RPC_URL =
  process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || '';

