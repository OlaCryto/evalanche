#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_ROOT,
  extractHighlights,
  extractReleaseTitle,
  loadPackage,
  maybeWriteJson,
  normalizeVersion,
  parseArgs,
  releaseNotesPath,
} from './release-helpers.mjs';

export async function runReleaseIntegrityCheck({
  rootDir = DEFAULT_ROOT,
  version,
  tag,
  releaseNotes,
  skillPath = 'skill/SKILL.md',
  out,
} = {}) {
  const pkg = await loadPackage(rootDir);
  const resolvedVersion = normalizeVersion(version ?? pkg.version);
  const resolvedTag = String(tag ?? `v${resolvedVersion}`);
  const notesPath = releaseNotes
    ? path.resolve(rootDir, releaseNotes)
    : releaseNotesPath(rootDir, resolvedVersion);
  const skillFile = path.resolve(rootDir, skillPath);

  if (pkg.version !== resolvedVersion) {
    throw new Error(`package.json version mismatch: ${pkg.version} !== ${resolvedVersion}`);
  }
  if (resolvedTag !== `v${resolvedVersion}`) {
    throw new Error(`tag mismatch: expected v${resolvedVersion}, got ${resolvedTag}`);
  }

  const notes = await fs.readFile(notesPath, 'utf8');
  const title = extractReleaseTitle(notes);
  const highlights = extractHighlights(notes);
  const skill = await fs.readFile(skillFile, 'utf8');

  if (!title || title !== `Evalanche v${resolvedVersion}`) {
    throw new Error(`release notes title must be "Evalanche v${resolvedVersion}"`);
  }
  if (highlights.length === 0) {
    throw new Error('release notes must include a non-empty Highlights section');
  }
  if (!skill.trim()) {
    throw new Error('skill/SKILL.md must be non-empty');
  }

  return maybeWriteJson(out, {
    ok: true,
    version: resolvedVersion,
    tag: resolvedTag,
    releaseNotesPath: path.relative(rootDir, notesPath),
    title,
    highlightsCount: highlights.length,
    skillPath: path.relative(rootDir, skillFile),
    skillBytes: Buffer.byteLength(skill),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runReleaseIntegrityCheck({
    version: args.version,
    tag: args.tag,
    releaseNotes: args['release-notes'],
    skillPath: args.skill,
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
