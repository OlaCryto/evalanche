# Evalanche Roadmap

This is the active roadmap for the repository.

<!-- GENERATED:roadmap-release:start -->
## Latest Shipped Release

- Latest release: [v1.8.8](docs/releases/RELEASE_NOTES_1.8.8.md)
- Shipped in `v1.8.8`:
  - Added a universal in-repo holdings registry shared by all agents
  - Added unified holdings scanning through `agent.holdings().scan()`
  - Added MCP tools: `get_holdings` `search_registry` `registry_status`
  - Unified DeFi routing and holdings discovery onto the same universal registry

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
