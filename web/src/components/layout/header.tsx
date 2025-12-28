import Link from 'next/link';
import { Bot, Wallet, LayoutDashboard, MessageSquare, History } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-blue-600" />
          <Link href="/" className="text-xl font-bold">
            Agent Marketplace
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/marketplace"
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>マーケットプレイス</span>
          </Link>

          <Link
            href="/chat"
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            <span>チャット</span>
          </Link>

          <Link
            href="/history"
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <History className="h-5 w-5" />
            <span>履歴</span>
          </Link>

          <Link
            href="/wallet"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
          >
            <Wallet className="h-5 w-5" />
            <span>ウォレット</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
