import type { ChalkInstance } from 'chalk'
import { chalk } from '../ansi/chalk.ts'
import type { BadgeColor } from '../types.ts'


export interface ToolTheme {
  icon:  string;
  color: BadgeColor;
}

const theme = (icon: string, color: BadgeColor): ToolTheme => ({ icon, color })

const SHELL   = theme('❯', 'magenta')
const WRITE   = theme('⊕', 'green')
const EDIT    = theme('Δ', 'green')
const READ    = theme('▤', 'blue')
const SEARCH  = theme('⌕', 'red')
const WEB     = theme('⇌', 'cyan')
const AGENT   = theme('󰒕', 'cyan')
const TASK    = theme('✓', 'blue')
const PLAN    = theme('≋', 'cyan')
const IMAGE   = theme('▩', 'blue')
const POWER   = theme('⏻', 'cyan')
const DEFAULT = theme('󰌠', 'blue')

/** Exact tool names (raw or with the `mcp__server__` prefix stripped). */
const TOOL_THEMES: Record<string, ToolTheme> = {
  'Bash':            SHELL,
  'BashCommand':     SHELL,
  'Write':           WRITE,
  'FileWriteOrEdit': WRITE,
  'Edit':            EDIT,
  'MultiEdit':       EDIT,
  'FileEdit':        EDIT,
  'apply_patch':     EDIT,
  'ApplyPatch':      EDIT,
  'Read':            READ,
  'ReadFiles':       READ,
  'read_page':       READ,
  'Glob':            SEARCH,
  'Grep':            SEARCH,
  'WebFetch':        WEB,
  'WebSearch':       theme('⌕', 'cyan'),
  'ToolSearch':      theme('⌕', 'cyan'),
  'query-docs':      WEB,
  'navigate':        WEB,
  'Task':            AGENT,
  'Agent':           AGENT,
  'TaskCreate':      TASK,
  'TaskUpdate':      TASK,
  'TaskList':        TASK,
  'TaskStop':        theme('■', 'red'),
  'update_plan':     PLAN,
  'UpdatePlan':      PLAN,
  'TodoWrite':       PLAN,
  'TodoRead':        PLAN,
  'ExitPlanMode':    POWER,
  'Initialize':      POWER,
  'ContextSave':     theme('⧺', 'cyan'),
  'AskUserQuestion': theme('?', 'brightGreen'),
  'view_image':      IMAGE,
  'ViewImage':       IMAGE,
  'ReadImage':       IMAGE,
  'spawn_agent':     theme('⬡', 'green'),
  'wait_agent':      theme('◷', 'gray'),
  'followup_task':   theme('↻', 'cyan'),
  'send_message':    theme('→', 'cyan'),
  'interrupt_agent': theme('■', 'red'),
  'list_agents':     theme('≋', 'blue'),
}

/** Unknown tools are themed by what their name says they do. */
const THEME_BY_VERB: ReadonlyArray<[RegExp, ToolTheme]> = [
  [ /bash|command|exec|shell/i, SHELL ],
  [ /write|edit|create/i, WRITE ],
  [ /read|get|fetch|load/i, READ ],
  [ /search|find|grep|query|glob/i, SEARCH ],
]

const COLLABORATION_RE = /^collaboration(?:__|[._-])?(spawn_agent|wait_agent|followup_task|send_message|interrupt_agent|list_agents)$/i

export interface ParsedToolName {
  server: string | null;
  tool:   string;
  pretty: string;
}

export function parseToolName (rawName: string | null | undefined): ParsedToolName {
  if (!rawName || typeof rawName !== 'string')
    return { server: null, tool: 'Unknown', pretty: 'Unknown' }

  const collaboration = COLLABORATION_RE.exec(rawName)
  if (collaboration) {
    const tool = collaboration[1]!.toLowerCase()
    return { server: 'collaboration', tool, pretty: `collaboration ▸ ${tool.replace(/_/g, ' ')}` }
  }

  const mcp = (/^mcp__([^_].*?)__(.+)$/).exec(rawName)
  if (mcp)
    return { server: mcp[1]!, tool: mcp[2]!, pretty: `${mcp[1]} ▸ ${mcp[2]!.replace(/_/g, ' ')}` }
  return { server: null, tool: rawName, pretty: rawName }
}

export function toolTheme (rawName: string): ToolTheme {
  const { tool } = parseToolName(rawName)
  return TOOL_THEMES[rawName] ??
    TOOL_THEMES[tool] ??
    THEME_BY_VERB.find(([ pattern ]) => pattern.test(tool))?.[1] ??
    DEFAULT
}

const BACKGROUND: Record<BadgeColor, ChalkInstance> = {
  blue:          chalk.bgBlue,
  green:         chalk.bgGreen,
  yellow:        chalk.bgYellow,
  red:           chalk.bgRed,
  magenta:       chalk.bgMagenta,
  cyan:          chalk.bgCyan,
  gray:          chalk.bgGray,
  white:         chalk.bgWhite,
  black:         chalk.bgBlack,
  brightBlue:    chalk.bgBlueBright,
  brightGreen:   chalk.bgGreenBright,
  brightYellow:  chalk.bgYellowBright,
  brightRed:     chalk.bgRedBright,
  brightMagenta: chalk.bgMagentaBright,
  brightCyan:    chalk.bgCyanBright,
  brightGray:    chalk.bgGray,
  brightWhite:   chalk.bgWhiteBright,
}

const FOREGROUND: Record<BadgeColor, ChalkInstance> = {
  blue:          chalk.blue,
  green:         chalk.green,
  yellow:        chalk.yellow,
  red:           chalk.red,
  magenta:       chalk.magenta,
  cyan:          chalk.cyan,
  gray:          chalk.gray,
  white:         chalk.white,
  black:         chalk.black,
  brightBlue:    chalk.blueBright,
  brightGreen:   chalk.greenBright,
  brightYellow:  chalk.yellowBright,
  brightRed:     chalk.redBright,
  brightMagenta: chalk.magentaBright,
  brightCyan:    chalk.cyanBright,
  brightGray:    chalk.gray,
  brightWhite:   chalk.whiteBright,
}

export const bg = (color: BadgeColor): ChalkInstance => BACKGROUND[color] ?? chalk.bgBlue
export const fg = (color: BadgeColor): ChalkInstance => FOREGROUND[color] ?? chalk.blue
