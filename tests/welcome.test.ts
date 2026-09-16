import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'


import { renderHook } from '../src/hooks.ts'
import { fit } from '../src/render/fit.ts'
import { HOOK_FIELD_CHAR_LIMIT, serializeHook } from '../src/runtime/transport.ts'
import { renderWelcome, welcomeImagePath } from '../src/render/welcome.ts'
import { stripAnsi } from '../src/ansi/text.ts'

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
    expect(renderWelcome(9_000)).toMatch(GLYPH_ROW)
  })

  test('prints nothing rather than a sliver when there is no room', () => {
    expect(renderWelcome(0)).toBe('')
    expect(renderWelcome(-100)).toBe('')
  })
})

describe('SessionStart banner', () => {
  test('fits the transport budget whole, art included', () => {
    const output                  = renderHook('SessionStart', { source: 'startup', model: 'claude-opus-5' })
    const { json, systemMessage } = serializeHook(output)
    // The limit lands on the message alone; `additionalContext` beside it in the
    // same envelope is weighed separately and cannot crowd the art out.
    expect((systemMessage ?? '').length).toBeLessThanOrEqual(HOOK_FIELD_CHAR_LIMIT)
    expect(() => JSON.parse(json)).not.toThrow()
    // The failure this guards is the art arriving with its middle cut out,
    // which is what an unbudgeted render gets from serializeHookResponse.
    expect(stripAnsi(systemMessage ?? '')).not.toMatch(/omitted/)
    expect(systemMessage ?? '').toMatch(GLYPH_ROW)
  })

  test('the fitter finds the largest limit a render fits at', () => {
    const rows    = Array.from({ length: 500 }, (_, index) => `\x1b[36mrow ${index}\x1b[39m`)
    type LimitType = { lines: number }

    const render  = (limit: LimitType) => rows.slice(0, limit.lines).join('\n')
    const fitted  = fit(render, 2_000)
    const kept    = fitted.text.split('\n').length
    const oneMore = rows.slice(0, kept + 1).join('\n')

    expect(fitted.shrunk).toBeTrue()
    expect(fitted.text.length).toBeLessThanOrEqual(2_000)
    expect(oneMore.length).toBeGreaterThan(2_000)
    expect(fitted.text).toContain('\x1b[36m')
    expect(fitted.full.split('\n')).toHaveLength(500)
    expect(fit('short', 2_000)).toEqual({ text: 'short', full: 'short', shrunk: false })
  })
})
