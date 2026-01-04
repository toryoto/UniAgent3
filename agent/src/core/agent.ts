/**
 * Paygent X - LangChain v1 Implementation (Middleware不使用)
 *
 * LangChain v1を使用したシンプルなReActエージェント実装
 * - discover_agents: MCPサーバー経由でエージェントを検索
 * - execute_agent: x402決済付きでエージェントを実行
 * - ストリーミング対応
 */

import { createAgent, initChatModel } from 'langchain';
import type { AgentRequest, AgentResponse, ExecutionLogEntry } from '@agent-marketplace/shared';
import { discoverAgentsTool, executeAgentTool } from '../tools/index.js';
import { logger, logStep, logSeparator } from '../utils/logger.js';

const SYSTEM_PROMPT = `あなたは UniAgent の AI エージェントです。
ユーザーのタスクを達成するために、マーケットプレイス上の外部エージェントを発見・選択・実行します。

## あなたの役割と思考プロセス

### 1. タスク分析フェーズ
- ユーザーのリクエストを詳細に分析する
- 必要なエージェントの種類、カテゴリ、スキルを特定する
- タスクの複雑さと必要なステップ数を評価する

### 2. エージェント検索フェーズ
- discover_agents ツールを使用して適切なエージェントを検索
- 検索パラメータ:
  - category: タスクに関連するカテゴリ（例: "travel", "finance", "utility"）
  - skillName: 必要なスキル名（部分一致可）
  - maxPrice: 予算内に収まる価格範囲
  - minRating: 最低評価（推奨: 3.0以上）

### 3. エージェント選択フェーズ
検索結果から最適なエージェントを選択する際は以下を考慮:
- **価格**: 予算内に収まり、かつコストパフォーマンスが良い
- **評価**: 高い評価と十分な評価数
- **説明**: タスク要件と一致するスキルと説明
- **複数エージェント**: 必要に応じて複数のエージェントを組み合わせる

### 4. エージェント実行フェーズ
- execute_agent ツールで選択したエージェントを実行
- 各実行前に残り予算を確認
- 複数エージェントを使用する場合は、合計コストを常に追跡

### 5. 結果統合フェーズ
- 複数のエージェントからの結果を統合
- ユーザーにわかりやすく、構造化された形で報告

## 重要な制約とガイドライン

### 予算管理
- ユーザーの max_budget を絶対に超えないこと
- 各エージェント実行の maxPrice は、残り予算の90%以下に設定（安全マージン）
- 複数のエージェントを使う場合は、合計コストを事前に計算
- 予算が不足する場合は、ユーザーに明確に報告

### エラーハンドリング
- エージェント実行が失敗した場合:
  1. エラーメッセージを分析
  2. 代替エージェントを検索
  3. 予算不足の場合は、より安価なエージェントを探す
  4. それでも解決できない場合は、ユーザーに状況を報告

### 応答形式
- 最終的な結果は日本語で簡潔かつ構造化して報告
- 以下の情報を含める:
  - 実行したエージェント名とその役割
  - 各エージェントの実行結果
  - 合計費用（USDC）
  - エラーが発生した場合は、その内容と対処方法

### 最適化のヒント
- 可能な限り効率的にタスクを完了する（不要なエージェント呼び出しを避ける）
- 類似のタスクを1つのエージェントで処理できる場合は、それを使用
- エージェントの評価と価格のバランスを考慮`;

/**
 * ユーザーメッセージを生成（コンテキスト情報を含む）
 */
function buildUserMessage(
  message: string,
  walletId: string,
  walletAddress: string,
  maxBudget: number,
  currentCost: number
): string {
  return `
## ユーザーのリクエスト
${message}

## コンテキスト
- wallet_id: ${walletId}
- wallet_address: ${walletAddress}
- max_budget: $${maxBudget} USDC
- 現在の予算使用額: $${currentCost} USDC
- 残り予算: $${maxBudget - currentCost} USDC

## 重要な指示
エージェントを使う場合は execute_agent に以下を指定してください:
- walletId: "${walletId}"
- walletAddress: "${walletAddress}"
- maxPrice: 残り予算の90%以下に設定してください（安全マージン）

各エージェント実行の maxPrice の合計が max_budget を超えないように注意してください。
予算が不足する場合は、より安価なエージェントを探すか、ユーザーに報告してください。
`;
}

/**
 * ツール実行結果から決済情報を抽出
 */
function extractPaymentInfo(content: string): number | null {
  try {
    const parsed = JSON.parse(content) as { paymentAmount?: number };
    return parsed.paymentAmount ?? null;
  } catch {
    return null;
  }
}

/**
 * エージェントを実行（非ストリーミング）
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
    const model = await initChatModel('claude-sonnet-4-5-20250929', { temperature: 0 });

    // @ts-ignore - Type instantiation is excessively deep (TS2589)
    const agent = createAgent({
      model,
      tools: [discoverAgentsTool, executeAgentTool],
      systemPrompt: SYSTEM_PROMPT,
    });

    const userMessage = buildUserMessage(message, walletId, walletAddress, maxBudget, totalCost);

    logStep(stepCounter, 'llm', 'Starting ReAct agent loop');

    const result = await agent.invoke({
      messages: [{ role: 'user', content: userMessage }],
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
        const toolMsg = msg as { content: string };
        const paymentAmount = extractPaymentInfo(toolMsg.content);
        if (paymentAmount !== null) {
          totalCost += paymentAmount;
          logger.payment.success(`Payment: $${paymentAmount} USDC`, {
            totalCost,
            remainingBudget: maxBudget - totalCost,
          });
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
    logger.agent.success('Total cost', { totalCost, remainingBudget: maxBudget - totalCost });

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

/**
 * ストリーミング中のテキストコンテンツを処理
 * @returns 更新されたfullContent
 */
