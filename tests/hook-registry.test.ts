import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import '../src/hooks/index.ts';
import { listHooks } from '../src/registry/hook-registry.ts';
import { HOOK_EVENT_NAMES } from '../src/types/hook-events.ts';

const ROOT = path.resolve(import.meta.dir, '..');

function sorted(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

describe('hook registration', () => {
  test('registers every known hook event', () => {
    expect(sorted(listHooks())).toEqual(sorted(HOOK_EVENT_NAMES));
  });

  test('keeps hooks.json bound events in sync with known events', () => {
    const hooksConfig = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')
    ) as { hooks: Record<string, unknown> };

    expect(sorted(Object.keys(hooksConfig.hooks))).toEqual(sorted(HOOK_EVENT_NAMES));
  });
});
