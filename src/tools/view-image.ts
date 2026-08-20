import { defineTool } from '../registry/tool-registry.ts'
import { extractResultText } from '../render/primitives.ts'
import { renderFileResult } from '../render/file-preview.ts'
import { renderScreenshot } from '../render/screenshot.ts'
import { pushDurationLine } from '../tui/index.ts'
import type { RawToolResult, ViewImageInput } from '../types/tool-io.ts'


defineTool<ViewImageInput, RawToolResult>({
  matches: [ 'view_image', 'ViewImage' ],
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const filePath = input.path ?? input.file_path
    const rendered = (filePath
      ? renderFileResult(filePath, { action: 'view', readText: false })
      : null) ?? renderScreenshot(result, extractResultText(result), 'view')
    if (rendered)
      lines.push(rendered)
    return { lines }
  },
})
