import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'website');
const outputDir = path.join(repoRoot, 'website-dist');

const files = [
  'index.html',
  'evalanche.css',
  'favicon.svg',
  'social-card.svg',
];

if (!existsSync(sourceDir)) {
  console.error(`Missing website source directory: ${sourceDir}`);
  process.exit(1);
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

for (const file of files) {
  const from = path.join(sourceDir, file);
  if (!existsSync(from)) {
    console.error(`Missing website asset: ${from}`);
    process.exit(1);
  }
  cpSync(from, path.join(outputDir, file));
}

console.log(JSON.stringify({
  sourceDir,
  outputDir,
  files,
}, null, 2));
