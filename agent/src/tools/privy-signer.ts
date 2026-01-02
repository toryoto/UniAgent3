/**
 * Privy EIP-712 Signer
 *
 * Privy delegated walletを使用してEIP-712署名を行うアダプター
 * @x402/evmが期待するClientEvmSigner型に適合
 */

import type { Hex, TypedDataDefinition } from 'viem';
import { PrivyClient } from '@privy-io/server-auth';
import { logger } from '../utils/logger.js';

const authorizationKey = process.env.PRIVY_AUTHORIZATION_KEY || '';

/**
 * PrivyベースのEIP-712署名アダプター
 *
 * 前提条件:
 * 1. ユーザーがクライアント側でウォレットを委譲している (delegateWallet)
 * 2. サーバーにauthorization keyが設定されている
 */
export class PrivyEIP712Signer {
  public address: `0x${string}`;

  constructor(
    private privyClient: PrivyClient,
    private walletId: string,
    walletAddress: string
  ) {
    this.address = walletAddress as `0x${string}`;
  }

  /**
   * TypedDataDefinitionをPrivy API用にシリアライズ
   * BigInt値を文字列に変換してJSON化可能にする
   */
  private serializeTypedData(typedData: TypedDataDefinition): unknown {
    return JSON.parse(
      JSON.stringify(typedData, (_, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      })
    );
  }

  /**
   * EIP-712署名（x402で使用）
   * @x402/evmはこのメソッドを呼び出して決済署名を作成
   */
  async signTypedData(typedData: TypedDataDefinition): Promise<Hex> {
    logger.payment.info('Signing EIP-712 typed data via Privy delegated wallet', {
      walletId: this.walletId,
      walletAddress: this.address,
      primaryType: typedData.primaryType,
      hasAuthorizationKey: !!authorizationKey,
    });

    try {
      const serializedTypedData = this.serializeTypedData(typedData);

      const result = await this.privyClient.walletApi.ethereum.signTypedData({
        walletId: this.walletId,
        typedData: serializedTypedData as any,
      });

      logger.payment.success('EIP-712 signature created via delegated wallet', {
        signature: `${result.signature.slice(0, 10)}...`,
        walletId: this.walletId,
      });

      return result.signature as Hex;
    } catch (error) {
      this.handleSignError(error);
      throw error;
    }
  }

  /**
   * 署名エラーのハンドリング
   */
  private handleSignError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown';

    if (errorMessage.includes('authorization')) {
      logger.payment.error(
        'Authorization key error - check if PRIVY_AUTHORIZATION_KEY is set correctly',
        {
          error: errorMessage,
          walletId: this.walletId,
        }
      );
    } else if (errorMessage.includes('delegated') || errorMessage.includes('permission')) {
      logger.payment.error('Wallet not delegated - user must delegate wallet from client first', {
        error: errorMessage,
        walletId: this.walletId,
      });
    } else {
      logger.payment.error('Failed to sign EIP-712 typed data', {
        error: errorMessage,
        walletId: this.walletId,
      });
    }
  }
}
