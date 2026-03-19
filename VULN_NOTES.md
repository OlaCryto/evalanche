# Vulnerability Notes

## Status after v1.4.0 remediation pass

The dependency remediation pass removed the critical `@hpke/core` path and upgraded vulnerable `axios` copies used by dYdX, Ledger helper packages, and `@osmonauts/lcd` via npm overrides.

Current `npm audit --omit=dev` state after remediation:
- 0 critical
- 3 high
- 18 low

## Remaining high-severity blocker

The remaining high vulnerabilities are trapped inside the Avalanche Core wallet SDK hardware-wallet dependency chain:

- `@avalabs/core-wallets-sdk@3.0.2`
- `@ledgerhq/hw-app-btc`
- `tiny-secp256k1`

`npm audit` does not provide a non-breaking fix for this tree today.

## Practical interpretation

These remaining highs matter mainly for the optional hardware-wallet / Ledger path pulled in by `@avalabs/core-wallets-sdk`, not for evalanche's core EVM wallet flow built on ethers.

## Recommended next step

Choose one of:
1. Replace or isolate `@avalabs/core-wallets-sdk` further so the hardware-wallet path is no longer part of the base install/runtime.
2. Track upstream fixes in the Avalanche Core SDK / Ledger packages and upgrade when available.
3. If multi-VM support can be split into a separate optional package, move this dependency tree out of the main package.
