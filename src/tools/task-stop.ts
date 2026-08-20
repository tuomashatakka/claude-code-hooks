import chalk from 'chalk'
import { defineTool } from '../registry/tool-registry.ts'
import { extractResultText } from '../render/primitives.ts'
import { Badge, pushDurationLine } from '../tui/index.ts'
import type { RawToolResult, TaskStopInput } from '../types/tool-io.ts'


function resultRecord (result: RawToolResult): Record<string, unknown> | null {
  if (result && typeof result === 'object' && !Array.isArray(result))
    return result as Record<string, unknown>

  const text = extractResultText(result)?.trim()
  if (!text?.startsWith('{'))
    return null
  try {
    return JSON.parse(text) as Record<string, unknown>
  }
  catch {
    return null
  }
}

defineTool<TaskStopInput, RawToolResult>({
  matches: 'TaskStop',
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)
    lines.push(chalk.red('■ ') + chalk.bold.red('TASK STOPPED'))

    const data = resultRecord(result)
    const id   = data?.task_id ?? data?.taskId ?? input.task_id ?? input.taskId
    const type = typeof data?.task_type === 'string' ? data.task_type : null
    return {
      lines,
      extraBadges: [
        id == null ? null : new Badge({ label: String(id), color: 'brightRed' }),
        type ? new Badge({ label: type, color: 'gray' }) : null,
      ].filter((badge): badge is Badge => badge !== null),
    }
  },
})
