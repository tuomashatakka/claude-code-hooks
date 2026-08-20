import chalk from 'chalk'
import { defineTool } from '../registry/tool-registry.ts'
import { extractResultText, wrapText } from '../render/primitives.ts'
import { Badge, getMaxContentWidth, pushDurationLine } from '../tui/index.ts'
import type { PlanUpdateInput, RawToolResult } from '../types/tool-io.ts'


interface PlanItem { text: string; status: string }

function record (value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function resultRecord (result: RawToolResult): Record<string, unknown> | null {
  const direct = record(result)
  if (direct)
    return direct

  const text = extractResultText(result)?.trim()
  if (!text?.startsWith('{'))
    return null
  try {
    return record(JSON.parse(text))
  }
  catch {
    return null
  }
}

function itemsFrom (value: unknown): PlanItem[] {
  if (!Array.isArray(value))
    return []
  return value.flatMap(item => {
    const data = record(item)
    const text = data?.step ?? data?.content ?? data?.activeForm
    if (typeof text !== 'string' || !text.trim())
      return []
    return [{ text:   text.trim(),
      status: String(data?.status ?? 'pending').toLowerCase()
        .replace(/-/g, '_') }]
  })
}

type AppearanceReturnType = { glyph: string; paint: (text: string) => string }

function appearance (status: string): AppearanceReturnType {
  if (status === 'completed')
    return { glyph: '✓', paint: chalk.green }
  if (status === 'in_progress')
    return { glyph: '▶', paint: chalk.yellow }
  if (status === 'blocked')
    return { glyph: '×', paint: chalk.red }
  return { glyph: '○', paint: chalk.cyan }
}

defineTool<PlanUpdateInput, RawToolResult>({
  matches: [ 'update_plan', 'UpdatePlan', 'TodoWrite', 'TodoRead' ],
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const resolved    = resultRecord(result)
    const inputItems  = itemsFrom(input.plan ?? input.todos)
    const plan        = inputItems.length ? inputItems : itemsFrom(resolved?.plan ?? resolved?.todos)
    const explanation = input.explanation ??
      (typeof resolved?.explanation === 'string' ? resolved.explanation : null)
    if (explanation)
      lines.push(chalk.gray(wrapText(explanation, getMaxContentWidth())))
    for (const item of plan) {
      const { glyph, paint } = appearance(item.status)
      lines.push(paint(`${glyph} `) + wrapText(item.text, getMaxContentWidth() - 2))
    }
    if (!plan.length)
      lines.push(chalk.gray('Plan updated'))

    const completed = plan.filter(item => item.status === 'completed').length
    return {
      lines,
      extraBadges: plan.length
        ? [ new Badge({
          label: `${completed}/${plan.length} complete`,
          color: completed === plan.length ? 'brightGreen' : 'brightYellow',
        }) ]
        : [],
    }
  },
})
