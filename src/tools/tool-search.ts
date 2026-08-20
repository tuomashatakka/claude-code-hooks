import chalk from 'chalk'
import { defineTool } from '../registry/tool-registry.ts'
import { extractResultText } from '../render/primitives.ts'
import { Badge, parseToolName, pushDurationLine } from '../tui/index.ts'
import type { RawToolResult, ToolSearchInput } from '../types/tool-io.ts'


function record (value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function parsedResult (result: RawToolResult): unknown {
  if (typeof result !== 'string')
    return result

  const text = extractResultText(result)?.trim() ?? ''
  if (!text.startsWith('{') && !text.startsWith('['))
    return result
  try {
    return JSON.parse(text)
  }
  catch {
    return result
  }
}

type NamesFromReturnType = { names: string[]; deferred: number | null }

function namesFrom (result: RawToolResult, query: string): NamesFromReturnType {
  const parsed     = parsedResult(result)
  const data       = record(parsed)
  const candidates = Array.isArray(parsed)
    ? parsed
    : Array.isArray(data?.matches)
      ? data.matches
      : Array.isArray(data?.content)
        ? data.content
        : []
  const names = candidates.flatMap(candidate => {
    if (typeof candidate === 'string')
      return [ candidate ]

    const item = record(candidate)
    const name = item?.tool_name ?? item?.toolName ?? item?.name
    return typeof name === 'string' ? [ name ] : []
  })
  const fallback = query.startsWith('select:')
    ? query.slice('select:'.length).split(',')
      .map(value => value.trim())
      .filter(Boolean)
    : []
  const deferred = typeof data?.total_deferred_tools === 'number' ? data.total_deferred_tools : null
  return { names: [ ...new Set(names.length ? names : fallback) ], deferred }
}

defineTool<ToolSearchInput, RawToolResult>({
  matches: 'ToolSearch',
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const { names, deferred } = namesFrom(result, input.query ?? '')
    for (const name of names)
      lines.push(chalk.green('✓ ') + parseToolName(name).pretty)
    if (!names.length)
      lines.push(chalk.gray('No tools loaded'))
    return {
      lines,
      extraBadges: [
        new Badge({ label: `${names.length} loaded`, color: names.length ? 'brightGreen' : 'gray' }),
        deferred == null ? null : new Badge({ label: `${deferred} deferred`, color: 'gray' }),
      ].filter((badge): badge is Badge => badge !== null),
    }
  },
})
