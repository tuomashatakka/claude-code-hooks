import { stripAnsi } from '../render/primitives.ts'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'


export const CLEAR_LINE_PREFIX = '\x1b[1A\x1b[2K\r'

/**
 * Claude Code weighs each hook output string on its own. `systemMessage`,
 * `additionalContext`, `initialUserMessage` and plain stdout all pass through
 * one guard — `if (value.length <= 1e4) return value` — and anything longer is
 * persisted by Claude Code with a preview and a path to the complete value.
 * Codex 0.148 rejects an oversized `systemMessage` as invalid hook JSON instead,
 * so this transport always enforces that same boundary itself.
 *
 * Two things follow from *where* that check sits, and getting either wrong is
 * what used to cost this transport most of its room:
 *
 *  - the unit is UTF-16 code units of the **parsed** string, not bytes of the
 *    serialized JSON. An ESC counts once, where `JSON.stringify` spends six
 *    bytes writing `\u001b`; four fifths of a rendered card is escape
 *    sequences, so weighing the encoded form overcharged the content by
 *    something close to a factor of five and shrank every picture to match.
 *  - the fields do not share a budget. `additionalContext` is checked
 *    separately, so a long system prompt travelling in the same response
 *    takes nothing away from the message rendered beside it.
 *
 * `String.length` is that same metric exactly — not an approximation of it —
 * so everything downstream measures with it and nothing converts.
 */
export const HOOK_FIELD_CHAR_LIMIT = 10_000

/** Characters one hook output string may spend, including its clear-line prefix. */
export const HOOK_RESPONSE_CHAR_BUDGET = HOOK_FIELD_CHAR_LIMIT

interface HookResponse {
  systemMessage?: string;
  [key: string]:  unknown;
}

export interface SerializedHookResponse {
  json:          string;
  systemMessage: string | null;
}

function responseWithMessage (data: HookResponse, systemMessage: string): HookResponse {
  return { ...data, systemMessage: CLEAR_LINE_PREFIX + systemMessage }
}

/** What Claude Code will charge this message, in the unit it charges it in. */
export function messageCost (systemMessage: string): number {
  return CLEAR_LINE_PREFIX.length + systemMessage.length
}

function fits (systemMessage: string): boolean {
  return messageCost(systemMessage) <= HOOK_RESPONSE_CHAR_BUDGET
}

/**
 * Characters a response may still add to its `systemMessage` before the host
 * needs either the complete plain-text fallback or a saved bounded preview.
 *
 * A hook that renders something elastic — art sized to whatever is left — needs
 * this *before* it renders. The whole response is taken rather than the message
 * alone because that is what the caller has in hand, but only `systemMessage`
 * is weighed: every other field carries its own separate limit.
 */
export function systemMessageHeadroom (data: HookResponse): number {
  const current = typeof data.systemMessage === 'string' ? data.systemMessage : ''
  return Math.max(0, HOOK_RESPONSE_CHAR_BUDGET - messageCost(current))
}

const PERSISTED_OUTPUT_DIRECTORY = path.join(os.tmpdir(), 'claude-code-hooks')
const MAX_PERSISTED_OUTPUTS      = 20

function persistCompleteOutput (content: string): string | null {
  try {
    fs.mkdirSync(PERSISTED_OUTPUT_DIRECTORY, { recursive: true })

    const file = path.join(PERSISTED_OUTPUT_DIRECTORY, `hook-output-${Date.now()}-${process.pid}.log`)
    fs.writeFileSync(file, content)

    const stale = fs.readdirSync(PERSISTED_OUTPUT_DIRECTORY)
      .map(name => {
        const candidate = path.join(PERSISTED_OUTPUT_DIRECTORY, name)
        return { candidate, modified: fs.statSync(candidate).mtimeMs }
      })
      .sort((a, b) => b.modified - a.modified)
      .slice(MAX_PERSISTED_OUTPUTS)
    for (const entry of stale)
      fs.unlinkSync(entry.candidate)
    return file
  }
  catch {
    return null
  }
}

function persistedPreview (plain: string): string {
  const file   = persistCompleteOutput(plain)
  const detail = file
    ? `full ${plain.length.toLocaleString('en-US')}-character hook output saved to ${file}`
    : `full hook output exceeded the ${HOOK_FIELD_CHAR_LIMIT.toLocaleString('en-US')}-character host limit`
  const marker    = `\n\n  … preview split — ${detail} …\n\n`
  const available = Math.max(0, HOOK_RESPONSE_CHAR_BUDGET - CLEAR_LINE_PREFIX.length - marker.length)
  const headSize  = Math.floor(available * 0.65)
  const tailSize  = available - headSize
  return plain.slice(0, headSize) + marker + plain.slice(-tailSize)
}

function transportSafeMessage (systemMessage: string): string {
  if (fits(systemMessage))
    return systemMessage

  const plain = stripAnsi(systemMessage)
  return fits(plain) ? plain : persistedPreview(plain)
}

export function serializeHookResponse (data: HookResponse): SerializedHookResponse {
  const systemMessage = typeof data.systemMessage === 'string' && data.systemMessage.length > 0
    ? data.systemMessage
    : null

  // ANSI-heavy output first gets a complete plain-text fallback. Codex rejects
  // an oversized systemMessage as invalid JSON instead of persisting it, so a
  // genuinely oversized plain result is saved intact and represented by a
  // bounded head/tail preview carrying the exact path to the complete value.
  const message = systemMessage ? transportSafeMessage(systemMessage) : systemMessage

  const output = message === null ? { ...data } : responseWithMessage(data, message)

  return {
    json:          JSON.stringify(output, null, 2),
    systemMessage: typeof output.systemMessage === 'string' ? output.systemMessage : null,
  }
}
