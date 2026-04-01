## Highlights

- Implemented Polymarket redemption through the real `pm_redeem` path on the Conditional Tokens Framework on Polygon
- `pm_redeem` now verifies resolution onchain, submits `redeemPositions`, and reports USDC plus token-balance deltas
- Expanded the release workflow into a stricter certification pipeline with integrity, docs-parity, tarball, audit-regression, smoke, and manifest gates
- Aligned published package entrypoints with the actual build output so the tarball matches both CommonJS and ESM consumers
- Simplified release notes by removing redundant in-file version titles; the filename and GitHub Release title now carry version identity

## Validation

- `npm run test`
- `npm run typecheck`
- `npm run build`

## Notes

- `pm_redeem` redeems winning Polymarket positions against the CTF contract on Polygon using USDC.e collateral
- release notes coverage now keys off `## Highlights` instead of a versioned H1
