import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ink } from '../ansi/chalk.ts'
import { stripAnsi } from '../ansi/text.ts'
import { fit } from '../render/fit.ts'
import type { Render } from '../render/fit.ts'
import type { HookOutput } from '../types.ts'

/**
 * Claude Code weighs each hook output string on its own: `systemMessage`,
 * `additionalContext` and plain stdout each pass `value.length <= 1e4`, and
 * anything longer is replaced by a preview. Codex rejects an oversized
 * `systemMessage` as invalid hook JSON outright. So this transport always
 * enforces the boundary itself, in the unit the hosts use — UTF-16 code units
 * of the parsed string, where an ESC costs one and the JSON envelope nothing.
 */
export const HOOK_FIELD_CHAR_LIMIT = 10_000

/** Moves the cursor up over the host's own "hook says" line before the card. */
export const CLEAR_LINE_PREFIX = '\x1b[1A\x1b[2K\r'

/** Room kept for the "full output saved to …" pointer a shrunk message carries. */
const POINTER_RESERVE = 200

/** Characters a rendered message may spend. */
export const MESSAGE_BUDGET = HOOK_FIELD_CHAR_LIMIT - CLEAR_LINE_PREFIX.length

const PERSIST_DIR = path.join(os.tmpdir(), 'claude-code-hooks')
const PERSIST_MAX = 20

/** Writes the complete plain-text render to disk, pruning old ones. */
function persist (content: string): string | null {
  try {
    fs.mkdirSync(PERSIST_DIR, { recursive: true })

    const file = path.join(PERSIST_DIR, `hook-output-${Date.now()}-${process.pid}.log`)
    fs.writeFileSync(file, content)
    fs.readdirSync(PERSIST_DIR)
      .map(name => path.join(PERSIST_DIR, name))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
      .slice(PERSIST_MAX)
      .forEach(stale => fs.unlinkSync(stale))
    return file
  }
  catch {
    return null
  }
}

function pointer (full: string): string {
  const file = persist(stripAnsi(full))
  const size = full.length.toLocaleString('en-US')
  return ink.note(file
    ? `  … full ${size}-character output saved to ${file}`
    : `  … full ${size}-character output exceeded the ${HOOK_FIELD_CHAR_LIMIT.toLocaleString('en-US')}-character host limit`)
}

/**
 * The message as it will ship: the largest render that fits, colours intact,
 * plus a pointer to the complete output when anything had to be left out.
 */
export function resolveMessage (message: string | Render | undefined): string | null {
  if (message === undefined || message === '')
    return null

  const { text, full, shrunk } = fit(message, MESSAGE_BUDGET - POINTER_RESERVE)
  return shrunk ? `${text}\n${pointer(full)}` : text
}

export interface SerializedHook {
  json:          string;
  systemMessage: string | null;
}

/** The hook response JSON, with `systemMessage` resolved and prefixed. */
export function serializeHook (output: HookOutput<string | Render>): SerializedHook {
  const { systemMessage: message, ...rest } = output
  const resolved                            = resolveMessage(message)
  const systemMessage                       = resolved === null ? null : CLEAR_LINE_PREFIX + resolved
  const body                                = systemMessage === null ? rest : { ...rest, systemMessage }
  return { json: JSON.stringify(body, null, 2), systemMessage }
}
