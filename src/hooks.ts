import fs from 'node:fs'
import path from 'node:path'
import { chalk, ink } from './ansi/chalk.ts'
import { asRecord, pickAny, pickBool, pickNumber, pickString } from './lib/data.ts'
import { fileCard, findImagePath } from './render/file-card.ts'
import type { Render } from './render/fit.ts'
import { renderWelcome } from './render/welcome.ts'
import { debugLog } from './runtime/debug.ts'
import { resolveMessage } from './runtime/transport.ts'
import { renderTool } from './tools/index.ts'
import { badge, durationLine, prose, renderHeading, section, toolBadge } from './tui/index.ts'
import type { BadgeLike, Line } from './tui/index.ts'
import type { HookEvent, HookOutput, Json, ToolView } from './types.ts'

// One handler per hook event. Each is a pure function of the wire payload that
// returns the response, with `systemMessage` either finished or elastic.

type Message = string | Render
type Handler = (raw: Json) => HookOutput<Message>

const HOME               = process.env.HOME ?? process.env.USERPROFILE ?? ''
const SYSTEM_PROMPT_PATH = path.join(HOME, 'system-prompt.md')

function loadSystemPrompt (): string | null {
  try {
    return fs.existsSync(SYSTEM_PROMPT_PATH) ? fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8') : null
  }
  catch (error) {
    debugLog('SessionStart', 'load-system-prompt', (error as Error).message)
    return null
  }
}

const quoted = (text: string, limit: number): string => ink.dim(prose(text, limit))

type HeadingColor = Parameters<typeof renderHeading>[0]['color']
type HeadingEvent = Parameters<typeof renderHeading>[0]['event']

const banner = (word: string, color: HeadingColor, event: HeadingEvent, badges: readonly BadgeLike[], lines: readonly Line[] = []): string =>
  renderHeading({ word, color, event }) + section(badges, lines)

function toolView (raw: Json): ToolView {
  const input = pickAny(raw, 'tool_input', 'toolInput')
  return {
    name:       pickString(raw, 'tool_name', 'toolName') ?? 'Unknown',
    // Freeform tools such as apply_patch put their payload directly in `tool_input`.
    input:      asRecord(input) ?? (typeof input === 'string' ? { input } : {}),
    result:     pickAny(raw, 'tool_response', 'tool_result', 'toolResult') as ToolView['result'] ?? null,
    durationMs: pickNumber(raw, 'duration_ms', 'durationMs'),
  }
}

