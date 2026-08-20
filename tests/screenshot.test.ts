import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'
import * as toolsIndex from '../src/tools/index.ts'
import * as hooksIndex from '../src/hooks/index.ts'


void toolsIndex
void hooksIndex

import { dispatchHook } from '../src/registry/hook-registry.ts'
import { findImagePath, findInlineImage, renderScreenshot } from '../src/render/screenshot.ts'
import { stripAnsi } from '../src/render/primitives.ts'

// Glyphs only the image renderer emits. The card's own frame is drawn from
// U+2581/2591/2594/258F/2595, so none of those may appear here or every card
// would look like a picture.
const PICTURE = /[⠀-⣿\u{1CD00}-\u{1CDE5}\u{1FB00}-\u{1FBFF}█▖-▟]/u

let dir    = ''
let shot   = ''
let spaced = ''
let base64 = ''

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-'))
  shot = path.join(dir, 'page-1.png')
  spaced = path.join(dir, 'page with spaces.png')

  const png = new PNG({ width: 640, height: 400 })
  for (let i = 0; i < 640 * 400; i++) {
    const at         = i << 2
    const x          = i % 640
    const y          = i / 640 | 0
    png.data[at]     = x * 255 / 640 | 0
    png.data[at + 1] = y * 255 / 400 | 0
    png.data[at + 2] = (x ^ y) & 255
    png.data[at + 3] = 255
  }
  fs.writeFileSync(shot, PNG.sync.write(png))
  fs.copyFileSync(shot, spaced)
  base64 = fs.readFileSync(shot).toString('base64')
})

afterAll(() => {
  if (dir)
    fs.rmSync(dir, { recursive: true, force: true })
})

function messageOf (payload: unknown): string {
  const out = dispatchHook('PostToolUse', payload as never) as { systemMessage?: string } | null
  return out?.systemMessage ?? ''
}

describe('finding the picture in a result', () => {
  test('reads the saved path out of the prose around it', () => {
    expect(findImagePath(`Took the viewport screenshot and saved it as ${shot}`)).toBe(shot)
  })

  test('drops the punctuation a sentence leaves stuck to a path', () => {
    expect(findImagePath(`Saved to ${shot}.`)).toBe(shot)
    expect(findImagePath(`Saved to "${shot}"`)).toBe(shot)
  })

  test('reads a quoted attachment path containing spaces', () => {
    expect(findImagePath(`<image name=[Image #1] path="${spaced}">`)).toBe(spaced)
  })

  test('ignores a name that no file answers to', () => {
    expect(findImagePath('wrote /nowhere/at/all/page-1.png')).toBeNull()
    expect(findImagePath('nothing here')).toBeNull()
    expect(findImagePath(null)).toBeNull()
  })

  test('resolves a relative name against the working directory', () => {
    expect(findImagePath('saved page-1.png', dir)).toBe(shot)
  })

  test('decodes a picture carried inline as base64', () => {
    const found = findInlineImage({ content: [{ type: 'image', data: base64, mimeType: 'image/png' }]})
    expect(found).not.toBeNull()
    expect(found!.ext).toBe('.png')
    expect(found!.data.length).toBeGreaterThan(0)
  })

  test('decodes Codex input_image data URLs', () => {
    const found = findInlineImage({
      type:      'input_image',
      image_url: `data:image/png;base64,${base64}`,
    })
    expect(found).not.toBeNull()
    expect(found!.ext).toBe('.png')
  })

  test('renders nothing for a result that names no picture', () => {
    expect(renderScreenshot({ content: [{ type: 'text', text: 'await page.goto("/")' }]}, 'no image here')).toBeNull()
  })
})

describe('screenshot tools draw the picture', () => {
  test('playwright, when the result names the file', () => {
    const message = messageOf({
      tool_name:     'mcp__playwright__browser_take_screenshot',
      tool_input:    { scale: 'css' },
      tool_response: { content: [{ type: 'text', text: `Took the viewport screenshot and saved it as ${shot}` }]},
    })
    expect(message).toMatch(PICTURE)
    // The prose it replaces should not also be along for the ride.
    expect(stripAnsi(message)).not.toContain('Took the viewport screenshot')
  })

  test('playwright, when the result carries the bytes', () => {
    const message = messageOf({
      tool_name:     'mcp__playwright__browser_take_screenshot',
      tool_input:    { scale: 'css' },
      tool_response: { content: [{ type: 'image', data: base64, mimeType: 'image/png' }]},
    })
    expect(message).toMatch(PICTURE)
    expect(message).not.toContain(base64.slice(0, 64))
  })

  test('agent-browser, from the path it prints', () => {
    const message = messageOf({
      tool_name:     'Bash',
      tool_input:    { command: `agent-browser screenshot --screenshot-dir ${dir}` },
      tool_response: { stdout: `Saved screenshot to ${shot}` },
    })
    expect(message).toMatch(PICTURE)
  })

  test('view_image renders its local target as a file card', () => {
    const message = messageOf({
      tool_name:     'view_image',
      tool_input:    { path: shot, detail: 'high' },
      tool_response: { detail: 'high' },
    })
    const plain = stripAnsi(message)
    expect(message).toMatch(PICTURE)
    expect(plain).toContain('view_image')
    expect(plain).toContain('view')
    expect(plain).not.toContain('detail:')
  })

  test('screenshot commands keep status and cwd metadata visible', () => {
    const message = messageOf({
      tool_name:     'Bash',
      tool_input:    { command: `agent-browser screenshot --screenshot-dir ${dir}` },
      tool_response: { stdout: `Saved screenshot to ${shot}\n\n---\nstatus = 0\ncwd = ${dir}` },
    })
    const plain = stripAnsi(message)
    expect(message).toMatch(PICTURE)
    expect(plain).toContain('✓ exit 0')
    expect(plain).toContain(`⌂ ${dir}`)
  })

  test('metadata-only wcgw results still render an inset footer', () => {
    const message = messageOf({
      tool_name:     'mcp__wcgw__BashCommand',
      tool_input:    { type: 'status_check', thread_id: 'qa' },
      tool_response: '\n---\nstatus = 0\ncwd = /tmp/project',
    })
    const plain = stripAnsi(message)
    expect(plain).toContain('Output')
    expect(plain).toContain('✓ exit 0')
    expect(plain).toContain('⌂ /tmp/project')
  })
})

describe('everything else is left alone', () => {
  test('a browser operation that took no screenshot', () => {
    const message = messageOf({
      tool_name:     'mcp__playwright__browser_navigate',
      tool_input:    { url: 'https://example.com' },
      tool_response: { content: [{ type: 'text', text: '### Ran Playwright code\nawait page.goto("/");' }]},
    })
    expect(message).not.toMatch(PICTURE)
    expect(stripAnsi(message)).toContain('page.goto')
  })

  test('a plain command that merely mentions a png', () => {
    const message = messageOf({
      tool_name:     'Bash',
      tool_input:    { command: 'ls -la' },
      tool_response: { stdout: `total 8\n${shot}\n` },
    })
    expect(message).not.toMatch(PICTURE)
    expect(stripAnsi(message)).toContain('page-1.png')
  })
})
