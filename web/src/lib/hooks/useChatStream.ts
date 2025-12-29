/**
 * useChatStream - SSE 接続・パースロジック
 *
 * SSE ストリームの接続、イベントパース、中断処理を担当。
 * メッセージの状態管理は useChat に委譲。
 */

import { useCallback, useRef } from 'react';
import type { ChatApiRequest, ChatSSEEvent } from '@/lib/types';

export interface UseChatStreamOptions {
  onEvent: (event: ChatSSEEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export interface UseChatStreamReturn {
  startStream: (request: ChatApiRequest) => Promise<void>;
  abort: () => void;
  isStreaming: boolean;
}

export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const { onEvent, onError, onComplete } = options;

  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isStreamingRef.current = false;
  }, []);

  const startStream = useCallback(
    async (request: ChatApiRequest) => {
      // 既存のストリームがあれば中断
      abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      isStreamingRef.current = true;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
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
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const chunk of lines) {
            if (!chunk.startsWith('data: ')) continue;
            const data = chunk.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data) as ChatSSEEvent;
              onEvent(event);

              if (event.type === 'error') {
                throw new Error(event.error);
              }
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
              const event = JSON.parse(data) as ChatSSEEvent;
              onEvent(event);
            } catch {
              // 無視
            }
          }
        }

        onComplete?.();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // 中断は正常終了扱い
          return;
        }
        onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        isStreamingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [abort, onEvent, onError, onComplete]
  );

  return {
    startStream,
    abort,
    get isStreaming() {
      return isStreamingRef.current;
    },
  };
}