export const HOOKS: Record<HookEvent, Handler> = {
  // Registered so Codex receives a valid no-op; policy stays host-owned.
  PreToolUse:    () => ({}),
  PostToolBatch: () => ({}),

  SessionStart: raw => {
    const source       = pickString(raw, 'source') ?? 'startup'
    const model        = pickString(raw, 'model')
    const agentType    = pickString(raw, 'agent_type', 'agentType')
    const systemPrompt = loadSystemPrompt()
    const isWake       = source === 'compact'
    const body         = banner(isWake ? 'WAKE UP' : 'BEGIN AGAIN', 'cyan', isWake ? 'wakeup' : 'start', [
      badge({ label: `Session:${source}`, color: 'green', icon: '⏻' }),
      model ? badge({ label: model, color: 'gray' }) : null,
    ], [
      ink.ok('Session started'),
      agentType ? ink.dim('Agent: ') + agentType : null,
      systemPrompt ? ink.key('✓ ') + 'System prompt loaded from: ' + SYSTEM_PROMPT_PATH : null,
    ])
    return {
      hookSpecificOutput: { hookEventName: 'SessionStart', ...systemPrompt ? { additionalContext: systemPrompt } : {}},
      // The art gets whatever the fixed part of the banner leaves of the limit.
      systemMessage:      limit => renderWelcome(limit.chars - body.length) + body,
    }
  },

  SessionEnd: () => ({ systemMessage: banner('BYE', 'red', 'bye', [ badge({ label: 'SessionEnd', color: 'red', icon: '⏼' }) ]) }),
  Stop:       () => ({ systemMessage: banner('STOP', 'red', 'stop', [ badge({ label: 'Stop', color: 'red', icon: '■' }) ]) }),

  SubagentStart: raw => {
    const agentType = pickString(raw, 'agent_type', 'agentType')
    return {
      systemMessage: banner('BEGIN', 'green', 'agent', [
        badge({ label: 'SubagentStart', color: 'green', icon: '⬡' }),
        agentType ? badge({ label: agentType, color: 'gray' }) : null,
      ]),
    }
  },

  SubagentStop: raw => ({
    systemMessage: banner('GOIN ASLEEP', 'green', 'agent', [
      badge({ label: 'SubagentStop', color: 'green', icon: '⌟' }),
      badge({ label: pickString(raw, 'agent_type', 'agentType') ?? 'Main Process', color: 'gray' }),
    ]),
  }),

  PreCompact: raw => {
    const trigger      = pickString(raw, 'trigger')
    const instructions = pickString(raw, 'custom_instructions', 'customInstructions')
    return {
      systemMessage: banner('COMPACT', 'yellow', 'compact', [
        badge({ label: 'PreCompact', color: 'yellow', icon: '⟳' }),
        trigger ? badge({ label: trigger, color: 'gray' }) : null,
      ], [ instructions ? quoted(instructions, 200) : null ]),
    }
  },

  PostCompact: raw => {
    const summary = pickString(raw, 'summary', 'compact_summary')
    return {
      systemMessage: banner('COMPACT', 'yellow', 'compact',
                            [ badge({ label: 'PostCompact', color: 'yellow', icon: '⟳' }) ],
                            [ summary ? quoted(summary, 200) : null ]),
    }
  },

  InstructionsLoaded: raw => {
    const filePath   = pickString(raw, 'file_path', 'filePath')
    const loadReason = pickString(raw, 'load_reason', 'loadReason')
    return {
      systemMessage: section([
        badge({ label: `Instructions:${pickString(raw, 'memory_type', 'memoryType') ?? 'Unknown'}`, color: 'cyan', icon: '✓' }),
        loadReason ? badge({ label: loadReason, color: 'gray' }) : null,
      ], [ filePath ? ink.dim('File: ') + filePath : null ]),
    }
  },

  UserPromptSubmit: raw => {
    const prompt    = pickString(raw, 'prompt', 'user_prompt', 'userPrompt') ?? ''
    const badges    = [ badge({ label: 'UserPromptSubmit', color: 'yellow', icon: '✎' }) ]
    const lines     = [ prompt ? quoted(prompt, 200) : null ]
    const imagePath = findImagePath(prompt, pickString(raw, 'cwd') ?? process.cwd())
    const image     = imagePath ? fileCard(imagePath, { action: 'prompt image' }) : null
    return { systemMessage: image ? limit => section(badges, [ ...lines, image(limit) ]) : section(badges, lines) }
  },

  UserPromptExpansion: raw => {
    const expanded = pickString(raw, 'expanded_prompt', 'expandedPrompt', 'expanded', 'prompt')
    if (!expanded)
      debugLog('UserPromptExpansion', 'unknown-shape', Object.keys(raw))
    return {
      systemMessage: section(
        [ badge({ label: 'UserPromptExpansion', color: 'magenta', icon: '✱' }) ],
        [ expanded ? quoted(expanded, 300) : null ]),
    }
  },

  PostToolUseFailure: raw => {
    const view  = toolView(raw)
    const error = pickAny(raw, 'error', 'tool_result') ?? 'Unknown error'
    const text  = typeof error === 'string' ? error : pickString(error, 'message') ?? JSON.stringify(error, null, 2)
    return {
      hookSpecificOutput: { hookEventName: 'PostToolUseFailure', additionalContext: typeof error === 'string' ? error : JSON.stringify(error) },
      systemMessage:      section([
        toolBadge(view.name, { color: 'red', icon: '⨂' }),
        pickBool(raw, 'is_interrupt', 'isInterrupt') ? badge({ label: 'INTERRUPT', color: 'yellow' }) : null,
      ], [ ink.err('⨂ ') + chalk.bold.red('Tool failed:'), text, durationLine(view.durationMs) ]),
    }
  },

  PostToolUse: raw => ({ systemMessage: renderTool(toolView(raw)) }),
}

/** The response for `event`, or `{}` when the handler throws — a hook must never crash the host. */
export function handleHook (event: HookEvent, raw: unknown): HookOutput<Message> {
  try {
    return HOOKS[event](asRecord(raw) ?? {})
  }
  catch (error) {
    debugLog('handleHook', 'handler-error', event, error instanceof Error ? error.stack ?? error.message : String(error))
    return {}
  }
}

/** The response with its message resolved to the string that will ship. */
export function renderHook (event: HookEvent, raw: unknown): HookOutput<string> {
  const { systemMessage, ...rest } = handleHook(event, raw)
  const resolved                   = resolveMessage(systemMessage)
  return resolved === null ? rest : { ...rest, systemMessage: resolved }
}
