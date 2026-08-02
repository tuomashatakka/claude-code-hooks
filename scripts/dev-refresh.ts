#!/usr/bin/env bun
// Refreshes the *installed* copy of this plugin from the remote.
//
// Worth knowing before using it: `claude plugin marketplace update` re-clones
// from GitHub, and the cache directory is keyed on the version in
// plugin.json. So a locally-built bundle that has not been committed and
// pushed will not appear in the installed copy, and neither will a new commit
// unless the version changed. Both cases fail loudly here rather than
// silently reinstalling the same bytes and leaving you wondering why nothing
// happened.
//
// For an actual edit-run-edit loop, don't use this at all - run
//     claude --plugin-dir <repo>
// which loads the working tree directly, with no install step.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const MARKETPLACE = 'claude-code-hooks';
const PLUGIN = `hooks@${MARKETPLACE}`;

function run(cmd: string, args: string[], opts: { capture?: boolean } = {}): string {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (r.status !== 0 && !opts.capture) process.exit(r.status ?? 1);
  return (r.stdout ?? '').trim();
}

function fail(message: string, hint: string): never {
  console.error(`\n✘ ${message}\n  ${hint}\n`);
  process.exit(1);
}

// 1. Build, so a stale bundle is caught here rather than in CI.
run('bun', ['run', 'build']);

// 2. The remote is what gets installed — refuse to pretend otherwise.
const dirty = run('git', ['status', '--porcelain', '--', 'src', 'hooks', 'packages', 'dist'], { capture: true });
if (dirty) {
  fail(
    'Uncommitted changes under src/, hooks/, packages/ or dist/.',
    'The installed copy is cloned from GitHub, so commit and push first — or use `claude --plugin-dir .` to run the working tree.'
  );
}

run('git', ['fetch', '--quiet', 'origin'], { capture: true });
const ahead = run('git', ['rev-list', '--count', '@{u}..HEAD'], { capture: true });
if (ahead && ahead !== '0') {
  fail(`${ahead} commit(s) not pushed.`, 'Push first — `claude plugin marketplace update` clones from the remote.');
}

// 3. The cache directory is keyed on this version; without a bump the
//    reinstall below is a no-op and nothing visibly changes.
const version = JSON.parse(readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version as string;
const installed = (() => {
  try {
    const state = JSON.parse(readFileSync(path.join(process.env.HOME ?? '', '.claude', 'plugins', 'installed_plugins.json'), 'utf8'));
    return state?.plugins?.[PLUGIN]?.[0]?.version ?? null;
  } catch {
    return null;
  }
})();

if (installed && installed === version) {
  console.warn(
    `\n! plugin.json still says ${version}, which is what is already installed.\n` +
    `  Claude Code keys the plugin cache on that version, so this refresh will not pick up\n` +
    `  new commits. Bump the version (or drop the field to track the commit SHA) to ship a change.\n`
  );
}

// 4. Re-fetch the catalogue, then reinstall. There is no --force, so the
//    uninstall is what makes the install actually re-copy.
run('claude', ['plugin', 'marketplace', 'update', MARKETPLACE]);
run('claude', ['plugin', 'uninstall', PLUGIN], { capture: true });
run('claude', ['plugin', 'install', PLUGIN, '--scope', 'user']);

console.log(`\n✔ ${PLUGIN} reinstalled at ${version}. Run /reload-plugins in any open session.`);
