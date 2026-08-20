import path from 'node:path'
import chalk from 'chalk'
import { defineTool } from '../registry/tool-registry.ts'
import { extractResultText, firstLine } from '../render/primitives.ts'
import { pushDurationLine } from '../tui/index.ts'
import { renderFileResult } from '../render/file-preview.ts'
import type { WcgwContextSaveInput, RawToolResult } from '../types/tool-io.ts'


chalk.level = 3

// wcgw returns either the bare save path or a sentence wrapping it
// ("… successfully saved at /…/memory/<id>.txt").
const SAVED_PATH_RE = /(\/[^\s"']*\.txt)/

function savedContextPath (input: WcgwContextSaveInput, resultText: string | null): string | null {
  const fromResult = resultText ? SAVED_PATH_RE.exec(resultText)?.[1] : null
  if (fromResult)
    return fromResult
  if (!input.id)
    return null

  // save_memory() writes to $XDG_DATA_HOME/wcgw/memory/<id>.txt — reconstructable
  // when the response wording changes or the path never made it into the text.
  const dataHome = process.env.XDG_DATA_HOME ||
    path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', '.local', 'share')
  return path.join(dataHome, 'wcgw', 'memory', `${input.id}.txt`)
}

// The context file inlines every file matched by the globs — often megabytes.
// Keep the head (project root, description, glob list) and account for the rest.
const RELEVANT_FILES_MARKER = '\n# Relevant Files:'

function dropInlinedFiles (raw: string): string {
  const at = raw.indexOf(RELEVANT_FILES_MARKER)
  if (at === -1)
    return raw

  const omitted = raw.slice(at + RELEVANT_FILES_MARKER.length).split('\n').length
  return raw.slice(0, at) + `\n# Relevant Files: ${omitted} lines of inlined file content`
}

defineTool<WcgwContextSaveInput, RawToolResult>({
  matches: 'mcp__wcgw__ContextSave',
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const text  = extractResultText(result)
    const saved = savedContextPath(input, text)

    // A bare path is just the box's Path line repeated; anything else is wcgw
    // reporting a warning or an unmatched glob and has to stay visible.
    const prose = text?.trim() && text.trim() !== saved ? firstLine(text.trim(), 200) : null
    if (prose) {
      const failed = (/\b(error|warning|no files found)\b/i).test(prose)
      lines.push((failed ? chalk.yellow('⚠ ') : chalk.green('⧺ ')) + prose)
    }

    const box = saved
      ? renderFileResult(saved, { action: 'context save', transform: dropInlinedFiles })
      : null

    if (box)
      lines.push(box)
    else if (text && !prose)
      lines.push(chalk.green('⧺ ') + firstLine(text, 200))

    return { lines }
  },
})
