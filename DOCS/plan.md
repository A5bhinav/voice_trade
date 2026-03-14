
AI Trading Terminal With Voice Panic and Intent-Based Execution
Executive summary
This project is a trading interface that converts plain-English intent into executed trades on Liquid in seconds, with a deliberate focus on safety primitives that make it feel production-grade instead of “LLM calls an API.” Liquid’s official docs show a clean REST surface plus an official Python SDK and an MCP server that already includes guardrails like maximum order size, daily loss limits, dry-run support, and audit logs. That means you can build a real product in 12 hours by putting most of your energy into UX, validation, and a crisp demo. 

Recommended hackathon scope to maximize win odds: a responsive web app with (1) chat trading with explicit confirmations and preview mode, (2) a voice “panic” flow that cancels all open orders and closes all positions with safe throttling, and (3) a minimal intent engine for rebalancing across 2–3 symbols with a generated “trade plan” that the user approves before execution. Keep it small, deterministic, and demonstrably safe, then do one live trade at minimal notional or show Liquid’s dry-run preview plus audit logs in the demo. 

Key risks: voice reliability and “oops” trades. Liquid’s API has strict auth requirements (HMAC, timestamp skew, nonce rules) and rate limits, including a low order-mutation cap on the free tier. Your panic execution must be sequential and rate-limit aware, or it will fail in the most visible moment. 

What you’re building and why it can win
The build is a “terminal” in the modern sense: a single UI that accepts natural language (typed or spoken), converts it into structured trade intents, validates them against the account and risk rules, then executes them via Liquid. Liquid’s docs indicate the platform exposes perpetual futures trading via a REST API and official SDK; market discovery, account state, orders, and position management are all first-class endpoints. 

What makes it judge-worthy versus a generic wrapper is that you are explicitly productizing the dangerous parts:

Every destructive action has a preview, a confirmation gate, and a clear rollback story (cancel open orders, close positions).
The interface demonstrates safety constraints (max order size, daily loss limits, leverage warnings).
The system produces an interpretable “trade plan” for intent-based actions like rebalancing, rather than firing off trades opportunistically. Liquid’s MCP server documentation even calls out built-in safety guardrails, dry-run support, and audit logs.
This matches the sponsor text for “novel trading interfaces” and aligns to Liquid’s message that you can “trade … with natural language,” but you are pushing it further with a panic workflow and an intent engine that is easy to demo live. 

Pros and cons, bluntly:

The upside is demo clarity and buildability because Liquid provides a straightforward API/SDK surface and even an agent-ready MCP server. 
The downside is that many hackathon teams will do “chat to trade.” The differentiator must be “intent plus safety plus panic,” and it must actually work under rate limits. 
Target platform recommendation for 12 hours: a mobile-responsive web app (works on phones, demoable on laptop) plus a push-to-talk voice control path. Native mobile is possible, but it is almost always a time sink unless your team already has a template.

Core user flows
Chat trade flow
The core chat flow should be deterministic:

User types: “Buy $200 of ETH with 3x leverage, take profit at 4200, stop loss at 3800.”
System parses into a structured command schema.
System fetches current account state and validates risk constraints (balance, limits).
System shows a preview card: symbol, side, type, size (USD notional), leverage, TP/SL, estimated fill price using mark price.
User confirms.
Backend executes the order via Liquid.
UI shows status and a link to audit log entry (or an execution record).
Liquid explicitly exposes order placement on POST /v1/orders with parameters like symbol, side, type, size in USD notional, leverage, TP, SL, and reduce-only. 

Mermaid sequence diagram:

Liquid API
LLM (structured output)
Backend API
Web UI
User
Liquid API
LLM (structured output)
Backend API
Web UI
User
Type trade request
POST /api/command (text)
Parse to TradeCommand JSON
TradeCommand (symbol, side, size_usd, leverage, tp, sl)
GET /v1/account + GET /v1/account/positions
Validate + compute preview
Preview + confirmation token
Confirm
POST /api/execute (confirmation token)
POST /v1/orders
Order result
Execution status + receipt


Show code
This flow maps cleanly to Liquid’s account and order endpoints and the SDK’s get_account, get_positions, and place_order methods. 

Voice “panic button” flow
The panic flow is your most demoable and most failure-prone feature. It must be engineered around Liquid’s rate limits and state reconciliation.

