import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import '../src/hooks/index.ts';
import { dispatchHook } from '../src/registry/hook-registry.ts';
import {
  HOOK_RESPONSE_BYTE_BUDGET,
  serializeHookResponse,
  systemMessageHeadroom,
} from '../src/runtime/output-transport.ts';
import { renderWelcome, welcomeImagePath } from '../src/render/welcome.ts';
import { stripAnsi } from '../src/render/primitives.ts';

// The banner renders in braille; the fallback text art is braille too.
const GLYPH_ROW = /[\u2801-\u28ff]/u;

describe('welcome art', () => {
  test('ships the bundled image the banner is rendered from', () => {
    const file = welcomeImagePath();
    expect(file).toBeTruthy();
    expect(fs.statSync(file!).size).toBeGreaterThan(0);
  });

  // Headroom swings with the system prompt handed back as additionalContext,
  // so the render has to hold the promise across the whole range, not at one
  // convenient size.
  for (const headroom of [3_000, 6_000, 9_000]) {
    test(`stays inside ${headroom} bytes of headroom`, () => {
      // JSON is what the budget is spent in, so that is what the fit is checked in.
      expect(Buffer.byteLength(JSON.stringify(renderWelcome(headroom)))).toBeLessThanOrEqual(headroom);
    });
  }

  test('renders the image once there is room for it', () => {
    expect(renderWelcome(6_000)).toMatch(GLYPH_ROW);
  });

  test('prints nothing rather than a sliver when there is no room', () => {
    expect(renderWelcome(0)).toBe('');
    expect(renderWelcome(-100)).toBe('');
  });
});

describe('SessionStart banner', () => {
  test('fits the transport budget whole, art included', () => {
    const output = dispatchHook('SessionStart', { source: 'startup', model: 'claude-opus-5' });
    const { json, systemMessage } = serializeHookResponse({ ...output } as Record<string, unknown>);
    expect(Buffer.byteLength(json, 'utf8')).toBeLessThanOrEqual(HOOK_RESPONSE_BYTE_BUDGET);
    // The failure this guards is the art arriving with its middle cut out,
    // which is what an unbudgeted render gets from serializeHookResponse.
    expect(stripAnsi(systemMessage ?? '')).not.toMatch(/omitted/);
    expect(systemMessage ?? '').toMatch(GLYPH_ROW);
  });

  test('headroom is what the response has left, not what it has spent', () => {
    const response = { systemMessage: 'x'.repeat(100) };
    const headroom = systemMessageHeadroom(response);
    expect(headroom).toBeGreaterThan(0);
    expect(headroom).toBeLessThan(HOOK_RESPONSE_BYTE_BUDGET);
  });
});
