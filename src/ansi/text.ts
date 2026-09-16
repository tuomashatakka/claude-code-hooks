import { ink } from './chalk.ts'

// Pure string functions over ANSI-decorated terminal text. Nothing here reads
// the environment or the filesystem.

const OSC_SEQUENCE = /\x1b\][^\x07]*(?:\x07|\x1b\\)/g
const CSI_SEQUENCE = /(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]/g
const SGR_SEQUENCE = /\x1b\[([0-9;]*)m/g

export function stripAnsi (value: unknown): string {
  return String(value).replace(OSC_SEQUENCE, '')
    .replace(CSI_SEQUENCE, '')
}

/** The parameters of one `ESC[…m`, split into attributes with `38;2;r;g;b` / `48;5;n` kept whole. */
function sgrAttributes (raw: string): string[][] {
  const values                 = (raw || '0').split(';')
  const attributes: string[][] = []
  for (let index = 0; index < values.length; index++) {
    const code     = values[index]!
    const extended = code === '38' || code === '48'
    const length   = !extended ? 1 : values[index + 1] === '2' ? 5 : values[index + 1] === '5' ? 3 : 1
    attributes.push(values.slice(index, index + length))
    index += length - 1
  }
  return attributes
}

const isBackground = ([ code ]: readonly string[]): boolean => {
  const number = Number(code)
  return number === 48 || number === 49 || number >= 40 && number <= 47 || number >= 100 && number <= 107
}

/**
 * Drops only background SGR parameters (40-47, 48;…, 49, 100-107) so a line
 * can be seated inside a card fill without punching holes in it.
 */
export function stripBackground (value: unknown): string {
  return String(value).replace(SGR_SEQUENCE, (_sequence, raw: string) => {
    const kept = sgrAttributes(raw).filter(attribute => !isBackground(attribute))
    return kept.length ? `\x1b[${kept.flat().join(';')}m` : ''
  })
}

/**
 * Turns every background reset in a line — a bare `49`, one fused into a
 * longer sequence, the `0` that resets everything — into `background` (SGR
 * parameters such as `48;5;236`), so content seated on a card fill cannot
 * fall through to the terminal's own background. chalk's nesting only
 * rewrites an exact `ESC[49m`, which a block-glyph picture rarely emits.
 */
export function reseatBackground (line: string, background: string): string {
  return String(line).replace(SGR_SEQUENCE, (_sequence, raw: string) => {
    const kept = sgrAttributes(raw).flatMap(attribute =>
      attribute[0] === '49' ? [[ background ]] : Number(attribute[0]) === 0 ? [ attribute, [ background ]] : [ attribute ])
    return `\x1b[${kept.flat().join(';')}m`
  })
}

/** Walks a string one visible glyph or one escape at a time. */
function* tokens (input: string): Generator<{ text: string; visible: boolean }> {
  for (let index = 0; index < input.length;) {
    CSI_SEQUENCE.lastIndex = index

    const sequence = CSI_SEQUENCE.exec(input)
    if (sequence?.index === index) {
      yield { text: sequence[0], visible: false }
      index += sequence[0].length
      continue
    }

    const codePoint = input.codePointAt(index)!
    const text      = String.fromCodePoint(codePoint)
    yield { text, visible: true }
    index += text.length
  }
}

/** Expands tabs against real columns so terminal tab stops cannot shift a card. */
export function expandTabs (text: string, tabSize = 4): string {
  let column = 0
  let output = ''
  for (const token of tokens(String(text))) {
    if (!token.visible) {
      output += token.text
      continue
    }
    if (token.text === '\t') {
      const count = tabSize - column % tabSize
      output += ' '.repeat(count)
      column += count
    }
    else {
      output += token.text
      column += 1
    }
  }
  return output
}

/**
 * Makes arbitrary terminal output safe inside a fixed background: foreground
 * SGR survives; foreign backgrounds, cursor movement, OSC, carriage returns
 * and tabs cannot falsify the measured width. A picture keeps its backgrounds —
 * for a block-glyph render they are half of every cell's colour.
 */
export function normalizeCardLine (line: string, keepBackground = false): string {
  const styledOnly = String(line)
    .replace(OSC_SEQUENCE, '')
    .replace(CSI_SEQUENCE, sequence => sequence.endsWith('m') ? sequence : '')
  const seated = keepBackground ? styledOnly : stripBackground(styledOnly)
  return expandTabs(seated.replace(/[\x00-\x08\x0b-\x1a\x1c-\x1f\x7f\r]/g, ''))
}

/** Terminal cells a string occupies (escapes are zero-width). */
export function visibleWidth (value: unknown): number {
  return Array.from(expandTabs(stripAnsi(value))).length
}

/** Hard-wraps at exact cell boundaries, leaving the escape stream in order. */
export function wrapAnsi (text: string, width: number): string[] {
  if (width <= 0)
    return [ String(text) ]

  const lines: string[] = []
  let line    = ''
  let visible = 0
  for (const token of tokens(String(text))) {
    if (token.visible && visible === width) {
      lines.push(line)
      line = ''
      visible = 0
    }
    line += token.text
    if (token.visible)
      visible += 1
  }
  lines.push(line)
  return lines
}

/**
 * Cuts to a visible-character count, passing escapes through so the cut never
 * lands mid-sequence, then resets so no style leaks past the ellipsis.
 */
export function truncateAnsi (text: string, maxVisible: number, ellipsis = '…'): string {
  let out     = ''
  let visible = 0
  for (const token of tokens(String(text))) {
    if (token.visible && visible >= maxVisible)
      break
    out += token.text
    if (token.visible)
      visible += 1
  }
  return out + '\x1b[0m' + ellipsis
}

/**
 * Cuts to a *character* count — the unit the host measures in — keeping every
 * escape whole. Used as the transport's last resort, when no amount of
 * content collapsing brought a message under the limit.
 */
export function truncateChars (text: string, maxChars: number, ellipsis = '…'): string {
  const reset = '\x1b[0m'
  const room  = maxChars - reset.length - ellipsis.length
  if (text.length <= maxChars)
    return text

  let out = ''
  for (const token of tokens(text)) {
    if (out.length + token.text.length > room)
      break
    out += token.text
  }
  return out + reset + ellipsis
}

/** Word-wraps plain prose to a column width, keeping existing newlines and long words. */
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

export function firstLine (value: unknown, maxLength?: number): string {
  const line = String(value ?? '').split('\n')[0] ?? ''
  return maxLength == null ? line : line.slice(0, maxLength)
}

export function trimBlankEdges (text: string): string {
  return String(text).replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '')
}

