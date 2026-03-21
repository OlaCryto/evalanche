# Evalanche 1.6.0

## What shipped
- Sovereign Polymarket execution path is now live in the local Evalanche build
- MCP wiring added for `pm_approve` and `pm_buy`
- Polymarket auth fallback hardened for wallets that already have API keys
- Additional unit coverage added across previously thin / untested modules
- Release hardening for active Mony sovereign-wallet workflows

## Test status
- `npm test` → **433 passing tests**
- `npm run build` → passed
- `npm run typecheck` → passed

## New coverage added
- Avalanche provider + cross-chain orchestration
- TTL cache
- error helpers / network config / safe-fetch
- wallet transaction builder
- reputation reporter
- YieldYak swap client
- x402 facilitator proof creation
- OpenClaw secrets resolution

## Live sovereign smoke tests completed
Using the sovereign wallet, Evalanche was exercised against production infra for:
- yoUSD vault withdrawal on Base
- Base USDC → Polygon bridge via LiFi
- Polygon USDC → USDC.e conversion via LiFi/Sushi path
- Polymarket collateral approvals
- sovereign Polymarket test buy + migration buys

## Wallet test budget
- A dedicated **$10 sovereign testing reserve** was carved out from yoUSD into liquid Base USDC for ongoing Evalanche feature validation
- Reserve tx: `0x06e0ab7cf7da86461c2819bd9d70585c69d7039fa168c17cb701ee0773cd6934`

## Notes
- Bankr is retired from active Mony workflows; sovereign Evalanche is the active execution path
- `pm_redeem` remains intentionally unimplemented until settlement/redeem flow is wrapped cleanly
