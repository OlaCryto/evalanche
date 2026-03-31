## Summary

This release expands the routing and perp abstractions while tightening project planning into a single active roadmap.

## Highlights

- LI.FI route selection now supports strategy-driven configuration such as `minimum_slippage`, `minimum_execution_time`, `fastest_route`, and `minimum_completion_time`
- MCP and SDK LI.FI flows now expose routing controls like explicit route order, preset, max price impact, and simulation skipping
- perpetuals were refactored around shared venue-neutral interfaces instead of dYdX-only shared types
- Hyperliquid was added as a first-class perp venue with market/account reads and explicit HIP-3 market metadata
- HIP-3 is modeled as Hyperliquid market classification (`marketClass: 'hip3'`), not as a separate venue
- the roadmap is now unified into a single `ROADMAP.md`

## Validation

- `npm run test -- test/bridge/lifi.test.ts`
- `npm run test -- test/mcp/server.test.ts`
- `npm run test -- test/perps/hyperliquid/client.test.ts test/perps/types.test.ts test/perps/dydx/types.test.ts test/agent.test.ts`
- `npm run typecheck`
- `npm run build`

## Notes for Maintainers

- Hyperliquid trading methods remain intentionally unimplemented until nonce/signing and API-wallet support are designed properly
- future release tags should continue to ship a matching `RELEASE_NOTES_X.Y.Z.md`
