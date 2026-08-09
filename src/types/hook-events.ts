import type { ToolName } from './claude-code.ts';
import type { RawToolInput, RawToolResult, ToolInputUnion } from './tool-io.ts';

export type HookEventName =
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PostToolBatch'
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreCompact'
  | 'PostCompact'
  | 'InstructionsLoaded'
  | 'UserPromptSubmit'
  | 'UserPromptExpansion'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'Stop';

// ── Per-event canonical (parsed) input shapes ────────────────────────────────────

export interface PostToolUseInput {
  toolName: ToolName;
  toolInput: ToolInputUnion;
  toolResponse: RawToolResult;
  durationMs: number | null;
  sessionId?: string;
}

export interface PostToolUseFailureInput {
  toolName: ToolName;
  toolInput: RawToolInput;
  error: string | { message?: string; [k: string]: unknown };
  isInterrupt: boolean;
  durationMs: number | null;
}

export interface PostToolBatchInput {
  // Reserved — no rendering today.
  [k: string]: unknown;
}

export interface SessionStartInput {
  source: 'startup' | 'resume' | 'clear' | 'compact' | (string & {});
  model?: string;
  agentType?: string;
}

export interface SessionEndInput {
  reason?: string;
}

export interface PostCompactInput {
  summary?: string;
}

export interface PreCompactInput {
  trigger?: 'manual' | 'auto';
  customInstructions?: string;
}

export interface SubagentStartInput {
  agentId?: string;
  agentType?: string;
}

export interface InstructionsLoadedInput {
  filePath: string;
  memoryType: string;
  loadReason: string;
}

export interface UserPromptSubmitInput {
  prompt: string;
}

export interface UserPromptExpansionInput {
  expandedPrompt: string;
  originalPrompt?: string;
}

export interface SubagentStopInput {
  agentType?: string;
}

export interface StopInput {
  reason?: string;
}

export type HookInput<E extends HookEventName> =
  E extends 'PostToolUse'          ? PostToolUseInput :
  E extends 'PostToolUseFailure'   ? PostToolUseFailureInput :
  E extends 'PostToolBatch'        ? PostToolBatchInput :
  E extends 'SessionStart'         ? SessionStartInput :
  E extends 'SessionEnd'           ? SessionEndInput :
  E extends 'PreCompact'           ? PreCompactInput :
  E extends 'PostCompact'          ? PostCompactInput :
  E extends 'InstructionsLoaded'   ? InstructionsLoadedInput :
  E extends 'UserPromptSubmit'     ? UserPromptSubmitInput :
  E extends 'UserPromptExpansion'  ? UserPromptExpansionInput :
  E extends 'SubagentStart'        ? SubagentStartInput :
  E extends 'SubagentStop'         ? SubagentStopInput :
  E extends 'Stop'                 ? StopInput :
  never;

export const HOOK_EVENT_NAMES: readonly HookEventName[] = [
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
] as const;

export function isHookEventName(x: unknown): x is HookEventName {
  return typeof x === 'string' && (HOOK_EVENT_NAMES as readonly string[]).includes(x);
}
