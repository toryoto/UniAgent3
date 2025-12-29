/**
 * Blockchain Configuration
 *
 * Base Sepoliaネットワークとスマートコントラクトの設定
 */

import { base, baseSepolia } from 'viem/chains';
import { sepolia } from 'viem/chains';

// 環境に応じたチェーン選択
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

export const CONTRACT_ADDRESSES = {
  AGENT_REGISTRY: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || '',
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '',
} as const;

// RPCエンドポイント
export const RPC_URL =
  process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || CHAIN.rpcUrls.default.http[0];

// Block Explorer
export const BLOCK_EXPLORER_URL = CHAIN.blockExplorers?.default.url || '';

// トランザクション設定
export const TX_CONFIG = {
  confirmations: 1,
  timeout: 60000, // 60秒
} as const;

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
