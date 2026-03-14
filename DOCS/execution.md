# Voice Trade — Execution Plan (3-Dev Split)

> Date: 2026-03-14
> Stack: Next.js App Router + TypeScript + Tailwind + Liquid SDK + OpenAI/Anthropic

---

## Overview

Each developer owns a vertical slice. Integration checkpoints are defined explicitly so all three slices can be merged once a feature is complete.

| Dev | Owns | Primary concern |
|-----|------|-----------------|
| **Dev A** | Backend + Liquid SDK integration + execution logic | Liquid API, trade execution, validation, safety |
| **Dev B** | Frontend + UI components + voice input | User experience, confirmation flows, layout |
| **Dev C** | LLM parsing + planning + API route layer | Structured output, schemas, parse/preview routes |

---

## Shared contracts (define first — all three devs depend on these)

Before any dev starts, agree on and commit `lib/types.ts` and `lib/constants.ts`.

### `lib/types.ts`

```ts
export type TradeAction =
  | "place_order"
  | "close_position"
  | "cancel_all_orders"
  | "set_tp_sl"
  | "rebalance_preview"
  | "panic";

export interface TradeCommand {
  action: TradeAction;
  symbol?: string;           // e.g. "BTC-PERP"
  side?: "buy" | "sell";
  order_type?: "market" | "limit";
  size_usd?: number;
  price?: number;
  leverage?: number;
  tp?: number;
  sl?: number;
  reduce_only?: boolean;
  urgency?: "panic" | "normal";
}

export interface TradePlanAction extends TradeCommand {
  order_index: number;
  note?: string;
}

export interface TradePlan {
  intent_summary: string;
  preconditions: string[];
  actions: TradePlanAction[];
  user_confirmation_required: true;
  estimated_total_mutations: number;
}

export interface PreviewCard {
  type: "trade" | "rebalance" | "panic";
  summary: string;
  details: Record<string, string | number>;
  confirmation_token: string;
  warnings: string[];
}

export interface ExecutionReceipt {
  id: string;
  type: "order" | "panic" | "rebalance";
  status: "executed" | "partial" | "failed";
  liquid_order_ids: string[];
  error?: string;
  timestamp: string;
}

export interface PanicPreview {
  open_orders_count: number;
  open_positions: { symbol: string; size: number }[];
  estimated_mutations: number;
  confirmation_token: string;
}

export interface PortfolioSnapshot {
  account: {
    balance_usd: number;
    available_usd: number;
  };
  positions: {
    symbol: string;
    side: "long" | "short";
    size: number;
    mark_price: number;
    unrealized_pnl: number;
  }[];
  open_orders: {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    size_usd: number;
    status: string;
  }[];
}
```

### `lib/constants.ts`

```ts
export const MAX_ORDER_USD = 500;
export const MAX_LEVERAGE = 10;
export const MIN_ORDER_USD = 10;
export const DAILY_LOSS_LIMIT_USD = 200;
export const SUPPORTED_SYMBOLS = ["BTC-PERP", "ETH-PERP", "SOL-PERP"];
export const PANIC_KEYWORDS = ["panic", "close all", "flatten", "emergency"];
export const CONFIRMATION_TOKEN_TTL_MS = 60_000; // 1 minute
export const MUTATION_DELAY_MS = 300; // rate-limit buffer between mutations
```

---

## Dev A — Backend + Liquid SDK + Execution

### Owns
- `lib/liquid.ts` — Liquid SDK wrapper
- `lib/validator.ts` — server-side trade validation
- `lib/queue.ts` — mutation queue with throttling
- `lib/audit.ts` — JSONL audit logger
- `lib/panic.ts` — panic flow orchestration
- `app/api/portfolio/route.ts`
- `app/api/command/execute/route.ts`
- `app/api/panic/execute/route.ts`
- `app/api/rebalance/execute/route.ts`
- `app/api/health/route.ts`

### Tasks

#### A1 — Liquid SDK wrapper (`lib/liquid.ts`)
- Wrap Liquid SDK: `getHealth`, `getAccount`, `getPositions`, `getOpenOrders`, `getMarkets`, `getTicker`
- Wrap mutations: `placeOrder`, `cancelAllOrders`, `cancelOrder`, `closePosition`
- All methods return typed responses using shared types
- Never auto-retry mutations
- Expose a `LiquidClient` singleton initialized from env vars (`LIQUID_API_KEY`, `LIQUID_API_SECRET`)

**Integration point A1:** Dev C's preview route and Dev A's execute routes both import `LiquidClient`. Agree on method signatures before Dev C starts their preview routes.

