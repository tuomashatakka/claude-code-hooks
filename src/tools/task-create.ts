import { defineTool } from '../registry/tool-registry.ts'
import { pushDurationLine } from '../tui/index.ts'
import { renderTask, taskFromResult } from './task-shared.ts'
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts'


defineTool<RawToolInput, RawToolResult>({
  matches: 'TaskCreate',
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const task = taskFromResult(input, result, 'pending')
    if (task)
      lines.push(...renderTask(task, 'ADDED TASK'))

    return { lines }
  },
})
