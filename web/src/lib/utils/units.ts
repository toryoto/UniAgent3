/**
 * Units / Base-units utilities
 *
 * 表示（ローカライズ）に依存しない、パース・単位変換系の純粋関数をまとめる。
 * - API / UI 両方から安全に利用可能
 */

/**
 * bigint / number / string から bigint を安全にパースする。
 */
export function parseBigIntLike(value: unknown): bigint | null {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
    if (typeof value === 'string' && value.trim() !== '') return BigInt(value);
  } catch {
    // ignore
  }
  return null;
}

/**
 * base units（最小単位の整数）を decimals 桁の10進 number に変換する。
 * - 例: USDC(6decimals): 1500000 -> 1.5
 *
 * 注意: 大きすぎる値は Number 精度が落ちるため、表示用途を想定。
 */
export function baseUnitsToNumber(value: unknown, decimals: number): number {
  const raw = parseBigIntLike(value);
  if (!raw) return 0;
  if (!Number.isInteger(decimals) || decimals < 0) return 0;

  const denom = 10 ** decimals;
  return Number(raw) / denom;
}

/**
 * USDC(6 decimals) の base units を number に変換する。
 */
export function usdcBaseUnitsToNumber(value: unknown): number {
  return baseUnitsToNumber(value, 6);
}

/**
 * (total / count) の平均値を number で計算する（count<=0 は 0）。
 * - total/count は bigint/number/string を許容
 */
export function averageFromTotals(total: unknown, count: unknown): number {
  const t = parseBigIntLike(total) ?? BigInt(0);
  const c = parseBigIntLike(count) ?? BigInt(0);
  if (c <= BigInt(0)) return 0;
  return Number(t) / Number(c);
}
