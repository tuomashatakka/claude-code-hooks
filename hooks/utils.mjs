#!/usr/bin/env node
/**
 * Shared utilities for hooks
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

chalk.level = 3;

export function stripAnsi(str) {
  return String(str).replace(/\x1b\[[0-9;]*m/g, '');
}

export function renderBox(content) {
  const lines = String(content).split('\n');
  const maxLen = Math.max(...lines.map(l => stripAnsi(l).length), 0);
  const width = maxLen + 2;
  const bg = chalk.bgHex('#252525');
  const blank = bg(' '.repeat(width));
  const body = lines.map(l =>
    bg(' ' + l + ' '.repeat(Math.max(0, width - 1 - stripAnsi(l).length)))
  );
  return [blank, ...body, blank].join('\n');
}

const DEBUG_LOG = path.resolve('/Users/mia/.claude/debug.log');
const DIVIDER_WIDTH = 60

export function debugLog(scope, ...parts) {
  try {
    const ts = new Date().toISOString();
    const line = parts.map(p =>
      typeof p === 'string'
        ? p
        : (() => { try { return JSON.stringify(p); } catch { return String(p); } })()
    ).join(' ');
    fs.appendFileSync(DEBUG_LOG, `[${ts}] [${scope}] ${line}\n`);
  } catch {}
}

export const TOOL_ICONS = {
  'Bash': '❯',
  'Write': '⊕',
  'Edit': 'Δ',
  'Read': '▤',
  'Glob': '⌕',
  'Grep': '⌕',
  'Task': '󰒕',
  'Agent': '󰒕',
  'WebFetch': '⇌',
  'WebSearch': '⌕',
  'TaskCreate': '✓',
  'TaskUpdate': '✓',
  'TaskList': '✓',
  'ToolSearch': '⌕',
  'ExitPlanMode': '⏻',
  'mcp__wcgw__BashCommand': '❯',
  'mcp__wcgw__FileWriteOrEdit': '⊕',
  'mcp__wcgw__FileEdit': 'Δ',
  'mcp__wcgw__ReadFiles': '▤',
  'mcp__wcgw__Initialize': '⏻',
  'mcp__wcgw__ContextSave': '⧺',
  'mcp__context7__query-docs': '⇌',
  'mcp__context7__resolve-library-id': '⇌',
  'mcp__claude-in-chrome__navigate': '⇌',
  'mcp__claude-in-chrome__read_page': '▤',
  'default': '󰌠',
};

export const TOOL_COLORS = {
  'Bash': 'magenta',
  'Write': 'green',
  'Edit': 'green',
  'Read': 'blue',
  'Task': 'cyan',
  'Agent': 'cyan',
  'Glob': 'red',
  'Grep': 'red',
  'WebFetch': 'cyan',
  'WebSearch': 'cyan',
  'mcp__wcgw__BashCommand': 'magenta',
  'mcp__wcgw__FileWriteOrEdit': 'green',
  'mcp__wcgw__FileEdit': 'green',
  'mcp__wcgw__ReadFiles': 'blue',
  'mcp__wcgw__Initialize': 'cyan',
  'mcp__wcgw__ContextSave': 'cyan',
  'default': 'blue',
};

/**
 * "mcp__wcgw__BashCommand" -> { server: "wcgw", tool: "BashCommand", pretty: "wcgw ▸ BashCommand" }
 * "Bash"                    -> { server: null,  tool: "Bash",        pretty: "Bash" }
 */
