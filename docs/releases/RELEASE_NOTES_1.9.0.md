## Highlights

- Implemented `pm_withdraw`, so Evalanche can now withdraw Polygon `USDC.e` from the Polymarket wallet through the official Polymarket bridge flow
- `pm_withdraw` gets a bridge quote, creates withdrawal addresses, submits the onchain `USDC.e` transfer, and returns the initial bridge-status snapshot for verification
- MCP now exposes `pm_withdraw` alongside the existing Polymarket trading, reconciliation, deposit, and redemption flows
- Added focused client and MCP regression coverage for the new Polymarket withdrawal path

## Validation

- `npm run test`
- `npm run typecheck`
- `npm run build`

## Notes

- `pm_withdraw` currently wraps the Polygon `USDC.e` withdrawal path that Polymarket exposes through its bridge APIs
- the returned envelope separates quote, submission, and verification fields so agents can reason about the onchain transfer and bridge settlement independently
