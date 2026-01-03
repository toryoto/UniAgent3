/**
 * Smart Contract Addresses - Centralized Configuration
 *
 * モノレポ全体で使用するすべてのスマートコントラクトアドレスを一元管理
 */

// ============================================================================
// USDC Token Addresses
// ============================================================================

/**
 * USDC Contract Address (Base Sepolia Testnet)
 * x402 SDKで使用するメインネットワーク
 */
export const USDC_BASE_SEPOLIA_ADDRESS =
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

/**
 * USDC Contract Address (Ethereum Sepolia Testnet)
 * レガシーサポート用
 */
export const USDC_SEPOLIA_ADDRESS =
  '0x7F594ABa4E1B6e137606a8fBAb5387B90C8DEEa9';

/**
 * メインのUSDCアドレス（環境変数での上書き可能）
 */
export const USDC_ADDRESS =
  process.env.USDC_ADDRESS ||
  process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  USDC_BASE_SEPOLIA_ADDRESS;

// ============================================================================
// Protocol Contracts
// ============================================================================

/**
 * Agent Registry Contract Address
 * エージェント登録・検索用のオンチェーンレジストリ
 */
export const AGENT_REGISTRY_ADDRESS =
  process.env.AGENT_REGISTRY_ADDRESS ||
  process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS ||
  '';

/**
 * Agent Receiver Address
 * エージェント実行時の支払い受取アドレス
 */
export const AGENT_RECEIVER_ADDRESS =
  process.env.AGENT_RECEIVER_ADDRESS ||
  '0x25b61126EED206F6470533C073DDC3B4157bb6d1';

// ============================================================================
// Network Identifiers
// ============================================================================

/**
 * Network IDs (CAIP-2 format)
 */
export const SEPOLIA_NETWORK_ID = 'eip155:11155111';
export const BASE_SEPOLIA_NETWORK_ID = 'eip155:84532';

/**
 * x402 SDK Network name
 */
export const X402_NETWORK = 'base-sepolia';

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * Agent IDs (deterministic hashes)
 * 各エージェントの一意識別子
 */
export const AGENT_IDS = {
  flight:
    '0x0bddd164b1ba44c2b7bd2960cce576de2de93bd1da0b5621d6b8ffcffa91b75e',
  hotel:
    '0x70fc4e8a3b9c2d1f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
  tourism:
    '0xc1de1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e',
} as const;

/**
 * Agent Price Configuration
 * USDC base units (6 decimals) での価格定義
 */
export const AGENT_PRICES = {
  flight: '10000', // 0.01 USDC
  hotel: '15000', // 0.015 USDC
  tourism: '20000', // 0.02 USDC
} as const;

// ============================================================================
// Legacy Support
// ============================================================================

/**
 * 後方互換性のための CONTRACT_ADDRESSES オブジェクト
 * @deprecated 個別の定数を直接使用することを推奨
 */
export const CONTRACT_ADDRESSES = {
  AGENT_REGISTRY: AGENT_REGISTRY_ADDRESS,
  USDC: USDC_ADDRESS,
} as const;
