# Evalanche 1.7.1

## Summary

This patch release adds a tag-driven release pipeline so future Evalanche releases can publish more consistently from a single source of truth.

## Highlights

- pushed `vX.Y.Z` tags now trigger the release workflow directly
- the workflow validates `package.json`, requires a matching `RELEASE_NOTES_X.Y.Z.md`, and runs tests, typecheck, and build before publishing
- GitHub Releases are now created automatically from the matching release-notes file
- npm publish remains trusted-publishing based
- ClawHub skill publication is now part of the automated release flow
- `RELEASING.md` documents the release checklist and expected outcomes for maintainers

## Validation

- workflow YAML parsed successfully
- release metadata is now aligned to `1.7.1`

## Notes for Maintainers

- future releases should ship `RELEASE_NOTES_X.Y.Z.md` in the tagged commit
- the workflow expects `CLAWHUB_TOKEN` to be configured in GitHub Actions secrets
