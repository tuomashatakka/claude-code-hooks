import { defineTool } from '../registry/tool-registry.ts'
import { detectOutputLanguage, simpleHighlight } from '../render/highlight.ts'
import { extractResultText, softCollapse } from '../render/primitives.ts'
import { OUTPUT_BADGE, pushDurationLine, renderCard } from '../tui/index.ts'
import type { ApplyPatchInput, RawToolResult } from '../types/tool-io.ts'


const SUCCESS_RESULT = /(?:^done!?$|success\.\s+updated the following files:|success\.\s+(?:added|deleted) the following files:)/im

/**
 * Codex already renders apply_patch's per-file diff before PostToolUse runs.
 * A successful result therefore needs no second output card; unexpected text
 * is kept so warnings and unfamiliar response shapes remain visible.
 */
defineTool<ApplyPatchInput, RawToolResult>({
  matches: [ 'apply_patch', 'ApplyPatch' ],
  post (_input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const text = extractResultText(result)?.trim() ?? ''
    if (text && !SUCCESS_RESULT.test(text)) {
      const language = detectOutputLanguage(text)
      lines.push(renderCard({
        badges:  OUTPUT_BADGE,
        content: softCollapse(simpleHighlight(text, language)),
      }))
    }

    return { lines }
  },
})