export interface Clamped {
  text:    string;
  omitted: number;
}

/** The first `maxLines` lines, and how many were dropped. */
export function clampLines (text: string, maxLines: number): Clamped {
  const lines = String(text).split('\n')
  const keep  = Math.max(0, Math.floor(maxLines))
  return lines.length <= keep
    ? { text: String(text), omitted: 0 }
    : { text: lines.slice(0, keep).join('\n'), omitted: lines.length - keep }
}

export const omittedNote = (omitted: number, label = 'lines'): string =>
  ink.note(`  … ${omitted.toLocaleString('en-US')} more ${label} omitted …`)

export interface CollapseOptions {
  label?: string;

  /** Applied to the kept head only — highlight after clamping, not before. */
  paint?: (head: string) => string;
}

/**
 * Keeps the first `maxLines` lines and says how many were dropped. This is the
 * single knob the transport turns to make a message fit — see render/fit.ts.
 */
export function collapse (text: string, maxLines: number, { label = 'lines', paint = head => head }: CollapseOptions = {}): string {
  const { text: head, omitted } = clampLines(text, maxLines)
  if (!omitted)
    return paint(head)
  return head ? paint(head) + '\n' + omittedNote(omitted, label) : omittedNote(omitted, label)
}

// ------------------------------------------------------------ SGR compaction

/** Attributes with a close code of their own. Bold and dim share `22`. */
const FLAG_OPEN = {
  bold:      '1',
  dim:       '2',
  italic:    '3',
  underline: '4',
  blink:     '5',
  inverse:   '7',
  hidden:    '8',
  strike:    '9',
  overline:  '53',
} as const

type Flag = keyof typeof FLAG_OPEN

const FLAG_CLOSE: Record<Flag, string> = {
  bold:      '22',
  dim:       '22',
  italic:    '23',
  underline: '24',
  blink:     '25',
  inverse:   '27',
  hidden:    '28',
  strike:    '29',
  overline:  '55',
}

const FLAGS       = Object.keys(FLAG_OPEN) as Flag[]
const OPEN_FLAG   = new Map<string, Flag>([ ...FLAGS.map(flag => [ FLAG_OPEN[flag], flag ] as const), [ '6', 'blink' ]])
const CLOSE_FLAGS = new Map<string, Flag[]>()
for (const flag of FLAGS)
  CLOSE_FLAGS.set(FLAG_CLOSE[flag], [ ...CLOSE_FLAGS.get(FLAG_CLOSE[flag]) ?? [], flag ])

/** What a blank cell shows: its background and the lines drawn through it — never its foreground. */
const BLANK_FLAGS: ReadonlySet<Flag> = new Set<Flag>([ 'underline', 'inverse', 'strike', 'overline' ])

interface Style {
  readonly fg: string | null;
  readonly bg: string | null;
  readonly on: ReadonlySet<Flag>;
}

