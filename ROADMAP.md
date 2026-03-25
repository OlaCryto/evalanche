# Evalanche Roadmap

> **Goal:** Evolve Evalanche from a multi-chain agent wallet + economy SDK into a full **open agent interoperability stack** where agents can discover each other, negotiate work, pay, settle, message asynchronously, and exchange portable proofs of work and trust.

This is the only active roadmap for the repository.

It has two jobs:
- record what has already shipped
- define what comes next, in order

---

## Current State

### Shipped foundation
- Multi-EVM agent wallet SDK with autonomous key management
- ERC-8004 identity + reputation support
- x402 client and service-host support
- Economy layer: spending policies, discovery, negotiation, settlement, service hosting, memory/trust graph
- Li.Fi bridging + swaps + Composer flows
- Gas funding through LI.FI `gasZipBridge`
- Avalanche multi-VM support
- dYdX v4 integration
- Polymarket integration
- MCP server with a large tool surface across wallet, markets, bridge, economy, and interop flows
- Tag-driven release automation for GitHub Releases, npm, and ClawHub

### Completed major milestones

#### 1.0 line: Agent economy layer
- Spending policies and simulation
- Agent discovery
- Revenue mode / x402 service hosting
- Negotiation and settlement
- Persistent memory and trust graph
- Economy exports and end-to-end economy tests

#### 1.1 line: Interop identity
- ERC-8004 registration file resolution
- Service endpoint resolution
- Endpoint verification
- Wallet reverse resolution
- MCP tools for interop identity workflows

#### 1.x hardening and product expansion
- Safer fetch and secret handling
- Better settlement and x402 verification semantics
- Network-switch rebinding fixes
- Updated LI.FI / GasZip integration behavior
- dYdX packaging/runtime fixes
- Release automation

---

## Product Direction

### Evalanche 1.x
Wallet, identity, economy, markets, and execution primitives.

### Evalanche 2.0
**Open agent interoperability stack**
- identity-aware
- protocol-aware
- transport-aware
- receipt-aware
- settlement-aware

The target outcome is simple:

**Any agent, any framework, any organization can discover, negotiate with, pay, verify, and rate an Evalanche-compatible agent without a custom integration.**

---

## Architecture Direction

```
┌──────────────────────────────────────────────────────────────┐
│                 MCP + SDK Public Surfaces                   │
│  wallet / economy / bridge / interop / transport / demos    │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                     src/interop/                             │
│  identity, A2A, manifests, receipts                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    src/transport/                            │
│  XMTP and other async agent transports                       │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                     src/economy/                             │
│  policy, discovery, negotiation, settlement, escrow, memory  │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    Existing primitives                       │
│  wallet / identity / reputation / x402 / bridge / markets    │
└──────────────────────────────────────────────────────────────┘
```

---

## Design Principles

1. Build on open standards where they exist.
2. Compose existing Evalanche primitives instead of parallel reinvention.
3. Keep security and guardrails as first-class concerns.
4. Keep optional integrations lazy and isolated.
5. Prefer portable receipts and verifiable state over implicit trust.
6. End each phase with runnable value, not only abstractions.
7. Keep one authoritative roadmap and update it as work lands.

---

## Next Phases

### Phase 8: Native A2A Support

> **Why next:** Once identity is resolved cleanly, the next missing layer is standard task interaction.

- [ ] **Step 8.1 — Agent Card client**
  - Create `src/interop/a2a.ts`
  - `fetchAgentCard(endpoint)` for `.well-known/agent-card.json`
  - Parse agent card metadata and capabilities
  - Resolve agent cards from ERC-8004 registrations

- [ ] **Step 8.2 — A2A task client**
  - `submitTask()`
  - `getTask()`
  - `streamTask()`
  - `cancelTask()`
  - Support full task lifecycle mapping

- [ ] **Step 8.3 — Evalanche adapters**
  - Map A2A skills to discovery
  - Map A2A task submission to negotiation
  - Map task completion to settlement
  - Map task failure to rejection/refund paths

- [ ] **Step 8.4 — Optional A2A server support**
  - Serve `agent-card.json`
  - Expose local handlers via A2A-compatible interfaces

- [ ] **Step 8.5 — MCP tools for A2A**
  - `fetch_agent_card`
  - `a2a_submit_task`
  - `a2a_get_task`
  - `a2a_cancel_task`
  - `a2a_list_skills`
  - `a2a_serve`

- [ ] **Step 8.6 — Tests for A2A**
  - Unit tests for cards, lifecycle, streaming, and adapters
  - MCP coverage

### Phase 9: XMTP Transport Layer

