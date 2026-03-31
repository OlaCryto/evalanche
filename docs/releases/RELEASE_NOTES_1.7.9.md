# Evalanche 1.7.9

## Summary

This release fixes a Polymarket collateral unit mismatch that could make `pm_preflight` report a wallet as funded even when the venue balance was only a few cents in raw microUSDC.

## Highlights

- normalized Polymarket collateral balance and allowance reads from raw 6-decimal USDC units into human USDC before buy preflight checks
- added raw collateral fields to the `pm_balances` response so agents can inspect both display and venue-native values
- `pm_buy` now fails deterministically in preflight for underfunded microUSDC wallets instead of reaching the CLOB order path
- added regression coverage for the `26190` microUSDC case and related buy/preflight behavior

## Validation

- `npm run test`
- `npm run typecheck`
- `npm run build`

## Notes for Maintainers

- this fix is in the balance normalization path, not the Polymarket nonce path
- the relevant regression is: `26190` raw collateral should be treated as `0.02619 USDC`, not `26190 USDC`
