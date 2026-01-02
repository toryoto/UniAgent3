/**
 * Agent Utilities
 *
 * エージェント関連のユーティリティ関数
 */

import type { AgentJson } from '@agent-marketplace/shared';
import { logger } from '../utils/logger.js';
import { AGENT_JSON_TIMEOUT_MS } from './constants.js';

/**
 * .well-known/agent.json を取得
 */
export async function fetchAgentJson(baseUrl: string): Promise<AgentJson | null> {
  try {
    const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // 既に.well-known/agent.jsonが含まれている場合はそのまま使用
    const agentJsonUrl = normalizedUrl.includes('/.well-known/agent.json')
      ? normalizedUrl
      : `${normalizedUrl}/.well-known/agent.json`;

    logger.logic.info('Fetching agent.json', { url: agentJsonUrl });

    const response = await fetch(agentJsonUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(AGENT_JSON_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.logic.warn('agent.json not found', { status: response.status });
      return null;
    }

    const agentJson = (await response.json()) as AgentJson;
    logger.logic.success('Got agent.json', { endpoint: agentJson.endpoints?.[0]?.url });
    return agentJson;
  } catch (error) {
    logger.logic.warn('Failed to fetch agent.json', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}
