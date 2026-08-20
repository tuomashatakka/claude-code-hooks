import chalk from 'chalk'
import { defineTool } from '../registry/tool-registry.ts'
import { extractResultText, firstLine } from '../render/primitives.ts'
import { OUTPUT_BADGE, pushDurationLine, renderCard } from '../tui/index.ts'
import { renderFileResult } from '../render/file-preview.ts'
import { parseSearchReplaceBlocks } from '../parsers/search-replace.ts'
import type { WcgwFileWriteOrEditInput, RawToolResult } from '../types/tool-io.ts'


chalk.level = 3

const FAILURE_RE = /\b(error|failed|failure|denied|not permitted|cannot|no such file)\b/i

defineTool<WcgwFileWriteOrEditInput, RawToolResult>({
  matches: [ 'mcp__wcgw__FileWriteOrEdit', 'mcp__wcgw__FileEdit' ],
  // wcgw answers with an MCP text block ("Success"), never the file itself, so
  // re-read the target from disk and render it the way Write's post hook does.
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const text   = extractResultText(result)
    const status = text ? firstLine(text, 200) : null
    const failed = status ? FAILURE_RE.test(status) : false
    if (status)
      lines.push((failed ? chalk.red('⨂ ') : chalk.green('✓ ')) + status)

    const action = parseSearchReplaceBlocks(input.text_or_search_replace_blocks).length ? 'edit' : 'write'
    const box    = input.file_path ? renderFileResult(input.file_path, { action }) : null

    if (box)
      lines.push(box)
    else if (!status && text)
      lines.push(renderCard({ badges: OUTPUT_BADGE, content: text }))

    return { lines }
  },
})
