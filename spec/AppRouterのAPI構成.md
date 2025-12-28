```
app/
├─ api/v1
│  ├─ agents/              # 人間/UI向け公開API(REST)
│  │  └─ route.ts          # GET /api/agents
│  │
│  ├─ chat/                # UIチャット入口(REST)
│  │  └─ route.ts          # POST /api/chat
│  │
│  ├─ agent-runtime/       # LLM / MCP Host 入口
│  │  ├─ discover/
│  │  │  └─ route.ts       # POST /api/agent-runtime/discover
│  │  ├─ execute/
│  │  │  └─ route.ts       # POST /api/agent-runtime/execute
│  │  └─ policy/
│  │     └─ route.ts
│  │
│  └─ internal/            # 外部非公開
│     ├─ mcp/
│     │  └─ client.ts
│     ├─ wallet/
│     │  └─ privy.ts
│     └─ payment/
│        └─ x402.ts
│
├─ domain/                 # 共通ロジック
│  ├─ agent/
│  │  ├─ discover.ts
│  │  └─ execute.ts
│  └─ ledger/
│     └─ record.ts
```
