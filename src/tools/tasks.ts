import { chalk, ink } from '../ansi/chalk.ts'
import { asRecord, parseJsonish, pickAny, pickId, pickString, resultRecord } from '../lib/data.ts'
import { badge, prose, renderBadges, renderCheckboxHeading, renderHeading } from '../tui/index.ts'
import type { BadgeColor, Json, ToolResult } from '../types.ts'
import { named } from './kit.ts'
import type { ToolRenderer } from './kit.ts'

// Task and plan tools: the checkbox heading is the shared vocabulary, so
// create / update / list all read as the same thing at different states.

export interface TaskView {
  id:           string | null;
  subject:      string;
  description?: string;
  status:       string;
}

export const normalizeStatus = (value: unknown, fallback = 'pending'): string =>
  String(value ?? fallback).trim()
    .toLowerCase()
    .replace(/-/g, '_') || fallback

function normalizeTask (value: unknown, fallback: Json = {}, fallbackStatus = 'pending'): TaskView | null {
  const task    = asRecord(value)
  const subject = pickString(task, 'subject', 'title', 'name') ?? pickString(fallback, 'subject', 'title', 'name')
  if (!subject)
    return null

  const description = pickString(task, 'description', 'details') ?? pickString(fallback, 'description', 'details')
  return {
    id:     pickId(task, 'id', 'taskId') ?? pickId(fallback, 'id', 'task_id'),
    subject,
    ...description ? { description } : {},
    status: normalizeStatus(pickAny(task, 'status') ?? pickAny(fallback, 'status'), fallbackStatus),
  }
}

const taskFromResult = (input: Json, result: ToolResult, fallbackStatus: string): TaskView | null =>
  normalizeTask(pickAny(asRecord(result), 'task', 'item') ?? result, input, fallbackStatus)

function tasksFromResult (result: ToolResult): TaskView[] {
  const parsed    = parseJsonish(result)
  const record    = asRecord(parsed)
  const candidate = record ? parseJsonish(pickAny(record, 'tasks', 'items', 'result', 'output', 'content')) : parsed
  return Array.isArray(candidate) ? candidate.map(item => normalizeTask(item)).filter((task): task is TaskView => task !== null) : []
}

interface Appearance {
  caption: string;
  checked: boolean;
  color:   BadgeColor;
}

const APPEARANCE: Record<string, Appearance> = {
  completed:   { caption: 'TASK COMPLETED', checked: true, color: 'green' },
  in_progress: { caption: 'TASK STARTED', checked: false, color: 'yellow' },
  blocked:     { caption: 'TASK BLOCKED', checked: false, color: 'red' },
  cancelled:   { caption: 'TASK CANCELLED', checked: false, color: 'gray' },
  canceled:    { caption: 'TASK CANCELLED', checked: false, color: 'gray' },
  pending:     { caption: 'TASK QUEUED', checked: false, color: 'cyan' },
  todo:        { caption: 'TASK QUEUED', checked: false, color: 'cyan' },
}

export const taskAppearance = (status: string): Appearance =>
  APPEARANCE[normalizeStatus(status)] ?? { caption: 'TASK UPDATED', checked: false, color: 'blue' }

export function renderTask (task: TaskView, caption?: string): string[] {
  const look    = taskAppearance(task.status)
  const heading = renderCheckboxHeading({
    caption:     caption ?? look.caption,
    checked:     look.checked,
    color:       look.color as never,
    description: task.description,
  })
  const label = task.id == null ? task.subject : `#${task.id}  ${task.subject}`
  return [ ...heading.split('\n'), '', renderBadges(badge({ label, color: look.color })) ]
}

export const taskCreate: ToolRenderer = {
  id:    'task-create',
  match: named('TaskCreate'),
  render ({ input, result }) {
    const task = taskFromResult(input, result, 'pending')
    return { lines: task ? renderTask(task, 'ADDED TASK') : []}
  },
}