> **Why after A2A:** A2A handles synchronous interaction; XMTP is the durable async layer.

- [ ] **Step 9.1 — XMTP client adapter**
  - Create `src/transport/xmtp.ts`
  - Open DMs, send messages, stream messages, list conversations

- [ ] **Step 9.2 — Structured message envelopes**
  - Negotiation proposals
  - Counters
  - Accept/reject flows
  - Payment requests
  - Settlement receipts
  - Task updates
  - Trust attestations

- [ ] **Step 9.3 — A2A over XMTP bridge**
  - Route A2A interactions through XMTP when HTTP is unavailable

- [ ] **Step 9.4 — Memory integration**
  - Record XMTP-sourced interactions in `AgentMemory`

- [ ] **Step 9.5 — MCP tools for XMTP**
  - `xmtp_open_channel`
  - `xmtp_send_agent_message`
  - `xmtp_list_messages`
  - `xmtp_watch_messages`
  - `xmtp_list_conversations`

- [ ] **Step 9.6 — Tests for XMTP**
  - Unit coverage for adapter, envelopes, and bridges
  - MCP coverage

### Phase 10: Trust and Settlement Composition

> **Why after protocol + transport:** Trust becomes composable only when interactions and artifacts have a canonical shape.

- [ ] **Step 10.1 — Signed service manifests**
  - Create `src/interop/manifests.ts`
  - Tie identity, wallet, transports, trust modes, pricing, and supported rails together

- [ ] **Step 10.2 — Canonical receipts**
  - Create `src/interop/receipts.ts`
  - Task, payment, escrow, and reputation receipts
  - Signable, portable, verifiable

- [ ] **Step 10.3 — Trust policy v2**
  - Verified endpoint requirements
  - Reputation thresholds
  - Trust mode requirements
  - Escrow requirements
  - Receipt-gated settlement rules

- [ ] **Step 10.4 — Receipt-gated escrow release**
  - Extend escrow flows so verified receipts can unlock release

- [ ] **Step 10.5 — MCP tools for manifests, receipts, and trust**
  - Create, verify, and enforce trust artifacts and policies

- [ ] **Step 10.6 — Tests for trust composition**
  - Unit and MCP coverage

### Phase 11: Security Hardening and Dependency Surface Reduction

> **Why now:** The more connected the system becomes, the more important it is to shrink risk at the boundaries.

- [ ] **Step 11.1 — Safe network primitives**
  - Harden all remote fetch paths
  - Enforce protocol and address restrictions where applicable

- [ ] **Step 11.2 — Secret and subprocess hardening**
  - Tighten secret resolution and log hygiene
  - Audit wrapper subprocess behavior

- [ ] **Step 11.3 — Optional module isolation**
  - Keep heavy integrations lazy and optional

- [ ] **Step 11.4 — Dependency reduction plan**
  - Map vulnerability reachability
  - Reduce or isolate risky trees

- [ ] **Step 11.5 — Tests for hardening work**
  - Network boundary, timeout, secret, and isolation coverage

### Phase 12: ERC-8183 Commerce Adapter

> **Why here:** This should be an optional settlement rail layered onto the interop stack, not a core assumption.

- [ ] **Step 12.1 — ERC-8183 client module**
- [ ] **Step 12.2 — Job lifecycle methods**
- [ ] **Step 12.3 — A2A / XMTP / receipt composition**
- [ ] **Step 12.4 — MCP tools for ERC-8183**
- [ ] **Step 12.5 — Tests for ERC-8183 adapter**

### Phase 13: Real Multi-Agent Demos

> **Why last:** The stack needs proof through real end-to-end flows.

- [ ] **Demo 1 — Paid research agent**
- [ ] **Demo 2 — Cross-agent execution market**
- [ ] **Demo 3 — Async long-running job**
- [ ] **Step 13.4 — Update README and architecture docs**

### Optional Adapter Track: Tempo

> **Why optional:** Useful for commercial workflows, but not foundational like ERC-8004, A2A, or XMTP.

- [ ] Add optional Tempo adapter module
- [ ] Add discovery / execution wrappers
- [ ] Keep it lazy and non-blocking for the base install

---

## Near-Term Priority Order

1. A2A client and agent-card resolution
2. A2A-to-economy adapters
3. XMTP transport adapter
4. Signed manifests and canonical receipts
5. Trust-policy composition
6. Security/dependency hardening pass
7. End-to-end demos

---

## Maintenance Rules

1. This file is the only active roadmap.
2. When a step ships, mark it here and summarize the result briefly.
3. Do not create a second roadmap file for future phases.
4. Historical milestone detail can be summarized here instead of preserved as a separate active plan.
