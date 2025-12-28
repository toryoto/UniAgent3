'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * 認証ガードコンポーネント
 * 未認証の場合、ページをぼかしてPrivyログインモーダルを表示
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { authenticated, ready, login } = usePrivy();
  const [hasTriedLogin, setHasTriedLogin] = useState(false);

  useEffect(() => {
    if (ready && !authenticated && !hasTriedLogin) {
      setHasTriedLogin(true);
      login();
    }
  }, [ready, authenticated, hasTriedLogin, login]);

  // Privyの初期化中
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-purple-500" />
          <div className="text-lg text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  // 未認証の場合、メインコンテンツをぼかして表示
  if (!authenticated) {
    return (
      <div className="relative h-full">
        {/* ぼかしたコンテンツ */}
        <div className="pointer-events-none blur-sm">{children}</div>

        {/* オーバーレイ（クリックでログインモーダル再表示） */}
        <div
          className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => {
            if (!authenticated) {
              login();
            }
          }}
        />
      </div>
    );
  }

  // 認証済み - 通常のコンテンツを表示
  return <>{children}</>;
}