Definition of panic mode (recommended):

Cancel all open orders.
Close all open positions, full close per symbol.
Liquid’s REST API explicitly supports cancel-all via DELETE /v1/orders and per-position closing via POST /v1/positions/{symbol}/close (omit size to close fully). 

Voice design constraints:

If voice-to-text is uncertain, you need either an “armed” mode (user flips a toggle to allow one-shot panic) or an immediate confirmation step (“I heard: CLOSE ALL POSITIONS. Confirm.”).
The panic command should be phrase-limited and keyword-oriented (“panic”, “close all”, “flatten”), because complex natural language increases error surface.
Mermaid sequence diagram:

Liquid API
Backend API
Speech-to-Text
Mobile/Web UI
User
Liquid API
Backend API
Speech-to-Text
Mobile/Web UI
User
loop
[For each position, rate-limit aware]
Hold-to-talk "Close all positions"
Stream audio
Transcript
POST /api/panic (transcript, armedFlag)
GET /v1/orders (open)
DELETE /v1/orders (cancel all)
GET /v1/account/positions
POST /v1/positions/{symbol}/close
Panic report (orders cancelled, positions closed, failures)


Show code
Implementation detail that matters: Liquid’s free tier describes a low “order mutations per second” limit, and order mutations include order placement, cancels, and position mutation routes. That means you must close positions sequentially with a short delay and show partial results rather than trying to fan out concurrency. 

Intent-based rebalance flow
Intent-based trading should look like this:

The user specifies a portfolio target state rather than a single trade.
The system generates and displays a plan.
The user approves the plan.
The system executes the sequence of trades.
Minimal rebalance spec that fits 12 hours:

Support 2–3 symbols (example: BTC-PERP, ETH-PERP, SOL-PERP if available).
Support “target allocations” by notional exposure percentage.
Use mark prices for planning, then market orders for execution (or limit orders if you want to show sophistication, but market is safer for demo speed).
Liquid provides:

Positions with size in asset units plus mark price fields in account/positions responses.
Tickers with mark price.
Orders sized in USD notional on placement. This makes “rebalance by USD notional delta” straightforward. 
Mermaid sequence diagram:

Liquid API
LLM (plan generator)
Backend API
Web UI
User
Liquid API
LLM (plan generator)
Backend API
Web UI
User
loop
[for each action (rate-limit aware)]
"Rebalance to 50% BTC, 30% ETH, 20% cash"
POST /api/rebalance/preview
GET /v1/account
GET /v1/account/positions
GET /v1/markets/{symbol}/ticker (per symbol)
Produce TradePlan JSON + explanation
TradePlan (list of actions, each action has side/symbol/size_usd)
Plan preview + projected exposures
Approve
POST /api/rebalance/execute
POST /v1/orders (market, size in USD)
Execution summary + receipts


Show code
Where teams usually blow this: they let the model decide to execute. Don’t. Execution must be gated by a human confirm, and the plan must be explicit and reviewable.

Integrations and minimal viable architecture
Liquid integration surface that matters
Liquid’s docs describe the Trading API base URL, auth scheme (HMAC-SHA256), permission scopes, and rate limits. 
Practical endpoints for this project:

Health: GET /v1/health (connectivity check). 
Market discovery and pricing: GET /v1/markets, GET /v1/markets/{symbol}/ticker, GET /v1/markets/{symbol}/orderbook. 
Account and positions: GET /v1/account, GET /v1/account/positions. 
Place order: POST /v1/orders (size is USD notional). 
Cancel: DELETE /v1/orders (cancel all), DELETE /v1/orders/{order_id}. 
Close position: POST /v1/positions/{symbol}/close (omit size to close fully; partial close uses coin units). 
Liquid’s official Python SDK wraps these and handles signing, typed models, and error mapping. It also explicitly avoids automatic retries on mutation requests, which is a feature here because retries on trading actions can create duplicated orders. 

Critical semantics that must be in your UI:

Orders are perpetual futures, and the size parameter on place_order is always USD notional. 
Closing positions differs: partial close uses coin units; full close omits size. 
Liquid’s API responses are wrapped in a consistent envelope with success, data, and error. 
The underlying exchange field is “hyperliquid” in market metadata, and Liquid’s quickstart explicitly frames “Enable Trading” as activating live trading on Hyperliquid. 
Minimal viable architecture
A hackathon-friendly reference architecture:

