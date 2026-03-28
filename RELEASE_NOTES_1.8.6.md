# Evalanche v1.8.6

## Summary

`v1.8.6` closes the main issues raised in the March 28 capability report by making DeFi chain resolution deterministic, strengthening venue-truth reporting for Polymarket, and expanding the verification payloads returned by Hyperliquid and LI.FI MCP execution tools.

## Highlights

### Chain-aware DeFi routing

- added interoperable address parsing for DeFi inputs such as `0x...@base`
- introduced an Evalanche-owned dapp registry abstraction with local canonical mappings
- routed known vaults like yoUSD to Base automatically
- routed Avalanche-native staking like sAVAX to Avalanche automatically
- explicit wrong-chain requests now fail clearly before contract decode/revert noise

### AvaPilot-backed Avalanche registry provider

- vendored a static Avalanche service snapshot derived from AvaPilot registry data
- added an Avalanche-specific provider behind the Evalanche registry interface
- kept local canonical mappings authoritative over provider data
- kept runtime resolution offline-safe by avoiding live GitHub/network dependency

### Polymarket venue-truth reporting

- sell and reconciliation flows now surface venue-state summaries directly
- reconciliation now warns when venue conditional balances and position snapshots disagree
- unsafe sell attempts are blocked using venue truth even when other local signals look plausible

### Hyperliquid and LI.FI recertification

- Hyperliquid MCP execution tools now return richer post-submission verification payloads
- LI.FI swap and compose tools now include stronger verification fields for tx, route, and transfer state
- MCP-level regression coverage now explicitly covers empty-account, cancel, close, and cross-chain verification scenarios

### Operator runbook

- upgraded the live smoke checklist into a report-closure checklist
- added explicit closure criteria tying report claims to code fixes, regressions, and manual live validation

## Validation

- `npm run test`
- `npm run typecheck`
- `npm run build`
