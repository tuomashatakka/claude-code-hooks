// Doc-faithful TypeScript interfaces for Claude Code hook stdin/stdout payloads.
//
// Source: https://docs.claude.com/en/docs/claude-code/hooks
//
// These types mirror the JSON the harness writes to a hook's stdin, and the
// JSON a hook may write to stdout. Field names use the on-the-wire snake_case
// form (e.g. `tool_name`, `hook_event_name`). The parsed/normalized shapes
// the runtime registry uses live in hook-events.ts and hook-outputs.ts.
//
// Keep in sync with the official docs.

import type { ToolName } from './claude-code.ts';

// ── Common ───────────────────────────────────────────────────────────────────

export type WireHookEventName =
  | 'SessionStart'
  | 'SessionEnd'
  | 'Setup'
  | 'InstructionsLoaded'
  | 'UserPromptSubmit'
  | 'UserPromptExpansion'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PostToolBatch'
  | 'PermissionRequest'
  | 'PermissionDenied'
  | 'Notification'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'Stop'
  | 'StopFailure'
  | 'PreCompact'
  | 'PostCompact'
  | 'ConfigChange'
  | 'CwdChanged'
  | 'FileChanged'
  | 'Elicitation'
  | 'ElicitationResult'
  | 'TeammateIdle'
  | 'TaskCreated'
  | 'TaskCompleted'
  | 'WorktreeCreate'
  | 'WorktreeRemove';

export type PermissionMode =
  | 'default'
  | 'plan'
  | 'acceptEdits'
  | 'auto'
  | 'dontAsk'
  | 'bypassPermissions';

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface WireCommonInput<E extends WireHookEventName = WireHookEventName> {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: E;
  // Not all events receive permission_mode; per docs it appears on tool-related
  // events and a handful of others. Marked optional for safety.
  permission_mode?: PermissionMode;
  effort?: { level: EffortLevel };
}

// `tool_input` and `tool_response` are tool-specific; we keep them as broad
// records here. Per-tool refinements live in tool-io.ts.
export type WireToolInput = Record<string, unknown>;
export type WireToolResponse = string | Array<{ type?: string; text?: string }> | Record<string, unknown>;

// ── Session lifecycle ────────────────────────────────────────────────────────

export interface WireSessionStartInput extends WireCommonInput<'SessionStart'> {
  source: 'startup' | 'resume' | 'clear' | 'compact';
  model: string;
  agent_type?: string;
}

export interface WireSessionEndInput extends WireCommonInput<'SessionEnd'> {
  reason:
    | 'clear'
    | 'resume'
    | 'logout'
    | 'prompt_input_exit'
    | 'bypass_permissions_disabled'
    | 'other';
}

export interface WireSetupInput extends WireCommonInput<'Setup'> {
  matcher?: 'init' | 'maintenance';
}

// ── Instructions / prompts ───────────────────────────────────────────────────

export interface WireInstructionsLoadedInput extends WireCommonInput<'InstructionsLoaded'> {
  file_path: string;
  memory_type: 'User' | 'Project' | 'Local' | 'Managed';
  load_reason: 'session_start' | 'nested_traversal' | 'path_glob_match' | 'include' | 'compact';
}

export interface WireUserPromptSubmitInput extends WireCommonInput<'UserPromptSubmit'> {
  prompt: string;
}

export interface WireUserPromptExpansionInput extends WireCommonInput<'UserPromptExpansion'> {
  command: string;
  prompt: string;
  expanded_prompt: string;
}

// ── Tool events ──────────────────────────────────────────────────────────────

export interface WirePreToolUseInput extends WireCommonInput<'PreToolUse'> {
  tool_name: ToolName;
  tool_input: WireToolInput;
  tool_use_id?: string;
}

export interface WirePostToolUseInput extends WireCommonInput<'PostToolUse'> {
  tool_name: ToolName;
  tool_input: WireToolInput;
  tool_response: WireToolResponse;
  tool_use_id?: string;
  duration_ms?: number;
}

