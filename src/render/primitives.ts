import chalk from 'chalk'
import { readFileSync } from 'node:fs'


chalk.level = 3

// The Claude Code harness wraps tool/hook output that exceeds its inline limit
// in <persisted-output>…Full output saved to: /path/…</persisted-output>. When
// rendering, prefer the on-disk content over the truncated preview so the user
// sees the whole thing. Errors fall back to the original text.
const PERSISTED_RE = /<persisted-output>[\s\S]*?(?:saved to:|→)\s*(\S+)[\s\S]*?<\/persisted-output>/g

export function expandPersistedOutput (text: string): string {
  if (typeof text !== 'string' || !text.includes('<persisted-output>'))
    return text
  return text.replace(PERSISTED_RE, (match, path: string) => {
    try {
      return readFileSync(path, 'utf8')
    }
    catch {
      return match
    }
  })
}

// Static cards may contain coloured output, but terminal control sequences do
// not all have zero *layout* impact. CSI cursor movement and OSC hyperlinks can
// move or confuse the terminal even though they draw no cells.

const OSC_SEQUENCE = /\x1b\][^\x07]*(?:\x07|\x1b\\)/g

const CSI_SEQUENCE = /(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]/g

const SGR_SEQUENCE = /\x1b\[([0-9;]*)m/g

export function stripAnsi (str: unknown): string {
  return String(str).replace(OSC_SEQUENCE, '')
    .replace(CSI_SEQUENCE, '')
}

/** Expands tabs before measuring so terminal tab stops cannot shift a card. */
export function expandTabs (text: string, tabSize = 4): string {
  let column = 0
  let output = ''
  const input = String(text)
  for (let index = 0; index < input.length;) {
    CSI_SEQUENCE.lastIndex = index

    const sequence         = CSI_SEQUENCE.exec(input)
    if (sequence?.index === index) {
      output += sequence[0]
      index += sequence[0].length
      continue
    }

    const char = input[index]!
    if (char === '\t') {
      const count = tabSize - column % tabSize
      output += ' '.repeat(count)
      column += count
    }
    else {
      output += char
      column += 1
    }
    index += 1
  }
  return output
}

function withoutBackgroundSgr (text: string): string {
  SGR_SEQUENCE.lastIndex = 0
  return text.replace(SGR_SEQUENCE, (sequence, raw: string) => {
    const values         = (raw || '0').split(';').map(value => Number(value || 0))
    const kept: number[] = []
    for (let index = 0; index < values.length; index++) {
      const value = values[index]!
      if (value === 49 || value >= 40 && value <= 47 || value >= 100 && value <= 107)
        continue
      if (value === 48) {
        const mode = values[index + 1]
        index += mode === 2 ? 4 : mode === 5 ? 2 : 0
        continue
      }
      kept.push(value)
    }
    return kept.length ? `\x1b[${kept.join(';')}m` : ''
  })
}

/**
 * Makes arbitrary terminal output safe to seat inside a fixed background.
 * Foreground/style SGR survives; foreign backgrounds, cursor movement, OSC,
 * carriage returns and tabs cannot punch holes or falsify the measured width.
 */
export function normalizeCardLine (line: string): string {
  const withoutOsc            = String(line).replace(OSC_SEQUENCE, '')
  const withoutCursorControls = withoutOsc.replace(CSI_SEQUENCE, sequence => sequence.endsWith('m') ? sequence : '')
  const withoutBackground     = withoutBackgroundSgr(withoutCursorControls)

  const withoutControls = withoutBackground.replace(/[\x00-\x08\x0b-\x1a\x1c-\x1f\x7f]/g, '').replace(/\r/g, '')
  return expandTabs(withoutControls)
}

/** Terminal-cell width for the glyphs this renderer emits (ANSI is zero-width). */
export function visibleWidth (str: unknown): number {
  return Array.from(expandTabs(stripAnsi(str))).length
}

/**
 * Hard-wraps terminal text without counting SGR sequences as columns.
 *
 * Card content is often code, paths or command output where dropping spaces or
 * inserting an ellipsis changes what was printed. Splitting at the exact cell
 * boundary preserves every visible character and leaves the ANSI stream in its
 * original order, so a style open at one row naturally continues on the next.
 */
export function wrapAnsi (text: string, width: number): string[] {
  if (width <= 0)
    return [ String(text) ]

  const input           = String(text)
  const lines: string[] = []
  let line    = ''
  let visible = 0

  for (let index = 0; index < input.length;) {
    CSI_SEQUENCE.lastIndex = index

    const sequence         = CSI_SEQUENCE.exec(input)
    if (sequence?.index === index) {
      line += sequence[0]
      index += sequence[0].length
      continue
    }

    if (visible === width) {
      lines.push(line)
      line = ''
      visible = 0
    }

    const codePoint = input.codePointAt(index)!
    line += String.fromCodePoint(codePoint)
    visible += 1
    index += codePoint > 0xffff ? 2 : 1
  }

  lines.push(line)
  return lines
}

// Truncates by visible-character count, passing ANSI escape sequences
// through untouched (they don't count against the budget) so a cut never
// lands mid-sequence and drops a style's closing reset code - which would
// otherwise leak that style into everything rendered after it.
export function truncateAnsi (text: string, maxVisibleLen: number, ellipsis = '…'): string {
  const csi = /\x1b\[[0-9;]*m/y
  let out     = ''
  let visible = 0
  let i       = 0
  while (i < text.length && visible < maxVisibleLen) {
    csi.lastIndex = i

    const m       = csi.exec(text)
    if (m) {
      out += m[0]
      i += m[0].length
      continue
    }
    out += text[i]
    visible += 1
    i += 1
  }
  return out + '\x1b[0m' + ellipsis
}

// Fallback content width when we can't see the real terminal (hooks are almost
// always spawned with piped, non-TTY stdio) - wide enough for normal code/output
export function firstLine (value: unknown, maxLength?: number): string {
  const line = String(value ?? '').split('\n')[0] ?? ''
  return maxLength == null ? line : line.slice(0, maxLength)
}

export function pickResultText (
  result: unknown,
  keys: readonly string[] = [ 'text', 'result', 'output' ]
): string | null {
  if (typeof result === 'string')
    return result
  if (!result || typeof result !== 'object')
    return null

  const record = result as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string')
      return value
  }
  return null
}


export interface SoftCollapseOptions {
  maxLines?: number;
  label?:    string;
}

// Safety ceiling, not a summary cap: this output is user-only (systemMessage on
// stderr, never model context), so it should render complete — the cap only stops
// a pathological multi-megabyte dump from flooding the terminal.
export const SAFETY_MAX_LINES = 2000

export function softCollapse (content: unknown, { maxLines = SAFETY_MAX_LINES, label = 'lines' }: SoftCollapseOptions = {}): string {
  const text  = String(content)
  const lines = text.split('\n')
  if (lines.length <= maxLines)
    return text

  const head = lines.slice(0, maxLines).join('\n')
  return head + '\n' + chalk.gray.italic(`  … +${lines.length - maxLines} more ${label}`)
}

/**
 * Word-wraps plain prose to a column width, preserving existing newlines.
 *
 * For the hooks that echo a prompt or a compaction summary: a terminal soft-wraps
 * a 200-character line for free, but anything that replays the output verbatim —
 * the showcase page, a log viewer — gets one line running off the right edge.
 * Words longer than the width (urls, paths) are left whole rather than chopped.
 */
export function wrapText (text: string, width: number): string {
  if (width <= 0)
    return text
  return String(text)
    .split('\n')
    .map(line => {
      const out: string[] = []
      let current = ''
      for (const word of line.split(/ +/))
        if (!current)
          current = word
        else if (current.length + 1 + word.length <= width)
          current += ' ' + word
        else {
          out.push(current)
          current = word
        }
      out.push(current)
      return out.join('\n')
    })
    .join('\n')
}

// Extract plain text from any tool response shape (string, array of content blocks, object).
export function extractResultText (toolResponse: unknown): string | null {
  const raw = extractResultTextRaw(toolResponse)
  return raw === null ? null : expandPersistedOutput(raw)
}

function extractResultTextRaw (toolResponse: unknown): string | null {
  if (typeof toolResponse === 'string')
    return toolResponse
  if (!toolResponse || typeof toolResponse !== 'object')
    return null
  if (Array.isArray(toolResponse))
    return textBlocks(toolResponse)

  const indexed = toolResponse as Record<string, { type?: string; text?: string }>
  if (indexed['0']?.type === 'text')
    return textBlocks(Object.values(indexed))

  const o         = toolResponse as Record<string, unknown>
  const candidate = o.stdout ?? o.output ?? o.text ?? o.content
  if (typeof candidate === 'string')
    return candidate
  // MCP clients commonly wrap content blocks in a CallToolResult object:
  // `{ content: [{ type: 'text', text: '…' }], isError: false }`.
  // Re-enter the same normalizer so Bash/wcgw and generic tools do not lose
  // otherwise valid output merely because the blocks gained an outer envelope.
  if (candidate && typeof candidate === 'object' && candidate !== toolResponse)
    return extractResultTextRaw(candidate)
  return null
}

function textBlocks (blocks: Array<{ type?: string; text?: string }>): string | null {
  const text = blocks.filter(b => b?.type === 'text' && typeof b.text === 'string').map(b => b.text!)
    .join('\n')
  return text || null
}
