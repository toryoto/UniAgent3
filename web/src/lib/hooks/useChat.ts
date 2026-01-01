/**
 * useChat - チャットビジネスロジック（メッセージ管理・送信・状態管理）
 *
 * useChatStream を利用して SSE イベントを受け取り、
 * メッセージ配列や UI 状態を管理する。
 *
 * このカスタムフックはシンプルなClaude API実行用
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatStream } from './useChatStream';
import type { ChatMessage, ChatSSEEvent, MCPConfig, ToolCallLog } from '@/lib/types';

export interface UseChatOptions {
  initialMessages?: ChatMessage[];
  mcpConfig?: MCPConfig;
  onError?: (error: Error) => void;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: (content?: string) => Promise<void>;
  abort: () => void;
  isStreaming: boolean;
  error: string | null;
  clearError: () => void;
  reset: () => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { initialMessages = [], mcpConfig, onError } = options;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // 現在ストリーミング中のアシスタントメッセージID（refで保持してレースを避ける）
  const streamingMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // SSE イベントハンドラー
  const handleEvent = useCallback((event: ChatSSEEvent) => {
    const targetId = streamingMessageIdRef.current;

    switch (event.type) {
      case 'start': {
        streamingMessageIdRef.current = event.messageId;
        // アシスタントメッセージを追加（空の状態で開始）
        const newMessage: ChatMessage = {
          id: event.messageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          metadata: { toolCalls: [] },
        };
        setMessages((prev) => [...prev, newMessage]);
        break;
      }

      case 'delta': {
        if (!targetId) break;
        setMessages((prev) =>
          prev.map((m) => (m.id === targetId ? { ...m, content: m.content + event.content } : m))
        );
        break;
      }

      case 'tool_use_start': {
        if (!targetId) break;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== targetId) return m;
            const toolCalls = [...(m.metadata?.toolCalls ?? []), event.toolCall];
            return { ...m, metadata: { ...m.metadata, toolCalls } };
          })
        );
        break;
      }

      case 'tool_use_delta': {
        // 将来のMCP統合で tool input をUI表示する場合に利用
        break;
      }

      case 'tool_use_end': {
        if (!targetId) break;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== targetId) return m;
            const toolCalls = (m.metadata?.toolCalls ?? []).map((tc: ToolCallLog) =>
              tc.id === event.toolCallId
                ? { ...tc, status: 'success' as const, output: event.output }
                : tc
            );
            return { ...m, metadata: { ...m.metadata, toolCalls } };
          })
        );
        break;
      }

      case 'end': {
        if (event.usage && targetId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === targetId
                ? { ...m, metadata: { ...m.metadata, cost: event.usage?.outputTokens } }
                : m
            )
          );
        }
        streamingMessageIdRef.current = null;
        break;
      }

      case 'error': {
        setError(event.error);
        streamingMessageIdRef.current = null;
        break;
      }
    }
  }, []);

  const handleStreamError = useCallback(
    (err: Error) => {
      setError(err.message);
      setIsStreaming(false);
      onError?.(err);
    },
    [onError]
  );

  const handleStreamComplete = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const { startStream, abort: abortStream } = useChatStream({
    onEvent: handleEvent,
    onError: handleStreamError,
    onComplete: handleStreamComplete,
  });

  const sendMessage = useCallback(
    async (content?: string) => {
      const text = (content ?? input).trim();
      if (!text) return;

      setError(null);
      setInput('');

      // ユーザーメッセージを追加
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // API 用のメッセージ履歴を構築
      const apiMessages = [...messagesRef.current, userMessage].map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      setIsStreaming(true);
      await startStream({ messages: apiMessages, mcpConfig });
    },
    [input, mcpConfig, startStream]
  );

  const abort = useCallback(() => {
    abortStream();
    setIsStreaming(false);
    streamingMessageIdRef.current = null;
  }, [abortStream]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    abort();
    setMessages(initialMessages);
    setInput('');
    setError(null);
  }, [abort, initialMessages]);

  return useMemo(
    () => ({
      messages,
      input,
      setInput,
      sendMessage,
      abort,
      isStreaming,
      error,
      clearError,
      reset,
    }),
    [messages, input, sendMessage, abort, isStreaming, error, clearError, reset]
  );
}