export const taskUpdate: ToolRenderer = {
  id:    'task-update',
  match: named('TaskUpdate'),
  render ({ input, result }) {
    const record = asRecord(result)
    const status = normalizeStatus(pickAny(asRecord(record?.statusChange), 'to') ?? pickAny(record, 'status') ?? pickAny(input, 'status'), 'updated')
    const task   = taskFromResult(input, result, status)
    if (task)
      return { lines: renderTask({ ...task, status }) }

    const id   = pickId(record, 'taskId', 'task_id') ?? pickId(input, 'taskId', 'task_id', 'id')
    const look = taskAppearance(status)
    return {
      lines: [ renderBadges(
        badge({ label: look.caption, color: look.color, icon: look.checked ? '✓' : '↻' }),
        id === null ? null : badge({ label: `#${id}`, color: 'gray' }),
      ) ],
    }
  },
}

export const taskList: ToolRenderer = {
  id:    'task-list',
  match: named('TaskList'),
  render ({ result }) {
    const tasks = tasksFromResult(result)
    return { lines: tasks.length ? tasks.flatMap((task, index) => [ ...index ? [ '' ] : [], ...renderTask(task) ]) : [ ink.dim('No tasks') ]}
  },
}

export const taskStop: ToolRenderer = {
  id:    'task-stop',
  match: named('TaskStop'),
  render ({ input, result }) {
    const record = resultRecord(result)
    const id     = pickId(record, 'task_id', 'taskId') ?? pickId(input, 'task_id', 'taskId')
    const type   = pickString(record, 'task_type')
    return {
      lines:  [ ink.err('■ ') + chalk.bold.red('TASK STOPPED') ],
      badges: [
        id === null ? null : badge({ label: id, color: 'brightRed' }),
        type ? badge({ label: type, color: 'gray' }) : null,
      ],
    }
  },
}

// ------------------------------------------------------------------- plans

interface PlanItem {
  text:   string;
  status: string;
}

function planItems (value: unknown): PlanItem[] {
  if (!Array.isArray(value))
    return []
  return value.flatMap(item => {
    const text = pickString(item, 'step', 'content', 'activeForm')
    return text ? [{ text: text.trim(), status: normalizeStatus(pickAny(item, 'status')) }] : []
  })
}

const PLAN_GLYPH: Record<string, [string, (text: string) => string]> = {
  completed:   [ '✓', ink.ok ],
  in_progress: [ '▶', ink.warn ],
  blocked:     [ '×', ink.err ],
}

export const planUpdate: ToolRenderer = {
  id:    'plan-update',
  match: named('update_plan', 'UpdatePlan', 'TodoWrite', 'TodoRead'),
  render ({ input, result }) {
    const record      = resultRecord(result)
    const fromInput   = planItems(pickAny(input, 'plan', 'todos'))
    const plan        = fromInput.length ? fromInput : planItems(pickAny(record, 'plan', 'todos'))
    const explanation = pickString(input, 'explanation') ?? pickString(record, 'explanation')
    const completed   = plan.filter(item => item.status === 'completed').length
    return {
      lines: [
        explanation ? ink.dim(prose(explanation)) : null,
        ...plan.map(({ text, status }) => {
          const [ glyph, paint ] = PLAN_GLYPH[status] ?? [ '○', ink.key ]
          return paint(`${glyph} `) + prose(text, Infinity, 2)
        }),
        plan.length ? null : ink.dim('Plan updated'),
      ],
      badges: plan.length
        ? [ badge({ label: `${completed}/${plan.length} complete`, color: completed === plan.length ? 'brightGreen' : 'brightYellow' }) ]
        : [],
    }
  },
}

export const exitPlan: ToolRenderer = {
  id:     'exit-plan',
  match:  named('ExitPlanMode'),
  render: () => ({ lines: renderHeading({ word: 'YEET FAFO', color: 'cyan', event: 'stop' }).split('\n') }),
}

export const TASK_RENDERERS: readonly ToolRenderer[] = [ taskCreate, taskUpdate, taskList, taskStop, planUpdate, exitPlan ]
