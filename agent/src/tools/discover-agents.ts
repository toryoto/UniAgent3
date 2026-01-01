/**
 * Discover Agents Tool
 *
 * MCPサーバーに接続してエージェントを検索するLangChainツール
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { DiscoveredAgent } from '@agent-marketplace/shared';
import { logger } from '../utils/logger.js';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';

interface MCPToolCallRequest {
  jsonrpc: '2.0';
  id: number;
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface MCPToolCallResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content: Array<{ type: string; text: string }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * MCPサーバーのdiscover_agentsツールを呼び出す
 */
async function callMCPDiscoverAgents(params: {
  category?: string;
  skillName?: string;
  maxPrice?: number;
  minRating?: number;
}): Promise<{ agents: DiscoveredAgent[]; total: number }> {
  const request: MCPToolCallRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'discover_agents',
      arguments: params,
    },
  };

  logger.mcp.info(`Calling MCP discover_agents`, { url: MCP_SERVER_URL, params });

  const response = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`MCP server error: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as MCPToolCallResponse;

  if (result.error) {
    throw new Error(`MCP tool error: ${result.error.message}`);
  }

  if (!result.result?.content?.[0]?.text) {
    throw new Error('Invalid MCP response format');
  }

  const parsed = JSON.parse(result.result.content[0].text);
  logger.mcp.success(`Found ${parsed.total} agents`);

  return parsed;
}

/**
 * discover_agents ツール定義
 */
export const discoverAgentsTool = tool(
  async (input) => {
    try {
      const result = await callMCPDiscoverAgents({
        category: input.category,
        skillName: input.skillName,
        maxPrice: input.maxPrice,
        minRating: input.minRating,
      });

      // LLMが理解しやすい形式に変換
      const summary = result.agents.map((agent) => ({
        agentId: agent.agentId,
        name: agent.name,
        description: agent.description,
        url: agent.url,
        endpoint: agent.endpoint,
        price: agent.price,
        rating: agent.rating,
        category: agent.category,
        skills: agent.skills.map((s) => s.name),
      }));

      return JSON.stringify({
        success: true,
        total: result.total,
        agents: summary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.mcp.error('discover_agents failed', { error: message });
      return JSON.stringify({
        success: false,
        error: message,
        agents: [],
      });
    }
  },
  {
    name: 'discover_agents',
    description: `ブロックチェーン上のAgentRegistryからエージェントを検索します。
カテゴリやスキル名で検索可能で、価格・評価でのフィルタリングもサポートしています。
結果にはエージェントのID、名前、説明、URL、価格（USDC）、評価が含まれます。`,
    schema: z.object({
      category: z
        .string()
        .optional()
        .describe('検索するカテゴリ (例: "travel", "finance", "utility")'),
      skillName: z.string().optional().describe('検索するスキル名 (部分一致)'),
      maxPrice: z.number().optional().describe('最大価格 (USDC)'),
      minRating: z.number().min(0).max(5).optional().describe('最小評価 (0-5)'),
    }),
  }
);
