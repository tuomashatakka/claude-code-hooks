import chalk from 'chalk'
import { defineGenericTool } from '../registry/tool-registry.ts'
import type { RenderedSection } from '../registry/tool-registry.ts'
import { softCollapse } from '../render/primitives.ts'
import {
  META_BADGE,
  OUTPUT_BADGE,
  pushDurationLine,
  renderCard,
} from '../tui/index.ts'
import { parseToolName } from '../tui/index.ts'
import {
  isJSON,
  formatJSON,
  isCode,
  detectLanguage,
  simpleHighlight,
  formatMetadataCustom,
} from '../render/highlight.ts'
import { operationBadges, playwrightOperation } from './browser-operations.ts'
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts'


chalk.level = 3

const TOOL_PRIMARY_OUTPUT_KEYS: Record<string, string[]> = {
  Read:         [ 'content', 'output', 'text' ],
  Edit:         [ 'diff', 'result', 'output' ],
  MultiEdit:    [ 'diff', 'result', 'output' ],
  Write:        [ 'file_path', 'result' ],
  Bash:         [ 'stdout', 'output' ],
  Glob:         [ 'filenames', 'result', 'output' ],
  Grep:         [ 'filenames', 'result', 'output' ],
  // WebFetch answers `{ code, codeText, url, durationMs, result }` — without
  // `result` first, the whole response falls through to the metadata card and
  // the actual answer gets flattened to one truncated line.
  WebFetch:     [ 'result', 'content', 'output', 'text' ],
  WebSearch:    [ 'results', 'output', 'text' ],
  Task:         [ 'description', 'result', 'output' ],
  Agent:        [ 'description', 'result', 'output' ],
  TodoRead:     [ 'todos', 'result', 'output' ],
  TodoWrite:    [ 'result', 'output' ],
  ToolSearch:   [ 'results', 'output', 'text' ],
  ExitPlanMode: [ 'plan', 'result' ],
  NotebookRead: [ 'output', 'content' ],
  NotebookEdit: [ 'result', 'output' ],
}

interface Deconstructed {
  primary:  string | null;
  metadata: Record<string, unknown> | null;
}

function renderArrayLike (res: Record<string, unknown>): string | null {
  const isArrayLike = Array.isArray(res) || (res['0'] as { type?: string } | undefined)?.type
  if (!isArrayLike)
    return null

  const parts: string[] = []
  for (const block of Array.isArray(res) ? res : Object.values(res)) {
    const b = block as { type?: string; text?: string; output?: string }
    if (b.type === 'text' && b.text)
      parts.push(b.text)
    else if (b.type === 'image' || b.type === 'base64')
      parts.push(chalk.yellow('[Image Data]'))
    else if (typeof block === 'string')
      parts.push(block)
    else if (b.output)
      parts.push(b.output)
  }
  return parts.length ? parts.join('\n\n') : null
}

function renderContentParts (res: Record<string, unknown>, primary: string): string[] {
  const keys = [ 'stdout', 'output', 'content', 'text', 'message', 'error', 'stderr', 'file-contents-numbered', 'file_contets_numbered', 'file-contents', 'filePath', 'type' ]
  return keys.filter(key => res[key] != null).flatMap(key => {
    let value: unknown = res[key]
    if (primary && primary.includes(String(value).slice(0, 20)))
      return []
    if (value && typeof value === 'object') {
      const object = value as Record<string, unknown>
      value = object.text ?? object.output ?? object.content ?? JSON.stringify(object, null, 2)
    }

    const rendered = key === 'stderr' || key === 'error'
      ? chalk.red(`⨂ ${key.toUpperCase()}:`) + '\n' + value
      : key === 'filePath'
        ? chalk.cyan('󰈚 ') + chalk.bold('Path: ') + value
        : key === 'type' ? chalk.cyan('⧖ ') + chalk.bold('Action: ') + value : String(value)
    delete res[key]
    return [ rendered ]
  })
}

function deconstructToolResult (toolName: string, result: RawToolResult): Deconstructed {
  if (!result || typeof result !== 'object')
    return { primary: typeof result === 'string' ? result : null, metadata: null }

  const res      = JSON.parse(JSON.stringify(result)) as Record<string, unknown>
  const { tool } = parseToolName(toolName)

  let primary = ''

  // Array-like content blocks (LLM standard)
  const arrayPrimary = renderArrayLike(res)
  if (arrayPrimary)
    return { primary: arrayPrimary, metadata: null }

  const toolKeys = TOOL_PRIMARY_OUTPUT_KEYS[tool] ?? []
  for (const key of toolKeys) {
    const v = res[key]
    if (v != null) {
      primary = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)
      delete res[key]
      break
    }
  }

  const parts: string[] = primary ? [ primary, ...renderContentParts(res, primary) ] : renderContentParts(res, primary)
  primary = parts.join('\n\n')

  const metadata = Object.keys(res).length ? res : null
  return { primary: primary || null, metadata }
}


defineGenericTool<RawToolInput, RawToolResult>({
  post (_input, result, durationMs, ctx): RenderedSection {
    const rawTool               = ctx.toolName
    const { primary, metadata } = deconstructToolResult(rawTool, result)
    const lines: string[]       = []

    pushDurationLine(lines, durationMs)

    if (primary) {
      let formatted: string = primary
      if (typeof primary === 'string') {
        if (isJSON(primary))
          formatted = simpleHighlight(formatJSON(primary), 'json')
        else if (isCode(primary))
          formatted = simpleHighlight(primary, detectLanguage(primary, rawTool))
      }
      lines.push(renderCard({ badges: OUTPUT_BADGE, content: softCollapse(formatted) }))
      if (metadata && Object.keys(metadata).length)
        lines.push(renderCard({ badges: META_BADGE, content: formatMetadataCustom(metadata) }))
    }
    else if (result && typeof result === 'object')
      lines.push(renderCard({ badges: META_BADGE, content: formatMetadataCustom(result) }))

    const operation = playwrightOperation(rawTool)
    return {
      lines,
      isJson:      !primary,
      extraBadges: operationBadges(operation ? [ operation ] : []),
    }
  },
})
