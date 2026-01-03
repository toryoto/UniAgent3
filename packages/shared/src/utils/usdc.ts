/**
 * USDC Utility Functions
 *
 * USDC（6 decimals）の基本的な型変換・計算関数を提供
 * 表示用フォーマットは各パッケージで実装すること
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * USDC decimals (standard: 6)
 */
export const USDC_DECIMALS = 6;

/**
 * USDC unit multiplier (1 USDC = 1,000,000 base units)
 */
export const USDC_UNIT = 1_000_000;

// ============================================================================
// Type Conversion Functions
// ============================================================================

/**
 * USDC金額をbase units（bigint）に変換
 *
 * @param amount - USDC金額（例: 1.5 = 1.5 USDC）
 * @returns base units (bigint)
 *
 * @example
 * parseUSDC(1.5)     // 1500000n
 * parseUSDC(0.01)    // 10000n
 */
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * USDC_UNIT));
}

/**
 * base units（bigint）をUSDC金額に変換
 *
 * @param amount - base units (bigint)
 * @returns USDC金額（number）
 *
 * @example
 * formatUSDCAmount(1500000n)  // 1.5
 * formatUSDCAmount(10000n)    // 0.01
 */
export function formatUSDCAmount(amount: bigint): number {
  return Number(amount) / USDC_UNIT;
}

/**
 * 文字列のbase unitsをUSDC金額に変換
 *
 * @param amount - base units (string)
 * @returns USDC金額（number）
 *
 * @example
 * parseUSDCString("1500000")  // 1.5
 * parseUSDCString("10000")    // 0.01
 */
export function parseUSDCString(amount: string): number {
  const parsed = parseInt(amount, 10);
  if (isNaN(parsed)) {
    return 0;
  }
  return parsed / USDC_UNIT;
}

/**
 * USDC金額を文字列のbase unitsに変換
 *
 * @param amount - USDC金額（number）
 * @returns base units (string)
 *
 * @example
 * formatUSDCString(1.5)   // "1500000"
 * formatUSDCString(0.01)  // "10000"
 */
export function formatUSDCString(amount: number): string {
  return Math.floor(amount * USDC_UNIT).toString();
}
