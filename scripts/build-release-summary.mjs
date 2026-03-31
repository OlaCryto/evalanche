#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_ROOT, parseArgs, readJson } from './release-helpers.mjs';

async function readOptionalJson(rootDir, file) {
  if (!file) return null;
  try {
    return await readJson(path.resolve(rootDir, file));
  } catch {
    return null;
  }
}

export async function buildReleaseSummary({
  rootDir = DEFAULT_ROOT,
  version,
  releaseNotes,
  testsStatus = 'pass',
  typecheckStatus = 'pass',
  buildStatus = 'pass',
  integrityFile,
  docsParityFile,
  tarballCheckFile,
  auditRegressionFile,
  mcpToolsFile,
  smokeFile,
  manifestFile,
  uploadedAssets = [],
  out,
} = {}) {
  const integrity = await readOptionalJson(rootDir, integrityFile);
  const docsParity = await readOptionalJson(rootDir, docsParityFile);
  const tarball = await readOptionalJson(rootDir, tarballCheckFile);
  const auditRegression = await readOptionalJson(rootDir, auditRegressionFile);
  const mcpTools = await readOptionalJson(rootDir, mcpToolsFile);
  const smoke = await readOptionalJson(rootDir, smokeFile);
  const manifest = await readOptionalJson(rootDir, manifestFile);

  const auditCounts = auditRegression?.currentCounts ?? {};
  const tarballSize = tarball?.size ?? 'unknown';
  const toolCount = mcpTools?.toolCount ?? 'unknown';
  const manifestName = manifest?.package?.name;
  const manifestVersion = manifest?.package?.version;
  const manifestLabel = manifestName && manifestVersion
    ? `\`${manifestName}@${manifestVersion}\``
    : 'unavailable';

  const markdown = [
    `## Release Summary: v${version}`,
    '',
    `- Release notes: \`${releaseNotes}\``,
    `- Tests: ${testsStatus}`,
    `- Typecheck: ${typecheckStatus}`,
    `- Build: ${buildStatus}`,
    `- Integrity: ${integrity ? (integrity.ok ? 'pass' : 'fail') : 'not available'}`,
    `- Docs parity: ${docsParity ? (docsParity.ok ? 'pass' : 'fail') : 'not available'}`,
    `- MCP tool count: ${toolCount}`,
    `- Tarball size: ${typeof tarballSize === 'number' ? `${tarballSize} bytes` : tarballSize}`,
    `- Audit: ${auditRegression ? `${auditCounts.critical ?? 'unknown'} critical / ${auditCounts.high ?? 'unknown'} high / ${auditCounts.low ?? 'unknown'} low` : 'not available'}`,
    `- Read-only smoke: ${smoke ? (smoke.ok ? 'pass' : 'fail') : 'not available'}`,
    `- Release assets: ${uploadedAssets.length > 0 ? uploadedAssets.join(', ') : 'none'}`,
    `- Manifest: ${manifestLabel}`,
    '',
  ].join('\n');

  if (out) {
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, markdown);
  }

  return markdown;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const markdown = await buildReleaseSummary({
    version: args.version,
    releaseNotes: args['release-notes'],
    testsStatus: args.tests ?? 'pass',
    typecheckStatus: args.typecheck ?? 'pass',
    buildStatus: args.build ?? 'pass',
    integrityFile: args.integrity,
    docsParityFile: args['docs-parity'],
    tarballCheckFile: args['tarball-check'],
    auditRegressionFile: args['audit-regression'],
    mcpToolsFile: args['mcp-tools'],
    smokeFile: args.smoke,
    manifestFile: args.manifest,
    uploadedAssets: args.assets ? String(args.assets).split(',').filter(Boolean) : [],
    out: args.out,
  });
  console.log(markdown);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
