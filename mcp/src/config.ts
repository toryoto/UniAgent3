/**
 * Blockchain Configuration for MCP Server
 *
 * 共通設定は @agent-marketplace/shared から取得
 */

// 共通設定をインポート・再エクスポート (Contracts)
export {
  CONTRACT_ADDRESSES,
  USDC_BASE_SEPOLIA_ADDRESS,
  USDC_SEPOLIA_ADDRESS,
  USDC_ADDRESS,
  AGENT_REGISTRY_ADDRESS,
  AGENT_RECEIVER_ADDRESS,
  SEPOLIA_NETWORK_ID,
  BASE_SEPOLIA_NETWORK_ID,
  X402_NETWORK,
  AGENT_IDS,
  AGENT_PRICES,
} from '@agent-marketplace/shared';

// 共通設定をインポート・再エクスポート (USDC Utilities)
export {
  USDC_DECIMALS,
  USDC_UNIT,
  parseUSDC,
  formatUSDCAmount,
  parseUSDCString,
  formatUSDCString,
} from '@agent-marketplace/shared';

// 共通設定をインポート・再エクスポート (Config)
export { RPC_URL } from '@agent-marketplace/shared';