interface Draft {
  fg: string | null;
  bg: string | null;
  on: Set<Flag>;
}

const PLAIN: Style = { fg: null, bg: null, on: new Set() }

const isColor = (code: number, base: number): boolean =>
  code >= base && code <= base + 7 || code >= base + 60 && code <= base + 67

function applyCode (draft: Draft, code: string): void {
  const number = Number(code)
  if (number === 0) {
    draft.fg = null
    draft.bg = null
    draft.on.clear()
  }
  else if (number === 39)
    draft.fg = null
  else if (number === 49)
    draft.bg = null
  else if (isColor(number, 30))
    draft.fg = code
  else if (isColor(number, 40))
    draft.bg = code
  else if (OPEN_FLAG.has(code))
    draft.on.add(OPEN_FLAG.get(code)!)
  else
    for (const flag of CLOSE_FLAGS.get(code) ?? [])
      draft.on.delete(flag)
}

/** The style after the parameters of one `ESC[…m` are applied to `style`. */
function applySgr (style: Style, params: string): Style {
  const draft: Draft = { fg: style.fg, bg: style.bg, on: new Set(style.on) }
  for (const attribute of sgrAttributes(params))
    if (attribute.length === 1)
      applyCode(draft, String(Number(attribute[0])))
    else if (attribute[0] === '38')
      draft.fg = attribute.join(';')
    else
      draft.bg = attribute.join(';')
  return draft
}

type Counts = (flag: Flag) => boolean

/** Close codes for flags going off, then open codes for flags coming on. */
function flagChanges (from: Style, to: Style, counts: Counts): string[] {
  const closes = FLAGS.filter(flag => counts(flag) && from.on.has(flag) && !to.on.has(flag)).map(flag => FLAG_CLOSE[flag])
  const params = [ ...new Set(closes) ]
  // `22` switches off bold and dim together; whichever should stay lit is re-opened.
  const reopen = (flag: Flag): boolean => !from.on.has(flag) || params.includes(FLAG_CLOSE[flag])
  for (const flag of FLAGS)
    if (counts(flag) && to.on.has(flag) && reopen(flag))
      params.push(FLAG_OPEN[flag])
  return params
}

function colorChanges (from: Style, to: Style, blank: boolean): string[] {
  const params: string[] = []
  if (!blank && from.fg !== to.fg)
    params.push(to.fg ?? '39')
  if (from.bg !== to.bg)
    params.push(to.bg ?? '49')
  return params
}

/**
 * The single sequence that takes a terminal from `from` to `to`, or '' when
 * nothing has to change. Over a blank run only what a blank cell shows counts.
 */
function transition (from: Style, to: Style, blank: boolean): string {
  const counts: Counts = flag => !blank || BLANK_FLAGS.has(flag)
  const params         = [ ...flagChanges(from, to, counts), ...colorChanges(from, to, blank) ]
  if (!params.length)
    return ''

  const reset = !blank && to.fg === null && to.bg === null && to.on.size === 0 && params.length > 1
  return reset ? '\x1b[0m' : `\x1b[${params.join(';')}m`
}

/** The style a terminal is actually in after `transition(from, to, blank)`. */
function settle (from: Style, to: Style, blank: boolean): Style {
  if (!blank)
    return to

  const on = new Set<Flag>()
  for (const flag of FLAGS)
    if ((BLANK_FLAGS.has(flag) ? to : from).on.has(flag))
      on.add(flag)
  return { fg: from.fg, bg: to.bg, on }
}

const STREAM_TOKEN = /\x1b\[([0-9;]*)m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]|\n|( +)|[^\x1b\x9b\n ]+|[\s\S]/g

/**
 * Re-encodes the SGR stream minimally: one sequence per style change, none
 * for a change nothing visible sits between, no foreground work over blank
 * cells, a bare reset where several attributes close at once. Every style is
 * closed before a newline and at the end, so nothing bleeds. Other escapes
 * (cursor movement, OSC) pass through untouched. Visible text is never changed.
 */
export function compactAnsi (text: string): string {
  let out     = ''
  let current = PLAIN
  let desired = PLAIN
  for (const [ token, sgr, spaces ] of String(text).matchAll(STREAM_TOKEN))
    if (sgr !== undefined)
      desired = applySgr(desired, sgr)
    else if (token === '\n') {
      out += transition(current, PLAIN, false) + token
      current = PLAIN
    }
    else if (token.charCodeAt(0) === 0x1b || token.charCodeAt(0) === 0x9b)
      out += token
    else {
      const blank = spaces !== undefined && !current.on.has('inverse') && !desired.on.has('inverse')
      out += transition(current, desired, blank) + token
      current = settle(current, desired, blank)
    }
  return out + transition(current, PLAIN, false)
}
