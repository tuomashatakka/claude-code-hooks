#!/usr/bin/env bun
import { handleHook } from './hooks.ts'
import { debugLog } from './runtime/debug.ts'
import { readStdin, writeResponse } from './runtime/io.ts'
import { serializeHook } from './runtime/transport.ts'
import { isHookEvent } from './types.ts'


const event = process.argv[2]

if (!isHookEvent(event)) {
  debugLog('main', 'unknown-event', String(event))
  writeResponse('{}', null, { mirrorToStderr: false })
}

// Codex supplies CLAUDE_PLUGIN_ROOT for compatibility, so that variable cannot
// identify Claude Code. Codex marks systemMessage as a warning and shows tool
// results itself; only hook context belongs in its JSON response.
const isCodex        = Boolean(process.env.PLUGIN_ROOT || process.env.PLUGIN_DATA)
const mirrorToStderr = !isCodex && event !== 'PostToolUse'

try {
  const raw = await readStdin()
  if (isCodex && event !== 'SessionStart' && event !== 'PostToolUseFailure')
    writeResponse('{}', null, { mirrorToStderr })

  const output                  = handleHook(event, raw)
  const response                = isCodex ? { ...output, systemMessage: undefined } : output
  const { json, systemMessage } = serializeHook(response)
  writeResponse(json, systemMessage, { mirrorToStderr })
}
catch (error) {
  debugLog(event, 'CRASH', error instanceof Error ? error.stack ?? error.message : String(error))
  writeResponse('{}', null, { mirrorToStderr })
}