Frontend (Next.js or similar)

Chat UI (messages, trade preview cards, confirm button)
Push-to-talk microphone UI (hold-to-talk)
“Armed panic” toggle and visible kill switch state
Portfolio snapshot and positions list
Backend (FastAPI or Node, but Python is convenient because Liquid’s official SDK is Python)

Session auth (hackathon-grade)
“Command parsing” endpoint (LLM)
“Preview/validate” endpoint (uses Liquid account and ticker)
“Execute” endpoints (trade, rebalance, panic)
A small execution queue with rate-limit aware throttling
LLM hosting

Use tool calling or structured outputs to force schema for TradeCommand and TradePlan.
Optional, but strong: run Liquid’s MCP server locally and call it from your app for built-in guardrails like max order size, daily loss limits, dry-run, and JSONL audit logs. The MCP docs show environment variables like MAX_ORDER_USD, DAILY_LOSS_LIMIT, and an audit path, plus dry_run support on destructive tools. 

Required credentials and account setup
Liquid’s quickstart states:

Create an account, deposit funds (USDC deposits), enable trading, then generate API keys (API key + API secret). 
The API secret is shown only once and should not be committed to source control. 
This means the backend must be the only place that ever sees the API secret in a real deployment. For hackathon, you can still do it correctly: paste key + secret into a backend-only config screen, store it only in server memory for the session, and print a big warning on screen that this is a demo and real money is at risk.

LLM and voice design
LLM design goals
Your LLM is not “a trader.” It is a deterministic parser and planner:

Turn messy English into a typed command schema.
Generate a plan for intent-based actions.
Never execute without a confirmation handshake.
Operate with tight latency because trading UIs fail if they feel laggy.
Both OpenAI and Anthropic document tool calling patterns that are a natural fit for this because you can force the model to output JSON matching your schema. OpenAI’s docs describe function calling as a multi-step flow where your app executes actions and returns tool outputs back to the model. 
OpenAI also documents Structured Outputs as schema-adherent structured responses and recommends it over basic JSON mode when possible. 
Anthropic’s tool-use docs explicitly call out strict: true to guarantee schema conformance for tool inputs. 

Recommended schema approach
Use two schemas.

TradeCommand (single action)

action: "place_order" | "close_position" | "cancel_all_orders" | "set_tp_sl" | "rebalance_preview" | "panic"
symbol: "BTC-PERP" etc (optional depending on action)
side: "buy" | "sell" (for orders)
order_type: "market" | "limit"
size_usd: number (for orders only)
price: number (limit only)
leverage: integer
tp, sl: number (optional)
reduce_only: boolean
urgency: "panic" | "normal"
TradePlan (sequence)

intent_summary: string
preconditions: list of checks (balance, max order, daily loss, “armed panic,” etc)
actions: list of TradeCommand with execution ordering
user_confirmation_required: boolean (always true for destructive actions)
estimated_total_mutations: integer (used to respect rate limits)
Prompt templates that are realistic for hackathon
System prompt for parsing:

Force the model to only output schema-matching JSON.
Include Liquid-specific semantics: “size is USD notional,” “positions are perps,” “don’t execute,” “require confirmation.”
Then you add a “validator” step in your own code that rejects:

missing symbol
size below a minimum
leverage above your cap
attempts to trade if the transcript confidence is low
This is the whole point: you are not trusting the model, you are sandboxing it.

Confirmation and safety flow
A practical confirmation policy:

Always confirm on any order placement, any position close, and any cancel-all.
Allow one-shot panic only when “armed,” otherwise require confirm.
If voice triggered, require either “armed” or a very short confirm prompt.
Liquid’s MCP server design basically endorses this mindset: it includes dry-run support for destructive tools, a max order cap, and a daily loss cap, plus an audit trail. 

Latency tradeoffs
For voice and low-latency UIs, you have two big architecture choices:

Chained approach (STT → text LLM → execute)

More predictable control: you keep hard constraints in the text layer.
More latency: at least one STT step plus the LLM step.
Speech-to-speech or realtime transcription paths

Lower latency and more “assistant-like,” but higher integration complexity.
OpenAI’s audio guide explicitly frames these two approaches and notes speech-to-speech is lower-latency, while chaining STT/LLM/TTS gives more control at the cost of added latency. 
For purely transcription-first voice control, OpenAI documents realtime transcription sessions over WebSockets or WebRTC, including turn detection and streaming deltas. 

