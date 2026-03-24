# Releasing Evalanche

This repository uses a tag-driven GitHub Actions release workflow.

On every pushed `vX.Y.Z` tag, GitHub Actions will:

- validate that the tag matches `package.json`
- require `RELEASE_NOTES_X.Y.Z.md` to exist
- run `npm test`
- run `npm run typecheck`
- run `npm run build`
- create the GitHub Release from the matching release-notes file
- publish the npm package via trusted publishing
- publish the ClawHub skill from `skill/`

## Prerequisites

- `CLAWHUB_TOKEN` is configured in GitHub Actions secrets
- npm trusted publishing is configured for this repository on npmjs.com
- `skill/SKILL.md` is updated for the release

## Release Steps

1. Update code, docs, and `skill/SKILL.md` as needed.
2. Add `RELEASE_NOTES_X.Y.Z.md`.
3. Bump the version in `package.json` and `package-lock.json` to `X.Y.Z`.
4. Run:

```bash
npm test
npm run typecheck
npm run build
```

5. Commit the release changes.
6. Create the tag:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
```

7. Push the branch and tag:

```bash
git push origin main
git push origin vX.Y.Z
```

## Expected Outcome

After the tag push, GitHub Actions should:

- create a GitHub Release named `Evalanche vX.Y.Z`
- publish `evalanche@X.Y.Z` to npm
- publish the updated Evalanche skill to ClawHub

## Troubleshooting

- If the workflow fails early, check that the tag exactly matches `package.json`.
- If the workflow cannot create the release, check repository Actions permissions.
- If ClawHub publish fails, verify `CLAWHUB_TOKEN` is present and still valid.
- If npm publish fails, verify trusted publishing is still configured for this repo.
