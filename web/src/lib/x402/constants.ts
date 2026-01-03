/**
 * x402 Protocol Constants
 *
 * エージェントメタデータとx402設定用の定数
 *
 * NOTE: 決済処理はCoinbase x402 SDK (withX402, facilitator) が担当するため、
 * EIP-3009などの低レベル定数は不要になりました。
 *
 * Smart Contract Addresses と Agent 設定は @agent-marketplace/shared から集中管理
 */

// Re-export from shared package for backward compatibility
export {
  USDC_BASE_SEPOLIA_ADDRESS,
  USDC_SEPOLIA_ADDRESS,
  SEPOLIA_NETWORK_ID,
  BASE_SEPOLIA_NETWORK_ID,
  X402_NETWORK,
  AGENT_RECEIVER_ADDRESS,
  AGENT_PRICES,
  AGENT_IDS,
} from '@agent-marketplace/shared';
