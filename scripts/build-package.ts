#!/usr/bin/env bun
// Builds one of the workspace packages into a publishable `dist/`.
//
//   bun run scripts/build-package.ts ansi-headings
//
// Both publish workflows call this rather than carrying their own copy of the
// build. The copies drifted once already: they still named `src/render/*.ts`
// long after those modules moved into packages/, so every dispatch failed at
// the bundle step.
//
// What ships is a single bundled `dist/index.js` plus a tree of declarations.
// The package's own `dependencies` are the externals — anything it declares, it
// expects the consumer to install, and anything it does not gets inlined.

import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');

const name = process.argv[2];
if (!name) {
  console.error('usage: bun run scripts/build-package.ts <package-dir-name> [--for-publish]');
  process.exit(1);
}

/**
 * Rewrite the manifest's entry points to the built bundle.
 *
 * Only for a publishing run: in the workspace these packages must keep
 * resolving to `src/index.ts`, or the repo cannot run its own tests without
 * building first. pnpm does this substitution itself via `publishConfig`, npm
 * does not — it honours only `registry`, `access` and `tag` there — so a
 * package that relies on it publishes with `main` still naming TypeScript
 * source, and consumers get a file node cannot execute.
 */
const forPublish = process.argv.includes('--for-publish');

const packageDir = path.join(ROOT, 'packages', name);
const distDir = path.join(packageDir, 'dist');
const entry = path.join(packageDir, 'src', 'index.ts');

const manifestPath = path.join(packageDir, 'package.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  name: string;
  dependencies?: Record<string, string>;
  publishConfig?: Record<string, unknown>;
};

/** The `publishConfig` keys npm itself understands; the rest are ours to apply. */
const NPM_OWNED = new Set(['registry', 'access', 'tag', 'provenance']);

const externals = Object.keys(manifest.dependencies ?? {});

async function run(cmd: string[], label: string): Promise<void> {
  const proc = Bun.spawn(cmd, { cwd: ROOT, stdout: 'inherit', stderr: 'inherit' });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${label} failed (exit ${code})`);
}

rmSync(distDir, { recursive: true, force: true });

await run(
  [
    'bun', 'build', entry,
    '--outfile', path.join(distDir, 'index.js'),
    '--target', 'node',
    '--format', 'esm',
    ...externals.flatMap(dep => ['--external', dep]),
  ],
  'bundle',
);

// Declarations are emitted as a tree beside the bundle: `index.d.ts` re-exports
// from `headings.d.ts` and so on, which resolves fine as long as the specifiers
// name a `.js` the way a consumer's resolver expects.
await run(
  [
    'npx', 'tsc', entry,
    '--declaration', '--emitDeclarationOnly',
    '--outDir', distDir,
    '--module', 'preserve',
    '--moduleResolution', 'bundler',
    '--target', 'ES2023',
    '--strict',
    '--resolveJsonModule',
    '--allowImportingTsExtensions',
    '--skipLibCheck',
  ],
  'declarations',
);

// tsc keeps the `.ts` specifiers this repo imports with, and a consumer cannot
// resolve those against a directory of `.d.ts` files. `.js` is the extension
// TypeScript maps back onto a declaration.
let rewritten = 0;
// Recursive: image-to-ascii keeps its glyph tables in a subdirectory, and those
// declarations import across it too.
for (const at of declarationFiles(distDir)) {
  const before = readFileSync(at, 'utf8');
  const after = before.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2');
  if (after !== before) {
    writeFileSync(at, after);
    rewritten++;
  }
}

function declarationFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const at = path.join(dir, entry.name);
    if (entry.isDirectory()) return declarationFiles(at);
    return entry.name.endsWith('.d.ts') ? [at] : [];
  });
}

// The bundle is the artifact that actually gets published, so prove it loads
// before a release finds out for us.
const loaded = await import(path.join(distDir, 'index.js'));
const exported = Object.keys(loaded).length;
if (!exported) throw new Error('bundle loaded but exported nothing');

let applied: string[] = [];
if (forPublish) {
  const overrides = Object.entries(manifest.publishConfig ?? {})
    .filter(([key]) => !NPM_OWNED.has(key));
  const published = { ...manifest } as Record<string, unknown>;
  for (const [key, value] of overrides) published[key] = value;
  writeFileSync(manifestPath, JSON.stringify(published, null, 2) + '\n');
  applied = overrides.map(([key]) => key);
}

console.log(
  `${manifest.name}: bundled ${exported} exports, `
  + `${externals.length ? `external ${externals.join(', ')}` : 'no externals'}, `
  + `${rewritten} declaration file(s) rewritten`
  + (forPublish ? `, publish overrides applied: ${applied.join(', ') || 'none'}` : '')
);
