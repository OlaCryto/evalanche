# Evalanche Roadmap

This is the active roadmap for the repository.

## Current State

Evalanche is an Avalanche-first agent wallet and execution SDK with:

- non-custodial wallet boot and identity support
- unified holdings discovery
- bridge, swap, and gas-funding flows
- Avalanche and multi-EVM DeFi actions
- Polymarket integration
- perpetual venue support for Hyperliquid and dYdX
- MCP and SDK public surfaces

## Near-Term Priorities

### 1. Avalanche-first execution quality

- keep Avalanche as the primary docs, examples, and user path
- expand canonical Avalanche app coverage
- improve execution and verification for Avalanche-native protocols

### 2. Holdings coverage

- grow the universal in-repo holdings registry
- expand protocol detectors and seeded sources
- reduce false negatives across DeFi positions and venue holdings

### 3. Interop and transport

- extend agent identity and interoperability support
- add stronger A2A-style task exchange patterns
- improve async transport and trust artifacts where they add real execution value

### 4. Security and dependency reduction

- keep optional integrations isolated
- reduce vulnerability reachability in heavy dependency trees
- maintain clear release and smoke-check discipline

## Working Rules

- keep one active roadmap
- keep release notes out of the repo root
- prefer shipped, testable value over speculative architecture
- update this file when priorities change materially