For a 12-hour hackathon, the simplest and safest is: realtime transcription (or browser STT) + text parsing + confirm + execute.

Voice stack options and tradeoffs
Option that wins hackathons: browser push-to-talk plus scripted phrases
Use the Web Speech API in Chrome:

Fast to implement
Great demo feel
But limited browser support
MDN explicitly flags SpeechRecognition as “limited availability” and not Baseline due to cross-browser gaps. 
The W3C Web Speech API spec defines the concept, but real-world support is fragmented. 

This is fine if your demo hardware is controlled (your laptop in Chrome). It is risky if judges try it on Safari.

Option that’s more reliable: OpenAI realtime transcription
If you want cross-browser reliability and a clean “panic” feel, use OpenAI’s realtime transcription:

Documented session model with WebSockets or WebRTC
Streaming deltas for gpt-4o-transcribe and gpt-4o-mini-transcribe
Built-in VAD options (server VAD), which helps detect utterance boundaries without weird UI hacks 
This is more code, but it makes the voice feature feel real.

Mobile-native options
If you do go native, these are the practical picks:

On-device (best latency, best privacy)

iOS: Apple’s Speech framework can support on-device recognition depending on device and language. Apple’s doc for supportsOnDeviceRecognition states that if it is false, the recognizer requires a network to recognize speech. 
Android: use platform speech services, plus consider on-device recognition via platform APIs where available. The AOSP source comments mention createOnDeviceSpeechRecognizer as an option on Android. 
Google’s on-device route

Google ML Kit’s GenAI Speech Recognition docs describe an on-device SpeechRecognizer client that can download models and provide streaming output, which is attractive for low-latency commands like panic. 
Cloud STT (more consistent accuracy, depends on network)

Google Cloud Speech-to-Text: Google’s best practices note that larger streaming frame sizes are more efficient but add latency, and recommends 100ms frames as a tradeoff between latency and efficiency. 
Cost is straightforward but nonzero; see cost table below. 
Mozilla option

Mozilla DeepSpeech is not a serious choice in 2026 for a hackathon build because the repo is archived and read-only. 
If you mention it at all, do it as historical context or as “not recommended.”
Security, risk controls, and compliance notes
Threat model: what can go wrong
For a hackathon trading app, the real failures are boring:

API key leaks (someone can trade your account)
Prompt injection or malformed commands (the model outputs something “valid” but harmful)
Accidental voice triggers (“close all positions” misheard)
Duplicate execution due to retries or user double-click
Rate-limit failures mid-panic leaving the account half-flattened
Liquid’s API design already implies a high-security posture: signed headers, strict timestamp skew, nonces with replay windows, permission scopes, and optional IP whitelisting. 

OWASP guidance is still the right mental model: protect authentication, enforce HTTPS, validate inputs, and rate limit. 

Concrete controls to implement in 12 hours
Authentication and access

Single-user demo mode: one backend-owned Liquid key with the minimum permissions required.
Multi-user demo mode: user stores their Liquid keys in a backend session (in-memory) and the session is protected by a simple passcode.
Do not put the Liquid API secret in the frontend. Liquid explicitly warns the API secret is sensitive and should not be shared or committed. 
Order validation (server-side, deterministic)

Validate symbol is in /v1/markets.
Validate leverage in range and enforce a stricter cap than Liquid allows (example: cap at 10x for demo).
Validate order size is within your configured max and greater than minimum; Liquid MCP mentions MAX_ORDER_USD and a $10 minimum enforcement. 
Validate user intent for “panic” with an armed toggle or confirm prompt.
Rate limits, circuit breakers, and fail-safes

Implement a request queue for trading mutations.
Panic flow must be sequential and show partial failures.
After any timeout, reconcile by fetching positions and open orders. Liquid’s MCP troubleshooting explicitly recommends reconciling and warns against blindly retrying failed mutations. 
Add idempotency keys at your application layer (store (session_id, client_request_id) and refuse duplicates).
Logging and auditability

Keep an append-only execution log (JSONL is fine).
If you run Liquid’s MCP server, it already writes a JSONL audit trail and supports dry runs, which is a simple story to tell judges. 
Transport security

