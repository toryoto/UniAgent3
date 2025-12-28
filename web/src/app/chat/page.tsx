'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Send } from 'lucide-react';
import { useState } from 'react';

export default function ChatPage() {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    // TODO: Send message to Claude API
    setMessage('');
  };

  return (
    <AppLayout>
      <AuthGuard>
        <div className="flex h-screen flex-col bg-slate-950">
          {/* Header */}
          <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-4">
            <h1 className="text-2xl font-bold text-white">Chat</h1>
            <p className="text-sm text-slate-400">Claude AIエージェントと対話してタスクを実行</p>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-4xl">
              {/* Welcome Message */}
              <div className="mb-8 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6">
                <h2 className="mb-2 text-lg font-bold text-purple-300">👋 Welcome to UniAgent3!</h2>
                <p className="mb-3 text-purple-200/80">
                  Claude AIエージェントがあなたのタスクを支援します。 例えば、こんなことができます：
                </p>
                <ul className="space-y-2 text-sm text-purple-200/70">
                  <li>• 「パリ3日間の旅行プランを作成して」</li>
                  <li>• 「東京の人気レストランを探して」</li>
                  <li>• 「最新のテクノロジートレンドを調査して」</li>
                </ul>
              </div>

              {/* Messages will go here */}
              <div className="space-y-4">
                {/* Example message */}
                <div className="flex justify-start">
                  <div className="max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-4">
                    <div className="mb-2 text-sm font-medium text-purple-400">AI Assistant</div>
                    <p className="text-slate-300">
                      こんにちは！何かお手伝いできることはありますか？
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-800 bg-slate-900/50 p-6">
            <div className="mx-auto max-w-4xl">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="メッセージを入力..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Shift + Enter で改行、Enter で送信</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    </AppLayout>
  );
}
