# Evalanche 1.7.2

## Summary

This patch release validates the corrected tag-driven release workflow after the `1.7.1` ClawHub publish failure.

## Highlights

- the ClawHub release step now publishes the `evalanche` skill with an explicit slug instead of inferring `skill` from the folder name
- the release pipeline remains tag-driven and continues to create the GitHub Release and publish to npm automatically
- this release exists mainly to verify the final ClawHub leg of the automation

## Validation

- local MCP version assertion updated to `1.7.2`
- targeted MCP server test remains green before tagging

## Notes for Maintainers

- future releases should continue to ship `RELEASE_NOTES_X.Y.Z.md` in the tagged commit
- if ClawHub behavior changes again, check the workflow’s explicit `--slug evalanche` publish path first
