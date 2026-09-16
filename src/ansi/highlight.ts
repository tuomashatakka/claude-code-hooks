import { chalk, ink } from './chalk.ts'
import { stripAnsi } from './text.ts'


export type Language =
  | 'javascript' | 'typescript' | 'json' | 'bash' | 'markdown' |
  'python' | 'yaml' | 'diff' | 'html' | 'xml' | 'css' | 'sql' |
  'output' | 'text' | string & {}

// ------------------------------------------------------------------ detection

export function isJSON (value: unknown): boolean {
  if (typeof value !== 'string')
    return false

  const trimmed = value.trim()
  if (!trimmed || trimmed[0] !== '{' && trimmed[0] !== '[')
    return false
  try {
    JSON.parse(trimmed)
    return true
  }
  catch {
    return false
  }
}

export function formatJSON (content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  }
  catch {
    return content
  }
}

const EXT_TO_LANG: Record<string, Language> = {
  ts:       'typescript',
  tsx:      'typescript',
  mts:      'typescript',
  cts:      'typescript',
  js:       'javascript',
  jsx:      'javascript',
  mjs:      'javascript',
  cjs:      'javascript',
  json:     'json',
  jsonc:    'json',
  json5:    'json',
  sh:       'bash',
  bash:     'bash',
  zsh:      'bash',
  env:      'bash',
  md:       'markdown',
  markdown: 'markdown',
  mdx:      'markdown',
  py:       'python',
  pyi:      'python',
  yaml:     'yaml',
  yml:      'yaml',
  toml:     'yaml',
  ini:      'yaml',
  diff:     'diff',
  patch:    'diff',
  html:     'html',
  htm:      'html',
  vue:      'html',
  svelte:   'html',
  xml:      'xml',
  svg:      'xml',
  plist:    'xml',
  css:      'css',
  scss:     'css',
  less:     'css',
  sql:      'sql',
}

export function langFromPath (filePath: string | null | undefined): Language | null {
  const match = String(filePath ?? '').match(/\.([^./\s]+)$/)
  return match ? EXT_TO_LANG[match[1]!.toLowerCase()] ?? null : null
}

