This release hardens live execution and canonical-chain DeFi routing, with the fixes validated against funded wallets and a full green test/build pass.

## Highlights

- Polymarket live execution fixes:
  - `pm_buy` now uses the SDK-compatible buy-order nonce path again, fixing live `invalid nonce` failures.
  - `pm_buy` surfaces venue rejections honestly, including geoblocking and min-order-size errors.
  - `pm_balances` now reports allowance consistently from the true source of truth, including `allowanceSource` and matching `rawAllowance`.
  - live funded `pm_buy` was verified end to end with venue reconciliation.

- Canonical-chain DeFi fixes:
  - yoUSD vault reads and quote paths now route cleanly to Base from MCP.
  - sAVAX quote paths now route cleanly to Avalanche from MCP.
  - vault metadata/quote reads were hardened for flaky public RPC behavior by disabling provider batching and making metadata reads deterministic.
  - `savax_unstake_quote` now degrades to delayed-only when instant pool balance probing reverts instead of failing the whole quote.

- Hyperliquid live execution hardening:
  - market order price/size normalization was fixed for low-priced assets.
  - live tiny trade and close-position verification succeeded after the fix.

- Polymarket discovery/runtime fixes:
  - stale/malformed market search handling was tightened.
  - venue-truth reconciliation remains the authority for execution reporting.

## Validation

- `npm run test` -> `486/486` passed
- `npm run typecheck` passed
- `npm run build` passed

## Live checks completed

- Polymarket funded buy + venue reconciliation
- Hyperliquid tiny trade + close verification
- LI.FI live Polygon swap execution
- yoUSD Base quote flow
- sAVAX Avalanche quote flow
