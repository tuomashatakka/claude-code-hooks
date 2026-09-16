// Shell-flavoured parsing: command chains, word splitting, and the trailer
// wcgw's BashCommand appends to stdout.

export interface CommandRow {
  text: string;

  /** The separator that terminates this row (`;`, `&&`, `||`) or ''. */
  sep: string;
}

interface Parser {
  rows:    CommandRow[];
  current: string;
  quote:   '"' | "'" | null;
  heredoc: string | null;
}

const HEREDOC_OPEN = /^<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/

function flush (state: Parser, sep: string): void {
  state.rows.push({ text: state.current.trim(), sep })
  state.current = ''
}

/** Inside quotes: copies characters through, honouring `\` in double quotes. Returns the index consumed to. */
function consumeQuoted (state: Parser, line: string, index: number): number {
  const character = line[index]!
  state.current += character
  if (state.quote === '"' && character === '\\' && index + 1 < line.length) {
    state.current += line[index + 1]!
    return index + 1
  }
  if (character === state.quote)
    state.quote = null
  return index
}

/** Outside quotes: opens quotes and heredocs, splits on separators. Returns the index consumed to. */
function consumeSyntax (state: Parser, line: string, index: number): number {
  const character = line[index]!
  if (character === '"' || character === "'") {
    state.quote = character
    state.current += character
    return index
  }

  const here = HEREDOC_OPEN.exec(line.slice(index))
  if (here) {
    state.current += here[0]
    state.heredoc = here[2]!
    return index + here[0].length - 1
  }
  if (character === ';') {
    flush(state, ';')
    return index
  }
  if ((character === '&' || character === '|') && line[index + 1] === character) {
    flush(state, character + character)
    return index + 1
  }
  state.current += character
  return index
}

function consumeLine (state: Parser, line: string, lineIndex: number): void {
  if (state.heredoc !== null) {
    state.current += (state.current ? '\n' : '') + line
    if (line.trim() === state.heredoc)
      state.heredoc = null
    return
  }
  if (lineIndex > 0)
    state.current += '\n'
  for (let index = 0; index < line.length; index++)
    index = state.quote ? consumeQuoted(state, line, index) : consumeSyntax(state, line, index)
}

/**
 * Splits a command on top-level `;`, `&&` and `||`, ignoring separators inside
 * quotes and heredoc bodies. The separator trails its own row so a chain reads
 * as it would in a script.
 */
export function splitCommandRows (command: string): CommandRow[] {
  const state: Parser = { rows: [], current: '', quote: null, heredoc: null }
  String(command).split('\n')
    .forEach((line, index) => consumeLine(state, line, index))
  flush(state, '')
  return state.rows.filter(row => row.text.length > 0)
}

/** POSIX-ish word split honouring quotes and backslash escapes. */
export function shellWords (command: string): string[] {
  const words: string[] = []
  let current                 = ''
  let quote: '"' | "'" | null = null
  for (let index = 0; index < command.length; index++) {
    const character = command[index]!
    if (quote) {
      if (quote === '"' && character === '\\' && index + 1 < command.length)
        current += command[++index]!
      else if (character === quote)
        quote = null
      else
        current += character
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if ((/\s/).test(character)) {
      if (current)
        words.push(current)
      current = ''
      continue
    }
    current += character === '\\' && index + 1 < command.length ? command[++index]! : character
  }
  if (current)
    words.push(current)
  return words
}

// ---------------------------------------------------------------- wcgw trailer

const TRAILER_SEP = /\n---\s*\n/
const TRAILER_KV  = /^([a-z_][a-z0-9_ ]*?)\s*=\s*(.*)$/

export interface WcgwTrailer {
  stdout: string;
  status: string | null;
  cwd:    string | null;
  extra:  Record<string, string>;
}

/** Splits `stdout\n---\nstatus = …\ncwd = …` into clean stdout plus metadata. */
export function parseWcgwTrailer (raw: string): WcgwTrailer {
  const separator = TRAILER_SEP.exec(raw)
  if (!separator)
    return { stdout: raw, status: null, cwd: null, extra: {}}

  const fields = Object.fromEntries(
    raw.slice(separator.index + separator[0].length)
      .split('\n')
      .map(line => TRAILER_KV.exec(line.trim()))
      .filter((match): match is RegExpExecArray => match !== null)
      .map(match => [ match[1]!.trim(), match[2]!.trim() ]),
  ) as Record<string, string>
  const { status = null, cwd = null, ...extra } = fields
  return { stdout: raw.slice(0, separator.index), status, cwd, extra }
}

// --------------------------------------------------------- browser operations

const AGENT_BROWSER_VALUE_OPTIONS = new Set([
  '--session', '--session-name', '--profile', '--state', '--headers',
  '--executable-path', '--extension', '--init-script', '--enable', '--args',
  '--user-agent', '--proxy', '--proxy-bypass', '--hide-scrollbars', '--provider',
  '--device', '--screenshot-dir', '--screenshot-quality', '--screenshot-format',
  '--cdp', '--color-scheme', '--download-path', '--max-output', '--allowed-domains',
  '--action-policy', '--confirm-actions', '--engine', '--model', '--config',
  '-p',
])

function agentBrowserOperation (segment: string): string | null {
  const words = shellWords(segment)
  const start = words.findIndex(word => (word.split('/').pop() ?? word) === 'agent-browser')
  if (start < 0)
    return null
  for (let index = start + 1; index < words.length; index++) {
    const word = words[index]!
    if (word === '--')
      return words[index + 1] ?? null
    if (!word.startsWith('-'))
      return word
    if (!word.includes('=') && AGENT_BROWSER_VALUE_OPTIONS.has(word))
      index++
  }
  return null
}

/** The sub-commands a chain of `agent-browser …` invocations performs, deduplicated. */
export function agentBrowserOperations (command: string): string[] {
  const operations = splitCommandRows(command)
    .map(row => agentBrowserOperation(row.text))
    .filter((operation): operation is string => operation !== null)
  return [ ...new Set(operations) ]
}

export function playwrightOperation (toolName: string): string | null {
  return toolName.match(/playwright.*__browser_(.+)$/i)?.[1]?.replace(/_/g, ' ') ?? null
}
