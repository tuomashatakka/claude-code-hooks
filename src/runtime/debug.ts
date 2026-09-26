import fs from 'node:fs'
import path from 'node:path'


const HOME      = process.env.HOME || process.env.USERPROFILE || ''
const DEBUG_LOG = path.join(HOME, '.claude', 'debug.log')

function detailValue (value: unknown): unknown {
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack, cause: value.cause }
  try {
    JSON.stringify(value)
    return value
  }
  catch {
    return String(value)
  }
}

export function formatDebugEntry (scope: string, parts: readonly unknown[], timestamp: Date = new Date()): string {
  const [ first ] = parts
  const labelled  = typeof first === 'string'
  return `[${timestamp.toISOString()}] [${scope}] ${JSON.stringify({
    stage:      labelled ? first : 'log',
    details:    parts.slice(labelled ? 1 : 0).map(detailValue),
    pid:        process.pid,
    ppid:       process.ppid,
    runtime:    `${process.release.name}@${process.version}`,
    platform:   `${process.platform}-${process.arch}`,
    host:       process.env.PLUGIN_ROOT || process.env.PLUGIN_DATA ? 'codex' : process.env.CLAUDE_PLUGIN_ROOT ? 'claude-code' : 'direct',
    cwd:        process.cwd(),
    entrypoint: process.argv[1] ?? null,
    event:      process.argv[2] ?? null,
  })}`
}

/** Appends a structured line to ~/.claude/debug.log. Never throws. */
export function debugLog (scope: string, ...parts: unknown[]): void {
  try {
    fs.mkdirSync(path.dirname(DEBUG_LOG), { recursive: true })
    fs.appendFileSync(DEBUG_LOG, formatDebugEntry(scope, parts) + '\n')
  }
  catch {
    // Logging must never crash a hook.
  }
}
