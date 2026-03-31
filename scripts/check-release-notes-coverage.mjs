#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_ROOT,
  gitLines,
  isCommitCoveredByNotes,
  maybeWriteJson,
  parseArgs,
  releaseNotesPath,
} from './release-helpers.mjs';

const DEFAULT_IGNORE_PATH = 'docs/releases/coverage-ignore.json';

export async function checkReleaseNotesCoverage({
  rootDir = DEFAULT_ROOT,
  version,
  previousTag,
  currentRef = 'HEAD',
  releaseNotes,
  ignoreConfigPath = DEFAULT_IGNORE_PATH,
  commits,
  out,
} = {}) {
  const notesPath = releaseNotes
    ? path.resolve(rootDir, releaseNotes)
    : releaseNotesPath(rootDir, version);
  const notes = await fs.readFile(notesPath, 'utf8');
  const ignoreConfig = JSON.parse(await fs.readFile(path.resolve(rootDir, ignoreConfigPath), 'utf8'));
  const commitLines = commits ?? (previousTag
    ? await gitLines(rootDir, 'log', '--format=%H\t%s', `${previousTag}..${currentRef}`)
    : []);

  const uncovered = commitLines
    .map((line) => {
      const [hash, subject] = line.split('\t');
      return { hash, subject };
    })
    .filter(({ subject }) => subject && !subject.startsWith('Merge '))
    .filter(({ hash, subject }) => {
      const ignoredByHash = (ignoreConfig.ignoreCommits ?? []).some((value) => hash.startsWith(value));
      const ignoredByPrefix = (ignoreConfig.ignorePrefixes ?? []).some((prefix) => subject.startsWith(prefix));
      return !ignoredByHash && !ignoredByPrefix;
    })
    .filter(({ subject }) => !isCommitCoveredByNotes(subject, notes));

  const result = {
    ok: uncovered.length === 0,
    previousTag,
    currentRef,
    releaseNotesPath: path.relative(rootDir, notesPath),
    checkedCommits: commitLines.length,
    uncovered,
  };

  if (uncovered.length > 0) {
    await maybeWriteJson(out, result);
    throw new Error(`Release notes coverage failed for ${uncovered.length} commit(s)`);
  }

  return maybeWriteJson(out, result);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await checkReleaseNotesCoverage({
    version: args.version,
    previousTag: args['previous-tag'],
    currentRef: args['current-ref'] ?? 'HEAD',
    releaseNotes: args['release-notes'],
    ignoreConfigPath: args['ignore-config'] ?? DEFAULT_IGNORE_PATH,
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
