## Highlights

- Hyperliquid is now a first-class trading venue in both the SDK and MCP surface.
- LI.FI execution flows now return stable verification envelopes instead of raw transaction-only responses.
- Yield and vault quote/info paths were repaired, especially around asset/share decimal handling and honest error mapping.
- A release-grade live smoke checklist now documents the required Polymarket, Hyperliquid, LI.FI, and vault verification flow before ship.

## Included work

### Hyperliquid execution surface
- added market orders, limit orders, cancellation, close-position flows, order lookup, open-orders, and fills
- exposed the full Hyperliquid execution family through MCP tools
- kept HIP-3 modeled as Hyperliquid market metadata rather than a separate venue

### LI.FI execution certification
- `lifi_swap` and `lifi_compose` now return `request`, `submission`, `verification`, and `warnings`
- added tx receipt, transfer status, and balance-delta verification paths where possible
- kept route-strategy configuration intact across execution calls

### Yield / vault repair
- fixed EIP-4626 asset/share decimal handling in quote and execution helpers
- improved error mapping for unsupported or reverted quote/info reads
- updated MCP vault quote handlers to accept explicit asset/share decimal overrides

### Release-certification docs
- updated README and skill docs for the new execution surfaces
- added a live smoke checklist runbook for release validation
