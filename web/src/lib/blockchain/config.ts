/**
 * Blockchain Configuration (Web)
 *
 * Base Sepoliaネットワークとスマートコントラクトの設定
 * 共通設定は @agent-marketplace/shared から取得
 */

import { base, baseSepolia } from 'viem/chains';

// 共通設定をインポート (Contracts)
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

// 共通設定をインポート (USDC Utilities)
export {
  USDC_DECIMALS,
  USDC_UNIT,
  parseUSDC,
  formatUSDCAmount,
  parseUSDCString,
  formatUSDCString,
} from '@agent-marketplace/shared';

// 共通設定をインポート (Config)
export { RPC_URL } from '@agent-marketplace/shared';

// 環境に応じたチェーン選択（Web固有）
export const CHAIN = (() => {
  const v = (process.env.NEXT_PUBLIC_CHAIN || '').toLowerCase();
  // 例:
  // - base-sepolia
  // - base
  // - mainnet
  if (v === 'base') return base;
  if (v === 'mainnet') return base; // このプロジェクトの "mainnet" は Base mainnet を指す想定
  return baseSepolia;
})();

// Block Explorer（Web固有）
export const BLOCK_EXPLORER_URL = CHAIN.blockExplorers?.default.url || '';

// トランザクション設定（Web固有）
export const TX_CONFIG = {
  confirmations: 1,
  timeout: 60000, // 60秒
} as const;
