#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_ROOT,
  maybeWriteJson,
  normalizeVersion,
  parseArgs,
  readJson,
  supportLine,
} from './release-helpers.mjs';

const DOC_FILES = ['README.md', 'ROADMAP.md', 'RELEASING.md', 'SECURITY.md', 'VULN_NOTES.md'];

function extractBacktickedTokens(text) {
  return Array.from(text.matchAll(/`([^`]+)`/g)).map((match) => match[1]);
}

function maybeToolName(token) {
  return /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(token) ? token : null;
}

export async function checkDocsParity({
  rootDir = DEFAULT_ROOT,
  version,
  mcpToolsFile,
  out,
} = {}) {
  const resolvedVersion = normalizeVersion(version);
  const notesPath = `docs/releases/RELEASE_NOTES_${resolvedVersion}.md`;
  const toolsData = await readJson(path.resolve(rootDir, mcpToolsFile));
  const toolNames = new Set((toolsData.tools ?? []).map((tool) => tool.name));
  const docs = await Promise.all(DOC_FILES.map(async (file) => [file, await fs.readFile(path.join(rootDir, file), 'utf8')]));
  const content = new Map(docs);

  const referencedToolNames = [];
  for (const file of DOC_FILES) {
    const tokens = extractBacktickedTokens(content.get(file) ?? '').map(maybeToolName).filter(Boolean);
    for (const token of tokens) {
      if (!toolNames.has(token)) referencedToolNames.push({ file, tool: token });
    }
  }

  const readme = content.get('README.md') ?? '';
  const releasing = content.get('RELEASING.md') ?? '';
  const security = content.get('SECURITY.md') ?? '';
  const roadmap = content.get('ROADMAP.md') ?? '';
  const vulnNotes = content.get('VULN_NOTES.md') ?? '';
  const support = supportLine(resolvedVersion);

  const issues = [];
  if (!readme.includes(`[v${resolvedVersion}](${notesPath})`)) issues.push('README current release block is stale');
  if (!releasing.includes(notesPath)) issues.push('RELEASING release notes path is stale');
  if (!security.includes(`| ${support.current}`)) issues.push('SECURITY supported versions line is stale');
  for (const [file, body] of [['ROADMAP.md', roadmap], ['RELEASING.md', releasing], ['SECURITY.md', security], ['VULN_NOTES.md', vulnNotes]]) {
    if (body.includes('RELEASE_NOTES_') && !body.includes('docs/releases/RELEASE_NOTES_')) {
      issues.push(`${file} still references root-level release notes`);
    }
  }
  if (referencedToolNames.length > 0) issues.push('Docs reference MCP tool names that do not exist');

  const result = {
    ok: issues.length === 0,
    issues,
    invalidToolReferences: referencedToolNames,
    checkedDocs: DOC_FILES,
    toolCount: toolNames.size,
  };

  if (issues.length > 0) {
    await maybeWriteJson(out, result);
    throw new Error(issues.join('; '));
  }

  return maybeWriteJson(out, result);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await checkDocsParity({
    version: args.version,
    mcpToolsFile: args['mcp-tools'],
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
