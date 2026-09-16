import { ink } from '../ansi/chalk.ts'
import { asRecord, parseJsonish, pickAny, pickString, resultText } from '../lib/data.ts'
import { badge, parseToolName, prose } from '../tui/index.ts'
import type { ToolResult } from '../types.ts'
import { named, outputCard } from './kit.ts'
import type { ToolRenderer } from './kit.ts'

// ---------------------------------------------------------- AskUserQuestion

interface Answer {
  question: string;
  answer:   string;
}

function structuredAnswers (result: ToolResult): Answer[] {
  const answers = asRecord(asRecord(result)?.answers)
  return answers
    ? Object.entries(answers).map(([ question, value ]) => ({ question, answer: Array.isArray(value) ? value.map(String).join(', ') : String(value) }))
    : []
}

/** Codex's native shape: `"question"="answer"` pairs inside the result text. */
function nativeAnswers (questions: readonly string[], result: ToolResult): Answer[] {
  const text = resultText(result) ?? ''
  return questions.flatMap(question => {
    const marker = `"${question}"="`
    const start  = text.indexOf(marker)
    if (start < 0)
      return []

    const from = start + marker.length
    const end  = text.indexOf('"', from)
    return [{ question, answer: text.slice(from, end < 0 ? undefined : end) }]
  })
}

export const askUserQuestion: ToolRenderer = {
  id:    'ask-user-question',
  match: named('AskUserQuestion'),
  render ({ input, result }) {
    const questions = Array.isArray(input.questions) ? input.questions.map(item => pickString(item, 'question')).filter((q): q is string => q !== null) : []
    const answers   = structuredAnswers(result)
    const resolved  = answers.length ? answers : nativeAnswers(questions, result)
    return {
      lines: resolved.length
        ? resolved.flatMap(({ question, answer }) => [ ink.dim('· ') + prose(question, Infinity, 2), ink.ok('→ ') + prose(answer, Infinity, 2) ])
        : [ ink.ok('✓ Answers recorded') ],
      badges: [ badge({ label: `${resolved.length || questions.length} answer${resolved.length === 1 ? '' : 's'}`, color: 'brightGreen', icon: '✓' }) ],
    }
  },
}

// ---------------------------------------------------------------- ToolSearch

type LoadedToolNamesReturnType = { names: string[]; deferred: number | null }

function loadedToolNames (result: ToolResult, query: string): LoadedToolNamesReturnType {
  const parsed     = parseJsonish(result)
  const record     = asRecord(parsed)
  const candidates = Array.isArray(parsed) ? parsed : [ record?.matches, record?.content ].find(Array.isArray) ?? []
  const names      = candidates.flatMap(candidate =>
    typeof candidate === 'string' ? [ candidate ] : [ pickString(candidate, 'tool_name', 'toolName', 'name') ].filter((name): name is string => name !== null))
  const selected = query.startsWith('select:')
    ? query.slice(7).split(',')
      .map(name => name.trim())
      .filter(Boolean)
    : []
  const deferred = typeof record?.total_deferred_tools === 'number' ? record.total_deferred_tools : null
  return { names: [ ...new Set(names.length ? names : selected) ], deferred }
}

export const toolSearch: ToolRenderer = {
  id:    'tool-search',
  match: named('ToolSearch'),
  render ({ input, result }) {
    const { names, deferred } = loadedToolNames(result, pickString(input, 'query') ?? '')
    return {
      lines:  names.length ? names.map(name => ink.ok('✓ ') + parseToolName(name).pretty) : [ ink.dim('No tools loaded') ],
      badges: [
        badge({ label: `${names.length} loaded`, color: names.length ? 'brightGreen' : 'gray' }),
        deferred === null ? null : badge({ label: `${deferred} deferred`, color: 'gray' }),
      ],
    }
  },
}

// --------------------------------------------------------------- apply_patch

const PATCH_SUCCESS = /(?:^done!?$|success\.\s+(?:updated|added|deleted) the following files:)/im

/** Codex renders apply_patch's diff itself; only unexpected text is worth a card. */
export const applyPatch: ToolRenderer = {
  id:    'apply-patch',
  match: named('apply_patch', 'ApplyPatch'),
  render ({ result }, limit) {
    const text = resultText(result)?.trim() ?? ''
    return { lines: [ text && !PATCH_SUCCESS.test(text) ? outputCard(text, limit) : null ]}
  },
}

// ---------------------------------------------------------- wcgw Initialize

export const wcgwInit: ToolRenderer = {
  id:    'wcgw-init',
  match: named('mcp__wcgw__Initialize'),
  render ({ result }) {
    const text = pickString(result, 'text', 'output') ?? resultText(result)
    return { lines: [ text
      ? ink.ok('⏻ ') + text.split('\n').slice(0, 3)
        .join('\n')
      : null ]}
  },
}

export const MISC_RENDERERS: readonly ToolRenderer[] = [ askUserQuestion, toolSearch, applyPatch, wcgwInit ]

export { pickAny }
