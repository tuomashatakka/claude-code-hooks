import chalk from 'chalk'
import { defineTool } from '../registry/tool-registry.ts'
import { extractResultText, wrapText } from '../render/primitives.ts'
import { Badge, getMaxContentWidth, pushDurationLine } from '../tui/index.ts'
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts'


const OPERATIONS = [
  'spawn_agent',
  'wait_agent',
  'followup_task',
  'send_message',
  'interrupt_agent',
  'list_agents',
] as const

type CollaborationOperation = typeof OPERATIONS[number]

function asRecord (value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function operationOf (rawName: string): CollaborationOperation | null {
  const normalized = rawName.replace(/^collaboration(?:__|[._-])?/i, '').toLowerCase()
  return OPERATIONS.find(operation => operation === normalized) ?? null
}

function parsedResult (result: RawToolResult): Record<string, unknown> | null {
  const direct = asRecord(result)
  if (direct)
    return direct

  const text = extractResultText(result)?.trim()
  if (!text?.startsWith('{'))
    return null
  try {
    return asRecord(JSON.parse(text))
  }
  catch {
    return null
  }
}

function stringField (record: Record<string, unknown> | null, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record?.[key]
    if (typeof value === 'string' && value.trim())
      return value.trim()
  }
  return null
}

function targetOf (input: RawToolInput, result: Record<string, unknown> | null): string | null {
  return stringField(result, 'task_name', 'agent_name', 'target') ??
    stringField(input, 'task_name', 'target', 'agent_name')
}

function statusBadge (label: string | null, color: 'green' | 'gray' | 'red' = 'gray'): Badge | null {
  return label ? new Badge({ label: label.replace(/_/g, ' '), color }) : null
}

type SpawnViewReturnType = { lines: string[]; badges: Badge[] }

function spawnView (input: RawToolInput, result: Record<string, unknown> | null): SpawnViewReturnType {
  const target = targetOf(input, result) ?? 'agent'
  return {
    lines:  [ chalk.green('✓ ') + `started ${target}` ],
    badges: [
      statusBadge(stringField(input, 'agent_type'), 'green'),
      statusBadge(stringField(input, 'model'), 'gray'),
    ].filter((badge): badge is Badge => badge !== null),
  }
}

type WaitViewReturnType = { lines: string[]; badges: Badge[] }

function waitView (result: Record<string, unknown> | null): WaitViewReturnType {
  const timedOut = result?.timed_out === true
  const message  = stringField(result, 'message') ??
    (timedOut ? 'No agents completed yet' : 'Agent update received')
  return {
    lines:  [ timedOut ? chalk.gray(message) : chalk.green('✓ ') + message ],
    badges: [ new Badge({ label: timedOut ? 'timed out' : 'update', color: timedOut ? 'gray' : 'green' }) ],
  }
}

type InteractionViewReturnType = { lines: string[]; badges: Badge[] }

function interactionView (
  operation: 'followup_task' | 'send_message' | 'interrupt_agent',
  input: RawToolInput,
  result: Record<string, unknown> | null,
): InteractionViewReturnType {
  const target = targetOf(input, result) ?? 'agent'
  if (operation === 'interrupt_agent') {
    const previous = stringField(result, 'previous_status', 'status')
    return {
      lines:  [ chalk.red('■ ') + `interrupted ${target}` ],
      badges: [ statusBadge(previous, 'gray') ].filter((badge): badge is Badge => badge !== null),
    }
  }
  return {
    lines:  [ chalk.cyan('→ ') + `${operation === 'followup_task' ? 'follow-up' : 'message'} sent to ${target}` ],
    badges: [],
  }
}

type AgentListViewReturnType = { lines: string[]; badges: Badge[] }

function agentListView (result: Record<string, unknown> | null): AgentListViewReturnType {
  const agents = Array.isArray(result?.agents) ? result.agents : []
  const lines  = agents.flatMap(agent => {
    const data   = asRecord(agent)
    const name   = stringField(data, 'agent_name', 'task_name', 'name')
    const status = stringField(data, 'agent_status', 'status')
    return name ? [ `${chalk.cyan('· ')}${name}${status ? chalk.gray(` — ${status.replace(/_/g, ' ')}`) : ''}` ] : []
  })
  return {
    lines:  lines.length ? lines : [ chalk.gray('No active agents') ],
    badges: [ new Badge({ label: `${lines.length} agent${lines.length === 1 ? '' : 's'}`, color: lines.length ? 'blue' : 'gray' }) ],
  }
}

type CollaborationViewReturnType = { lines: string[]; badges: Badge[] }

function collaborationView (
  operation: CollaborationOperation,
  input: RawToolInput,
  result: Record<string, unknown> | null,
): CollaborationViewReturnType {
  if (operation === 'spawn_agent')
    return spawnView(input, result)
  if (operation === 'wait_agent')
    return waitView(result)
  if (operation === 'list_agents')
    return agentListView(result)
  return interactionView(operation, input, result)
}

defineTool<RawToolInput, RawToolResult>({
  matches: rawName => operationOf(rawName) !== null,
  post (input, result, durationMs, context) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const operation = operationOf(context.toolName) ?? 'list_agents'
    const view      = collaborationView(operation, input, parsedResult(result))
    lines.push(...view.lines.map(line => wrapText(line, getMaxContentWidth())))
    return { lines, extraBadges: view.badges }
  },
})
