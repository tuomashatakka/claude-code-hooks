import chalk, { type ChalkInstance } from 'chalk';
import type { BadgeColor } from '../types/claude-code.ts';

chalk.level = 3;

export const TOOL_ICONS: Record<string, string> = {
  Bash: '❯',
  Write: '⊕',
  Edit: 'Δ',
  Read: '▤',
  Glob: '⌕',
  Grep: '⌕',
  Task: '󰒕',
  Agent: '󰒕',
  WebFetch: '⇌',
  WebSearch: '⌕',
  TaskCreate: '✓',
  TaskUpdate: '✓',
  TaskList: '✓',
  ToolSearch: '⌕',
  ExitPlanMode: '⏻',
  mcp__wcgw__BashCommand: '❯',
  mcp__wcgw__FileWriteOrEdit: '⊕',
  mcp__wcgw__FileEdit: 'Δ',
  mcp__wcgw__ReadFiles: '▤',
  mcp__wcgw__ReadImage: '▩',
  mcp__wcgw__Initialize: '⏻',
  mcp__wcgw__ContextSave: '⧺',
  'mcp__context7__query-docs': '⇌',
  'mcp__context7__resolve-library-id': '⇌',
  'mcp__claude-in-chrome__navigate': '⇌',
  'mcp__claude-in-chrome__read_page': '▤',
  default: '󰌠',
};

export const TOOL_COLORS: Record<string, BadgeColor> = {
  Bash: 'magenta',
  Write: 'green',
  Edit: 'green',
  Read: 'blue',
  Task: 'cyan',
  Agent: 'cyan',
  Glob: 'red',
  Grep: 'red',
  WebFetch: 'cyan',
  WebSearch: 'cyan',
  mcp__wcgw__BashCommand: 'magenta',
  mcp__wcgw__FileWriteOrEdit: 'green',
  mcp__wcgw__FileEdit: 'green',
  mcp__wcgw__ReadFiles: 'blue',
  mcp__wcgw__ReadImage: 'blue',
  mcp__wcgw__Initialize: 'cyan',
  mcp__wcgw__ContextSave: 'cyan',
  default: 'blue',
};

export interface ParsedToolName {
  server: string | null;
  tool: string;
  pretty: string;
}

export function parseToolName(rawName: string | null | undefined): ParsedToolName {
  if (!rawName || typeof rawName !== 'string') {
    return { server: null, tool: 'Unknown', pretty: 'Unknown' };
  }
  if (rawName.startsWith('mcp__')) {
    const rest = rawName.slice(5);
    const idx = rest.indexOf('__');
    if (idx > 0) {
      const server = rest.slice(0, idx);
      const tool = rest.slice(idx + 2);
      const prettyTool = tool.replace(/_/g, ' ');
      return { server, tool, pretty: `${server} ▸ ${prettyTool}` };
    }
  }
  return { server: null, tool: rawName, pretty: rawName };
}

export function getToolIcon(rawName: string): string {
  if (TOOL_ICONS[rawName]) return TOOL_ICONS[rawName]!;
  const { tool } = parseToolName(rawName);
  if (TOOL_ICONS[tool]) return TOOL_ICONS[tool]!;
  if (/bash|command|exec|shell/i.test(tool)) return TOOL_ICONS.Bash!;
  if (/write|edit|create/i.test(tool)) return TOOL_ICONS.Write!;
  if (/read|get|fetch|load/i.test(tool)) return TOOL_ICONS.Read!;
  if (/search|find|grep|query|glob/i.test(tool)) return TOOL_ICONS.Grep!;
  return TOOL_ICONS.default!;
}

export function getToolColor(rawName: string): BadgeColor {
  if (TOOL_COLORS[rawName]) return TOOL_COLORS[rawName]!;
  const { tool } = parseToolName(rawName);
  if (TOOL_COLORS[tool]) return TOOL_COLORS[tool]!;
  if (/bash|command|exec|shell/i.test(tool)) return 'magenta';
  if (/write|edit|create/i.test(tool)) return 'green';
  if (/read|get|fetch|load/i.test(tool)) return 'blue';
  if (/search|find|grep|query|glob/i.test(tool)) return 'red';
  return TOOL_COLORS.default!;
}

const BACKGROUND_COLOR_MAP: Record<BadgeColor, ChalkInstance> = {
  blue: chalk.bgBlue,
  green: chalk.bgGreen,
  yellow: chalk.bgYellow,
  red: chalk.bgRed,
  magenta: chalk.bgMagenta,
  cyan: chalk.bgCyan,
  gray: chalk.bgGray,
  white: chalk.bgWhite,
  black: chalk.bgBlack,
  brightBlue: chalk.bgBlueBright,
  brightGreen: chalk.bgGreenBright,
  brightYellow: chalk.bgYellowBright,
  brightRed: chalk.bgRedBright,
  brightMagenta: chalk.bgMagentaBright,
  brightCyan: chalk.bgCyanBright,
  brightGray: chalk.bgGray,
  brightWhite: chalk.bgWhiteBright,
};

const FOREGROUND_COLOR_MAP: Record<BadgeColor, ChalkInstance> = {
  blue: chalk.blue,
  green: chalk.green,
  yellow: chalk.yellow,
  red: chalk.red,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  gray: chalk.gray,
  white: chalk.white,
  black: chalk.black,
  brightBlue: chalk.blueBright,
  brightGreen: chalk.greenBright,
  brightYellow: chalk.yellowBright,
  brightRed: chalk.redBright,
  brightMagenta: chalk.magentaBright,
  brightCyan: chalk.cyanBright,
  brightGray: chalk.gray,
  brightWhite: chalk.whiteBright,
};

export function getBadgeColor(name: BadgeColor): ChalkInstance {
  return BACKGROUND_COLOR_MAP[name] ?? chalk.bgBlue;
}

export function getBadgeTextColor(name: BadgeColor): ChalkInstance {
  return FOREGROUND_COLOR_MAP[name] ?? chalk.blue;
}
