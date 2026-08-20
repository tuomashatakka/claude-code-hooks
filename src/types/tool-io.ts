import type { ContentBlock, ToolName, KnownToolName } from './claude-code.ts'

// Native Claude Code tool inputs --------------------------------------------------

export interface BashInput { command: string; description?: string; timeout?: number; run_in_background?: boolean }
export interface ReadInput { file_path: string; limit?: number; offset?: number; pages?: string }
export interface EditInputSingle { file_path: string; old_string: string; new_string: string; replace_all?: boolean }
export interface EditInputMulti { file_path: string; edits: Array<{ old_string: string; new_string: string; replace_all?: boolean }> }
export type EditInput = EditInputSingle | EditInputMulti
export interface WriteInput { file_path: string; content: string }
export interface GlobInput { pattern: string; path?: string }
export interface GrepInput { 'pattern': string; 'path'?: string; 'output_mode'?: 'content' | 'files_with_matches' | 'count'; '-i'?: boolean; '-n'?: boolean; 'multiline'?: boolean }
export interface TaskInput { description: string; prompt: string; subagent_type?: string; model?: string; isolation?: 'worktree' }
export interface WebFetchInput { url: string; prompt: string }
export interface WebSearchInput { query: string; allowed_domains?: string[]; blocked_domains?: string[] }
export interface ExitPlanInput { plan?: string }
export interface TodoWriteInput { todos: unknown[] }
export interface ApplyPatchInput { patch?: string; input?: string; text?: string }
export interface TaskStopInput { task_id?: string; taskId?: string }
export interface ToolSearchInput { query?: string; max_results?: number }
export interface PlanUpdateInput {
  explanation?: string;
  plan?:        Array<{ step?: string; content?: string; status?: string }>;
  todos?:       Array<{ content?: string; step?: string; activeForm?: string; status?: string }>;
}
export interface AskUserQuestionInput {
  questions?: Array<{
    question?:    string;
    header?:      string;
    multiSelect?: boolean;
    options?:     Array<{ label?: string; description?: string; preview?: string }>;
  }>;
}
export interface ViewImageInput { path?: string; file_path?: string; detail?: string }

// wcgw MCP tool inputs ------------------------------------------------------------

export interface WcgwBashCommandInput {
  type:              'command' | 'status_check' | 'send_text' | 'send_specials' | 'send_ascii';
  thread_id:         string;
  command?:          string | null;
  is_background?:    boolean;
  wait_for_seconds?: number | null;
  send_text?:        string | null;
  send_specials?:    string[] | null;
  send_ascii?:       number[] | null;
  status_check?:     boolean | null;
  bg_command_id?:    string | null;
  // Surface-level legacy
  action_json?:      unknown;
  chats_id?:         string;
  timeout?:          number;
}

export interface WcgwFileWriteOrEditInput {
  file_path:                     string;
  percentage_to_change:          number;
  text_or_search_replace_blocks: string;
  thread_id:                     string;
}

export type WcgwFileEditInput = WcgwFileWriteOrEditInput

export interface WcgwReadFilesInput {
  // Some shapes pass it as a single string; ReadImage passes `file_path`.
  file_paths?: string[] | string;
  file_path?:  string;
}

export interface WcgwInitializeInput {
  type:                  'first_call' | 'user_asked_mode_change' | 'reset_shell' | 'user_asked_change_workspace';
  any_workspace_path:    string;
  initial_files_to_read: string[];
  task_id_to_resume:     string;
  mode_name:             'wcgw' | 'architect' | 'code_writer';
  thread_id:             string;
  allowed_commands?:     'all' | string[] | null;
  allowed_globs?:        'all' | string[] | null;
}

export interface WcgwContextSaveInput {
  id:                  string;
  project_root_path:   string;
  description:         string;
  relevant_file_globs: string[];
}

// Discriminated union, with `__tool` injected at parse time. Not on the wire.

export type ToolInputUnion =
  | { __tool: 'Bash' } & BashInput |
  { __tool: 'Read' } & ReadInput |
  { __tool: 'Edit' } & EditInput |
  { __tool: 'MultiEdit' } & EditInput |
  { __tool: 'Write' } & WriteInput |
  { __tool: 'Glob' } & GlobInput |
  { __tool: 'Grep' } & GrepInput |
  { __tool: 'Task' | 'Agent' } & TaskInput |
  { __tool: 'WebFetch' } & WebFetchInput |
  { __tool: 'WebSearch' } & WebSearchInput |
  { __tool: 'ExitPlanMode' } & ExitPlanInput |
  { __tool: 'TodoWrite' } & TodoWriteInput |
  { __tool: 'TodoRead' } & Partial<TodoWriteInput> |
  { __tool: 'update_plan' | 'UpdatePlan' } & PlanUpdateInput |
  { __tool: 'ToolSearch' } & ToolSearchInput |
  { __tool: 'TaskStop' } & TaskStopInput |
  { __tool: 'AskUserQuestion' } & AskUserQuestionInput |
  { __tool: 'view_image' | 'ViewImage' } & ViewImageInput |
  { __tool: 'apply_patch' | 'ApplyPatch' } & ApplyPatchInput |
  { __tool: 'mcp__wcgw__BashCommand' } & WcgwBashCommandInput |
  { __tool: 'mcp__wcgw__FileWriteOrEdit' } & WcgwFileWriteOrEditInput |
  { __tool: 'mcp__wcgw__FileEdit' } & WcgwFileEditInput |
  { __tool: 'mcp__wcgw__ReadFiles' } & WcgwReadFilesInput |
  { __tool: 'mcp__wcgw__ReadImage' } & WcgwReadFilesInput |
  { __tool: 'mcp__wcgw__Initialize' } & WcgwInitializeInput |
  { __tool: 'mcp__wcgw__ContextSave' } & WcgwContextSaveInput |
  { __tool: string; [k: string]: unknown }

export type ToolInputOf<TName extends ToolName> = Extract<ToolInputUnion, { __tool: TName }>

// Open-ended input fallback for unknown tools.
export type RawToolInput = Record<string, unknown>

// Tool result shapes are far less stable; treat them as unknown until parsed.
export type RawToolResult = string | ContentBlock[] | Record<string, unknown> | null | undefined

export type ToolResultOf<_T extends ToolName> = RawToolResult

export type { ToolName, KnownToolName }