export function parseToolName(rawName) {
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

export function getToolIcon(rawName) {
  if (TOOL_ICONS[rawName]) return TOOL_ICONS[rawName];
  const { tool } = parseToolName(rawName);
  if (TOOL_ICONS[tool]) return TOOL_ICONS[tool];
  if (/bash|command|exec|shell/i.test(tool)) return TOOL_ICONS.Bash;
  if (/write|edit|create/i.test(tool))       return TOOL_ICONS.Write;
  if (/read|get|fetch|load/i.test(tool))     return TOOL_ICONS.Read;
  if (/search|find|grep|query|glob/i.test(tool)) return TOOL_ICONS.Grep;
  return TOOL_ICONS.default;
}

export function getToolColor(rawName) {
  if (TOOL_COLORS[rawName]) return TOOL_COLORS[rawName];
  const { tool } = parseToolName(rawName);
  if (TOOL_COLORS[tool]) return TOOL_COLORS[tool];
  if (/bash|command|exec|shell/i.test(tool)) return 'magenta';
  if (/write|edit|create/i.test(tool))       return 'green';
  if (/read|get|fetch|load/i.test(tool))     return 'blue';
  if (/search|find|grep|query|glob/i.test(tool)) return 'red';
  return TOOL_COLORS.default;
}

export function getBadgeColor(colorName) {
  const colorMap = {
    'blue': chalk.bgBlue,
    'green': chalk.bgGreen,
    'yellow': chalk.bgYellow,
    'red': chalk.bgRed,
    'magenta': chalk.bgMagenta,
    'cyan': chalk.bgCyan,
    'gray': chalk.bgGray,
    'white': chalk.bgWhite,
    'black': chalk.bgBlack,
    'brightBlue': chalk.bgBlueBright,
    'brightGreen': chalk.bgGreenBright,
    'brightYellow': chalk.bgYellowBright,
    'brightRed': chalk.bgRedBright,
    'brightMagenta': chalk.bgMagentaBright,
    'brightCyan': chalk.bgCyanBright,
    'brightGray': chalk.bgGrayBright,
    'brightWhite': chalk.bgWhiteBright,
  };
  return colorMap[colorName] || chalk.bgBlue;
}

/**
 * Single canonical badge renderer used by every hook.
 *   renderBadge({ rawToolName: 'mcp__wcgw__BashCommand' })
 *   renderBadge({ label: 'UserPromptSubmit', color: 'yellow', icon: '✎' })
 * For multi-badge rows, build Badge instances and use renderBadges(...).
 */
export function renderBadge({ rawToolName = null, label = null, color = null, icon = null } = {}) {
  let pretty;
  let badgeColor = color;
  let badgeIcon = icon;

  if (rawToolName) {
    pretty = parseToolName(rawToolName).pretty;
    if (!badgeIcon) badgeIcon = getToolIcon(rawToolName);
    if (!badgeColor) badgeColor = getToolColor(rawToolName);
  } else {
    pretty = label || '';
    if (!badgeColor) badgeColor = 'cyan';
  }

  const bg = getBadgeColor(badgeColor);
  return bg.black(` ${badgeIcon ? badgeIcon + ' ' : ''}${pretty} `);
}

export class Badge {
  icon = null;
  color = null;
  label = null;
  toolName = null;

  constructor(props = {}) {
    if (props.icon) this.icon = props.icon;
    if (props.color) this.color = props.color;
    if (props.label) this.label = props.label;
    if (props.toolName) this.toolName = props.toolName;
  }

  get rawToolName() {
    return this.toolName;
  }

  toString() {
    return renderBadge({
      rawToolName: this.rawToolName,
      label: this.label,
      color: this.color,
      icon: this.icon,
    });
  }
}

/**
 * Compose multiple badges into a single line.
 * @param  {...(Badge|string|null|undefined)} badges
 */
export function renderBadges(...badges) {
  return badges
    .filter(Boolean)
    .map(b => (b instanceof Badge ? b.toString() : String(b)))
    .join(' ');
}

/**
 * Per-tool ordered list of input keys to surface as the "main" rendered output.
 * Falls back to a generic key list if the tool isn't listed.
 */
export const PRIMARY_INPUT_KEYS = {
  Bash: ['command'],
  Write: ['file_path', 'filePath'],
  Edit: ['file_path', 'filePath'],
  Read: ['file_path', 'filePath', 'file_paths'],
  Glob: ['pattern'],
  Grep: ['pattern'],
  WebFetch: ['url'],
  WebSearch: ['query'],
  Task: ['description', 'prompt'],
  Agent: ['description', 'prompt'],
  ExitPlanMode: ['plan'],
  TodoWrite: ['todos'],
  TaskCreate: ['description', 'prompt'],
  mcp__wcgw__BashCommand: ['command', 'action_json'],
  mcp__wcgw__FileWriteOrEdit: ['file_path'],
  mcp__wcgw__ReadFiles: ['file_paths'],
};

const GENERIC_PRIMARY_KEYS = [
  'command', 'file_path', 'filePath', 'file_paths',
  'url', 'query', 'pattern', 'prompt', 'description', 'plan',
];

export function pickPrimaryInput(rawToolName, input) {
  if (!input || typeof input !== 'object') return { key: null, value: null };
  const candidates = [
    ...(PRIMARY_INPUT_KEYS[rawToolName] || []),
    ...((parseToolName(rawToolName).tool && PRIMARY_INPUT_KEYS[parseToolName(rawToolName).tool]) || []),
    ...GENERIC_PRIMARY_KEYS,
  ];
  for (const key of candidates) {
    if (input[key] != null && input[key] !== '') {
      return { key, value: input[key] };
    }
  }
  return { key: null, value: null };
}

/**
 * Render a section: badge on first line, optional divider, then body lines.
 */
export function renderSection({ badge, lines = [], divider = '─', dividerColor = 'gray' } = {}) {
  let out = '\n' + badge;
  const body = lines.filter(Boolean);
  if (body.length) {
    out += '\n' + chalk[dividerColor](divider.repeat(DIVIDER_WIDTH)) + '\n';
    out += body.join('\n');
  }
  return out;
}

/**
 * Standard hook entry point. Reads stdin, calls handler, catches errors,
 * always emits a safe { continue: true } payload.
 */
export async function runHook(name, handler) {
  try {
    const data = await readInput()
    const out = (await handler(data || {})) || {}
    writeOutput({ continue: true, ...out })
  }
  catch (err) {
    debugLog(name, 'CRASH', err && (err.stack || err.message) || String(err))
    writeOutput({ continue: true })
  }
}

export function readInput() {
  const input = [];
  return new Promise(resolve => {
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => input.push(chunk))
    process.stdin.on('end', () => {
      const raw = input.join('')
      if (!raw.trim()) {
        resolve(null)
        return
      }

      try {
        resolve(JSON.parse(raw))
      }
      catch (e) {
        debugLog('readInput', 'parse-fail', e.message, raw.slice(0, 200))
        resolve(null)
      }
    })
  })
}