export interface WirePostToolUseFailureInput extends WireCommonInput<'PostToolUseFailure'> {
  tool_name: ToolName;
  tool_input: WireToolInput;
  tool_use_id?: string;
  error: string;
  is_interrupt?: boolean;
  duration_ms?: number;
}

export interface WirePostToolBatchEntry {
  tool_name: ToolName;
  tool_input: WireToolInput;
  tool_use_id: string;
  tool_response: WireToolResponse;
}

export interface WirePostToolBatchInput extends WireCommonInput<'PostToolBatch'> {
  tool_calls: WirePostToolBatchEntry[];
}

export interface WirePermissionSuggestion {
  type: 'addRules' | 'replaceRules' | 'removeRules' | 'setMode';
  rules?: Array<{ toolName: string; ruleContent: string }>;
  behavior?: 'allow' | 'deny' | 'ask';
  destination?: 'localSettings' | 'projectSettings' | 'userSettings' | 'session';
  mode?: PermissionMode;
}

export interface WirePermissionRequestInput extends WireCommonInput<'PermissionRequest'> {
  tool_name: ToolName;
  tool_input: WireToolInput;
  permission_suggestions?: WirePermissionSuggestion[];
}

export interface WirePermissionDeniedInput extends WireCommonInput<'PermissionDenied'> {
  tool_name: ToolName;
  tool_input: WireToolInput;
  tool_use_id?: string;
  reason: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'permission_prompt'
  | 'idle_prompt'
  | 'auth_success'
  | 'elicitation_dialog'
  | 'elicitation_complete'
  | 'elicitation_response';

export interface WireNotificationInput extends WireCommonInput<'Notification'> {
  message: string;
  title?: string;
  notification_type: NotificationType;
}

// ── Agents ───────────────────────────────────────────────────────────────────

export interface WireSubagentStartInput extends WireCommonInput<'SubagentStart'> {
  agent_id: string;
  agent_type: string;
}

export interface WireSubagentStopInput extends WireCommonInput<'SubagentStop'> {
  stop_hook_active: boolean;
  agent_id: string;
  agent_type: string;
  agent_transcript_path?: string;
  last_assistant_message?: string;
}

// ── Stop / failure ───────────────────────────────────────────────────────────

export interface WireStopInput extends WireCommonInput<'Stop'> {
  stop_hook_active: boolean;
  last_assistant_message?: string;
}

export type StopFailureErrorType =
  | 'rate_limit'
  | 'authentication_failed'
  | 'oauth_org_not_allowed'
  | 'billing_error'
  | 'invalid_request'
  | 'server_error'
  | 'max_output_tokens'
  | 'unknown';

export interface WireStopFailureInput extends WireCommonInput<'StopFailure'> {
  error: StopFailureErrorType;
  error_details?: string;
  last_assistant_message: string;
}

// ── Compaction ───────────────────────────────────────────────────────────────

export type CompactTrigger = 'manual' | 'auto';

export interface WirePreCompactInput extends WireCommonInput<'PreCompact'> {
  trigger: CompactTrigger;
  custom_instructions?: string;
}

export interface WirePostCompactInput extends WireCommonInput<'PostCompact'> {
  trigger: CompactTrigger;
  custom_instructions?: string;
}

// ── Config / filesystem ──────────────────────────────────────────────────────

export type ConfigChangeSource =
  | 'user_settings'
  | 'project_settings'
  | 'local_settings'
  | 'policy_settings'
  | 'skills';

export interface WireConfigChangeInput extends WireCommonInput<'ConfigChange'> {
  source: ConfigChangeSource;
  file_path?: string;
}

export interface WireCwdChangedInput extends WireCommonInput<'CwdChanged'> {
  old_cwd: string;
  new_cwd: string;
}

export type FileChangeEvent = 'change' | 'add' | 'unlink';

export interface WireFileChangedInput extends WireCommonInput<'FileChanged'> {
  file_path: string;
  event: FileChangeEvent;
}

// ── Elicitation (MCP) ────────────────────────────────────────────────────────

export type ElicitationAction = 'accept' | 'decline' | 'cancel';

export interface WireElicitationInput extends WireCommonInput<'Elicitation'> {
  mcp_server_name: string;
  elicitation_id?: string;
  mode?: string;
  message?: string;
  schema?: Record<string, unknown>;
}

export interface WireElicitationResultInput extends WireCommonInput<'ElicitationResult'> {
  mcp_server_name: string;
  action: ElicitationAction;
  content?: Record<string, unknown>;
  mode?: string;
  elicitation_id?: string;
}

// ── Teams / tasks ────────────────────────────────────────────────────────────

export interface WireTeammateIdleInput extends WireCommonInput<'TeammateIdle'> {
  teammate_name: string;
  team_name: string;
}

export interface WireTaskCreatedInput extends WireCommonInput<'TaskCreated'> {
  task_id: string;
  task_subject: string;
  task_description?: string;
  teammate_name?: string;
  team_name?: string;
}

export interface WireTaskCompletedInput extends WireCommonInput<'TaskCompleted'> {
  task_id: string;
  task_subject: string;
  task_description?: string;
  teammate_name?: string;
  team_name?: string;
}

// ── Worktrees ────────────────────────────────────────────────────────────────

export interface WireWorktreeCreateInput extends WireCommonInput<'WorktreeCreate'> {
  // Per docs: hook is invoked when a worktree is being created; it prints
  // the chosen path on stdout. Input mirrors common fields plus a `name`.
  name?: string;
}

export interface WireWorktreeRemoveInput extends WireCommonInput<'WorktreeRemove'> {
  worktree_path: string;
}

// ── Discriminated union ──────────────────────────────────────────────────────

export type WireHookInput<E extends WireHookEventName = WireHookEventName> =
  E extends 'SessionStart'         ? WireSessionStartInput :
  E extends 'SessionEnd'           ? WireSessionEndInput :
  E extends 'Setup'                ? WireSetupInput :
  E extends 'InstructionsLoaded'   ? WireInstructionsLoadedInput :
  E extends 'UserPromptSubmit'     ? WireUserPromptSubmitInput :
  E extends 'UserPromptExpansion'  ? WireUserPromptExpansionInput :
  E extends 'PreToolUse'           ? WirePreToolUseInput :
  E extends 'PostToolUse'          ? WirePostToolUseInput :
  E extends 'PostToolUseFailure'   ? WirePostToolUseFailureInput :
  E extends 'PostToolBatch'        ? WirePostToolBatchInput :
  E extends 'PermissionRequest'    ? WirePermissionRequestInput :
  E extends 'PermissionDenied'     ? WirePermissionDeniedInput :
  E extends 'Notification'         ? WireNotificationInput :
  E extends 'SubagentStart'        ? WireSubagentStartInput :
  E extends 'SubagentStop'         ? WireSubagentStopInput :
  E extends 'Stop'                 ? WireStopInput :
  E extends 'StopFailure'          ? WireStopFailureInput :
  E extends 'PreCompact'           ? WirePreCompactInput :
  E extends 'PostCompact'          ? WirePostCompactInput :
  E extends 'ConfigChange'         ? WireConfigChangeInput :
  E extends 'CwdChanged'           ? WireCwdChangedInput :
  E extends 'FileChanged'          ? WireFileChangedInput :
  E extends 'Elicitation'          ? WireElicitationInput :
  E extends 'ElicitationResult'    ? WireElicitationResultInput :
  E extends 'TeammateIdle'         ? WireTeammateIdleInput :
  E extends 'TaskCreated'          ? WireTaskCreatedInput :
  E extends 'TaskCompleted'        ? WireTaskCompletedInput :
  E extends 'WorktreeCreate'       ? WireWorktreeCreateInput :
  E extends 'WorktreeRemove'       ? WireWorktreeRemoveInput :
  never;

// ═════════════════════════════════════════════════════════════════════════════
// Output (stdout JSON) shapes
// ═════════════════════════════════════════════════════════════════════════════

export interface WireBaseHookOutput {
  /** If false, Claude stops processing entirely after the hook runs. */
  continue?: boolean;
  /** Shown to the user when continue is false. Not shown to Claude. */
  stopReason?: string;
  /** Omit stdout from the debug log when true. */
  suppressOutput?: boolean;
  /** Warning message shown to the user. */
  systemMessage?: string;
}

/** Top-level decision pattern used by many events. */
export interface WireDecisionOutput extends WireBaseHookOutput {
  decision?: 'block' | 'approve';
  reason?: string;
}

// hookSpecificOutput envelopes — keyed by hookEventName

export type PreToolUsePermissionDecision = 'allow' | 'deny' | 'ask' | 'defer';

export interface WirePreToolUseHookSpecific {
  hookEventName: 'PreToolUse';
  permissionDecision?: PreToolUsePermissionDecision;
  permissionDecisionReason?: string;
  updatedInput?: WireToolInput;
  updatedPermissions?: WirePermissionSuggestion[];
  additionalContext?: string;
}

export interface WirePostToolUseHookSpecific {
  hookEventName: 'PostToolUse';
  additionalContext?: string;
  updatedToolOutput?: unknown;
  toolName?: ToolName;
}

export interface WirePostToolUseFailureHookSpecific {
  hookEventName: 'PostToolUseFailure';
  additionalContext?: string;
}

export interface WirePostToolBatchHookSpecific {
  hookEventName: 'PostToolBatch';
  additionalContext?: string;
}

export interface WireUserPromptSubmitHookSpecific {
  hookEventName: 'UserPromptSubmit';
  additionalContext?: string;
  sessionTitle?: string;
}

export interface WireUserPromptExpansionHookSpecific {
  hookEventName: 'UserPromptExpansion';
  additionalContext?: string;
}

export interface WireSessionStartHookSpecific {
  hookEventName: 'SessionStart';
  additionalContext?: string;
}

export interface WireInstructionsLoadedHookSpecific {
  hookEventName: 'InstructionsLoaded';
  additionalContext?: string;
}

export interface WirePermissionRequestHookSpecific {
  hookEventName: 'PermissionRequest';
  decision?: {
    behavior: 'allow' | 'deny' | 'ask';
    updatedInput?: WireToolInput;
    updatedPermissions?: WirePermissionSuggestion[];
    message?: string;
    interrupt?: boolean;
  };
}

export interface WireElicitationResultHookSpecific {
  hookEventName: 'ElicitationResult';
  action?: ElicitationAction;
  content?: Record<string, unknown>;
}

export interface WireFileChangedHookSpecific {
  hookEventName: 'FileChanged';
  watchPaths?: string[];
}

export interface WireWorktreeCreateHookSpecific {
  hookEventName: 'WorktreeCreate';
  worktreePath?: string;
}

export type WireHookSpecificOutput<E extends WireHookEventName = WireHookEventName> =
  E extends 'PreToolUse'           ? WirePreToolUseHookSpecific :
  E extends 'PostToolUse'          ? WirePostToolUseHookSpecific :
  E extends 'PostToolUseFailure'   ? WirePostToolUseFailureHookSpecific :
  E extends 'PostToolBatch'        ? WirePostToolBatchHookSpecific :
  E extends 'UserPromptSubmit'     ? WireUserPromptSubmitHookSpecific :
  E extends 'UserPromptExpansion'  ? WireUserPromptExpansionHookSpecific :
  E extends 'SessionStart'         ? WireSessionStartHookSpecific :
  E extends 'InstructionsLoaded'   ? WireInstructionsLoadedHookSpecific :
  E extends 'PermissionRequest'    ? WirePermissionRequestHookSpecific :
  E extends 'ElicitationResult'    ? WireElicitationResultHookSpecific :
  E extends 'FileChanged'          ? WireFileChangedHookSpecific :
  E extends 'WorktreeCreate'       ? WireWorktreeCreateHookSpecific :
  never;

export interface WireHookOutput<E extends WireHookEventName = WireHookEventName>
  extends WireDecisionOutput {
  hookSpecificOutput?: WireHookSpecificOutput<E>;
}
