/**
 * useAgentChat - Agent Service用チャットフック（SSE対応）
 *
 * /api/agent/stream エンドポイントを使用して、エージェントの実行結果をストリーミングで取得
 *
 * このカスタムフックはLangChainを使用したAgent endpoint実行用（SSE対応版）
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ExecutionLogEntry } from '@agent-marketplace/shared';
import type { AgentSSEEvent } from '@/lib/types';

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  executionLog?: ExecutionLogEntry[];
  totalCost?: number;
}

export interface UseAgentChatOptions {
  walletId: string;
  walletAddress: string;
  maxBudget: number;
}

export interface UseAgentChatReturn {
  messages: AgentChatMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: (content?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  reset: () => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function useAgentChat(options: UseAgentChatOptions): UseAgentChatReturn {
  const { walletId, walletAddress, maxBudget } = options;

  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const executionLogRef = useRef<ExecutionLogEntry[]>([]);

  const sendMessage = useCallback(
    async (content?: string) => {
      const text = (content ?? input).trim();
      if (!text) return;

      // 既存のストリームがあれば中断
      abortControllerRef.current?.abort();

      setError(null);
      setInput('');

      // ユーザーメッセージを追加
      const userMessage: AgentChatMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // ローディング用のアシスタントメッセージを追加
      const assistantId = generateId();
      streamingMessageIdRef.current = assistantId;
      executionLogRef.current = [];

      const loadingMessage: AgentChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, loadingMessage]);

      setIsLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/agent/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            walletId,
            walletAddress,
            maxBudget,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          throw new Error(errorJson.error ?? `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const chunk of lines) {
            if (!chunk.startsWith('data: ')) continue;
            const data = chunk.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data) as AgentSSEEvent;
              handleEvent(event);
            } catch (parseError) {
              // JSON パースエラーは無視（不完全なチャンク）
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }

        // 残りのバッファを処理
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6).trim();
          if (data) {
            try {
              const event = JSON.parse(data) as AgentSSEEvent;
              handleEvent(event);
            } catch {
              // 無視
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // 中断は正常終了扱い
          return;
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        // エラー時はローディングメッセージを削除
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        streamingMessageIdRef.current = null;
      }

      function handleEvent(event: AgentSSEEvent) {
        const targetId = streamingMessageIdRef.current;
        if (!targetId) {
          return;
        }

        switch (event.type) {
          case 'start': {
            // 開始イベントは既にメッセージを作成済みなので何もしない
            break;
          }

          case 'token': {
            // トークン単位でコンテンツを追加（リアルタイム表示）
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === targetId) {
                  return { ...m, content: m.content + event.data.token };
                }
                return m;
              })
            );
            break;
          }

          case 'log': {
            // 実行ログエントリを追加
            const logEntry: ExecutionLogEntry = {
              step: event.data.step,
              type: event.data.type,
              action: event.data.action,
              timestamp: new Date(event.data.timestamp),
              details: event.data.details,
            };
            executionLogRef.current = [...executionLogRef.current, logEntry];
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId ? { ...m, executionLog: [...executionLogRef.current] } : m
              )
            );
            break;
          }

          case 'tool_call': {
            // ツール呼び出しをログに追加
            const logEntry: ExecutionLogEntry = {
              step: event.data.step,
              type: event.data.tool === 'execute_agent' ? 'payment' : 'logic',
              action: `Tool: ${event.data.tool}`,
              details: event.data.args,
              timestamp: new Date(),
            };
            executionLogRef.current = [...executionLogRef.current, logEntry];
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId ? { ...m, executionLog: [...executionLogRef.current] } : m
              )
            );
            break;
          }

          case 'payment': {
            // 決済情報をログに追加
            const logEntry: ExecutionLogEntry = {
              step: executionLogRef.current.length + 1,
              type: 'payment',
              action: `Payment: $${event.data.amount} USDC`,
              details: {
                amount: event.data.amount,
                totalCost: event.data.totalCost,
                remainingBudget: event.data.remainingBudget,
              },
              timestamp: new Date(),
            };
            executionLogRef.current = [...executionLogRef.current, logEntry];
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId
                  ? {
                      ...m,
                      executionLog: [...executionLogRef.current],
                      totalCost: event.data.totalCost,
                    }
                  : m
              )
            );
            break;
          }

          case 'end': {
            // 最終的なメッセージを更新
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId
                  ? {
                      ...m,
                      content: event.data.message ? event.data.message : m.content,
                      executionLog: [...executionLogRef.current],
                      totalCost: event.data.totalCost,
                    }
                  : m
              )
            );
            streamingMessageIdRef.current = null;
            break;
          }

          case 'error': {
            setError(event.data.error);
            setMessages((prev) => prev.filter((m) => m.id !== targetId));
            streamingMessageIdRef.current = null;
            break;
          }
        }
      }
    },
    [input, walletId, walletAddress, maxBudget]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setInput('');
    setError(null);
    setIsLoading(false);
    streamingMessageIdRef.current = null;
    executionLogRef.current = [];
  }, []);

  return useMemo(
    () => ({
      messages,
      input,
      setInput,
      sendMessage,
      isLoading,
      error,
      clearError,
      reset,
    }),
    [messages, input, sendMessage, isLoading, error, clearError, reset]
  );
}
