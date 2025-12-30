'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Send, Square, Loader2, Bot, User, AlertCircle, Wrench } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import type { ChatMessage, ToolCallLog } from '@/lib/types';

export default function ChatPage() {
  const { messages, input, setInput, sendMessage, abort, isStreaming, error, clearError } = useChat(
    {
      mcpConfig: {
        enabled: true,
      },
    }
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 新しいメッセージが来たら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 送信後に入力欄にフォーカス
  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
              {/* Welcome Message (メッセージがない場合のみ表示) */}
              {messages.length === 0 && <WelcomeMessage />}

              {/* Messages */}
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

                {/* Streaming indicator */}
                {isStreaming && messages.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>応答中...</span>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm text-red-200">{error}</p>
                    <button
                      onClick={clearError}
                      className="mt-2 text-xs text-red-400 hover:text-red-300"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-800 bg-slate-900/50 p-6">
            <div className="mx-auto max-w-4xl">
              <div className="flex gap-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力..."
                  disabled={isStreaming}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                />
                {isStreaming ? (
                  <button
                    onClick={abort}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    <Square className="h-5 w-5" />
                    停止
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                    className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">Enter で送信 • MCP ツール統合は準備中</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    </AppLayout>
  );
}

function WelcomeMessage() {
  return (
    <div className="mb-8 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6">
      <h2 className="mb-2 text-lg font-bold text-purple-300">👋 Welcome to UniAgent3!</h2>
      <p className="mb-3 text-purple-200/80">
        Claude AIエージェントがあなたのタスクを支援します。例えば、こんなことができます：
      </p>
      <ul className="space-y-2 text-sm text-purple-200/70">
        <li>• 「パリ3日間の旅行プランを作成して」</li>
        <li>• 「東京の人気レストランを探して」</li>
        <li>• 「最新のテクノロジートレンドを調査して」</li>
      </ul>
      <p className="mt-4 text-xs text-purple-300/60">
        ※ MCP ツール統合（エージェント検索・実行・決済）は準備中です
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl rounded-2xl px-6 py-4 ${
          isUser ? 'bg-purple-600 text-white' : 'border border-slate-800 bg-slate-900/50'
        }`}
      >
        {/* Role indicator */}
        <div
          className={`mb-2 flex items-center gap-2 text-sm font-medium ${
            isUser ? 'text-purple-200' : 'text-purple-400'
          }`}
        >
          {isUser ? (
            <>
              <User className="h-4 w-4" />
              You
            </>
          ) : (
            <>
              <Bot className="h-4 w-4" />
              AI Assistant
            </>
          )}
        </div>

        {/* Content */}
        <div className={`whitespace-pre-wrap ${isUser ? 'text-white' : 'text-slate-300'}`}>
          {message.content || <span className="text-slate-500 italic">応答を生成中...</span>}
        </div>

        {/* Tool Calls (アシスタントメッセージのみ) */}
        {!isUser && message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Wrench className="h-3 w-3" />
              ツール呼び出し
            </div>
            {message.metadata.toolCalls.map((tc: ToolCallLog) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallCard({ toolCall }: { toolCall: ToolCallLog }) {
  const statusColors = {
    pending: 'bg-slate-500',
    running: 'bg-yellow-500',
    success: 'bg-green-500',
    failed: 'bg-red-500',
  };

  const outputText = formatToolOutput(toolCall.output);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${statusColors[toolCall.status]}`} />
        <span className="font-mono text-slate-300">{toolCall.toolName}</span>
        <span className="text-slate-500">
          {toolCall.status === 'running' && '実行中...'}
          {toolCall.status === 'success' && '完了'}
          {toolCall.status === 'failed' && '失敗'}
        </span>
      </div>
      {toolCall.output != null ? (
        <pre className="mt-2 overflow-x-auto text-slate-400">{outputText}</pre>
      ) : null}
    </div>
  );
}

function formatToolOutput(output: unknown): string {
  if (output == null) return '';
  if (typeof output === 'string') return output;
  if (typeof output === 'number' || typeof output === 'boolean') return String(output);
  if (typeof output === 'bigint') return output.toString();
  if (output instanceof Error) {
    return output.stack ?? output.message;
  }

  try {
    return JSON.stringify(
      output,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    );
  } catch {
    return String(output);
  }
}