All calls should be HTTPS. OWASP’s REST Security Cheat Sheet explicitly recommends HTTPS-only endpoints to protect credentials in transit like API keys and tokens. 
Compliance considerations
KYC/AML: unspecified in the hackathon prompt and not described in the Liquid SDK docs you provided. Treat as unspecified and out of scope for a 12-hour build.
Regulatory classification: also unspecified. Your demo should include a blunt disclaimer: “This is a hackathon prototype; real trading has financial risk.”
Implementation blueprint for a 12-hour build
Data model
For hackathon, you can use SQLite or in-memory objects. Suggested minimal schema:

User

id, created_at
Session

id, user_id, created_at, expires_at, armed_panic boolean
LiquidCredential

user_id
api_key (string)
api_secret (encrypted at rest if persisted; ideally not persisted in hackathon)
permissions_seen (int, optional) 
CommandLog (append-only)

id, session_id, source (“chat” | “voice”), raw_text, parsed_json, created_at
Execution

id, session_id, type (“order” | “panic” | “rebalance”)
status (“previewed” | “confirmed” | “executed” | “failed”)
liquid_order_ids[]
error (nullable)
audit_blob (optional)
Backend API endpoints
A compact endpoint set:

POST /api/session/start
POST /api/session/arm-panic (toggle)
GET /api/portfolio (account + positions + open orders)
Chat

POST /api/command/parse (returns proposed TradeCommand or TradePlan)
POST /api/command/preview (validates against Liquid state, produces preview card and confirmation token)
POST /api/command/execute (executes after confirmation)
Voice

POST /api/voice/transcribe (if not doing in-browser STT)
POST /api/panic/preview
POST /api/panic/execute
Rebalance

POST /api/rebalance/preview
POST /api/rebalance/execute
Testing plan for the demo
Unit tests (fast, local)

Parser tests: given 20 sample prompts, output schema-valid JSON.
Validator tests: rejects leverage above cap, invalid symbols, size too high, missing TP/SL if you require brackets.
Integration tests (hits Liquid but avoids trades)

GET /v1/health connectivity check. 
GET /v1/markets, GET /v1/account, GET /v1/account/positions. 
Execution tests (controlled)

If using Liquid MCP: run destructive tools in dry-run mode first, since the MCP docs say destructive tools support dry_run. 
If doing one live trade: do a minimal-size market order and immediately close it. Liquid’s docs clarify size is USD notional and you can close positions fully by omitting size. 
Panic test

Place a tiny order (or create a tiny open position), then trigger panic. Validate that cancel-all and close-all complete under rate limits.
Deployment checklist
Backend

Store Liquid keys in server environment or in encrypted storage.
Enforce HTTPS in deployment (even for hackathon). 
Set env limits:
MAX_ORDER_USD and DAILY_LOSS_LIMIT if using MCP. 
Add a global “killswitch” that disables all mutations.
Frontend

Disable double-submit on confirm buttons.
Show a visible “LIVE TRADING” indicator and the current max order limit.
Show last sync timestamp (Liquid’s orderbook timestamp can be null, so you may use local request time for freshness). 
Cost and credits estimate
Assumptions (keep it honest):

1,000 text commands during dev + demo.
Average 600 input tokens and 200 output tokens per command for parsing + response.
30 minutes of voice audio during testing/demo.
One short live trade cycle at minimal notional, plus fees that are not specified in docs.
Component   Provider    Unit pricing    Hackathon-scale estimate    Notes
Text LLM for parsing and plan output    OpenAI  $0.15 / 1M input tokens and $0.60 / 1M output tokens (gpt-4o mini)  ~$0.03–$0.10    This assumes sub-1M total tokens.
Text LLM alternative    Anthropic   Claude Sonnet 4.6: $3 / MTok input, $15 / MTok output   ~$0.50–$2.00    Still small at hackathon volume; tool overhead tokens exist. 
STT (cloud) Google  $0.016 / minute (Speech-to-Text V2 standard)    ~$0.50  30 minutes.
STT (OpenAI)    OpenAI  gpt-4o-mini-transcribe estimated $0.003 / minute    ~$0.10  Lower cost than Google for short demos.
On-device STT   Apple / Android $0  $0  On-device availability varies; Apple indicates network may be required depending on supportsOnDeviceRecognition.
Hosting (web + API) Any PaaS    Free tier likely    $0  Keep it simple: one backend, one frontend.
Liquid trading capital at risk  Liquid  Unspecified $20–$100 USDC   Liquid docs mention USDC deposits and live trading enablement; no official “testnet” described in the SDK docs. 

