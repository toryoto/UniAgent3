/**
 * useDelegatedWallet - Privy Delegated Wallet管理フック
 *
 * ユーザーのembedded walletをサーバー側から使用できるようにするための
 * 委譲機能を管理するカスタムフック
 *
 * @see https://docs.privy.io/guide/react/wallets/embedded/delegated-actions/delegate
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePrivy, useHeadlessDelegatedActions } from '@privy-io/react-auth';
import type { WalletWithMetadata } from '@privy-io/react-auth';

export interface DelegatedWalletInfo {
  /** Privy wallet ID (サーバー側でsignTypedDataに使用) */
  walletId: string;
  /** ウォレットアドレス (0x...) */
  address: string;
  /** 委譲済みかどうか */
  isDelegated: boolean;
}

export interface UseDelegatedWalletReturn {
  /** Embedded wallet情報 */
  wallet: DelegatedWalletInfo | null;
  /** 委譲処理中かどうか */
  isDelegating: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** ウォレットを委譲する */
  delegateWallet: () => Promise<boolean>;
  /** ローディング中かどうか */
  isLoading: boolean;
}

/**
 * ユーザーのembedded walletを取得
 */
function getEmbeddedWallet(linkedAccounts: unknown[]): WalletWithMetadata | null {
  if (!linkedAccounts || !Array.isArray(linkedAccounts)) {
    return null;
  }

  // walletClientType: 'privy' のウォレットを検索
  const embeddedWallet = linkedAccounts.find(
    (account): account is WalletWithMetadata =>
      account !== null &&
      typeof account === 'object' &&
      'type' in account &&
      account.type === 'wallet' &&
      'walletClientType' in account &&
      account.walletClientType === 'privy'
  ) as WalletWithMetadata | undefined;

  return embeddedWallet ?? null;
}

export function useDelegatedWallet(): UseDelegatedWalletReturn {
  const { user, ready } = usePrivy();
  const { delegateWallet: privyDelegateWallet } = useHeadlessDelegatedActions();

  const [isDelegating, setIsDelegating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Embedded walletを取得
  const embeddedWallet = useMemo(() => {
    if (!user?.linkedAccounts) return null;
    return getEmbeddedWallet(user.linkedAccounts);
  }, [user?.linkedAccounts]);

  // wallet情報を構築
  const wallet = useMemo((): DelegatedWalletInfo | null => {
    if (!embeddedWallet) return null;

    // Privy embedded wallet の場合、wallet IDはアカウントオブジェクトに含まれる
    // linkedAccountsの各要素にはidフィールドがある場合がある
    // 最新のPrivy SDKではwalletIdを直接取得可能
    const walletId =
      // @ts-expect-error - Privy SDKのバージョンによって構造が異なる
      embeddedWallet.id ??
      // @ts-expect-error - Privy SDKのバージョンによって構造が異なる
      embeddedWallet.walletId ??
      // フォールバック: addressをIDとして使用
      embeddedWallet.address;

    return {
      walletId,
      address: embeddedWallet.address,
      // @ts-expect-error - delegatedフィールドはPrixy SDKのバージョンによって存在しない場合がある
      isDelegated: embeddedWallet.delegated === true,
    };
  }, [embeddedWallet]);

  // ウォレットを委譲
  const delegateWallet = useCallback(async (): Promise<boolean> => {
    if (!embeddedWallet) {
      setError('Embedded wallet not found');
      return false;
    }

    if (wallet?.isDelegated) {
      // 既に委譲済み
      return true;
    }

    setIsDelegating(true);
    setError(null);

    try {
      await privyDelegateWallet({
        address: embeddedWallet.address,
        chainType: 'ethereum',
      });

      console.log('Wallet delegated successfully:', embeddedWallet.address);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delegate wallet';
      console.error('Failed to delegate wallet:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsDelegating(false);
    }
  }, [embeddedWallet, wallet?.isDelegated, privyDelegateWallet]);

  return useMemo(
    () => ({
      wallet,
      isDelegating,
      error,
      delegateWallet,
      isLoading: !ready,
    }),
    [wallet, isDelegating, error, delegateWallet, ready]
  );
}
