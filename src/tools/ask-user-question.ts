import chalk from 'chalk'
import { defineTool } from '../registry/tool-registry.ts'
import { extractResultText, wrapText } from '../render/primitives.ts'
import { Badge, getMaxContentWidth, pushDurationLine } from '../tui/index.ts'
import type { AskUserQuestionInput, RawToolResult } from '../types/tool-io.ts'


interface AnswerView { question: string; answer: string }

function structuredAnswers (result: RawToolResult): AnswerView[] {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return []

  const answers = (result as Record<string, unknown>).answers
  if (!answers || typeof answers !== 'object' || Array.isArray(answers))
    return []
  return Object.entries(answers as Record<string, unknown>).map(([ question, value ]) => ({
    question,
    answer: Array.isArray(value) ? value.map(String).join(', ') : String(value),
  }))
}

function nativeAnswers (input: AskUserQuestionInput, result: RawToolResult): AnswerView[] {
  const text = extractResultText(result) ?? ''
  return (input.questions ?? []).flatMap(({ question }) => {
    if (!question)
      return []

    const marker = `\"${question}\"=\"`
    const start  = text.indexOf(marker)
    if (start < 0)
      return []

    const valueStart = start + marker.length
    const end        = text.indexOf('\"', valueStart)
    return [{ question, answer: text.slice(valueStart, end < 0 ? undefined : end) }]
  })
}

defineTool<AskUserQuestionInput, RawToolResult>({
  matches: 'AskUserQuestion',
  post (input, result, durationMs) {
    const lines: string[] = []
    pushDurationLine(lines, durationMs)

    const answers = structuredAnswers(result)
    if (!answers.length)
      answers.push(...nativeAnswers(input, result))

    if (!answers.length)
      lines.push(chalk.green('✓ Answers recorded'))
    for (const { question, answer } of answers) {
      lines.push(chalk.gray('· ') + wrapText(question, getMaxContentWidth() - 2))
      lines.push(chalk.green('→ ') + wrapText(answer, getMaxContentWidth() - 2))
    }

    return {
      lines,
      extraBadges: [ new Badge({
        label: `${answers.length || (input.questions?.length ?? 0)} answer${answers.length === 1 ? '' : 's'}`,
        color: 'brightGreen',
        icon:  '✓',
      }) ],
    }
  },
})
