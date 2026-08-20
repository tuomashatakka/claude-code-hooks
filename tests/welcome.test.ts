import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import * as hooksIndex from '../src/hooks/index.ts'


void hooksIndex

import { dispatchHook } from '../src/registry/hook-registry.ts'
import {
  HOOK_RESPONSE_CHAR_BUDGET,
  serializeHookResponse,
  systemMessageHeadroom,
} from '../src/runtime/output-transport.ts'
import { renderWelcome, welcomeImagePath } from '../src/render/welcome.ts'
import { stripAnsi } from '../src/render/primitives.ts'

// The bundled image uses half blocks; a local fallback may be braille text art.
const GLYPH_ROW = /[▀▄█\u2801-\u28ff]/u

describe('welcome art', () => {
  test('ships the bundled image the banner is rendered from', () => {
    const file = welcomeImagePath()
    expect(file).toBeTruthy()
    expect(fs.statSync(file!).size).toBeGreaterThan(0)
  })

  // Headroom swings with the system prompt handed back as additionalContext,
  // so the render has to hold the promise across the whole range, not at one
  // convenient size.
  for (const headroom of [ 3_000, 6_000, 9_000 ])
    test(`stays inside ${headroom} characters of headroom`, () => {
    // Characters of the message are what the limit is applied to, so that is
    // what the fit is checked in — not bytes of anything's encoding.
      expect(renderWelcome(headroom).length).toBeLessThanOrEqual(headroom)
    })

  test('renders complete art once there is room for it', () => {
    expect(renderWelcome(6_000)).toMatch(GLYPH_ROW)
  })

  test('prints nothing rather than a sliver when there is no room', () => {
    expect(renderWelcome(0)).toBe('')
    expect(renderWelcome(-100)).toBe('')
  })
})

describe('SessionStart banner', () => {
  test('fits the transport budget whole, art included', () => {
    const output                  = dispatchHook('SessionStart', { source: 'startup', model: 'claude-opus-5' })
    const { json, systemMessage } = serializeHookResponse({ ...output } as Record<string, unknown>)
    // The limit lands on the message alone; `additionalContext` beside it in the
    // same envelope is weighed separately and cannot crowd the art out.
    expect((systemMessage ?? '').length).toBeLessThanOrEqual(HOOK_RESPONSE_CHAR_BUDGET)
    expect(() => JSON.parse(json)).not.toThrow()
    // The failure this guards is the art arriving with its middle cut out,
    // which is what an unbudgeted render gets from serializeHookResponse.
    expect(stripAnsi(systemMessage ?? '')).not.toMatch(/omitted/)
    expect(systemMessage ?? '').toMatch(GLYPH_ROW)
  })

  test('headroom is what the response has left, not what it has spent', () => {
    const response = { systemMessage: 'x'.repeat(100) }
    const headroom = systemMessageHeadroom(response)
    expect(headroom).toBeGreaterThan(0)
    expect(headroom).toBeLessThan(HOOK_RESPONSE_CHAR_BUDGET)
  })
})