#### A2 — Validator (`lib/validator.ts`)
Deterministic, throws on violation:
- `validateSymbol(symbol)` — must be in `/v1/markets` or `SUPPORTED_SYMBOLS`
- `validateLeverage(leverage)` — must be ≤ `MAX_LEVERAGE`
- `validateOrderSize(size_usd)` — must be ≥ `MIN_ORDER_USD` and ≤ `MAX_ORDER_USD`
- `validateBalance(size_usd, available_usd)` — size must not exceed available balance
- `validateConfirmationToken(token)` — must exist and not be expired

#### A3 — Audit logger (`lib/audit.ts`)
- Append-only JSONL writes to `audit.jsonl` in project root
- `logCommand(entry)`, `logExecution(entry)`, `logPanic(entry)`
- Each entry: `{ ts, type, session_id, payload, result }`

#### A4 — Mutation queue (`lib/queue.ts`)
- Simple async queue: processes one mutation at a time
- Enforces `MUTATION_DELAY_MS` between each call
- Returns results in order; records partial failures without stopping the queue

#### A5 — Portfolio route (`app/api/portfolio/route.ts`)
```
GET /api/portfolio
Response: PortfolioSnapshot
```
- Calls `getAccount`, `getPositions`, `getOpenOrders`
- Returns merged snapshot

#### A6 — Execute route (`app/api/command/execute/route.ts`)
```
POST /api/command/execute
Body: { confirmation_token: string }
Response: ExecutionReceipt
```
- Looks up pending command by token
- Calls `validateConfirmationToken`
- Calls `placeOrder` or `closePosition` via `LiquidClient`
- Logs to audit
- Returns `ExecutionReceipt`

#### A7 — Panic execute route (`app/api/panic/execute/route.ts`)
```
POST /api/panic/execute
Body: { confirmation_token: string }
Response: { orders_cancelled: number, positions_closed: string[], failures: string[] }
```
- Validates token
- Sequential: cancel all orders first, then close each position via queue
- Rate-limit aware (`MUTATION_DELAY_MS`)
- Never throws — logs and surfaces partial failures
- Logs full panic record to audit

#### A8 — Rebalance execute route (`app/api/rebalance/execute/route.ts`)
```
POST /api/rebalance/execute
Body: { confirmation_token: string }
Response: ExecutionReceipt[]
```
- Validates token
- Executes `TradePlan.actions` sequentially via queue
- Returns array of receipts, one per action

#### A9 — Health route (`app/api/health/route.ts`)
```
GET /api/health
Response: { ok: boolean, liquid: boolean, timestamp: string }
```
- Calls `getHealth` on Liquid
- Returns combined status

---

## Dev B — Frontend + UI Components + Voice

### Owns
- `app/page.tsx` — main app shell
- `app/layout.tsx`, `app/globals.css`
- `components/` — all UI components
- Voice input flow (browser push-to-talk)
- Panic arming toggle state

### Tasks

#### B1 — App shell (`app/page.tsx`)
- Two-column layout: left = chat + voice, right = portfolio + risk controls
- Global state (React context or `useState`): `portfolio`, `panicArmed`, `pendingPreview`, `receipts`
- Poll portfolio every 10s via `GET /api/portfolio`

#### B2 — Header (`components/Header.tsx`)
- App name + "LIVE TRADING" badge
- Shows current `MAX_ORDER_USD` limit
- Last portfolio sync timestamp

#### B3 — Chat panel (`components/ChatPanel.tsx`)
- Message list (user messages + assistant responses)
- Text input with submit
- Renders `PreviewCard` inline when `pendingPreview` is set
- Renders `TradeReceipt` after execution

#### B4 — Preview card (`components/PreviewCard.tsx`)
- Receives `PreviewCard` type
- Shows: type, summary, detail fields, warnings
- Two buttons: **Confirm** (calls execute endpoint) and **Cancel**
- Disables confirm button after first click (no double-submit)
- Shows spinner during execution

#### B5 — Portfolio panel (`components/PortfolioPanel.tsx`)
- Shows `PortfolioSnapshot`: balance, positions table, open orders table
- Refreshes on execution receipt received

#### B6 — Panic button (`components/PanicButton.tsx`)
- Shows current armed state visually (red when armed, gray when not)
- "Arm Panic" toggle + "PANIC — Close All" button (only enabled when armed)
- On click: calls `POST /api/panic/preview` → shows `PanicPreviewModal` → confirm → `POST /api/panic/execute`
- Displays result summary inline

