/**
 * Paygent X
 *
 * LangChain.jsを使用したReActエージェント実装
 * - discover_agents: MCPサーバー経由でエージェントを検索
 * - execute_agent: x402決済付きでエージェントを実行
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AgentRequest, AgentResponse, ExecutionLogEntry } from '@agent-marketplace/shared';
import { discoverAgentsTool, executeAgentTool } from '../tools/index.js';
import { logger, logStep, logSeparator } from '../utils/logger.js';

// System prompt for the agent
const SYSTEM_PROMPT = `あなたは UniAgent3 の AI エージェントです。
ユーザーのタスクを達成するために、マーケットプレイス上の外部エージェントを発見・選択・実行します。

## あなたの役割
1. ユーザーのタスクを理解し、必要なエージェントの種類を判断する
2. discover_agents ツールで適切なエージェントを検索する
3. 価格と評価を考慮して最適なエージェントを選択する
4. execute_agent ツールでエージェントを実行する
5. 結果をユーザーにわかりやすく報告する

## 重要な制約
- ユーザーの max_budget を超えないように注意してください
- 複数のエージェントを使う場合は合計コストを計算してください
- エージェント実行時は maxPrice を適切に設定してください

## ツールの使い方
- discover_agents: カテゴリや価格でエージェントを検索
- execute_agent: 選択したエージェントにタスクを依頼（x402決済を自動処理）

## 応答形式
最終的な結果は日本語で簡潔に報告してください。
実行したエージェントと費用も含めてください。`;

/**
 * エージェントを作成
 */
function createAgent() {
  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-20250514',
    temperature: 0,
  });

  const tools = [discoverAgentsTool, executeAgentTool];

  const agent = createReactAgent({
    llm: model,
    tools,
  });

  return agent;
}

/**
 * エージェントを実行
 */
export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const { message, walletId, walletAddress, maxBudget } = request;
  const executionLog: ExecutionLogEntry[] = [];
  let totalCost = 0;
  let stepCounter = 0;

  logSeparator('Agent Execution Start');
  logger.agent.info('Received request', { message, walletId, walletAddress, maxBudget });

  executionLog.push({
    step: ++stepCounter,
    type: 'llm',
    action: 'Request received',
    details: { message, maxBudget },
    timestamp: new Date(),
  });

  try {
    const agent = createAgent();

    // ユーザーメッセージにコンテキストを追加
    const userMessage = `
## ユーザーのリクエスト
${message}

## コンテキスト
- wallet_id: ${walletId}
- wallet_address: ${walletAddress}
- max_budget: $${maxBudget} USDC

エージェントを使う場合は execute_agent に以下を指定してください:
- walletId: "${walletId}"
- walletAddress: "${walletAddress}"
各エージェント実行の maxPrice の合計が max_budget を超えないようにしてください。
`;

    logStep(stepCounter, 'llm', 'Starting ReAct agent loop');

    // エージェント実行
    const result = await agent.invoke({
      messages: [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(userMessage)],
    });

    // メッセージからログを抽出
    for (const msg of result.messages) {
      if (msg._getType() === 'ai') {
        const aiMsg = msg as {
          tool_calls?: Array<{ name: string; args: Record<string, unknown> }>;
        };

        // ツール呼び出しをログ
        if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
          for (const toolCall of aiMsg.tool_calls) {
            stepCounter++;
            logStep(stepCounter, 'mcp', `Tool call: ${toolCall.name}`);
            logger.mcp.info('Tool arguments', toolCall.args);

            executionLog.push({
              step: stepCounter,
              type: toolCall.name === 'execute_agent' ? 'payment' : 'logic',
              action: `Tool: ${toolCall.name}`,
              details: toolCall.args,
              timestamp: new Date(),
            });
          }
        }
      }

      if (msg._getType() === 'tool') {
        // LangChainのToolMessage型にはcontentプロパティがある
        const toolMsg = msg as { content: string };
        try {
          const parsed = JSON.parse(toolMsg.content) as { paymentAmount?: number };
          if (parsed.paymentAmount) {
            totalCost += parsed.paymentAmount;
            logger.payment.success(`Payment: $${parsed.paymentAmount} USDC`);
          }
        } catch {
          // JSON解析失敗は無視
        }
      }
    }

    // 最終レスポンスを取得
    const lastMessage = result.messages[result.messages.length - 1];
    const finalResponse =
      lastMessage._getType() === 'ai'
        ? (lastMessage as { content: string }).content
        : 'タスクが完了しました。';

    stepCounter++;
    logStep(stepCounter, 'llm', 'Agent execution completed');

    executionLog.push({
      step: stepCounter,
      type: 'llm',
      action: 'Execution completed',
      details: { totalCost },
      timestamp: new Date(),
    });

    logSeparator('Agent Execution End');
    logger.agent.success('Total cost', { totalCost });

    return {
      success: true,
      message: typeof finalResponse === 'string' ? finalResponse : JSON.stringify(finalResponse),
      executionLog,
      totalCost,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.agent.error('Agent execution failed', { error: errorMessage });

    executionLog.push({
      step: ++stepCounter,
      type: 'error',
      action: 'Execution failed',
      details: { error: errorMessage },
      timestamp: new Date(),
    });

    logSeparator('Agent Execution End (Error)');

    return {
      success: false,
      message: '',
      executionLog,
      totalCost,
      error: errorMessage,
    };
  }
}
