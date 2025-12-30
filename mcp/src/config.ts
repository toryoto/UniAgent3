/**
 * Blockchain Configuration for MCP Server
 *
 * 共通設定は @agent-marketplace/shared から取得
 */

// 共通設定をインポート・再エクスポート
export {
  CONTRACT_ADDRESSES,
  RPC_URL,
  USDC_DECIMALS,
  USDC_UNIT,
  parseUSDC,
  formatUSDCAmount,
} from '@agent-marketplace/shared';
