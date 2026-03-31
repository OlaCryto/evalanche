#!/usr/bin/env node

import path from 'node:path';
import {
  DEFAULT_ROOT,
  extractHighlights,
  loadPackage,
  maybeWriteJson,
  parseArgs,
  readJson,
} from './release-helpers.mjs';

async function readOptionalJson(rootDir, file) {
  if (!file) return null;
  try {
    return await readJson(path.resolve(rootDir, file));
  } catch {
    return null;
  }
}

export async function buildReleaseManifest({
  rootDir = DEFAULT_ROOT,
  version,
  tag,
  sha,
  releaseNotes,
  mcpToolsFile,
  packJsonFile,
  tarballCheckFile,
  auditFile,
  auditRegressionFile,
  docRefreshFile,
  out,
} = {}) {
  const pkg = await loadPackage(rootDir);
  const notesPath = path.resolve(rootDir, releaseNotes);
  const notesContent = await import('node:fs/promises').then(({ readFile }) => readFile(notesPath, 'utf8'));
  const highlights = extractHighlights(notesContent);
  const mcpTools = await readJson(path.resolve(rootDir, mcpToolsFile));
  const packJson = await readJson(path.resolve(rootDir, packJsonFile));
  const tarballCheck = await readJson(path.resolve(rootDir, tarballCheckFile));
  const audit = await readJson(path.resolve(rootDir, auditFile));
  const auditRegression = await readJson(path.resolve(rootDir, auditRegressionFile));
  const docRefresh = await readOptionalJson(rootDir, docRefreshFile);
  const packEntry = Array.isArray(packJson) ? packJson[0] : packJson;

  return maybeWriteJson(out, {
    version,
    tag,
    sha,
    package: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
    },
    releaseNotes: {
      path: releaseNotes,
      highlightsCount: highlights.length,
    },
    docsRefresh: docRefresh,
    mcp: {
      toolCount: mcpTools.toolCount,
    },
    tarball: {
      filename: packEntry.filename,
      size: packEntry.size,
      unpackedSize: packEntry.unpackedSize,
      entryCount: packEntry.entryCount,
      validation: tarballCheck,
    },
    audit: {
      summary: audit.metadata?.vulnerabilities ?? {},
      regression: auditRegression,
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await buildReleaseManifest({
    version: args.version,
    tag: args.tag,
    sha: args.sha,
    releaseNotes: args['release-notes'],
    mcpToolsFile: args['mcp-tools'],
    packJsonFile: args['pack-json'],
    tarballCheckFile: args['tarball-check'],
    auditFile: args.audit,
    auditRegressionFile: args['audit-regression'],
    docRefreshFile: args['doc-refresh'],
    out: args.out,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