function processTextBlock(
  block: { type: string; text?: string },
  nodeName: string | undefined,
  fullContent: string
): { newContent: string; event?: { type: 'token'; data: { token: string; node?: string } } } {
  if (block.type === 'text' && block.text) {
    return {
      newContent: fullContent + block.text,
      event: {
        type: 'token',
        data: {
          token: block.text,
          node: nodeName,
        },
      },
    };
  }
  return { newContent: fullContent };
}

/**
 * 完了したツールコールを処理
 */
function processCompletedToolCall(
  block: { type: string; [key: string]: unknown },
  stepCounter: number
): { step: number; tool: string; args: Record<string, unknown>; id?: string } | null {
  if (block.type === 'tool_call' && block.name && typeof block.name === 'string') {
    const args =
      typeof block.args === 'object' && block.args !== null && !Array.isArray(block.args)
        ? (block.args as Record<string, unknown>)
        : {};
    return {
      step: stepCounter + 1,
      tool: block.name,
      args,
      id: typeof block.id === 'string' ? block.id : undefined,
    };
  }
  return null;
}

/**
 * ツール実行結果を処理（決済情報の抽出を含む）
 */
function processToolResult(
  content: string,
  totalCost: number,
  maxBudget: number
): { paymentAmount: number; totalCost: number; remainingBudget: number } | null {
  const paymentAmount = extractPaymentInfo(content);
  if (paymentAmount !== null) {
    return {
      paymentAmount,
      totalCost: totalCost + paymentAmount,
      remainingBudget: maxBudget - (totalCost + paymentAmount),
    };
  }
  return null;
}

/**
 * エージェントを実行（ストリーミング）
 *
 * LangChain v1のstreamMode: 'messages'を使用して、トークン単位でストリーミング。
 * ツールコールは完了時に一度だけ通知される。
 */
export async function* runAgentStream(
  request: AgentRequest
): AsyncGenerator<{ type: string; data: unknown }, void, unknown> {
  const { message, walletId, walletAddress, maxBudget } = request;
  let totalCost = 0;
  let stepCounter = 0;

  yield { type: 'start', data: { message, maxBudget } };

  try {
    // @ts-ignore - Type instantiation is excessively deep (TS2589)
    const agent = createAgent({
      model: 'claude-sonnet-4-5-20250929',
      tools: [discoverAgentsTool, executeAgentTool],
      systemPrompt: SYSTEM_PROMPT,
    });

    const userMessage = buildUserMessage(message, walletId, walletAddress, maxBudget, totalCost);

    yield {
      type: 'log',
      data: {
        step: ++stepCounter,
        type: 'llm',
        action: 'Starting agent',
        timestamp: new Date(),
      },
    };

    // LangChain v1: streamMode 'messages' - トークン単位でストリーミング
    const stream = await agent.stream(
      { messages: [{ role: 'user', content: userMessage }] },
      { streamMode: 'messages' }
    );

    // 最終的な完全なテキストを蓄積
    let fullContent = '';

    for await (const [token, metadata] of stream) {
      const nodeName = metadata.langgraph_node;

      // content_blocks を取得（LangChain v1形式）
      const contentBlocks = token.contentBlocks || [];

      for (const block of contentBlocks) {
        // テキストトークンのストリーミング（リアルタイム表示）
        const textResult = processTextBlock(block, nodeName, fullContent);
        fullContent = textResult.newContent;
        if (textResult.event) {
          yield textResult.event;
        }

        // 完了したツールコールの処理
        const toolCall = processCompletedToolCall(block, stepCounter);
        if (toolCall) {
          stepCounter++;
          yield {
            type: 'tool_call',
            data: {
              step: toolCall.step,
              tool: toolCall.tool,
              args: toolCall.args,
              id: toolCall.id,
            },
          };
        }
      }

      // ToolMessage の処理（ツール実行結果）
      if (nodeName === 'tools') {
        const content =
          typeof token.content === 'string'
            ? token.content
            : contentBlocks.find((b: { type: string }) => b.type === 'text')?.text;

        if (content && typeof content === 'string') {
          // 決済情報の処理
          const paymentInfo = processToolResult(content, totalCost, maxBudget);
          if (paymentInfo) {
            totalCost = paymentInfo.totalCost;
            yield {
              type: 'payment',
              data: {
                amount: paymentInfo.paymentAmount,
                totalCost: paymentInfo.totalCost,
                remainingBudget: paymentInfo.remainingBudget,
              },
            };
          }
        }
      }
    }

    // 最終メッセージ
    const finalMessage = fullContent.trim() || 'タスクが完了しました。';

    yield {
      type: 'end',
      data: {
        success: true,
        totalCost,
        remainingBudget: maxBudget - totalCost,
        message: finalMessage,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.agent.error('Streaming execution failed', { error: errorMessage });
    yield { type: 'error', data: { error: errorMessage } };
  }
}