#### B7 — Voice input (`components/VoiceInput.tsx`)
- Push-to-talk: hold button → records → releases → transcribes
- Uses Web Speech API (`SpeechRecognition`) with fallback text box
- On transcript: sends to `POST /api/command/parse` same as chat input
- Shows transcript text before submitting
- Shows listening state clearly

#### B8 — Trade receipt (`components/TradeReceipt.tsx`)
- Renders `ExecutionReceipt`
- Shows: type, status, order IDs, timestamp, error (if any)

#### B9 — Rebalance plan (`components/RebalancePlan.tsx`)
- Receives `TradePlan`
- Lists each action with symbol, side, size_usd
- "Approve Plan" button → calls `POST /api/rebalance/execute`

#### B10 — Risk controls (`components/RiskControls.tsx`)
- Shows current limits: max order USD, max leverage, daily loss cap
- Static display for hackathon (no edit)

**Integration point B+C:** `ChatPanel` sends text to `POST /api/command/parse` (owned by Dev C). The response is a `TradeCommand` or `TradePlan`. `ChatPanel` passes this to `PreviewCard` or `RebalancePlan`. Agree on the response shape before wiring.

**Integration point B+A:** Confirm button in `PreviewCard` calls `POST /api/command/execute` (owned by Dev A). Panic confirm calls `POST /api/panic/execute`. Response is `ExecutionReceipt` which renders in `TradeReceipt`.

---

## Dev C — LLM Parsing + Planning + Parse/Preview Routes

### Owns
- `lib/parser.ts` — LLM schema parsing
- `lib/planner.ts` — rebalance plan generation
- `app/api/command/parse/route.ts`
- `app/api/command/preview/route.ts`
- `app/api/rebalance/preview/route.ts`
- `app/api/panic/preview/route.ts`

### Tasks

#### C1 — Types and system prompts (`lib/parser.ts`)

**System prompt for command parsing:**
```
You are a trade command parser. Your only job is to convert a user's message into a valid JSON TradeCommand or TradePlan.
Rules:
- Output ONLY valid JSON matching the schema. No explanation.
- size is always USD notional.
- Never include execution logic.
- If intent is ambiguous, return { "action": null, "clarification_needed": "..." }
- Supported symbols: BTC-PERP, ETH-PERP, SOL-PERP
- Panic keywords: "panic", "close all", "flatten"
```

- `parseCommand(text: string): Promise<TradeCommand | TradePlan>` — calls LLM with structured output
- Uses OpenAI tool calling or Anthropic tool use with `strict: true`
- Falls back to asking for clarification if output is invalid

#### C2 — Parse route (`app/api/command/parse/route.ts`)
```
POST /api/command/parse
Body: { text: string, source: "chat" | "voice" }
Response: TradeCommand | TradePlan | { clarification_needed: string }
```
- Calls `parseCommand`
- Does NOT validate against Liquid state (that's preview's job)
- Logs raw text + parsed result to audit

#### C3 — Preview route (`app/api/command/preview/route.ts`)
```
POST /api/command/preview
Body: TradeCommand
Response: PreviewCard
```
- Calls `LiquidClient.getAccount()` + `getTicker(symbol)`
- Runs validator checks (symbol, leverage, size, balance)
- Builds `PreviewCard` with summary, detail fields, and any warnings
- Generates and stores `confirmation_token` (in-memory map, keyed by token, value = `TradeCommand`, expires in 60s)
- Does NOT execute

**Integration point C+A:** The `confirmation_token` stored here is consumed by Dev A's execute route. Use a shared in-memory store in `lib/session.ts` (simple `Map<string, { command: TradeCommand, expires: number }>`). Both routes import from the same module.

#### C4 — Rebalance preview (`app/api/rebalance/preview/route.ts`)
```
POST /api/rebalance/preview
Body: { text: string }
Response: TradePlan + PreviewCard
```
- Calls `getAccount`, `getPositions`, `getTicker` for each supported symbol
- Passes current state + user intent to LLM (planner prompt)
- LLM generates `TradePlan` with explicit actions
- Validates each action in the plan
- Generates `confirmation_token` covering the full plan
- Returns `TradePlan` + `PreviewCard`

**Planner system prompt:**
```
You are a portfolio rebalance planner. Given current positions and a target allocation, generate a TradePlan JSON.
Rules:
- Output ONLY valid TradePlan JSON.
- size_usd values must be USD notional.
- Always set user_confirmation_required: true.
- Compute estimated_total_mutations from actions array length.
- Never include market timing predictions.
```

