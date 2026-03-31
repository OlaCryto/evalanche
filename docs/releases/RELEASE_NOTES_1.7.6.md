## Summary

This release hardens the Polymarket integration and documents the agent-facing surface more clearly.

## Highlights

- Polymarket market discovery now prefers live CLOB market reads and falls back to Gamma when needed
- the SDK supports direct `BUY` and `SELL` orders through `placeOrder()` and exposes a `placeMarketSellOrder()` helper for target-USDC sell flows
- MCP now exposes `pm_sell` alongside the existing Polymarket read and buy tools
- the README and skill docs now describe the Polymarket SDK flow, MCP tools, and current limitations for agents using the integration

## Validation

- `npm run test`
- `npm run typecheck`
- `npm run build`

## Notes for Maintainers

- `pm_sell` is a market-sell helper, not a limit-sell tool
- `pm_redeem` remains intentionally unimplemented until winning-share redemption is wired through the CTF contract path
