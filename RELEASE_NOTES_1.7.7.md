# Evalanche 1.7.7

## Summary

This release hardens Polymarket sell execution so agents do not silently route into unsafe dust-floor fills.

## Highlights

- `pm_sell` now performs a slippage check against visible bid-side liquidity before execution
- immediate sells are submitted as protected `FAK` limit orders instead of unbounded market sells
- Polymarket CLOB auth fallback now uses fresh nonces per derive/create attempt
- `pm_limit_sell` now respects `postOnly: false` instead of always forcing a resting order
- regression tests were added for auth nonce handling, protected sells, and `pm_limit_sell` execution semantics

## Validation

- `npm run test -- test/polymarket/client-extended.test.ts`
- `npm run test -- test/polymarket/client.test.ts`
- `npm run typecheck`
- `npm run build`

## Notes for Maintainers

- `pm_sell` now fails fast when visible liquidity would breach the configured slippage bound
- `pm_limit_sell` remains the explicit tool for posting a resting sell order on the book
