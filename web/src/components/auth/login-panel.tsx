'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Wallet } from 'lucide-react';

interface LoginPanelProps {
  onClose?: () => void;
}

export function LoginPanel({}: LoginPanelProps) {
  const { authenticated, login } = usePrivy();

  if (authenticated) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#0F172A] p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-[#F1F5F9]">Get Started</h2>
          <p className="text-lg text-slate-400">
            Connect your wallet to access the AI Agent Marketplace and discover autonomous agents
            powered by blockchain technology.
          </p>
        </div>

        <button
          onClick={login}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#1E40AF] px-8 py-4 text-center text-lg font-semibold text-white transition-all duration-300 hover:from-[#7C3AED] hover:to-[#1E3A8A] hover:shadow-lg hover:shadow-[#8B5CF6]/50 active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect with Wallet
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] to-[#1E40AF] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </button>
      </div>
    </div>
  );
}
