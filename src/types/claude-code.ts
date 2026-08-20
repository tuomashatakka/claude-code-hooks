// Shared primitive types referenced across hook events and tool I/O.

export type ContentBlock =
  | { type: 'text'; text: string } |
  { type: 'image' | 'base64'; [k: string]: unknown } |
  { type: string; [k: string]: unknown }

// Common discriminated tool name set we care about. Anything else falls under `string`.
export type KnownToolName =
  | 'Bash' |
  'Read' |
  'Edit' |
  'MultiEdit' |
  'Write' |
  'Glob' |
  'Grep' |
  'Task' |
  'Agent' |
  'WebFetch' |
  'WebSearch' |
  'TaskCreate' |
  'TaskUpdate' |
  'TaskList' |
  'TaskStop' |
  'apply_patch' |
  'ApplyPatch' |
  'ToolSearch' |
  'AskUserQuestion' |
  'view_image' |
  'ViewImage' |
  'update_plan' |
  'UpdatePlan' |
  'ExitPlanMode' |
  'TodoWrite' |
  'TodoRead' |
  'NotebookRead' |
  'NotebookEdit' |
  'mcp__wcgw__BashCommand' |
  'mcp__wcgw__FileWriteOrEdit' |
  'mcp__wcgw__FileEdit' |
  'mcp__wcgw__ReadFiles' |
  'mcp__wcgw__ReadImage' |
  'mcp__wcgw__Initialize' |
  'mcp__wcgw__ContextSave'

export type ToolName = KnownToolName | string & {}

export type BadgeColor =
  | 'blue' | 'green' | 'yellow' | 'red' | 'magenta' | 'cyan' |
  'gray' | 'white' | 'black' |
  'brightBlue' | 'brightGreen' | 'brightYellow' | 'brightRed' |
  'brightMagenta' | 'brightCyan' | 'brightGray' | 'brightWhite'
