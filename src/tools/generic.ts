import { ink } from '../ansi/chalk.ts'
import { asRecord, pickAny, resultText } from '../lib/data.ts'
import { parseToolName } from '../tui/index.ts'
import type { ToolResult } from '../types.ts'
import { metaCard, outputCard } from './kit.ts'
import type { ToolRenderer } from './kit.ts'

// The fallback for every tool without a renderer of its own: find the field
// that carries the answer, show it as output, and table whatever is left.

const PRIMARY_KEYS: Record<string, readonly string[]> = {
  Read:         [ 'content', 'output', 'text' ],
  Glob:         [ 'filenames', 'result', 'output' ],
  Grep:         [ 'filenames', 'result', 'output' ],
  // WebFetch answers `{ code, codeText, url, durationMs, result }`.
  WebFetch:     [ 'result', 'content', 'output', 'text' ],
  ExitPlanMode: [ 'plan', 'result' ],
  NotebookRead: [ 'output', 'content' ],
  NotebookEdit: [ 'result', 'output' ],
}

const CONTENT_KEYS = [ 'stdout', 'output', 'content', 'text', 'message', 'result', 'error', 'stderr', 'filePath', 'type' ] as const

const LABELLED: Partial<Record<typeof CONTENT_KEYS[number], (value: string) => string>> = {
  error:    value => ink.err('⨂ ERROR:') + '\n' + value,
  stderr:   value => ink.err('⨂ STDERR:') + '\n' + value,
  filePath: value => ink.key('󰈚 ') + ink.strong('Path: ') + value,
  type:     value => ink.key('⧖ ') + ink.strong('Action: ') + value,
}

const asText = (value: unknown): string =>
  typeof value === 'object' && value !== null
    ? resultText(value) ?? JSON.stringify(value, null, 2)
    : String(value)

interface Deconstructed {
  primary:  string | null;
  metadata: Record<string, unknown> | null;
}

/** Removes the well-known content fields from `rest`, returning them as readable parts. */
function takeContent (rest: Record<string, unknown>, primary: string | null): string[] {
  const parts = primary === null ? [] : [ primary ]
  for (const key of CONTENT_KEYS) {
    if (rest[key] == null)
      continue

    const value = asText(rest[key])
    if (!primary?.includes(value.slice(0, 20)))
      parts.push(LABELLED[key]?.(value) ?? value)
    delete rest[key]
  }
  return parts
}

/** Splits a result into the text worth reading and the fields worth tabling. */
function deconstruct (toolName: string, result: ToolResult): Deconstructed {
  if (typeof result === 'string')
    return { primary: result, metadata: null }
  if (Array.isArray(result) || asRecord(result)?.['0'])
    return { primary: resultText(result), metadata: null }

  const record = asRecord(result)
  if (!record)
    return { primary: null, metadata: null }

  const rest       = { ...record }
  const primaryKey = (PRIMARY_KEYS[parseToolName(toolName).tool] ?? []).find(key => rest[key] != null)
  const primary    = primaryKey ? asText(rest[primaryKey]) : null
  if (primaryKey)
    delete rest[primaryKey]

  const parts = takeContent(rest, primary)
  return {
    primary:  parts.join('\n\n') || null,
    metadata: Object.keys(rest).length ? rest : null,
  }
}

export const generic: ToolRenderer = {
  id:    'generic',
  match: () => true,
  render ({ name, result }, limit) {
    const { primary, metadata } = deconstruct(name, result)
    return {
      lines: [
        primary ? outputCard(primary, limit) : null,
        metadata ? metaCard(metadata, limit) : null,
        !primary && !metadata && pickAny(result) === undefined && result && typeof result === 'object' ? metaCard(result, limit) : null,
      ],
    }
  },
}
