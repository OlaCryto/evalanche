# Vulnerability Notes

This file is a short current-state security posture note, not a historical remediation log.

## Current Posture

- keep dependency overrides explicit and current
- track vulnerability reachability, not only raw advisory counts
- prefer isolating optional heavy integrations over carrying risky trees in the main runtime path

## Current Watch Areas

- Avalanche Core SDK dependency surface
- Ledger and hardware-wallet transitive paths
- multi-client trees that duplicate shared HTTP dependencies like `axios`

## Expected Maintenance

- review dependency changes during release prep
- keep override policy aligned with the installed tree
- update this note when the current risk picture materially changes
