#!/usr/bin/env bun
// Converts the SGR sequences chalk emits at chalk.level = 3 (set throughout
// src/tui, src/render, src/tools, src/hooks) into inline-styled HTML spans. Handles
// what this codebase's chalk usage actually produces: bold/italic/underline/
// inverse, 38;2/48;2 truecolor (from .hex()/.rgb() calls), and the standard
// 16-color codes (from named methods like chalk.cyan/chalk.bgGreen — chalk
// does NOT upgrade these to truecolor just because level is 3). Named colors
// map onto the same --var() palette public/index.css already defines, so
// captured output matches the rest of the page.

// Both columns are `var()` so the page's palette stays the single place colors
// are decided — index.css mirrors the user's ~/.hyper.js, and the captured
// markup inherits it without being re-captured.
const NAMED: Array<{ normal: string; bright: string }> = [
  { normal: 'var(--term-bg)', bright: 'var(--fg-dim)' }, // 0 black / bright-black (chalk.gray)
  { normal: 'var(--red)', bright: 'var(--red-br)' }, // 1 red
  { normal: 'var(--green)', bright: 'var(--brightgreen)' }, // 2 green
  { normal: 'var(--yellow)', bright: 'var(--yellow-br)' }, // 3 yellow
  { normal: 'var(--blue)', bright: 'var(--blue-br)' }, // 4 blue
  { normal: 'var(--magenta)', bright: 'var(--magenta-br)' }, // 5 magenta
  { normal: 'var(--cyan)', bright: 'var(--cyan-br)' }, // 6 cyan
  { normal: 'var(--fg)', bright: 'var(--fg-bright)' }, // 7 white
]

// image-to-ascii degrades to xterm-256 (\x1b[38;5;N) once a render would blow
// the hook's byte budget - see its ATTEMPTS ladder - so anything but a tiny
// image arrives palette-indexed rather than truecolor. Without this the index
// leaks out as a bare SGR code and paints the whole image white.
const CUBE = [ 0, 95, 135, 175, 215, 255 ]

function xterm256 (n: number): string {
  if (n < 16) {
    const base = NAMED[n % 8]!
    return n < 8 ? base.normal : base.bright
  }
  if (n < 232) {
    const i = n - 16
    return `rgb(${CUBE[Math.floor(i / 36) % 6]},${CUBE[Math.floor(i / 6) % 6]},${CUBE[i % 6]})`
  }

  const v = 8 + (n - 232) * 10
  return `rgb(${v},${v},${v})`
}

interface Style {
  fg:        string | null;
  bg:        string | null;
  bold:      boolean;
  italic:    boolean;
  underline: boolean;
  inverse:   boolean;
}

function emptyStyle (): Style {
  return { fg: null, bg: null, bold: false, italic: false, underline: false, inverse: false }
}

function escapeHtml (s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function styleToCss (s: Style): string {
  const fg              = s.inverse ? s.bg ?? '#0c0c0e' : s.fg
  const bg              = s.inverse ? s.fg ?? '#e6e6e6' : s.bg
  const parts: string[] = []
  if (fg)
    parts.push(`color:${fg}`)
  if (bg)
    parts.push(`background:${bg}`)
  if (s.bold)
    parts.push('font-weight:700')
  if (s.italic)
    parts.push('font-style:italic')
  if (s.underline)
    parts.push('text-decoration:underline')
  return parts.join(';')
}

// Matches any CSI sequence (ESC [ params letter), not just SGR ('m'). Cursor
// movement / line-clear codes (e.g. the CLEAR_LINE_PREFIX render-tool.ts uses
// to redraw a spinner line: \x1b[1A\x1b[2K\x1b[1B) have no HTML equivalent
// and are dropped; only 'm' (SGR) sequences affect styling.
const CSI_RE = /\x1b\[([0-9;]*)([a-zA-Z])/g

function applyBasicSgr (code: number, style: Style): boolean {
  switch (code) {
    case 0: Object.assign(style, emptyStyle()); break
    case 1: style.bold = true; break
    case 22: style.bold = false; break
    case 3: style.italic = true; break
    case 23: style.italic = false; break
    case 4: style.underline = true; break
    case 24: style.underline = false; break
    case 7: style.inverse = true; break
    case 27: style.inverse = false; break
    case 39: style.fg = null; break
    case 49: style.bg = null; break
    default: return false
  }
  return true
}

function applyNamedSgr (code: number, style: Style): boolean {
  if (code >= 30 && code <= 37)
    style.fg = NAMED[code - 30]!.normal
  else if (code >= 90 && code <= 97)
    style.fg = NAMED[code - 90]!.bright
  else if (code >= 40 && code <= 47)
    style.bg = NAMED[code - 40]!.normal
  else if (code >= 100 && code <= 107)
    style.bg = NAMED[code - 100]!.bright
  else
    return false
  return true
}

function applyExtendedSgr (codes: number[], index: number, style: Style): number {
  const code = codes[index]
  if (code !== 38 && code !== 48)
    return 0

  const mode   = codes[index + 1]
  const target = code === 38 ? 'fg' : 'bg'
  if (mode === 2) {
    style[target] = `rgb(${codes[index + 2]},${codes[index + 3]},${codes[index + 4]})`
    return 4
  }
  if (mode === 5) {
    style[target] = xterm256(codes[index + 2] ?? 0)
    return 2
  }
  return 0
}

function applySgr (codes: number[], style: Style): Style {
  for (let j = 0; j < codes.length; j++) {
    const code = codes[j]!
    if (applyBasicSgr(code, style) || applyNamedSgr(code, style))
      continue
    j += applyExtendedSgr(codes, j, style)
  }
  return style
}

// Converts a full (possibly multi-line) captured blob into one HTML string
// per physical line. Style state is carried across embedded newlines - a
// chalk-colored span that itself contains '\n' (e.g. a badge wrapping text
// that spans rows) only opens/resets its SGR codes once, so per-line
// conversion must track state across the whole blob, not reset per line, or
// the color bleeds into or drops out of adjacent lines.
export function ansiToHtmlLines (text: string): string[] {
  let style = emptyStyle()
  const lines: string[] = []
  let current      = ''
  let last         = 0
  CSI_RE.lastIndex = 0

  const flush = (segment: string) => {
    const parts = segment.split('\n')
    parts.forEach((part, idx) => {
      if (part) {
        const css = styleToCss(style)
        current += css ? `<span style="${css}">${escapeHtml(part)}</span>` : escapeHtml(part)
      }
      if (idx < parts.length - 1) {
        lines.push(current)
        current = ''
      }
    })
  }

  let m: RegExpExecArray | null
  while (m = CSI_RE.exec(text)) {
    flush(text.slice(last, m.index))
    last = CSI_RE.lastIndex
    if (m[2] !== 'm')
      continue

    const codes = (m[1] ?? '').split(';').filter(Boolean)
      .map(Number)
    if (codes.length === 0)
      codes.push(0)
    style = applySgr(codes, style)
  }
  flush(text.slice(last))
  lines.push(current)
  return lines
}