function shebangLanguage (content: string): Language | null {
  const interpreter = content.match(/^#!\s*\S*?\/(?:env\s+)?([\w.-]+)/)?.[1]
  if (!interpreter)
    return null
  if ((/^(ba|z|da|k|)sh$/).test(interpreter))
    return 'bash'
  if ((/^python/).test(interpreter))
    return 'python'
  return (/^(node|bun|deno)/).test(interpreter) ? 'javascript' : null
}

const CONTENT_CHECKS: ReadonlyArray<[Language, (content: string, head: string) => boolean]> = [
  [ 'diff', c => (/^diff --git /m).test(c) || (/^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/m).test(c) || (/^--- \S/m).test(c) && (/^\+\+\+ \S/m).test(c) ],
  [ 'html', (_, head) => (/^<!DOCTYPE html/i).test(head) || (/^<(html|head|body)\b/i).test(head) ],
  [ 'xml', (_, head) => (/^<\?xml/).test(head) ],
  [ 'sql', c => (/^\s*(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE (TABLE|INDEX|VIEW)|ALTER TABLE)\b/im).test(c) ],
  [ 'python', c => (/^\s*(def|class)\s+\w+.*:\s*$/m).test(c) || (/^(from \w[\w.]* import|import \w+)\s*$/m).test(c) ],
  [ 'typescript', c => (/^\s*(export\s+)?(interface|type|enum)\s+\w+/m).test(c) || (/:\s*(string|number|boolean|void|unknown|never)\b/).test(c) ],
  [ 'javascript', c => (/^(import|export)\s.*from\s+['"]/m).test(c) || (/^\s*(const|let|var|function)\s+\w/m).test(c) || (/=>\s*[{(]/).test(c) ],
  [ 'markdown', c => (/^#{1,6}\s+\S/m).test(c) && ((/^\s*[-*+]\s+\S/m).test(c) || (/```/).test(c)) ],
]

/** Guesses a language from content alone — JSON, shebangs, structure, syntax markers. */
export function detectContentLanguage (content: string): Language | null {
  if (isJSON(content))
    return 'json'

  const shebang = shebangLanguage(content)
  if (shebang)
    return shebang

  const head  = content.trimStart()
  const match = CONTENT_CHECKS.find(([ , test ]) => test(content, head))
  if (match)
    return match[0]

  // YAML last: `key: value` shapes appear in lots of plain output.
  const yamlKeys = content.match(/^[\w."'-]+:(\s+\S|$)/gm)
  return yamlKeys && yamlKeys.length >= 2 && !(/[{};]/).test(content) ? 'yaml' : null
}

/** Language for command *output*: never pretends stdout is bash source. */
export function detectOutputLanguage (text: string): Language {
  return detectContentLanguage(text) ?? 'output'
}

// -------------------------------------------------------------------- scanner
//
// One left-to-right pass. At every position the first rule that matches owns
// the characters it consumed, so a comment swallows the quotes inside it, a
// string swallows the `#` inside it, and a heredoc body is one token that is
// highlighted in its own language. The regex-replace chains this replaces
// could not tell a quote in a comment from a string, and every later pass
// happily re-painted the parameters of the escapes an earlier one emitted.

interface Cursor {
  src:   string;
  at:    number;
  state: Record<string, unknown>;

  /** Last non-whitespace token, for context-sensitive rules (regex vs division). */
  prev: { type: string; text: string } | null;
}

type Paint = (text: string) => string

interface Rule {

  /** Token class, or a classifier when the same shape means different things. */
  type: string | ((text: string, cursor: Cursor) => string);

  /** Sticky regex anchored at the cursor, or a function returning the length matched. */
  match: RegExp | ((cursor: Cursor) => number);

  /** Extra context the rule needs (line start, inside a tag…). */
  when?: (cursor: Cursor) => boolean;

  /** Custom painter, for tokens with structure of their own. */
  paint?: (text: string, cursor: Cursor) => string;
}

type Grammar = readonly Rule[]

const WORD = /[\p{L}\p{N}_$]/u

const lineBefore         = ({ src, at }: Cursor): string => src.slice(src.lastIndexOf('\n', at - 1) + 1, at)
const atLineStart        = (cursor: Cursor): boolean => cursor.at === 0 || cursor.src[cursor.at - 1] === '\n'
const atLineHead         = (cursor: Cursor): boolean => (/^\s*$/).test(lineBefore(cursor))
const afterSpace         = (cursor: Cursor): boolean => cursor.at === 0 || (/\s/).test(cursor.src[cursor.at - 1]!)
const wordBoundaryBefore = (cursor: Cursor): boolean => cursor.at === 0 || !WORD.test(cursor.src[cursor.at - 1]!)

function matchLength (rule: Rule, cursor: Cursor): number {
  if (typeof rule.match === 'function')
    return rule.match(cursor)
  rule.match.lastIndex = cursor.at
  return rule.match.exec(cursor.src)?.[0].length ?? 0
}

/** Highlights `src` by `grammar`, painting each token class with `palette`. */
function scan (src: string, grammar: Grammar, palette: Record<string, Paint>): string {
  const cursor: Cursor = { src, at: 0, state: {}, prev: null }
  let out   = ''
  let plain = ''

  while (cursor.at < src.length) {
    const rule = grammar.find(candidate => (!candidate.when || candidate.when(cursor)) && matchLength(candidate, cursor) > 0)
    if (!rule) {
      const character = src[cursor.at]!
      plain += character
      if (!(/\s/).test(character))
        cursor.prev = { type: 'plain', text: character }
      cursor.at += 1
      continue
    }

    const length = matchLength(rule, cursor)
    const text   = src.slice(cursor.at, cursor.at + length)
    const type   = typeof rule.type === 'function' ? rule.type(text, cursor) : rule.type
    out += plain
    plain = ''
    out += rule.paint ? rule.paint(text, cursor) : palette[type]?.(text) ?? text
    cursor.prev = { type, text }
    cursor.at += length
  }
  return out + plain
}

const PALETTE: Record<string, Paint> = {
  comment:   ink.dim,
  string:    ink.str,
  regex:     chalk.red,
  number:    ink.num,
  literal:   ink.num,
  keyword:   ink.key,
  key:       ink.key,
  call:      chalk.magenta,
  command:   chalk.magenta,
  decorator: chalk.magenta,
  selector:  chalk.magenta,
  variable:  ink.num,
  flag:      ink.num,
  attr:      ink.num,
  operator:  ink.dim,
  punct:     ink.punct,
  marker:    ink.num,
  tag:       ink.key,
  heading:   chalk.cyanBright,
  quote:     ink.note,
  bold:      chalk.bold,
  italic:    chalk.italic,
  code:      chalk.inverse,
}

const classify = (sets: ReadonlyArray<[string, ReadonlySet<string>]>, fallback: string, fold = false) =>
  (text: string): string => sets.find(([ , words ]) => words.has(fold ? text.toLowerCase() : text))?.[0] ?? fallback

const followedByCall = ({ src, at }: Cursor, length: number): boolean => (/^\s*\(/).test(src.slice(at + length, at + length + 8))

// ------------------------------------------------------------- javascript

const JS_KEYWORDS = new Set([ 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'static', 'interface', 'type', 'enum', 'extends', 'implements', 'typeof', 'instanceof', 'in', 'of', 'yield', 'switch', 'case', 'default', 'break', 'continue', 'do', 'void', 'delete', 'as', 'declare', 'namespace', 'readonly', 'keyof', 'infer', 'satisfies', 'abstract', 'public', 'private', 'protected', 'override', 'get', 'set' ])
const JS_LITERALS = new Set([ 'true', 'false', 'null', 'undefined', 'NaN', 'Infinity' ])

/** Words after which a `/` starts a regex rather than dividing. */
const REGEX_AFTER_KEYWORD = new Set([ 'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'instanceof', 'new', 'delete', 'void', 'throw', 'yield', 'await' ])

function regexAllowed ({ prev }: Cursor): boolean {
  if (!prev)
    return true
  if (prev.type === 'keyword')
    return REGEX_AFTER_KEYWORD.has(prev.text)
  return prev.type === 'plain' && (/[(,=:[!&|?{};+\-*%<>~^]/).test(prev.text) || prev.type === 'operator'
}

/** Length of a template literal at the cursor, `${…}` nesting included. */
function templateLength (src: string, start: number): number {
  let index = start + 1
  while (index < src.length) {
    const character = src[index]!
    if (character === '\\') {
      index += 2
      continue
    }
    if (character === '`')
      return index + 1 - start
    if (character === '$' && src[index + 1] === '{') {
      index = interpolationEnd(src, index + 2)
      continue
    }
    index += 1
  }
  return src.length - start
}

/** Index just past the `}` that closes an interpolation opened before `start`. */
function interpolationEnd (src: string, start: number): number {
  let depth = 1
  let index = start
  while (index < src.length && depth > 0) {
    const character = src[index]!
    if (character === '`') {
      index += templateLength(src, index)
      continue
    }
    if (character === '"' || character === "'") {
      const quote = character
      index += 1
      while (index < src.length && src[index] !== quote && src[index] !== '\n')
        index += src[index] === '\\' ? 2 : 1
    }
    else if (character === '{')
      depth += 1
    else if (character === '}')
      depth -= 1
    index += 1
  }
  return index
}

/** A template literal: quoted parts green, each `${…}` highlighted as code. */
function paintTemplate (text: string): string {
  let out   = ''
  let index = 0
  let from  = 0
  while (index < text.length) {
    if (text[index] === '\\') {
      index += 2
      continue
    }
    if (text[index] === '$' && text[index + 1] === '{') {
      const end = interpolationEnd(text, index + 2)
      out += ink.str(text.slice(from, index)) + ink.punct('${') + highlight(text.slice(index + 2, end - 1), 'javascript') + ink.punct(text.slice(end - 1, end))
      index = from = end
      continue
    }
    index += 1
  }
  return out + ink.str(text.slice(from))
}

const JS_GRAMMAR: Grammar = [
  { type: 'comment', match: /\/\*[\s\S]*?(?:\*\/|$)/y },
  { type: 'comment', match: /\/\/[^\n]*/y },
  { type: 'string', match: cursor => cursor.src[cursor.at] === '`' ? templateLength(cursor.src, cursor.at) : 0, paint: paintTemplate },
  { type: 'string', match: /"(?:[^"\\\n]|\\[\s\S])*"?|'(?:[^'\\\n]|\\[\s\S])*'?/y },
  { type: 'regex', match: /\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[dgimsuvy]*/y, when: regexAllowed },
  { type: 'number', match: /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?)n?/y, when: wordBoundaryBefore },
  {
    type:  (text, cursor) => JS_KEYWORDS.has(text) ? 'keyword' : JS_LITERALS.has(text) ? 'literal' : followedByCall(cursor, text.length) ? 'call' : 'plain',
    match: /[\p{L}_$][\p{L}\p{N}_$]*/uy,
    when:  wordBoundaryBefore,
  },
]

// ------------------------------------------------------------------- bash

const BASH_KEYWORDS = new Set([ 'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'until', 'do', 'done', 'case', 'esac', 'in', 'function', 'select', 'time', 'return', 'export', 'local', 'readonly', 'declare', 'typeset', 'set', 'unset', 'shift', 'source', 'exit', 'break', 'continue', 'trap', 'eval', 'exec' ])

/** Keywords a simple command may directly follow. */
const COMMAND_AFTER = new Set([ 'then', 'else', 'do', 'if', 'elif', 'while', 'until', 'time', 'exec', 'eval' ])

/** Operators a simple command may directly follow — redirections are not among them. */
const COMMAND_AFTER_OPERATOR = new Set([ '&&', '||', '|', '|&', ';', '&', '$(' ])

function commandPosition (cursor: Cursor): boolean {
  const { prev } = cursor
  if (!prev || atLineStart(cursor) || prev.type === 'heredoc')
    return true
  if (prev.type === 'operator')
    return COMMAND_AFTER_OPERATOR.has(prev.text)
  if (prev.type === 'keyword')
    return COMMAND_AFTER.has(prev.text)
  return prev.type === 'plain' && (/^[({`!]$/).test(prev.text)
}

const HEREDOC_OPEN = /<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/y

/** Consumes the body of a pending heredoc up to and including its delimiter line. */
function heredocBodyLength (cursor: Cursor): number {
  const pending   = cursor.state.heredocs as string[] | undefined
  const delimiter = pending?.[0]
  if (!delimiter || !atLineStart(cursor))
    return 0

  const { src, at } = cursor
  let lineStart = at
  while (lineStart <= src.length) {
    const lineEnd = src.indexOf('\n', lineStart)
    const line    = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd)
    if (line.trim() === delimiter) {
      pending.shift()
      return lineStart + line.length - at
    }
    if (lineEnd === -1)
      break
    lineStart = lineEnd + 1
  }
  pending.shift()
  return src.length - at
}

/** A heredoc body in its own language, the closing delimiter dimmed. */
function paintHeredoc (text: string, cursor: Cursor): string {
  const delimiterAt = text.lastIndexOf('\n') + 1
  const body        = text.slice(0, delimiterAt)
  const delimiter   = text.slice(delimiterAt)
  const closed      = delimiter.trim() === cursor.state.lastDelimiter
  return closed
    ? highlight(body, detectContentLanguage(body)) + ink.dim(delimiter)
    : highlight(text, detectContentLanguage(text))
}

const BASH_GRAMMAR: Grammar = [
  { type: 'heredoc', match: heredocBodyLength, paint: paintHeredoc },
  { type: 'comment', match: /#[^\n]*/y, when: afterSpace },
  {
    type:  'operator',
    match: cursor => {
      HEREDOC_OPEN.lastIndex = cursor.at

      const match = HEREDOC_OPEN.exec(cursor.src)
      if (!match)
        return 0

      const pending = cursor.state.heredocs as string[] | undefined ?? (cursor.state.heredocs = [])
      pending.push(match[2]!)
      cursor.state.lastDelimiter = match[2]
      return match[0].length
    },
    paint: text => ink.dim(text.slice(0, text.search(/[^<\-\s]/))) + ink.str(text.slice(text.search(/[^<\-\s]/))),
  },
  { type: 'string', match: /\$?"(?:[^"\\]|\\[\s\S])*"?/y },
  { type: 'string', match: /\$'(?:[^'\\]|\\[\s\S])*'?|'[^']*'?/y },
  { type: 'variable', match: /\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*|\$[0-9@#?*!$-]/y },
  { type: 'operator', match: /2>&1|&>|&&|\|\||>>|\|&|[|<>;&]|\$\(|\(\(|\)\)/y },
  { type: 'flag', match: /--?[A-Za-z][\w-]*(?==|\s|$)/y, when: cursor => cursor.at === 0 || (/[\s=]/).test(cursor.src[cursor.at - 1]!) },
  { type: 'number', match: /\d+(?![\w./-])/y, when: wordBoundaryBefore },
  {
    type:  (text, cursor) => BASH_KEYWORDS.has(text) ? 'keyword' : commandPosition(cursor) ? 'command' : 'plain',
    match: /[A-Za-z_][\w.+-]*/y,
    when:  wordBoundaryBefore,
  },
]

// ----------------------------------------------------------------- python

const PY_KEYWORDS = new Set([ 'def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'lambda', 'yield', 'async', 'await', 'pass', 'break', 'continue', 'raise', 'global', 'nonlocal', 'assert', 'del', 'in', 'not', 'and', 'or', 'is', 'match', 'case' ])
const PY_LITERALS = new Set([ 'None', 'True', 'False' ])

const PY_GRAMMAR: Grammar = [
  { type: 'comment', match: /#[^\n]*/y },
  { type: 'string', match: /[rRbBuUfF]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y, when: wordBoundaryBefore },
  { type: 'string', match: /[rRbBuUfF]{0,2}(?:"(?:[^"\\\n]|\\[\s\S])*"?|'(?:[^'\\\n]|\\[\s\S])*'?)/y, when: wordBoundaryBefore },
  { type: 'decorator', match: /@[\w.]+/y, when: atLineHead },
  { type: 'number', match: /(?:0[xXoObB][\da-fA-F_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?[jJ]?)/y, when: wordBoundaryBefore },
  {
    type:  (text, cursor) => PY_KEYWORDS.has(text) ? 'keyword' : PY_LITERALS.has(text) ? 'literal' : followedByCall(cursor, text.length) ? 'call' : 'plain',
    match: /[\p{L}_][\p{L}\p{N}_]*/uy,
    when:  wordBoundaryBefore,
  },
]

// ------------------------------------------------------------------- json

const JSON_GRAMMAR: Grammar = [
  { type: 'key', match: /"(?:[^"\\]|\\.)*"(?=\s*:)/y },
  { type: 'string', match: /"(?:[^"\\]|\\.)*"?/y },
  { type: 'number', match: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, when: wordBoundaryBefore },
  { type: 'literal', match: /true|false|null/y, when: wordBoundaryBefore },
  { type: 'punct', match: /[{}[\]:,]/y },
]

// ------------------------------------------------------------------- yaml

const YAML_GRAMMAR: Grammar = [
  { type: 'comment', match: /#[^\n]*/y, when: afterSpace },
  { type: 'marker', match: /-(?=\s)/y, when: atLineHead },
  { type: 'key', match: /[\w."'/-][\w ."'/-]*(?=:(?:\s|$))/y, when: cursor => (/^\s*(?:-\s+)?$/).test(lineBefore(cursor)) },
  { type: 'string', match: /"(?:[^"\\]|\\.)*"?|'[^']*'?/y },
  { type: 'literal', match: /(?:true|false|null|yes|no|~)(?=\s|$)/y, when: wordBoundaryBefore },
  { type: 'number', match: /-?\d+(?:\.\d+)?(?=\s|$)/y, when: wordBoundaryBefore },
]

// -------------------------------------------------------------------- css

const CSS_GRAMMAR: Grammar = [
  { type: 'comment', match: /\/\*[\s\S]*?(?:\*\/|$)/y },
  { type: 'string', match: /"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?/y },
  { type: 'selector', match: /[^{};\n]+(?=\s*\{)/y, when: atLineHead },
  { type: 'key', match: /[\w-]+(?=\s*:)/y, when: cursor => atLineHead(cursor) || cursor.prev?.type === 'punct' && (/^[{;]$/).test(cursor.prev.text) },
  { type: 'number', match: /#[0-9a-fA-F]{3,8}(?![\w-])/y },
  {
    type:  'number',
    match: /\d*\.?\d+(?:px|em|rem|vh|vw|vmin|vmax|ch|ex|%|s|ms|deg|rad|turn|fr)?/y,
    when:  wordBoundaryBefore,
    paint: text => {
      const unit = text.match(/[a-z%]+$/i)?.[0] ?? ''
      return ink.num(text.slice(0, text.length - unit.length)) + ink.punct(unit)
    },
  },
  { type: 'punct', match: /[{}:;,]/y },
]

// -------------------------------------------------------------------- sql

const SQL_KEYWORDS = new Set('select from where insert into values update set delete create table index view alter drop join left right inner outer on as and or not null in is like order group by having limit offset distinct count sum avg min max union all exists between case when then else end primary foreign key references default unique constraint if returning with recursive'.split(' '))

const SQL_GRAMMAR: Grammar = [
  { type: 'comment', match: /--[^\n]*/y },
  { type: 'comment', match: /\/\*[\s\S]*?(?:\*\/|$)/y },
  { type: 'string', match: /'(?:[^'\\]|\\.|'')*'?/y },
  { type: 'number', match: /\d+(?:\.\d+)?/y, when: wordBoundaryBefore },
  { type: classify([[ 'keyword', SQL_KEYWORDS ]], 'plain', true), match: /[A-Za-z_]\w*/y, when: wordBoundaryBefore },
]

// -------------------------------------------------------------------- xml

const inTag = (cursor: Cursor): boolean => cursor.state.inTag === true

const XML_GRAMMAR: Grammar = [
  { type: 'comment', match: /<!--[\s\S]*?(?:-->|$)/y },
  { type: 'comment', match: /<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/y },
  {
    type:  'tag',
    match: cursor => {
      const match = (/<[/?!]?[\w:.-]+/y).exec(cursor.src.slice(cursor.at))
      if (!match)
        return 0
      cursor.state.inTag = true
      return match[0].length
    },
    paint: text => {
      const name = text.match(/[\w:.-]+$/)![0]
      return ink.punct(text.slice(0, text.length - name.length)) + ink.key(name)
    },
  },
  {
    type:  'punct',
    match: cursor => {
      const match = (/[/?]?>/y).exec(cursor.src.slice(cursor.at))
      if (!match)
        return 0
      cursor.state.inTag = false
      return match[0].length
    },
    when: inTag,
  },
  { type: 'string', match: /"[^"]*"?|'[^']*'?/y, when: inTag },
  { type: 'attr', match: /[\w:.-]+(?=\s*=)/y, when: inTag },
  { type: 'punct', match: /=/y, when: inTag },
]

// --------------------------------------------------------------- markdown

function paintFence (text: string): string {
  const [ , info = '', body = '' ] = (/^(```[^\n]*\n)([\s\S]*?)(?:\n?```)?$/).exec(text) ?? []
  const language                   = info.slice(3).trim()
    .split(/\s+/)[0] || null
  const closed = text.endsWith('```') && text.length > info.length + 2
  const inner  = language ? highlight(body, EXT_TO_LANG[language] ?? language) : body
  const fence  = info.trimEnd()
  return ink.dim(fence) + info.slice(fence.length) + inner + (closed ? ink.dim(text.slice(info.length + body.length)) : '')
}

const MD_GRAMMAR: Grammar = [
  { type: 'code', match: /```[^\n]*\n[\s\S]*?(?:\n```|$)/y, when: atLineStart, paint: paintFence },
  { type: 'heading', match: /#{1,6} [^\n]*/y, when: atLineStart },
  { type: 'quote', match: />[^\n]*/y, when: atLineStart },
  { type: 'marker', match: /(?:[-*+]|\d+\.)(?=\s)/y, when: atLineHead },
  { type: 'code', match: /`[^`\n]+`/y },
  { type: 'bold', match: /\*\*[^*\n]+\*\*|__[^_\n]+__/y, when: wordBoundaryBefore },
  { type: 'italic', match: /\*[^*\n]+\*|_[^_\n]+_/y, when: wordBoundaryBefore },
  {
    type:  'link',
    match: /\[[^\]\n]+\]\([^)\n]+\)/y,
    paint: text => {
      const [ , label, url ] = (/^\[([^\]]+)\]\(([^)]+)\)$/).exec(text)!
      return ink.punct('[') + ink.accent(label!) + ink.punct('](') + chalk.gray.underline(url!) + ink.punct(')')
    },
  },
]

// ------------------------------------------------------------ line-based

function highlightDiff (code: string): string {
  return code.split('\n').map(line => {
    if ((/^(diff --git|index |new file|deleted file|similarity|rename )/).test(line))
      return chalk.gray.bold(line)
    if ((/^(--- |\+\+\+ )/).test(line))
      return chalk.bold(line)
    if ((/^@@ /).test(line))
      return ink.key(line)
    if (line.startsWith('+'))
      return ink.ok(line)
    return line.startsWith('-') ? ink.err(line) : line
  })
    .join('\n')
}

export type Severity = 'error' | 'warning' | 'success'

const SEVERITY: ReadonlyArray<[Severity, RegExp]> = [
  [ 'error', /\b(error|fatal|failed|failure|exception|traceback|panic|denied|refused|not permitted|no such file|cannot)\b/i ],
  [ 'warning', /\b(warn|warning|deprecated|no files found)\b/i ],
  [ 'success', /\b(success|succeeded|passed|completed?)\b|[✓✔]/i ],
]

/** What a status line is telling us, by the words it uses. */
export function severity (text: string): Severity | null {
  return SEVERITY.find(([ , pattern ]) => pattern.test(text))?.[0] ?? null
}

export const SEVERITY_INK: Record<Severity, Paint> = { error: ink.err, warning: ink.warn, success: ink.ok }

const ANSI_SEQ = /\x1b\[[0-9;]*[a-zA-Z]/g

/**
 * Runs a replace pass over only the plain-text spans of a partially coloured
 * string, so it can never match the parameters of an existing escape.
 */
export function replaceOutsideAnsi (
  input: string,
  pattern: RegExp,
  replacer: (substring: string, ...args: string[]) => string,
): string {
  if (!input.includes('\x1b'))
    return input.replace(pattern, replacer as never)

  let out            = ''
  let last           = 0
  ANSI_SEQ.lastIndex = 0

  let match: RegExpExecArray | null
  while (match = ANSI_SEQ.exec(input)) {
    out += input.slice(last, match.index).replace(pattern, replacer as never) + match[0]
    last = ANSI_SEQ.lastIndex
  }
  return out + input.slice(last).replace(pattern, replacer as never)
}

const OUTPUT_URL_RE    = /\bhttps?:\/\/[^\s)'"]+/g
const OUTPUT_PATH_RE   = /(^|[\s('"=])((?:~|\.{1,2})?\/[\w.@+-]+(?:\/[\w.@+-]+)+(?::\d+(?::\d+)?)?)/g
const OUTPUT_METRIC_RE = /\b\d+(?:[.,]\d+)?\s?(?:ms|s|m|h|[KMGT]i?B|kb|mb|gb|%)\b/g

// Generic stdout: colour by *meaning*. Severity tints a whole line that carries
// no colour of its own; paths, URLs and metric-suffixed numbers get accents.
function highlightOutput (code: string): string {
  return code.split('\n').map(line => {
    const level = line.includes('\x1b') ? null : severity(line)
    if (level)
      return SEVERITY_INK[level](line)

    // Replacers are called with (match, …groups, offset, input): chalk would
    // join every argument, so each one has to take the match alone.
    let out = line
    out = replaceOutsideAnsi(out, OUTPUT_METRIC_RE, match => ink.num(match))
    out = replaceOutsideAnsi(out, OUTPUT_URL_RE, match => ink.accent(match))
    return replaceOutsideAnsi(out, OUTPUT_PATH_RE, (_m, lead: string, file: string) => lead + ink.accent(file))
  })
    .join('\n')
}

// -------------------------------------------------------------------- api

const GRAMMARS: Record<string, Grammar> = {
  javascript: JS_GRAMMAR,
  typescript: JS_GRAMMAR,
  bash:       BASH_GRAMMAR,
  python:     PY_GRAMMAR,
  json:       JSON_GRAMMAR,
  yaml:       YAML_GRAMMAR,
  css:        CSS_GRAMMAR,
  sql:        SQL_GRAMMAR,
  html:       XML_GRAMMAR,
  xml:        XML_GRAMMAR,
  markdown:   MD_GRAMMAR,
}

const LINE_HIGHLIGHTERS: Record<string, Paint> = { diff: highlightDiff, output: highlightOutput }

export const HIGHLIGHT_LANGUAGES: readonly Language[] = [ ...Object.keys(GRAMMARS), ...Object.keys(LINE_HIGHLIGHTERS) ]

/** Colours `code` as `language`; unknown or null languages come back untouched. */
export function highlight (code: string, language: Language | null | undefined): string {
  if (!language)
    return code

  const grammar = GRAMMARS[language]
  if (grammar)
    return scan(code, grammar, PALETTE)
  return LINE_HIGHLIGHTERS[language]?.(code) ?? code
}

/**
 * Text as a card body: the language is taken from the path when there is one,
 * else guessed from the content; JSON is pretty-printed first.
 */
export function renderText (text: string, filePath?: string | null, fallback: Language = 'output'): string {
  const language = langFromPath(filePath) ?? detectContentLanguage(text) ?? fallback
  return highlight(language === 'json' ? formatJSON(text) : text, language)
}

// ------------------------------------------------------------------ values

const META_STR_MAX = 200

function flattenString (value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  return collapsed.length > META_STR_MAX ? collapsed.slice(0, META_STR_MAX - 1) + '…' : collapsed
}

/**
 * One value as a metadata cell: scalars coloured by type, collections inline
 * when short and indented when not. Strings are flattened to one line.
 */
export function formatValue (value: unknown, depth = 0): string {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number')
    return ink.num(String(value))
  if (typeof value === 'string')
    return ink.str(flattenString(value))
  if (typeof value !== 'object')
    return String(value)

  const pad   = '  '.repeat(depth + 1)
  const close = '  '.repeat(depth)
  const items = Array.isArray(value)
    ? value.map(item => formatValue(item, depth + 1))
    : Object.entries(value as Record<string, unknown>).map(([ key, item ]) => ink.key(key) + ink.punct(': ') + formatValue(item, depth + 1))
  const [ open, shut ] = Array.isArray(value) ? [ '[', ']' ] : [ '{', '}' ]
  if (!items.length)
    return ink.punct(`${open} ${shut}`)

  const inline = ink.punct(open + ' ') + items.join(ink.punct(', ')) + ink.punct(' ' + shut)
  if (stripAnsi(inline).length <= 50)
    return inline
  return ink.punct(open + '\n') + items.map(item => pad + item).join(ink.punct(',\n')) + '\n' + close + ink.punct(shut)
}