#### C5 — Panic preview (`app/api/panic/preview/route.ts`)
```
POST /api/panic/preview
Body: { armed: boolean }
Response: PanicPreview
```
- Calls `getOpenOrders` + `getPositions`
- Returns `PanicPreview`: counts, position list, estimated mutations
- Generates `confirmation_token`
- Does NOT check `armed` flag here — that's enforced in the execute route (Dev A)

---

## Integration Checkpoints

### Checkpoint 1 — End-to-end chat trade (all three devs)

**Trigger:** Dev A finishes A1+A2+A6, Dev B finishes B3+B4, Dev C finishes C2+C3.

**Test:**
1. Type "Buy $50 of ETH" in chat
2. Parse route returns `TradeCommand`
3. Preview route returns `PreviewCard` with confirmation token
4. UI shows PreviewCard
5. Click Confirm → execute route fires → `ExecutionReceipt` returned
6. UI shows `TradeReceipt`

**Integration steps:**
- Confirm `LiquidClient` method signatures match what preview + execute expect
- Confirm `confirmation_token` store is shared (`lib/session.ts`)
- Confirm `PreviewCard` shape matches what `PreviewCard.tsx` renders

---

### Checkpoint 2 — Panic flow (Dev A + Dev B)

**Trigger:** Dev A finishes A7, Dev B finishes B6, Dev C finishes C5.

**Test:**
1. Arm panic toggle
2. Click PANIC button
3. Panic preview shows order count + positions
4. Confirm → execute → result shows cancelled orders + closed positions

**Integration steps:**
- `PanicButton.tsx` uses `confirmation_token` from panic preview response
- Execute route checks armed state (passed as body field or session flag)
- Partial failure responses render correctly in UI

---

### Checkpoint 3 — Rebalance flow (all three devs)

**Trigger:** Dev A finishes A8, Dev B finishes B9, Dev C finishes C4.

**Test:**
1. Type "Rebalance me to 60% BTC 40% ETH"
2. Rebalance preview returns `TradePlan`
3. `RebalancePlan.tsx` renders plan
4. Click "Approve Plan" → execute → receipts per action

**Integration steps:**
- `confirmation_token` from rebalance preview covers the full plan array
- Execute route reconstructs plan from token store
- Dev B's `RebalancePlan` component passes token on approve

---

### Checkpoint 4 — Voice → parse → preview → confirm

**Trigger:** Dev B finishes B7, Dev C finishes C2+C3.

**Test:**
1. Hold push-to-talk, say "Buy fifty dollars of Bitcoin"
2. Transcript appears in UI
3. Auto-submits to parse route
4. Rest of flow same as chat trade

**Integration steps:**
- `VoiceInput.tsx` calls same parse endpoint as chat input
- Transcript source tagged as `"voice"` in request body
- If voice transcript is low-confidence, show transcript for user to confirm before parsing

---

## Shared module: `lib/session.ts`

All three devs import from this. Implement first (5 minutes).

```ts
interface PendingCommand {
  command: TradeCommand | TradePlan;
  expires: number;
}

const store = new Map<string, PendingCommand>();

export function storePendingCommand(command: TradeCommand | TradePlan): string {
  const token = crypto.randomUUID();
  store.set(token, { command, expires: Date.now() + CONFIRMATION_TOKEN_TTL_MS });
  return token;
}

export function consumePendingCommand(token: string): TradeCommand | TradePlan {
  const entry = store.get(token);
  if (!entry) throw new Error("Invalid or expired confirmation token");
  if (Date.now() > entry.expires) {
    store.delete(token);
    throw new Error("Confirmation token expired");
  }
  store.delete(token); // one-use
  return entry.command;
}
```

---

## Environment variables (`.env.local`)

```
LIQUID_API_KEY=
LIQUID_API_SECRET=
OPENAI_API_KEY=          # or ANTHROPIC_API_KEY
MAX_ORDER_USD=500
DAILY_LOSS_LIMIT_USD=200
AUDIT_LOG_PATH=./audit.jsonl
```

---

## Build order (recommended)

1. **All devs together (30 min):** Finalize `lib/types.ts`, `lib/constants.ts`, `lib/session.ts`
2. **Parallel (2–3 hours):** Dev A: A1→A2→A5→A9 | Dev B: B1→B2→B3→B4 | Dev C: C1→C2→C3
3. **Checkpoint 1 integration** (30 min)
4. **Parallel:** Dev A: A7→A8 | Dev B: B6→B7 | Dev C: C4→C5
5. **Checkpoint 2+3+4 integrations** (45 min)
6. **Dev A:** A3+A4 (audit + queue) | **Dev B:** B5+B8+B9+B10 | **Dev C:** cleanup + prompt tuning
7. **Full end-to-end test + polish**