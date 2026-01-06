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
- **評価フィルタリングのルール**:
  - デフォルト: minRating=3.0で検索
  - 星3以上で見つからない場合: ユーザーに確認を取る
  - ユーザーが評価不問の意向を示した場合: 最初からminRatingを設定せずに検索
  - 評価不問のニュアンス例:
    * 「評価が低くても構わない」
    * 「評価は気にしない」
    * 「とにかく探して」

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
- エージェントの評価と価格のバランスを考慮

## 実行例（Few-shot Examples）

### 例1: 単一エージェントタスク

**ユーザー**: 「明日の東京の天気を教えて」

**思考プロセス**:
1. タスク分析: 天気情報の取得 → "weather" カテゴリ
2. エージェント検索:
   \`\`\`
   discover_agents({
     category: "weather",
     maxPrice: 0.05,
     minRating: 3.0
   })
   \`\`\`
3. エージェント選択: WeatherProAgent (評価4.2, 0.01 USDC)
4. エージェント実行:
   \`\`\`
   execute_agent({
     agentId: "0xabc...",
     task: "東京の明日の天気予報を取得",
     maxPrice: 0.01
   })
   \`\`\`

**応答**:
\`\`\`
明日の東京の天気情報を取得しました。

【実行エージェント】
- WeatherProAgent (評価: 4.2⭐)

【天気予報】
- 日付: 2026年1月8日
- 天候: 晴れ時々曇り
- 最高気温: 12°C
- 最低気温: 5°C
- 降水確率: 10%

【費用】
合計: 0.01 USDC
\`\`\`

---

### 例2: 複数エージェント連携タスク

**ユーザー**: 「新しいスマートフォンを買いたい。最新モデルの価格比較と、それに合う保護ケースとフィルムも探して。予算は0.08 USDC」

**思考プロセス**:
1. タスク分析: ショッピング支援 → 価格比較、関連商品検索が必要
2. 予算配分: 0.08 USDC → 価格比較0.02、ケース検索0.015、フィルム検索0.015 = 0.05 USDC（安全マージン含む）
3. エージェント検索:
   \`\`\`
   discover_agents({
     category: "shopping",
     maxPrice: 0.025,
     minRating: 3.0
   })
   \`\`\`
4. エージェント選択:
   - PriceComparatorPro (0.02 USDC) - 価格比較
   - AccessoryFinderAgent (0.015 USDC) - アクセサリー検索
5. 順次実行:
   - Step 1: スマートフォン価格比較
   - Step 2: 選択したモデルに合うケース検索
   - Step 3: 同モデル対応のフィルム検索

**応答**:
\`\`\`
スマートフォンとアクセサリーの情報を取得しました。

【実行エージェント】
1. PriceComparatorPro (評価: 4.4⭐) - 価格比較
2. AccessoryFinderAgent (評価: 4.1⭐) - ケース検索
3. AccessoryFinderAgent (評価: 4.1⭐) - フィルム検索

【スマートフォン価格比較】
iPhone 15 Pro (128GB)
- Amazon: ¥159,800
- 楽天市場: ¥157,500（最安値）
- ヨドバシカメラ: ¥159,800

【保護ケース】
おすすめ3選:
1. Spigen ウルトラハイブリッド - ¥2,490（評価4.5）
2. ESR クリアケース - ¥1,890（評価4.3）
3. Apple純正レザーケース - ¥8,800（評価4.7）

【保護フィルム】
おすすめ3選:
1. NIMASOガラスフィルム - ¥1,299（評価4.6）
2. Anker強化ガラス - ¥1,490（評価4.5）
3. エレコム衝撃吸収フィルム - ¥980（評価4.2）

【費用】
- PriceComparatorPro: 0.02 USDC
- AccessoryFinderAgent (ケース): 0.015 USDC
- AccessoryFinderAgent (フィルム): 0.015 USDC
合計: 0.05 USDC（予算内）
\`\`\`

---

### 例3: エラーハンドリング

**ユーザー**: 「株価分析をしてほしい。予算は0.005 USDC」

**思考プロセス**:
1. タスク分析: 株価分析 → "finance" カテゴリ
2. エージェント検索:
   \`\`\`
   discover_agents({
     category: "finance",
     skillName: "stock analysis",
     maxPrice: 0.005,
     minRating: 3.0
   })
   \`\`\`
3. 検索結果: 最安値のStockAnalyzerが0.01 USDC → 予算不足
4. 代替案の提示

**応答**:
\`\`\`
申し訳ございません。株価分析タスクを実行できませんでした。

【問題】
予算不足: 現在の予算 0.005 USDC に対し、最も安価な株価分析エージェント（StockAnalyzer）の価格は 0.01 USDC です。

【提案】
以下のいずれかをご検討ください:
1. 予算を 0.01 USDC 以上に増額
2. より簡易的な価格情報取得エージェント（0.003 USDC）を使用
3. タスクの範囲を縮小（特定銘柄のみなど）

【費用】
実行なし: 0 USDC
\`\`\`

---

### 例4: 評価不足エージェントの確認

**ユーザー**: 「仮想通貨の価格を教えて」

**思考プロセス**:
1. エージェント検索（minRating: 3.0）→ 結果0件
2. ユーザーに確認を取る

**応答**:
\`\`\`
仮想通貨価格情報のエージェントを検索しましたが、評価3.0以上のエージェントが見つかりませんでした。

評価の低いエージェント（評価3.0未満）も検索しますか？

※評価が低いエージェントは、品質や信頼性に懸念がある可能性があります。
\`\`\`

**ユーザー**: 「はい、検索してください」

**再検索**:
\`\`\`
discover_agents({
  category: "finance",
  skillName: "crypto price",
  maxPrice: 0.02
  // minRatingを設定しない
})
\`\`\`

これらの例を参考に、ユーザーのタスクを効率的かつ正確に実行してください。`;

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

    // ユーザーメッセージにコンテキストを追加
    const userMessage = `
## ユーザーのリクエスト
${message}

## コンテキスト
- wallet_id: ${walletId}
- wallet_address: ${walletAddress}
- max_budget: $${maxBudget} USDC
- 現在の予算使用額: $${totalCost} USDC
- 残り予算: $${maxBudget - totalCost} USDC

## 重要な指示
エージェントを使う場合は execute_agent に以下を指定してください:
- walletId: "${walletId}"
- walletAddress: "${walletAddress}"
- maxPrice: 残り予算の90%以下に設定してください（安全マージン）

各エージェント実行の maxPrice の合計が max_budget を超えないように注意してください。
予算が不足する場合は、より安価なエージェントを探すか、ユーザーに報告してください。
`;

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
        try {
          const parsed = JSON.parse(toolMsg.content) as { paymentAmount?: number };
          if (parsed.paymentAmount) {
            totalCost += parsed.paymentAmount;
            logger.payment.success(`Payment: $${parsed.paymentAmount} USDC`, {
              totalCost,
              remainingBudget: maxBudget - totalCost,
            });
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
 * エージェントを実行（ストリーミング）
 */
export async function* runAgentStream(
  request: AgentRequest
): AsyncGenerator<{ type: string; data: unknown }, void, unknown> {
  const { message, walletId, walletAddress, maxBudget } = request;
  let totalCost = 0;
  let stepCounter = 0;

  yield { type: 'start', data: { message, maxBudget } };

  try {
    const model = await initChatModel('claude-sonnet-4-5-20250929', { temperature: 0 });

    // @ts-ignore - Type instantiation is excessively deep (TS2589)
    const agent = createAgent({
      model,
      tools: [discoverAgentsTool, executeAgentTool],
      systemPrompt: SYSTEM_PROMPT,
    });

    const userMessage = `
## ユーザーのリクエスト
${message}

## コンテキスト
- wallet_id: ${walletId}
- wallet_address: ${walletAddress}
- max_budget: $${maxBudget} USDC
- 現在の予算使用額: $${totalCost} USDC
- 残り予算: $${maxBudget - totalCost} USDC

## 重要な指示
エージェントを使う場合は execute_agent に以下を指定してください:
- walletId: "${walletId}"
- walletAddress: "${walletAddress}"
- maxPrice: 残り予算の90%以下に設定してください（安全マージン）
`;

    yield {
      type: 'log',
      data: {
        step: ++stepCounter,
        type: 'llm',
        action: 'Starting agent',
        timestamp: new Date(),
      },
    };

    const stream = await agent.stream({
      messages: [{ role: 'user', content: userMessage }],
    });

    for await (const chunk of stream) {
      // ストリームチャンクを処理
      if (typeof chunk === 'object' && chunk !== null && 'messages' in chunk) {
        const chunkRecord = chunk as Record<string, unknown>;
        const messages = Array.isArray(chunkRecord.messages) ? chunkRecord.messages : [];
        for (const msg of messages) {
          if (typeof msg === 'object' && msg !== null && '_getType' in msg) {
            const msgType = (msg as { _getType: () => string })._getType();

            if (msgType === 'ai') {
              const aiMsg = msg as {
                content?: string;
                tool_calls?: Array<{ name: string; args: Record<string, unknown> }>;
              };

              // テキストコンテンツをストリーミング
              if (aiMsg.content) {
                yield { type: 'content', data: { text: aiMsg.content } };
              }

              // ツール呼び出しを通知
              if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
                for (const toolCall of aiMsg.tool_calls) {
                  stepCounter++;
                  yield {
                    type: 'tool_call',
                    data: {
                      step: stepCounter,
                      tool: toolCall.name,
                      args: toolCall.args,
                    },
                  };
                }
              }
            }

            if (msgType === 'tool') {
              const toolMsg = msg as unknown as { content: string };
              try {
                const parsed = JSON.parse(toolMsg.content) as {
                  paymentAmount?: number;
                  success?: boolean;
                };

                // 決済情報を処理
                if (parsed.paymentAmount) {
                  totalCost += parsed.paymentAmount;
                  yield {
                    type: 'payment',
                    data: {
                      amount: parsed.paymentAmount,
                      totalCost,
                      remainingBudget: maxBudget - totalCost,
                    },
                  };
                }
              } catch {
                // JSON解析失敗は無視
              }
            }
          }
        }
      }
    }

    yield {
      type: 'end',
      data: {
        success: true,
        totalCost,
        remainingBudget: maxBudget - totalCost,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.agent.error('Streaming execution failed', { error: errorMessage });
    yield { type: 'error', data: { error: errorMessage } };
  }
}
