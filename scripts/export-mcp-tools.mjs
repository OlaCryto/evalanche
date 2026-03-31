#!/usr/bin/env node

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_ROOT, maybeWriteJson, parseArgs } from './release-helpers.mjs';

export async function exportMcpTools({
  rootDir = DEFAULT_ROOT,
  moduleExports,
  out,
} = {}) {
  const resolvedModule = moduleExports ?? await import(pathToFileURL(path.join(rootDir, 'dist', 'index.mjs')).href);
  const { EvalancheMCPServer } = resolvedModule;

  const server = new EvalancheMCPServer({
    privateKey: `0x${'1'.repeat(64)}`,
    network: 'avalanche',
  });

  const response = await server.handleRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  });
  const tools = Array.isArray(response?.result?.tools)
    ? response.result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }))
    : [];

  return maybeWriteJson(out, {
    ok: tools.length > 0,
    toolCount: tools.length,
    tools,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await exportMcpTools({ out: args.out });
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
