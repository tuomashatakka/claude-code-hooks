import chalk from 'chalk';
import { renderBox, softCollapse } from '../primitives.mjs';
import { parseToolName } from '../theme.mjs';
import { isJSON, formatJSON, isCode, detectLanguage, simpleHighlight, formatMetadataCustom } from '../highlight.mjs';

chalk.level = 3;

// ── Input key priorities per tool ─────────────────────────────────────────────

export const PRIMARY_INPUT_KEYS = {
  Bash:                        ['command'],
  Write:                       ['file_path', 'filePath'],
  Edit:                        ['file_path', 'filePath'],
  Read:                        ['file_path', 'filePath', 'file_paths'],
  Glob:                        ['pattern'],
  Grep:                        ['pattern'],
  WebFetch:                    ['url'],
  WebSearch:                   ['query'],
  Task:                        ['description', 'prompt'],
  Agent:                       ['description', 'prompt'],
  ExitPlanMode:                ['plan'],
  TodoWrite:                   ['todos'],
  TaskCreate:                  ['description', 'prompt'],
  mcp__wcgw__BashCommand:      ['command', 'action_json'],
  mcp__wcgw__FileWriteOrEdit:  ['file_path'],
  mcp__wcgw__ReadFiles:        ['file_paths'],
};

const GENERIC_PRIMARY_KEYS = [
  'command', 'file_path', 'filePath', 'file_paths',
  'url', 'query', 'pattern', 'prompt', 'description', 'plan',
];

export function pickPrimaryInput(rawToolName, input) {
  if (!input || typeof input !== 'object') return { key: null, value: null };
  const { tool } = parseToolName(rawToolName);
  const candidates = [
    ...(PRIMARY_INPUT_KEYS[rawToolName] || []),
    ...(PRIMARY_INPUT_KEYS[tool] || []),
    ...GENERIC_PRIMARY_KEYS,
  ];
  for (const key of candidates) {
    if (input[key] != null && input[key] !== '') return { key, value: input[key] };
  }
  return { key: null, value: null };
}

// ── Output field priorities per tool ─────────────────────────────────────────

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

// ── Deconstruct tool result → { primary, metadata } ──────────────────────────

export function deconstructToolResult(toolName, result) {
  if (!result || typeof result !== 'object') {
    return { primary: result, metadata: null };
  }

  const res = JSON.parse(JSON.stringify(result));
  const { tool } = parseToolName(toolName);

  let primary = '';
  const metadata = {};

  // Array-like content blocks (LLM standard)
  const isArrayLike = Array.isArray(res) || (typeof res === 'object' && res['0']?.type);
  if (isArrayLike) {
    const blocks = Array.isArray(res) ? res : Object.values(res);
    const parts = [];
    for (const block of blocks) {
      if (block.type === 'text' && block.text) parts.push(block.text);
      else if (block.type === 'image' || block.type === 'base64') parts.push(chalk.yellow('[Image Data]'));
      else if (typeof block === 'string') parts.push(block);
      else if (block.output) parts.push(block.output);
    }
    if (parts.length) return { primary: parts.join('\n\n'), metadata: null };
  }

  // Per-tool primary field
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

  // General extraction
  const contentKeys = [
    'stdout', 'output', 'content', 'text', 'message', 'error', 'stderr',
    'file-contents-numbered', 'file_contets_numbered', 'file-contents',
    'filePath', 'type',
  ];
  const parts = primary ? [primary] : [];
  for (const key of contentKeys.filter(k => res[k] != null)) {
    let val = res[key];
    if (primary && primary.includes(String(val).slice(0, 20))) continue;
    if (typeof val === 'object' && val !== null) {
      val = val.text ?? val.output ?? val.content ?? JSON.stringify(val, null, 2);
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

  if (Object.keys(res).length > 0) Object.assign(metadata, res);
  return { primary: primary || null, metadata: Object.keys(metadata).length ? metadata : null };
}

// ── Generic strategy ──────────────────────────────────────────────────────────

const FIELD_LABELS = {
  command: 'Command', file_path: 'File', filePath: 'File',
  file_paths: 'Files', pattern: 'Pattern', query: 'Query',
  url: 'URL', description: 'Description', prompt: 'Prompt', plan: 'Plan',
};

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}

export const generic = {
  // ctx: { toolName: string }
  pre(input, ctx) {
    const rawTool = ctx?.toolName ?? 'Unknown';
    const { key: primaryKey, value: primaryValue } = pickPrimaryInput(rawTool, input);
    const lines = [];

    if (primaryValue != null) {
      const formatted = formatValue(primaryValue);
      const lang = primaryKey === 'command' ? 'bash' : detectLanguage(formatted, rawTool);
      lines.push(simpleHighlight(formatted, lang));
    }

    for (const [k, label] of Object.entries(FIELD_LABELS)) {
      if (k === primaryKey) continue;
      if (input[k] == null || input[k] === '') continue;
      lines.push(chalk.gray(`${label}: `) + formatValue(input[k]));
    }

    return { lines };
  },

  post(input, result, durationMs, ctx) {
    const rawTool = ctx?.toolName ?? 'Unknown';
    const { primary, metadata } = deconstructToolResult(rawTool, result);
    const lines = [];

    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    if (primary) {
      let formatted = primary;
      if (typeof primary === 'string') {
        if (isJSON(primary)) formatted = simpleHighlight(formatJSON(primary), 'json');
        else if (isCode(primary)) formatted = simpleHighlight(primary, detectLanguage(primary, rawTool));
      } else if (typeof primary === 'object') {
        formatted = simpleHighlight(JSON.stringify(primary, null, 2), 'json');
      }
      lines.push(renderBox(softCollapse(formatted)));
      if (metadata && Object.keys(metadata).length) {
        lines.push(chalk.gray('  metadata'));
        lines.push(renderBox(formatMetadataCustom(metadata)));
      }
    } else if (result && typeof result === 'object') {
      lines.push(renderBox(formatMetadataCustom(result)));
    }

    const isJson = !primary;
    return { lines, isJson };
  },
};
