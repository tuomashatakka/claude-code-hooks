// Shared vocabulary. Everything on the wire is untrusted JSON, so the input
// side is `Json`/`unknown` and gets picked apart with `lib/data.ts`; only the
// output side (what this plugin writes back to the host) is typed precisely.

export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'SessionStart',
  'SessionEnd',
  'PreCompact',
  'PostCompact',
  'InstructionsLoaded',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'SubagentStart',
  'SubagentStop',
  'Stop',
] as const

export type HookEvent = typeof HOOK_EVENTS[number]

export function isHookEvent (value: unknown): value is HookEvent {
  return typeof value === 'string' && (HOOK_EVENTS as readonly string[]).includes(value)
}

export type Json = Record<string, unknown>

export interface ContentBlock {
  type?:         string;
  text?:         string;
  [key: string]: unknown;
}

/** Tool results are the least stable shape on the wire; treat as unknown until parsed. */
export type ToolResult = string | ContentBlock[] | Json | null | undefined

export interface HookSpecificOutput {
  hookEventName:      HookEvent;
  additionalContext?: string;
  [key: string]:      unknown;
}

/**
 * What a hook hands back. `M` is the message type: handlers produce either a
 * finished string or an elastic `Render` (see render/fit.ts); the transport
 * resolves the latter to a string that fits the host limit.
 */
export interface HookOutput<M = string> {
  continue?:           boolean;
  systemMessage?:      M;
  suppressOutput?:     boolean;
  stopReason?:         string;
  hookSpecificOutput?: HookSpecificOutput;
}

export type BadgeColor =
  | 'blue' | 'green' | 'yellow' | 'red' | 'magenta' | 'cyan' |
  'gray' | 'white' | 'black' |
  'brightBlue' | 'brightGreen' | 'brightYellow' | 'brightRed' |
  'brightMagenta' | 'brightCyan' | 'brightGray' | 'brightWhite'

/** One tool invocation as PostToolUse reports it, normalized. */
export interface ToolView {
  name:       string;
  input:      Json;
  result:     ToolResult;
  durationMs: number | null;
}
