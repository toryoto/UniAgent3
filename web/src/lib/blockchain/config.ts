/**
 * Blockchain Configuration (Web)
 *
 * Base Sepoliaネットワークとスマートコントラクトの設定
 * 共通設定は @agent-marketplace/shared から取得
 */

import { base, baseSepolia } from 'viem/chains';
import { sepolia } from 'viem/chains';

// 共通設定をインポート
export {
  CONTRACT_ADDRESSES,
  RPC_URL,
  USDC_DECIMALS,
  USDC_UNIT,
  parseUSDC,
  formatUSDCAmount,
} from '@agent-marketplace/shared';

// 環境に応じたチェーン選択（Web固有）
export const CHAIN = (() => {
  const v = (process.env.NEXT_PUBLIC_CHAIN || '').toLowerCase();
  // 例:
  // - sepolia
  // - base-sepolia
  // - base
  // - mainnet
  if (v === 'sepolia') return sepolia;
  if (v === 'base') return base;
  if (v === 'mainnet') return base; // このプロジェクトの "mainnet" は Base mainnet を指す想定
  // default: base-sepolia（要件定義寄り）
  return sepolia;
})();

// Block Explorer（Web固有）
export const BLOCK_EXPLORER_URL = CHAIN.blockExplorers?.default.url || '';

// トランザクション設定（Web固有）
export const TX_CONFIG = {
  confirmations: 1,
  timeout: 60000, // 60秒
} as const;
