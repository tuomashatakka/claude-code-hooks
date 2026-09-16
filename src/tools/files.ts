import path from 'node:path'
import { ink } from '../ansi/chalk.ts'
import { renderText } from '../ansi/highlight.ts'
import { collapse, firstLine } from '../ansi/text.ts'
import { asRecord, pickAny, pickString, resultText } from '../lib/data.ts'
import { fileCard, screenshotCard, stripLineRange } from '../render/file-card.ts'
import type { LineRange } from '../render/file-card.ts'
import { share } from '../render/fit.ts'
import type { Limit } from '../render/fit.ts'
import { OUTPUT_BADGE, renderCard, renderPathCard } from '../tui/index.ts'
import type { Json, ToolResult } from '../types.ts'
import { named, outputCard, statusLine } from './kit.ts'
import type { ToolRenderer } from './kit.ts'

// Everything that shows a file: native Read/Write/Edit, view_image, and the
// wcgw file tools whose MCP payload is opaque ("Success") so the target is
// re-read from disk and drawn the same way.

const pathOf = (input: Json): string | null => pickString(input, 'file_path', 'filePath', 'path')

export const read: ToolRenderer = {
  id:    'read',
  match: named('Read'),
  render ({ input, result }, limit) {
    const filePath = pathOf(input)
    const text     = resultText(result)
    const card     = filePath ? fileCard(filePath, { action: 'read', fallbackText: text }) : null
    return { lines: [ card ? card(limit) : text ? outputCard(text, limit) : null ]}
  },
}

export const write: ToolRenderer = {
  id:    'write',
  match: named('Write'),
  render ({ input, result }, limit) {
    const filePath = pathOf(input) ?? pickString(result, 'filePath')
    const card     = filePath ? fileCard(filePath, { action: 'write' }) : null
    return { lines: [ card ? card(limit) : filePath ? statusLine(`wrote ${filePath}`) : null ]}
  },
}

// Lines of untouched file kept on either side of the edited region.
const CONTEXT_LINES = 3

/** The span Edit's jsdiff `structuredPatch` touched, so the card shows the change, not the file. */
function editedSpan (result: ToolResult): LineRange | null {
  const hunks = asRecord(result)?.structuredPatch
  if (!Array.isArray(hunks) || !hunks.length)
    return null

  const spans = hunks.flatMap(hunk => {
    const start = Number(asRecord(hunk)?.newStart)
    const count = Number(asRecord(hunk)?.newLines)
    return Number.isFinite(start) ? [{ start, end: start + Math.max(Number.isFinite(count) ? count : 1, 1) - 1 }] : []
  })
  if (!spans.length)
    return null
  return {
    start: Math.max(1, Math.min(...spans.map(span => span.start)) - CONTEXT_LINES),
    end:   Math.max(...spans.map(span => span.end)) + CONTEXT_LINES,
  }
}

export const edit: ToolRenderer = {
  id:    'edit',
  match: named('Edit', 'MultiEdit'),
  render ({ name, input, result }, limit) {
    const filePath = pathOf(input) ?? pickString(result, 'filePath')
    const card     = filePath ? fileCard(filePath, { action: name === 'MultiEdit' ? 'multi-edit' : 'edit', range: editedSpan(result) }) : null
    const text     = resultText(result)
    return { lines: [ card ? card(limit) : text ? statusLine(text, 120) : null ]}
  },
}

export const viewImage: ToolRenderer = {
  id:    'view-image',
  match: named('view_image', 'ViewImage'),
  render ({ input, result }, limit) {
    const filePath = pathOf(input)
    const card     = (filePath ? fileCard(filePath, { action: 'view', readText: false }) : null) ??
      screenshotCard(result, resultText(result), 'view')
    return { lines: [ card?.(limit) ]}
  },
}

const SEARCH_REPLACE_RE = /<<<<<<< SEARCH\r?\n[\s\S]*?=======\r?\n[\s\S]*?>>>>>>> REPLACE/

