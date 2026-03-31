# Evalanche 1.7.8

## Summary

This release turns the Polymarket MCP surface into a more reliable execution layer by adding deterministic preflight checks, venue-first verification, and structured reconciliation tools.

## Highlights

- added `pm_preflight` for buy, sell, and limit-sell execution checks before order submission
- added venue inspection and reconciliation tools: `pm_balances`, `pm_order`, `pm_open_orders`, `pm_trades`, and `pm_reconcile`
- `pm_market` and `pm_orderbook` now return structured inspection results instead of brittle upstream exceptions
- `pm_positions` now returns a stable envelope with `walletAddress`, `count`, and `positions`
- `pm_buy`, `pm_sell`, and `pm_limit_sell` now include `request`, `preflight`, `submission`, `verification`, and `warnings` in their responses
- MCP server version metadata is aligned with the released package version

## Validation

- `npm run test`
- `npm run typecheck`
- `npm run build`

## Notes for Maintainers

- downstream agents can now verify venue truth without building their own Polymarket reconciliation layer
- `pm_sell` and `pm_limit_sell` share the same preflight primitives, so future execution changes should stay in one place