Note on Mozilla: if teammates ask about offline STT via Mozilla DeepSpeech, the repo is archived and should be treated as unsupported for a new build. 

Judge-winning features to prioritize
Panic mode (highest ROI)

Voice-triggered flattening with a safety arming toggle.
Cancel all orders, close all positions, show a structured report.
Intent engine (second highest ROI)

“Target allocations” with explicit plan preview.
Display the plan as a list of actions with per-action confirmations.
Risk guard (third)

User-configurable caps: max order size, max leverage, daily loss. Liquid’s MCP server already has concepts like max order USD, daily loss tracking, leverage warnings, dry-run, and auditing. If you reuse those ideas (or the MCP server itself), it reads like you built a serious trading surface. 
Hour-by-hour build plan for a 4-person team
Team roles

Engineer A: Backend + Liquid integration
Engineer B: Frontend chat UI + portfolio view
Engineer C: LLM schemas + prompts + command parsing service
Engineer D: Voice UX + panic execution + demo harness
Hour 1

A: Stand up backend skeleton, add Liquid SDK client wrapper, health check route. 
B: Build basic chat UI + message list + preview card component.
C: Define JSON schemas for TradeCommand and TradePlan; wire structured output call.
D: Implement push-to-talk UI skeleton and decide STT approach (Web Speech vs realtime transcription).
Hour 2

A: Implement /portfolio (account + positions + open orders). 
B: Add portfolio panel and “LIVE” indicator.
C: Implement parse endpoint and golden test prompts.
D: Implement STT path and transcript display; stub panic endpoint.
Hour 3

A: Implement preview validator: symbol lookup, leverage cap, size cap, balance checks.
B: Wire preview card with confirm action.
C: Add “intent detection” logic: trade vs rebalance vs panic.
D: Implement panic preview: show how many orders/positions will be touched.
Hour 4

A: Implement execute order path using place_order. 
B: Add confirm modal and disable double-submit.
C: Add strict “do not execute” system prompt and ensure schema-only output.
D: Implement cancel-all orders via REST or SDK method; show partial failures. 
Hour 5

A: Implement close position per symbol, full close. 
B: Add “panic armed” toggle UI and clear warnings.
C: Add TradePlan generator for rebalancing and return an explicit plan.
D: Implement sequential close-all loop with throttling to respect order-mutation limits. 
Hour 6

A: Add reconciliation after each mutation: refetch open orders and positions.
B: Build “execution receipts” UI.
C: Implement “rebalance preview” that computes exposures and deltas.
D: Add voice confirmation logic: armed one-shot vs confirm.
Hour 7

A: Add execution queue and global kill switch.
B: Polish UI for demo: big buttons, simple wording, predictable paths.
C: Implement fallback: if parse confidence low, ask a clarifying question rather than executing.
D: End-to-end panic test with a dummy position.
Hour 8

A: Add audit logging (JSONL).
B: Add a “demo mode” toggle that forces preview-only.
C: Add streaming responses (optional) or keep it simple.
D: Run through demo script repeatedly and fix flakiness.
Hour 9

A: Deployment setup (env vars, secrets) and smoke tests.
B: Deploy frontend.
C: Verify schemas under real prompts, tighten constraints.
D: Voice latency tuning (shorter utterances, keyword biasing if supported).
Hour 10

Whole team: integration test session. Break everything intentionally: wrong symbol, huge size, missing TP, rapid clicks.
Hour 11

Whole team: finalize demo story, prepare a “known good” Liquid account state, keep small notional.
Hour 12

Whole team: rehearse twice, then stop changing code. Prepare backup: demo in preview mode if live trading fails.
Recommended final scope
If your goal is to win, do not overbuild:

Chat trading with preview + confirm + receipts.
Voice panic that works every time (even if it requires a prior “arm” toggle).
Rebalance for 2 symbols (BTC and ETH) with a plan preview and an “execute plan” button.
Visible risk controls: max leverage, max order USD, daily loss cap.
Everything else is optional. If you have extra time, add exactly one “wow” screen: a timeline showing “transcript → parsed intent → validations passed → API calls → resulting state.” That reads like production engineering and plays well with judges.
