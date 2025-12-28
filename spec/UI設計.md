# UI設計（PoC）

## プロジェクト名

**UniAgent3** - AI エージェントの分散型マーケットプレイス

## デザイン方針

- **最優先**: 一般的なAIが作成したと一目でわかるようなUIではなく洗練された人間が開発したようなUIにすること
- **参考デザイン**: NFT Marketplace (OpenSea風)
- **カラー**: 宇宙をイメージした深い青・紫系（Uni = Universe）
- **技術**: shadcn/ui + Tailwind CSS
- **レイアウト**: サイドバーナビゲーション
- **原則**: シンプル・実用的・過度なコンポーネント化を避ける

---

## 画面一覧（6画面）

### 1. Topページ（`/`）

**役割**: ランディングページ

**構成**:

- ヘッダー（ロゴ + Privyログインボタン）
- ヒーローセクション（キャッチコピー + CTA）
- 特徴紹介（Discovery, Trust, Automation, Openness）
- 使い方（3ステップ）
- フッター

**未認証時**: そのまま閲覧可能
**認証後**: ヘッダーにウォレットアドレス表示

---

### 2. ウォレット画面（`/wallet`）

**役割**: USDC入金・予算設定

**認証**: 必須（未認証時はPrivyモーダル表示）

**構成**:

```
[サイドバー]
- Chat
- Marketplace
- History
- Wallet (選択中)
- Faucet

[メインコンテンツ]
1. ウォレット情報カード
   - アドレス（コピーボタン付き）
   - ETH残高
   - USDC残高

2. USDC入金セクション
   - Base Sepolia USDC Contract表示
   - 入金手順説明
   - Approve実行ボタン

3. 予算設定セクション
   - 日次上限（入力）
   - 自動承認閾値（入力）
   - 保存ボタン

4. Faucetリンク
   - Sepolia ETH Faucet
   - USDC Faucet（テストネット用）
```

---

### 3. Chat画面（`/chat`）

**役割**: Claude AIエージェントとの対話

**認証**: 必須

**構成**:

```
[サイドバー]
- Chat (選択中)
- Marketplace
- History
- Wallet
- Faucet

[メインコンテンツ]
- チャット履歴エリア（スクロール可能）
  - ユーザーメッセージ
  - AIメッセージ
  - 実行ログ（MCP Tool呼び出し履歴を展開可能）
  - 決済情報（金額・txHash）

- 入力エリア
  - テキストエリア
  - 送信ボタン
  - 例: 「パリ3日間の旅行プランを作成して」

- 実行完了後
  - 評価入力UI（★1-5）
  - 送信ボタン
```

**実行ログ表示例**:

```
[Claude] タスクを分析中...
[MCP: discover_agents] カテゴリ「travel」で検索...
[MCP: discover_agents] 3件のエージェントを発見
[Claude] FlightAgent（評価4.5）を選択
[MCP: execute_agent_capability] 実行中...
[MCP: execute_agent_capability] 決済完了 (tx: 0x1234...)
[Claude] フライト情報を取得しました
```

---

### 4. Marketplace画面（`/marketplace`）

**役割**: エージェント検索・一覧表示

**認証**: 不要（閲覧のみ可能）

**構成**:

```
[サイドバー]
- Chat
- Marketplace (選択中)
- History
- Wallet

[メインコンテンツ]
1. 検索・フィルターエリア
   - キーワード検索
   - カテゴリ選択
   - 価格範囲（min-max）
   - 評価フィルター（最小評価）

2. エージェントカード一覧（グリッド）
   各カード:
   - エージェント名
   - 説明（1-2行）
   - カテゴリバッジ
   - 価格（USDC）
   - 評価（★4.5）
   - 利用回数
   - 詳細ボタン
```

---

### 5. エージェント詳細画面（`/marketplace/[id]`）

**役割**: エージェントの詳細情報表示

**認証**: 不要（閲覧のみ可能）

**構成**:

```
[サイドバー]
- Chat
- Marketplace (選択中)
- History
- Wallet
- Faucet

[メインコンテンツ]
1. エージェント情報
   - 名前
   - 説明
   - カテゴリ
   - 価格
   - 平均評価（★表示）
   - 総利用回数
   - オーナーアドレス
   - エンドポイントURL

2. スキル一覧
   - スキル名
   - スキル説明

3. 統計
   - 評価分布グラフ（1-5の分布）
   - 最近の利用履歴

4. アクション
   - Chatで利用ボタン → /chat に遷移
```

---

### 6. History画面（`/history`）

**役割**: トランザクション履歴・評価履歴

**認証**: 必須

**構成**:

```
[サイドバー]
- Chat
- Marketplace
- History (選択中)
- Wallet
- Faucet

[メインコンテンツ]
1. 統計サマリー
   - 総支出（USDC）
   - 総利用回数
   - 平均評価

2. トランザクション一覧（テーブル）
   列:
   - 日時
   - エージェント名
   - 金額（USDC）
   - 評価（★）
   - txHash（Blockscoutリンク）
   - ステータス

3. フィルター
   - 期間選択
   - エージェント選択
   - 評価フィルター
```

---

## 共通コンポーネント

### サイドバーナビゲーション

```
[Logo: UniAgent3]

メニュー:
- Chat
- Marketplace
- History
- Wallet
- Faucet

[下部]
- ウォレットアドレス（短縮表示）
- Disconnect
```

### ヘッダー（Topページのみ）

```
[Logo: UniAgent3]  [メニュー] [Privyログインボタン]
```

---

## カラーパレット（宇宙テーマ）

```css
プライマリ: #5B21B6 (紫)
セカンダリ: #1E40AF (深い青)
アクセント: #8B5CF6 (明るい紫)
背景: #0F172A (ダークブルー)
カード: #1E293B (スレートグレー)
テキスト: #F1F5F9 (明るいグレー)
成功: #10B981 (グリーン)
警告: #F59E0B (オレンジ)
```

---

## 認証フロー

1. **未認証ユーザー**:
   - Top, Marketplace, Agent詳細 → 閲覧可能
   - Chat, History, Wallet → Privyログインモーダル表示

2. **認証後**:
   - 全画面アクセス可能
   - サイドバーにウォレット情報表示
   - 自動的にウォレット作成（Privy）

---

## 実装優先順位

1. **Phase 1**: Top + 認証
   - Topページ
   - Privyログイン統合
   - サイドバーレイアウト

2. **Phase 2**: Wallet + Marketplace
   - Wallet画面（入金・予算設定）
   - Marketplace一覧
   - Agent詳細

3. **Phase 3**: Chat
   - Chat UI
   - Claude API統合
   - 実行ログ表示
   - 評価入力

4. **Phase 4**: History
   - トランザクション履歴
   - 統計グラフ

---

## 技術要件

- **フレームワーク**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **認証**: Privy SDK
- **ブロックチェーン**: ethers.js + wagmi
- **状態管理**: React Query
- **アイコン**: lucide-react

---

## 注意事項（PoC）

- ❌ 過度なコンポーネント分割を避ける
- ✅ 機能優先・シンプル実装
- ✅ デモシナリオが動作することを最優先
