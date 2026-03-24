# Evalanche 1.7.0

## Summary

This release hardens the payment, settlement, network-switching, and transport layers, updates live bridge/gas integrations to current vendor behavior, and repairs the test harness so the suite is trustworthy again.

## Highlights

- x402 proofs are now challenge-bound, single-use, and validated against request path/body
- settlement now requires a real EVM recipient address instead of implicitly treating agent IDs like wallet addresses
- MCP `switch_network` now rebinds provider- and wallet-dependent helpers after changing networks
- `safeFetch` now enforces response-size limits even when responses are streamed or omit `content-length`
- mixed env/OpenClaw secret fallback now preserves plain credentials when secret refs fail
- identity resolution is chain-aware for reputation registries, and wallet reverse-resolution now verifies current ownership
- Avalanche cross-chain imports now poll for atomic UTXO availability instead of sleeping a fixed 3 seconds
- Gas funding now uses LI.FI's live `gasZipBridge` route surface and LI.FI gas suggestion handling matches the current endpoint shape
- dYdX runtime loading/build packaging was hardened and validated from the built package

## Validation

- `npm run test`
- `npm run typecheck`
- `npm run build`
- live smoke pass from `dist` covering keystore boot/reload, network switching, LI.FI discovery + gas suggestion, Gas.zip quote generation, CoinGecko, Polymarket read flows, and dYdX market loading

## Notes for Integrators

- If you expose paid endpoints with `AgentServiceHost`, clients must answer the current `402` challenge. Cached proofs are no longer accepted.
- If you use economy settlement or the MCP `settle_payment` tool, include a recipient address via proposal `toAddress` or `recipientAddress`.
