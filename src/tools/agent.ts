import { defineTool } from '../registry/tool-registry.ts'
import { Badge, pushDurationLine } from '../tui/index.ts'
import { extractResultText, wrapText } from '../render/primitives.ts'
import { shortenPath } from '../parsers/wcgw-trailer.ts'
import { getMaxContentWidth } from '../tui/index.ts'
import type { TaskInput, RawToolResult } from '../types/tool-io.ts'


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

function agentBadges (status: string | null, model: string | null, id: unknown): Badge[] {
  return [
    status ? new Badge({ label: status.replace(/_/g, ' '), color: (/fail|error|stop/).test(status) ? 'red' : 'green' }) : null,
    model ? new Badge({ label: model, color: 'blue' }) : null,
    id == null ? null : new Badge({ label: String(id), color: 'gray' }),
  ].filter((badge): badge is Badge => badge !== null)
}

interface AgentView {
  status:     string | null;
  model:      string | null;
  id:         unknown;
  outputFile: string | null;
}

function stringValue (record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' ? value : null
}

function agentView (result: RawToolResult): AgentView {
  const record = resultRecord(result)
  return {
    status:     stringValue(record, 'status'),
    model:      stringValue(record, 'resolvedModel'),
    id:         record?.agentId ?? record?.agent_id ?? record?.taskId ?? record?.task_id,
    outputFile: stringValue(record, 'outputFile'),
  }
}

defineTool<TaskInput, RawToolResult>({
  matches: [ 'Agent', 'Task' ],
  post (input, result, durationMs) {
    const lines: string[] = []

    pushDurationLine(lines, durationMs)

    if (input.description)
      lines.push(wrapText(input.description, getMaxContentWidth()))

    const view = agentView(result)
    if (view.outputFile)
      lines.push(shortenPath(view.outputFile))

    return {
      lines,
      extraBadges: agentBadges(view.status, view.model, view.id),
    }
  },
})
