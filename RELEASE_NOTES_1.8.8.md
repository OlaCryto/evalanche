# Evalanche v1.8.8

## Highlights

- Added a universal in-repo holdings registry shared by all agents
- Added unified holdings scanning through `agent.holdings().scan()`
- Added MCP tools:
  - `get_holdings`
  - `search_registry`
  - `registry_status`
- Unified DeFi routing and holdings discovery onto the same universal registry
- Added DefiLlama import tooling for maintainers via `npm run sync:defillama-registry`
- Updated the README and npm package metadata to match the shipped package surface

## Holdings Coverage

The unified scanner now covers:

- native balances across supported EVM chains
- seeded ERC-20 balances
- ERC-4626 vault positions such as yoUSD and Avantis `avUSDC`
- liquid staking receipts such as sAVAX
- Polymarket positions
- Hyperliquid and dYdX perp positions

## Notes

- The registry source of truth remains the repo
- DefiLlama is used for seed/enrichment, not runtime wallet ownership
- Wallet ownership is always confirmed through live onchain or venue reads
