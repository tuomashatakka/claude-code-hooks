import { ink } from '../ansi/chalk.ts'
import { asRecord, displayPath, pickId, pickString, resultRecord } from '../lib/data.ts'
import { badge, parseToolName, prose } from '../tui/index.ts'
import type { Badge } from '../tui/index.ts'
import type { BadgeColor, Json } from '../types.ts'
import { named } from './kit.ts'
import type { Section, ToolRenderer } from './kit.ts'

// Agent lifecycle tools summarised rather than replayed: the prompt or brief
// handed to a worker is private to it, so only status, model and identity show.

const statusBadge = (label: string | null, color: BadgeColor): Badge | null =>
  label ? badge({ label: label.replace(/_/g, ' '), color }) : null

export const agent: ToolRenderer = {
  id:    'agent',
  match: named('Agent', 'Task'),
  render ({ input, result }) {
    const record     = resultRecord(result)
    const status     = pickString(record, 'status')
    const outputFile = pickString(record, 'outputFile')
    return {
      lines: [
        pickString(input, 'description')?.trim() ? prose(pickString(input, 'description')!) : null,
        outputFile ? displayPath(outputFile) : null,
      ],
      badges: [
        statusBadge(status, status && (/fail|error|stop/).test(status) ? 'red' : 'green'),
        statusBadge(pickString(record, 'resolvedModel'), 'blue'),
        statusBadge(pickId(record, 'agentId', 'agent_id', 'taskId', 'task_id'), 'gray'),
      ],
    }
  },
}

// -------------------------------------------------------------- collaboration

type Operation = 'spawn_agent' | 'wait_agent' | 'followup_task' | 'send_message' | 'interrupt_agent' | 'list_agents'

const targetOf = (input: Json, result: Json | null): string =>
  pickString(result, 'task_name', 'agent_name', 'target') ?? pickString(input, 'task_name', 'target', 'agent_name') ?? 'agent'

const VIEWS: Record<Operation, (input: Json, result: Json | null) => Section> = {
  spawn_agent: (input, result) => ({
    lines:  [ ink.ok('✓ ') + `started ${targetOf(input, result)}` ],
    badges: [ statusBadge(pickString(input, 'agent_type'), 'green'), statusBadge(pickString(input, 'model'), 'gray') ],
  }),
  wait_agent: (_input, result) => {
    const timedOut = result?.timed_out === true
    const message  = pickString(result, 'message') ?? (timedOut ? 'No agents completed yet' : 'Agent update received')
    return {
      lines:  [ timedOut ? ink.dim(message) : ink.ok('✓ ') + message ],
      badges: [ badge({ label: timedOut ? 'timed out' : 'update', color: timedOut ? 'gray' : 'green' }) ],
    }
  },
  followup_task:   (input, result) => ({ lines: [ ink.key('→ ') + `follow-up sent to ${targetOf(input, result)}` ]}),
  send_message:    (input, result) => ({ lines: [ ink.key('→ ') + `message sent to ${targetOf(input, result)}` ]}),
  interrupt_agent: (input, result) => ({
    lines:  [ ink.err('■ ') + `interrupted ${targetOf(input, result)}` ],
    badges: [ statusBadge(pickString(result, 'previous_status', 'status'), 'gray') ],
  }),
  list_agents: (_input, result) => {
    const agents = Array.isArray(result?.agents) ? result.agents : []
    const lines  = agents.flatMap(entry => {
      const data   = asRecord(entry)
      const name   = pickString(data, 'agent_name', 'task_name', 'name')
      const status = pickString(data, 'agent_status', 'status')
      return name ? [ ink.key('· ') + name + (status ? ink.dim(` — ${status.replace(/_/g, ' ')}`) : '') ] : []
    })
    return {
      lines:  lines.length ? lines : [ ink.dim('No active agents') ],
      badges: [ badge({ label: `${lines.length} agent${lines.length === 1 ? '' : 's'}`, color: lines.length ? 'blue' : 'gray' }) ],
    }
  },
}

const operationOf = (toolName: string): Operation | null => {
  const { server, tool } = parseToolName(toolName)
  return server === 'collaboration' && tool in VIEWS ? tool as Operation : null
}

export const collaboration: ToolRenderer = {
  id:    'collaboration',
  match: toolName => operationOf(toolName) !== null,
  render ({ name, input, result }) {
    const view = VIEWS[operationOf(name) ?? 'list_agents'](input, resultRecord(result))
    return { ...view, lines: view.lines.map(line => line ? prose(line) : line) }
  },
}

export const AGENT_RENDERERS: readonly ToolRenderer[] = [ agent, collaboration ]
