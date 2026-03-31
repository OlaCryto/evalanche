# Evalanche

Avalanche-first agent wallet and execution SDK for AI agents, with multi-EVM support for holdings, payments, DeFi, bridge flows, prediction markets, and perpetuals.

<!-- GENERATED:release-summary:start -->
## Current Release

- Latest release: [v1.8.8](docs/releases/RELEASE_NOTES_1.8.8.md)
- Published package: `evalanche@1.8.8`
- Current package surface:
  - Added a universal in-repo holdings registry shared by all agents
  - Added unified holdings scanning through `agent.holdings().scan()`
  - Added MCP tools: `get_holdings` `search_registry` `registry_status`
  - Unified DeFi routing and holdings discovery onto the same universal registry
- Docs:
  - [Release notes](docs/releases/README.md)
  - [Roadmap](ROADMAP.md)
  - [Release process](RELEASING.md)
  - [Security](SECURITY.md)
<!-- GENERATED:release-summary:end -->

## Install

```bash
npm install evalanche
```

## Quick Start

```typescript
import { Evalanche } from 'evalanche';

const { agent } = await Evalanche.boot({ network: 'avalanche' });

console.log(agent.address);

const holdings = await agent.holdings().scan();
console.log(holdings.summary);
```

## MCP

```bash
npx evalanche-mcp
```

Evalanche ships an MCP server for wallet actions, holdings discovery, DeFi, bridge and swap flows, Polymarket, and perpetual venues.

## What It Does

- Avalanche-first wallet boot, identity, and agent execution flows
- Unified holdings discovery across wallet balances, DeFi positions, prediction positions, and perp venues
- Cross-chain bridge, swap, and gas-funding flows
- Avalanche and multi-EVM DeFi actions
- Polymarket market reads and execution
- Perpetual trading support for Hyperliquid and dYdX

## Also Works Across EVM

Avalanche is the primary path, but Evalanche also supports Base, Ethereum, Arbitrum, Optimism, Polygon, BSC, and other EVM networks for execution and holdings discovery.

## Docs

- [Roadmap](ROADMAP.md)
- [Release notes](docs/releases/README.md)
- [Release process](RELEASING.md)
- [Smoke checklist](docs/live-smoke-checklist.md)
- [Protocol notes](docs/eva-protocol.md)
- [Security](SECURITY.md)
- [Open gaps](GAPS.md)
- [Security posture](VULN_NOTES.md)

## License

MIT