export function writeOutput(data) {
  if (data.systemMessage)
    process.stderr.write(data.systemMessage + '\n')
  process.stdout.write(JSON.stringify(data, null, 2))
  process.exit(0)
}


export function isJSON(str) {
  if (typeof str !== 'string') return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function isCode(str) {
  if (typeof str !== 'string') return false;
  const codePatterns = [
    /^(function|const|let|var|class|import|export|if|for|while|return)\s/m,
    /^(def|class|import|from|if|for|while|return)\s/m,
    /=>/,
    /\{\s*[\w\s:,\n]+\}/,
    /^\s*```/m,
  ];
  return codePatterns.some(p => p.test(str));
}

export function formatJSON(content) {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

export function detectLanguage(content, toolName) {
  const { tool } = parseToolName(toolName);
  if (tool === 'Read' || tool === 'ReadFiles') {
    const extMatch = content.match(/\.([a-z]+)$/m);
    if (extMatch) return extMatch[1];
    if (content.includes('function') || content.includes('const ') || content.includes('let ') || content.includes('=>')) return 'javascript';
    if (content.includes('def ') && content.includes(':')) return 'python';
  }
  if (tool === 'Bash' || tool === 'BashCommand') return 'bash';
  return 'text';
}

export function simpleHighlight(code, language) {
  if (!language || (language !== 'javascript' && language !== 'typescript' && language !== 'json' && language !== 'bash')) {
    return code;
  }

  let result = code;

  if (language === 'json') {
    result = result.replace(/"([^"]+)":/g, (m, p1) => chalk.cyan(`"${p1}"`) + chalk.gray(':'));
    result = result.replace(/: "([^"]*)"/g, (m, p1) => chalk.gray(': ') + chalk.green(`"${p1}"`));
    result = result.replace(/: (\d+)/g, (m, p1) => chalk.gray(': ') + chalk.yellow(p1));
    result = result.replace(/: (true|false|null)/g, (m, p1) => chalk.gray(': ') + chalk.yellow(p1));
    return result;
  }

  if (language === 'javascript' || language === 'typescript') {
    result = result.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (m) => chalk.gray(m));
    result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, (m) => chalk.green(m));
    result = result.replace(/\b\d+\.?\d*\b/g, (m) => chalk.yellow(m));
    result = result.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|super|static)\b/g, (m) => chalk.cyan(m));
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, (m) => chalk.magenta(m));
    return result;
  }

  if (language === 'bash') {
    result = result.replace(/(^|\n)(#.*)$/gm, (m, p1, p2) => p1 + chalk.gray(p2));
    return result;
  }

  return code;
}

export function formatWCGWOutput(result) {
  let output = [];

  if (typeof result === 'string') return result;

  if (result && typeof result === 'object') {
    if (result.file_paths) {
      let files = chalk.cyan('⊛ ') + chalk.bold('Files accessed:') + '\n';
      result.file_paths.forEach(f => {
        files += chalk.gray('  ├ ') + f + '\n';
      });
      output.push(files);
    }

    const fileContents = result['file-contents-numbered'] || result.file_contets_numbered || result['file-contents'] || result.output;

    if (fileContents && typeof fileContents === 'object') {
      let files = chalk.cyan('⊛ ') + chalk.bold('File contents/Output:') + '\n';
      for (const [filePath, fileContent] of Object.entries(fileContents)) {
        if (typeof fileContent !== 'string') continue;
        files += chalk.gray('  ├ ') + chalk.yellow(filePath) + '\n';
        const lines = fileContent.split('\n').slice(0, 15);
        lines.forEach((line, i) => {
          files += chalk.gray(`  │ ${String(i + 1).padStart(3)} │ `) + line + '\n';
        });
        if (fileContent.split('\n').length > 15) {
          files += chalk.gray('  │ ... ') + chalk.italic(`+${fileContent.split('\n').length - 15} more lines`) + '\n';
        }
      }
      output.push(files);
    } else if (typeof fileContents === 'string' && fileContents.length > 0) {
      let outs = chalk.cyan('⊛ ') + chalk.bold('Output:') + '\n';
      const lines = fileContents.split('\n').slice(0, 20);
      lines.forEach((line) => {
        outs += chalk.gray(`  │ `) + line + '\n';
      });
      if (fileContents.split('\n').length > 20) {
        outs += chalk.gray('  │ ... ') + chalk.italic(`+${fileContents.split('\n').length - 20} more lines`) + '\n';
      }
      output.push(outs);
    }

    if (result.status_check) output.push(chalk.cyan('⧖ ') + chalk.bold('Status:')  + ' ' + result.status_check);
    if (result.command) {
      output.push(chalk.cyan('❯ ') + chalk.bold('Command:') + '\n' + chalk.gray('  $ ') + result.command);
    }
  }

  return output.join('\n');
}

/**
 *
 * @param {string} toolName Name of the called tool
 * @param {*} toolResult Tool results
 * @returns {{ type: 'json' | 'code' | 'text', content: string | null, language: string | null } | null} The description for the main user-facing preview
 */
export function formatToolResult(toolName, toolResult) {
  let content = toolResult;

  if (content === null || content === undefined) return null;

  if (typeof content === 'object')
    content = JSON.stringify(content, null, 2);

  if (typeof content !== 'string' || content.trim() === '' || content.trim() === '""' || content.trim() === "''")
    return null;

  if (isJSON(content))
    return { type: 'json', content: formatJSON(content), language: 'json' };

  if (isCode(content)) {
    const lang = detectLanguage(content, toolName);
    return { type: 'code', content, language: lang };
  }

  return { type: 'text', content, language: null };
}


/**
 * Splits a tool result into "apparent output" and "metadata".
 *   primary: The bulk content (stdout, file contents, etc.)
 *   metadata: The remaining fields as an object.
 */
export function deconstructToolResult(toolName, result) {
  if (!result || typeof result !== 'object' || result === null) {
    return { primary: result, metadata: null };
  }

  // Deep copy to avoid modifying the original
  const res = JSON.parse(JSON.stringify(result));
  const { server, tool } = parseToolName(toolName);

  let primary = '';
  const metadata = {};

  // 1. Handle Array-like objects (standard LLM content blocks)
  // These often look like { "0": { "type": "text", "text": "..." }, ... }
  // Or they are actual arrays.
  const isArrayLike = Array.isArray(res) || (typeof res === 'object' && res['0'] && res['0'].type);
  if (isArrayLike) {
    const blocks = Array.isArray(res) ? res : Object.values(res);
    const parts = [];
    blocks.forEach(block => {
      if (block.type === 'text' && block.text) parts.push(block.text);
      else if (block.type === 'image' || block.type === 'base64') parts.push(chalk.yellow('[Image Data]'));
      else if (typeof block === 'string') parts.push(block);
      else if (block.output) parts.push(block.output); // Some MCP servers use this
    });
    if (parts.length > 0) {
      return { primary: parts.join('\n\n'), metadata: null };
    }
  }

  // 2. Specialized formatters (WCGW)
  if (server === 'wcgw') {
    primary = formatWCGWOutput(res);
  }

  // 3. Per-tool primary output field lookup
  const TOOL_PRIMARY_OUTPUT_KEYS = {
    Read:        ['content', 'output', 'text'],
    Edit:        ['diff', 'result', 'output'],
    MultiEdit:   ['diff', 'result', 'output'],
    Write:       ['file_path', 'result'],
    Bash:        ['stdout', 'output'],
    Glob:        ['filenames', 'result', 'output'],
    Grep:        ['filenames', 'result', 'output'],
    WebFetch:    ['content', 'output', 'text'],
    WebSearch:   ['results', 'output', 'text'],
    Task:        ['description', 'result', 'output'],
    Agent:       ['description', 'result', 'output'],
    TodoRead:    ['todos', 'result', 'output'],
    TodoWrite:   ['result', 'output'],
    ToolSearch:  ['results', 'output', 'text'],
    ExitPlanMode:['plan', 'result'],
    NotebookRead:['output', 'content'],
    NotebookEdit:['result', 'output'],
  };
  if (!primary) {
    const toolKeys = TOOL_PRIMARY_OUTPUT_KEYS[tool] || [];
    for (const key of toolKeys) {
      if (res[key] != null) {
        primary = typeof res[key] === 'object'
          ? JSON.stringify(res[key], null, 2)
          : String(res[key]);
        delete res[key];
        break;
      }
    }
  }

  // 4. General extraction from common fields
  const contentKeys = [
    'stdout', 'output', 'content', 'text', 'message', 'error', 'stderr',
    'file-contents-numbered', 'file_contets_numbered', 'file-contents',
    'filePath', 'type',
  ];

  const parts = primary ? [primary] : [];
  const foundKeys = contentKeys.filter(k => res[k] != null);

  for (const key of foundKeys) {
    let val = res[key];

    // If we already have this in primary (from specialized formatter), skip
    if (primary && primary.includes(String(val).slice(0, 20))) continue;

    // If the value itself is an object with text/output (nested content blocks)
    if (typeof val === 'object' && val !== null) {
      if (val.text) val = val.text;
      else if (val.output) val = val.output;
      else if (val.content) val = val.content;
      else val = JSON.stringify(val, null, 2);
    }

    if (key === 'stderr' || key === 'error') {
      parts.push(chalk.red(`⨂ ${key.toUpperCase()}:`) + '\n' + val);
    } else if (key === 'filePath') {
      parts.push(chalk.cyan('󰈚 ') + chalk.bold('Path: ') + val);
    } else if (key === 'type') {
      parts.push(chalk.cyan('⧖ ') + chalk.bold('Action: ') + val);
    } else {
      parts.push(val);
    }
    delete res[key];
  }
  primary = parts.join('\n\n');

  // Whatever is left is metadata
  if (Object.keys(res).length > 0) {
    Object.assign(metadata, res);
  }

  return { primary: primary || null, metadata: Object.keys(metadata).length > 0 ? metadata : null };
}

// ─── Metadata custom formatter ────────────────────────────────────────────────

const META_KEY   = chalk.hex('#7aa2f7');
const META_STR   = chalk.hex('#9ece6a');
const META_NUM   = chalk.yellow;
const META_PUNCT = chalk.gray;

function formatMetaValue(val, depth) {
  if (val === null)      return META_NUM('null');
  if (val === undefined) return META_NUM('undefined');
  if (typeof val === 'boolean') return META_NUM(String(val));
  if (typeof val === 'number')  return META_NUM(String(val));
  if (typeof val === 'string')  return META_STR(val);

  const pad  = '  '.repeat(depth + 1);
  const cpad = '  '.repeat(depth);

  if (Array.isArray(val)) {
    if (val.length === 0) return META_PUNCT('[ ]');
    const items = val.map(v => formatMetaValue(v, depth + 1));
    const inline = META_PUNCT('[ ') + items.join(META_PUNCT(', ')) + META_PUNCT(' ]');
    if (stripAnsi(inline).length <= 50) return inline;
    return META_PUNCT('[\n') + items.map(i => pad + i).join(META_PUNCT(',\n')) + '\n' + cpad + META_PUNCT(']');
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val);
    if (entries.length === 0) return META_PUNCT('{ }');
    const pairs = entries.map(([k, v]) => META_KEY(k) + META_PUNCT(': ') + formatMetaValue(v, depth + 1));
    const inline = META_PUNCT('{ ') + pairs.join(META_PUNCT(', ')) + META_PUNCT(' }');
    if (stripAnsi(inline).length <= 50) return inline;
    return META_PUNCT('{\n') + pairs.map(p => pad + p).join(META_PUNCT(',\n')) + '\n' + cpad + META_PUNCT('}');
  }

  return String(val);
}

export function formatMetadataCustom(obj) {
  if (!obj || typeof obj !== 'object') return String(obj);
  return Object.entries(obj)
    .map(([k, v]) => META_KEY(k) + META_PUNCT(': ') + formatMetaValue(v, 0))
    .join('\n');
}

// ─── Pagga font (3-row block chars) ──────────────────────────────────────────

const PAGGA = {
  ' ': ['    ', '    ', '    '],
  'A': ['░█▀█', '░█▀█', '░▀░▀'],
  'B': ['░█▀▄', '░█▀▄', '░▀▀░'],
  'C': ['░▄▀░', '░█░░', '░▀▀░'],
  'D': ['░██▄', '░█░█', '░▀▀░'],
  'E': ['░█▀▀', '░█▀▀', '░▀▀▀'],
  'F': ['░█▀▀', '░█▀░', '░▀░░'],
  'G': ['░█▀▀', '░█░█', '░▀▀▀'],
  'H': ['░█░█', '░█▀█', '░▀░▀'],
  'I': ['░▀█░', '░░█░', '░░▀░'],
  'J': ['░░░█', '░░░█', '░▀▄▀'],
  'K': ['░█▄░', '░██░', '░█▄░'],
  'L': ['░█░░', '░█░░', '░▀▀░'],
  'M': ['░█▄█', '░█░█', '░▀░▀'],
  'N': ['░██░', '░█░█', '░▀░▀'],
  'O': ['░▄▀▄', '░█░█', '░▀▀▀'],
  'P': ['░███', '░█▀░', '░▀░░'],
  'Q': ['░▄▀▄', '░█▄█', '░▀▄▀'],
  'R': ['░█▀▄', '░█▀▄', '░▀░▀'],
  'S': ['░▄█░', '░▀▄░', '░▀▀░'],
  'T': ['░▀█▀', '░░█░', '░░▀░'],
  'U': ['░█░█', '░█░█', '░▀▀▀'],
  'V': ['░█░█', '░▀▄▀', '░░▀░'],
  'W': ['░█░█', '░▄▀▄', '░▀░▀'],
  'X': ['░█░█', '░▄█▄', '░█░█'],
  'Y': ['░█▄█', '░░█░', '░░▀░'],
  'Z': ['░▀▀█', '░░█░', '░█▀▀'],
  '!': ['░░█░', '░░█░', '░░▄░'],
};

// ─── Unicode cursive (Mathematical Script) ────────────────────────────────────

const CURSIVE_MAP = {
  'a':'𝒶','b':'𝒷','c':'𝒸','d':'𝒹','e':'ℯ','f':'𝒻','g':'ℊ','h':'𝒽','i':'𝒾',
  'j':'𝒿','k':'𝓀','l':'𝓁','m':'𝓂','n':'𝓃','o':'ℴ','p':'𝓅','q':'𝓆','r':'𝓇',
  's':'𝓈','t':'𝓉','u':'𝓊','v':'𝓋','w':'𝓌','x':'𝓍','y':'𝓎','z':'𝓏',
  'A':'𝒜','B':'ℬ','C':'𝒞','D':'𝒟','E':'ℰ','F':'ℱ','G':'𝒢','H':'ℋ','I':'ℐ',
  'J':'𝒥','K':'𝒦','L':'ℒ','M':'ℳ','N':'𝒩','O':'𝒪','P':'𝒫','Q':'𝒬','R':'ℛ',
  'S':'𝒮','T':'𝒯','U':'𝒰','V':'𝒱','W':'𝒲','X':'𝒳','Y':'𝒴','Z':'𝒵',' ':' ',
};

const AESTHETIC_SYMBOLS = ['✧','⋆','✩','✮','❀','♡','✦','✰','✿','❁','⋆｡°✩','ੈ✩‧₊˚'];

function toCursive(text) {
  return text.split('').map(c => CURSIVE_MAP[c] ?? c).join('');
}

function pickAestheticSymbol() {
  return AESTHETIC_SYMBOLS[Math.floor(Math.random() * AESTHETIC_SYMBOLS.length)];
}

export function renderAnsiShadowText(text, color = 'cyan') {
  const chars = text.toUpperCase().split('');
  const rows = ['  ', '  ', '  '];
  for (const ch of chars) {
    const glyph = PAGGA[ch] ?? PAGGA[' '];
    for (let r = 0; r < 3; r++) rows[r] += glyph[r];
  }
  const paggaBlock = chalk[color](rows.join('\n'));
  const sym = pickAestheticSymbol();
  const cursiveLine = chalk[color](`${sym} ${toCursive(text.toLowerCase())} ${sym}`);
  return '\n\n' + paggaBlock + '\n' + cursiveLine;
}

// ─── Gen-Z Japan girly onomatopoeia ──────────────────────────────────────────

const GENZ_FILLER = [
  'kyaa~ ✧˖°',
  'uwuwuwu (˃ᆺ˂)',
  'omg sugoi!! ✦',
  'nyan~~ ≽^•⩊•^≼',
  'yabai yabai!!!',
  'ayo slay bestie~',
  'kira kira ★彡',
  'maji kowai... (╥_╥)',
  'SLAY QUEEN',
  'ara ara~~ uwu',
  'etto... ✧',
  'eh?!?! すごい!!',
  'noo way bestie (~>_<)~',
  'ugh so good omg ♡',
  'mouu~~ ^~^',
  'haii!! ✧.*・。゚',
  'skibidi desu ka?? ≤._.3≥',
  'yeet the context~~ (ノ◕ヮ◕)ノ*:･ﾟ✧',
  'OMG IT WORKED?? (⊙_☉)',
  'わあああ~~ so cooked rn',
];

export function randomFiller() {
  return GENZ_FILLER[Math.floor(Math.random() * GENZ_FILLER.length)];
}
