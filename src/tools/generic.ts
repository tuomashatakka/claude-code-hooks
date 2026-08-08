import chalk from 'chalk';
import { META_BADGE, OUTPUT_BADGE } from '../render/badge.ts';
import { defineGenericTool, type RenderedSection, type ToolContext } from '../registry/tool-registry.ts';
import { renderCard, softCollapse, pushDurationLine } from '../render/primitives.ts';
import { parseToolName } from '../render/theme.ts';
import {
  isJSON,
  formatJSON,
  isCode,
  detectLanguage,
  simpleHighlight,
  formatMetadataCustom,
} from '../render/highlight.ts';
import { operationBadges, playwrightOperation } from './browser-operations.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

const PRIMARY_INPUT_KEYS: Record<string, string[]> = {
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
  mcp__wcgw__BashCommand:      ['command', 'action_json'],
  mcp__wcgw__FileWriteOrEdit:  ['file_path'],
  mcp__wcgw__ReadFiles:        ['file_paths'],
};

const GENERIC_PRIMARY_KEYS = [
  'command', 'file_path', 'filePath', 'file_paths',
  'url', 'query', 'pattern', 'prompt', 'description', 'plan',
];

interface PrimaryPick {
  key: string | null;
  value: unknown;
}

function pickPrimaryInput(rawToolName: string, input: RawToolInput): PrimaryPick {
  if (!input || typeof input !== 'object') return { key: null, value: null };
  const { tool } = parseToolName(rawToolName);
  const candidates = [
    ...(PRIMARY_INPUT_KEYS[rawToolName] ?? []),
    ...(PRIMARY_INPUT_KEYS[tool] ?? []),
    ...GENERIC_PRIMARY_KEYS,
  ];
  for (const key of candidates) {
    const v = input[key];
    if (v != null && v !== '') return { key, value: v };
  }
  return { key: null, value: null };
}

const TOOL_PRIMARY_OUTPUT_KEYS: Record<string, string[]> = {
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

interface Deconstructed {
  primary: string | null;
  metadata: Record<string, unknown> | null;
}

function deconstructToolResult(toolName: string, result: RawToolResult): Deconstructed {
  if (!result || typeof result !== 'object') {
    return { primary: typeof result === 'string' ? result : null, metadata: null };
  }
  const res = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
  const { tool } = parseToolName(toolName);

  let primary = '';

  // Array-like content blocks (LLM standard)
  const isArrayLike = Array.isArray(res) || (typeof res === 'object' && (res as any)['0']?.type);
  if (isArrayLike) {
    const blocks = Array.isArray(res) ? res : Object.values(res);
    const parts: string[] = [];
    for (const block of blocks) {
      const b = block as { type?: string; text?: string; output?: string };
      if (b.type === 'text' && b.text) parts.push(b.text);
      else if (b.type === 'image' || b.type === 'base64') parts.push(chalk.yellow('[Image Data]'));
      else if (typeof block === 'string') parts.push(block);
      else if (b.output) parts.push(b.output);
    }
    if (parts.length) return { primary: parts.join('\n\n'), metadata: null };
  }

  const toolKeys = TOOL_PRIMARY_OUTPUT_KEYS[tool] ?? [];
  for (const key of toolKeys) {
    const v = res[key];
    if (v != null) {
      primary = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
      delete res[key];
      break;
    }
  }

  const contentKeys = [
    'stdout', 'output', 'content', 'text', 'message', 'error', 'stderr',
    'file-contents-numbered', 'file_contets_numbered', 'file-contents',
    'filePath', 'type',
  ];
  const parts: string[] = primary ? [primary] : [];
  for (const key of contentKeys.filter(k => res[k] != null)) {
    let val: unknown = res[key];
    if (primary && typeof val !== 'undefined' && primary.includes(String(val).slice(0, 20))) continue;
    if (typeof val === 'object' && val !== null) {
      const o = val as Record<string, unknown>;
      val = o.text ?? o.output ?? o.content ?? JSON.stringify(o, null, 2);
    }
    if (key === 'stderr' || key === 'error') {
      parts.push(chalk.red(`⨂ ${key.toUpperCase()}:`) + '\n' + val);
    } else if (key === 'filePath') {
      parts.push(chalk.cyan('󰈚 ') + chalk.bold('Path: ') + val);
    } else if (key === 'type') {
      parts.push(chalk.cyan('⧖ ') + chalk.bold('Action: ') + val);
    } else {
      parts.push(String(val));
    }
    delete res[key];
  }
  primary = parts.join('\n\n');

  const metadata = Object.keys(res).length ? res : null;
  return { primary: primary || null, metadata };
}

const FIELD_LABELS: Record<string, string> = {
  command: 'Command', file_path: 'File', filePath: 'File',
  file_paths: 'Files', pattern: 'Pattern', query: 'Query',
  url: 'URL', description: 'Description', prompt: 'Prompt', plan: 'Plan',
};

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}

defineGenericTool<RawToolInput, RawToolResult>({
  pre(input, ctx: ToolContext): RenderedSection {
    const rawTool = ctx.toolName;
    const { key: primaryKey, value: primaryValue } = pickPrimaryInput(rawTool, input);
    const lines: string[] = [];

    if (primaryValue != null) {
      const formatted = formatValue(primaryValue);
      const lang = primaryKey === 'command' ? 'bash' : detectLanguage(formatted, rawTool);
      lines.push(simpleHighlight(formatted, lang));
    }

    for (const [k, label] of Object.entries(FIELD_LABELS)) {
      if (k === primaryKey) continue;
      const v = input[k];
      if (v == null || v === '') continue;
      lines.push(chalk.gray(`${label}: `) + formatValue(v));
    }

    const operation = playwrightOperation(rawTool);
    return { lines, extraBadges: operationBadges(operation ? [operation] : []) };
  },

  post(input, result, durationMs, ctx): RenderedSection {
    const rawTool = ctx.toolName;
    const { primary, metadata } = deconstructToolResult(rawTool, result);
    const lines: string[] = [];

    pushDurationLine(lines, durationMs);

    if (primary) {
      let formatted: string = primary;
      if (typeof primary === 'string') {
        if (isJSON(primary)) formatted = simpleHighlight(formatJSON(primary), 'json');
        else if (isCode(primary)) formatted = simpleHighlight(primary, detectLanguage(primary, rawTool));
      }
      lines.push(renderCard(OUTPUT_BADGE, softCollapse(formatted)));
      if (metadata && Object.keys(metadata).length) {
        lines.push(renderCard(META_BADGE, formatMetadataCustom(metadata)));
      }
    } else if (result && typeof result === 'object') {
      lines.push(renderCard(META_BADGE, formatMetadataCustom(result)));
    }

    const operation = playwrightOperation(rawTool);
    return {
      lines,
      isJson: !primary,
      extraBadges: operationBadges(operation ? [operation] : []),
    };
  },
});
