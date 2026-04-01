# Evalanche Roadmap

This is the active roadmap for the repository.

<!-- GENERATED:roadmap-release:start -->
## Latest Shipped Release

- Latest release: [v1.8.9](docs/releases/RELEASE_NOTES_1.8.9.md)
- Shipped in `v1.8.9`:
  - Implemented Polymarket redemption through the real `pm_redeem` path on the Conditional Tokens Framework on Polygon
  - `pm_redeem` now verifies resolution onchain, submits `redeemPositions`, and reports USDC plus token-balance deltas
  - Expanded the release workflow into a stricter certification pipeline with integrity, docs-parity, tarball, audit-regression, smoke, and manifest gates
  - Aligned published package entrypoints with the actual build output so the tarball matches both CommonJS and ESM consumers

## Current Focus

- Avalanche-first execution quality
- Holdings coverage
- Interop and transport
- Security and dependency reduction
<!-- GENERATED:roadmap-release:end -->

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
