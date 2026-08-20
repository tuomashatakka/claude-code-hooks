import { defineTool } from '../registry/tool-registry.ts'
import { Badge, pushDurationLine, renderBadges } from '../tui/index.ts'
import { normalizeStatus, renderTask, taskAppearance, taskFromResult } from './task-shared.ts'
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts'


function statusFrom (input: RawToolInput, result: RawToolResult): unknown {
  const resultRecord = result && typeof result === 'object' ? result as Record<string, unknown> : null
  const inputRecord  = input && typeof input === 'object' ? input as Record<string, unknown> : null
  const change       = resultRecord?.statusChange
  const to           = change && typeof change === 'object' ? (change as Record<string, unknown>).to : undefined
  return to ?? resultRecord?.status ?? inputRecord?.status ?? ''
}


defineTool<RawToolInput, RawToolResult>({
  matches: 'TaskUpdate',
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const normalizedStatus = normalizeStatus(statusFrom(input, result), 'updated')
    const task             = taskFromResult(input, result, normalizedStatus)
    if (task)
      lines.push(...renderTask({ ...task, status: normalizedStatus }))
    else {
      const record = result && typeof result === 'object' && !Array.isArray(result)
        ? result as Record<string, unknown>
        : null
      const id         = record?.taskId ?? record?.task_id ?? input.taskId ?? input.task_id ?? input.id
      const appearance = taskAppearance(normalizedStatus)
      lines.push(renderBadges(
        new Badge({ label: appearance.caption, color: appearance.color, icon: appearance.checked ? '✓' : '↻' }),
        id == null ? null : new Badge({ label: `#${String(id)}`, color: 'gray' }),
      ))
    }

    return { lines }
  },
})