export const wcgwFile: ToolRenderer = {
  id:    'wcgw-file',
  match: named('mcp__wcgw__FileWriteOrEdit', 'mcp__wcgw__FileEdit'),
  render ({ input, result }, limit) {
    const text     = resultText(result)
    const filePath = pathOf(input)
    const action   = SEARCH_REPLACE_RE.test(String(input.text_or_search_replace_blocks ?? '')) ? 'edit' : 'write'
    const card     = filePath ? fileCard(filePath, { action }) : null
    return {
      lines: [
        text?.trim() ? statusLine(text) : null,
        card ? card(limit) : text && !text.trim() ? null : !card && text ? outputCard(text, limit) : null,
      ],
    }
  },
}

function pathList (input: Json): string[] {
  const raw = pickAny(input, 'file_paths', 'file_path', 'path') ?? []
  return (Array.isArray(raw) ? raw : [ raw ]).map(String).filter(Boolean)
}

/** The older object-shaped ReadFiles response that carries contents inline. */
function inlineContents (result: ToolResult, limit: Limit): string[] {
  const record   = asRecord(result)
  const contents = pickAny(record, 'file-contents-numbered', 'file_contets_numbered', 'file-contents', 'output')
  if (typeof contents === 'string')
    return contents ? [ outputCard(contents, limit) ] : []

  const files = asRecord(contents)
  if (!files)
    return []
  return Object.entries(files)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([ filePath, content ]) => renderPathCard({
      path:    filePath,
      content: collapse(renderText(content, filePath), limit.lines),
    }))
}

export const wcgwRead: ToolRenderer = {
  id:    'wcgw-read',
  match: named('mcp__wcgw__ReadFiles', 'mcp__wcgw__ReadImage'),
  render ({ input, result }, limit) {
    const paths = pathList(input)
    // Several files share one response, so they share one budget.
    const each  = share(limit, paths.length)
    const cards = paths.map(rawPath => fileCard(rawPath, { action: 'read' })?.(each) ??
      ink.err('⨂ ') + ink.strong('Path: ') + stripLineRange(rawPath).path)
    const missed = cards.filter(card => card.includes('⨂ ')).length

    if (paths.length && missed < paths.length)
      return { lines: cards }

    // Only fall back to the response payload when disk gave us nothing.
    const inline = inlineContents(result, limit)
    const text   = resultText(result)
    return { lines: [ ...cards, ...inline.length ? inline : text ? [ outputCard(text, limit) ] : [] ]}
  },
}

// wcgw returns either the bare save path or a sentence wrapping it.
const SAVED_PATH_RE = /(\/[^\s"']*\.txt)/

function savedContextPath (input: Json, text: string | null): string | null {
  const fromResult = text ? SAVED_PATH_RE.exec(text)?.[1] : null
  if (fromResult)
    return fromResult

  const id = pickString(input, 'id')
  if (!id)
    return null

  // save_memory() writes to $XDG_DATA_HOME/wcgw/memory/<id>.txt.
  const dataHome = process.env.XDG_DATA_HOME || path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', '.local', 'share')
  return path.join(dataHome, 'wcgw', 'memory', `${id}.txt`)
}

// The context file inlines every file matched by the globs — often megabytes.
const RELEVANT_FILES_MARKER = '\n# Relevant Files:'

function dropInlinedFiles (raw: string): string {
  const at = raw.indexOf(RELEVANT_FILES_MARKER)
  if (at === -1)
    return raw

  const omitted = raw.slice(at + RELEVANT_FILES_MARKER.length).split('\n').length
  return raw.slice(0, at) + `\n# Relevant Files: ${omitted} lines of inlined file content`
}

export const wcgwContext: ToolRenderer = {
  id:    'wcgw-context',
  match: named('mcp__wcgw__ContextSave'),
  render ({ input, result }, limit) {
    const text  = resultText(result)?.trim() || null
    const saved = savedContextPath(input, text)
    // A bare path is just the card's title repeated; anything else is wcgw
    // reporting a warning or an unmatched glob and has to stay visible.
    const status = text && text !== saved ? statusLine(text) : null
    const card   = saved ? fileCard(saved, { action: 'context save', transform: dropInlinedFiles }) : null
    return {
      lines: [
        status,
        card ? card(limit) : text && !status ? ink.ok('⧺ ') + firstLine(text, 200) : null,
      ],
    }
  },
}

export const FILE_RENDERERS: readonly ToolRenderer[] = [ read, write, edit, viewImage, wcgwFile, wcgwRead, wcgwContext ]

export { OUTPUT_BADGE, renderCard }
