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

// Codex displays PostToolUse's stdout systemMessage itself; mirroring it to
// stderr would show the card twice. Lifecycle events keep the mirror Claude
// Code's hook presentation relies on.
const mirrorToStderr = event !== 'PostToolUse'

try {
  const raw                     = await readStdin()
  const isCodex                 = Boolean(process.env.CODEX_HOME && !process.env.CLAUDE_PLUGIN_ROOT)
  const { json, systemMessage } = serializeHook(handleHook(event, raw), { ansi: !isCodex })
  writeResponse(json, systemMessage, { mirrorToStderr })
}
catch (error) {
  debugLog(event, 'CRASH', error instanceof Error ? error.stack ?? error.message : String(error))
  writeResponse('{}', null, { mirrorToStderr })
}
