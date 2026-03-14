# Voice Trade Plan

## User should run using:
---->     claude --permission-mode bypassPermissions      <----

## Admin Mode
You should always run bash commands when needed, but never pull, push, merge, or commit anything unless I explicitly ask. Remember this always.

## Response Style

- Use the minimum tokens necessary.
- Be concise and efficient while still being thorough.
- Avoid filler.
- Always ask clarifying questions before making major architectural decisions.
- Never guess when a requirement is underspecified.
- If a task will take a long time, first produce a short execution plan and then implement.
- Always prefer shipping a working end-to-end feature over adding extra complexity.
- Prioritize deterministic behavior over cleverness.
- For anything involving trade execution, safety and explicit confirmation matter more than speed.
- Make it so that there is a loop structure that runs tests to ensure that the code that you are writing has no bugs.
- The code should be clean and shouldn't have errors when I am trying to run it.

## What this project is

**Voice Trade** is a voice-first AI trading copilot built for the Liquid hackathon track.

Voice Trade allows a trader to interact with a crypto trading account using:

1. voice commands
2. natural language chat commands
3. intent-based portfolio actions
4. a one-tap panic mode for volatile markets

The goal is to remove complex trading dashboards and allow traders to execute actions instantly using voice or natural language.

Example commands:
- "I heard that the US and Iran war just started again. I have heard that this will affect gas and food prices. Make me money based on my insight"

Voice Trade parses the command using an LLM, generates a structured execution plan, previews the action for the user, and only executes after explicit confirmation using the Liquid SDK.

This is not just AI on top of a trading API. The real product is the **safe execution layer** that converts user intent into structured trade plans, previews them, validates them server-side, and only executes after explicit confirmation.

## Recommended tech stack

- Frontend: Next.js App Router + TypeScript
- UI: Tailwind CSS
- Backend: Next.js route handlers
- LLM: OpenAI or Anthropic for structured parsing only
- Trading integration: Liquid SDK/API
- Voice input: browser-based push-to-talk first
- Storage: no DB required initially, use local file or in-memory session state for hackathon MVP
- Audit trail: JSONL or simple append-only file

## Why this stack

- Fastest path to a polished web app
- Easy to demo on laptop and phone
- One repo, one deployment surface
- Minimal setup overhead
- Good enough for a 12-hour hackathon scope

## Hackathon goal

This is a 12-hour hackathon build. The goal is not to build a complete trading platform. The goal is to build a technically robust, demoable MVP that:

- works end-to-end
- is easy to understand in under 10 seconds
- clearly uses the Liquid SDK/API
- feels production-minded instead of duct-taped

The strongest demo should show:

1. natural language trading
2. portfolio rebalancing
3. voice panic mode

## Non-goals

Do not waste hackathon time on:

- advanced charting
- multi-user auth complexity
- social features
- full mobile app build unless the web app is already complete
- autonomous trading strategies
- complex quant logic
- unnecessary animation
- speculative infra abstractions

## Product principles

- Preview before execute
- Validate before preview
- Confirm before any destructive action
- Never let the LLM directly execute trades
- The LLM parses and plans only
- The backend validates and executes
- Every executed action should produce a receipt or audit record
- Panic mode must be safe, visible, and easy to demo
- Voice is the primary interface, but the system must always support a text fallback if speech recognition fails

## Current file structure

```text
~/Desktop/voice-trade/
  app/
    page.tsx                      # Main app shell
    layout.tsx                    # Root layout
    globals.css                   # Global styles
    api/
      portfolio/route.ts          # Returns account, positions, orders
      command/parse/route.ts      # Parses NL command -> structured JSON
      command/preview/route.ts    # Validates and previews command
      command/execute/route.ts    # Executes confirmed command
      rebalance/preview/route.ts  # Generates rebalance plan
      rebalance/execute/route.ts  # Executes approved rebalance plan
      panic/preview/route.ts      # Shows what panic will do
      panic/execute/route.ts      # Cancel all + close positions
      health/route.ts             # App health check
  components/
    ChatPanel.tsx
    PortfolioPanel.tsx
    PreviewCard.tsx
    PanicButton.tsx
    VoiceInput.tsx
    TradeReceipt.tsx
    RebalancePlan.tsx
    RiskControls.tsx
    Header.tsx
  lib/
    liquid.ts                     # Liquid SDK/API wrapper
    parser.ts                     # LLM schema parsing helpers
    validator.ts                  # Server-side trade validation
    planner.ts                    # Rebalance plan generation
    panic.ts                      # Panic flow orchestration
    queue.ts                      # Mutation queue / throttling
    audit.ts                      # JSONL or file-based audit logging
    types.ts                      # Shared types and schemas
    constants.ts                  # Limits, defaults, enums
    utils.ts                      # Helpers
  public/
    logo.svg
  tests/
    parser.test.ts
    validator.test.ts
    planner.test.ts
    panic.test.ts
    api.test.ts
  .env.local
  package.json
  tsconfig.json
  next.config.js
  PRODUCT.md
  PLAN.md
  README.md
