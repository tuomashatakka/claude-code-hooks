import { defineTool } from '../registry/tool-registry.ts'
import { renderHeading } from '../tui/index.ts'
import type { ExitPlanInput, RawToolResult } from '../types/tool-io.ts'


defineTool<ExitPlanInput, RawToolResult>({
  matches: 'ExitPlanMode',
  post (_input, _result, _durationMs) {
    const heading = renderHeading({
      word:  'YEET FAFO',
      color: 'cyan',
      event: 'stop',
    })
    return {
      lines: heading.split('\n'),
    }
  },
})
