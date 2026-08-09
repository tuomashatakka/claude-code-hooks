import chalk from 'chalk';
import { defineGenericTool, type RenderedSection } from '../registry/tool-registry.ts';
import { softCollapse } from '../render/primitives.ts';
import {
  META_BADGE,
  OUTPUT_BADGE,
  pushDurationLine,
  renderCard,
} from '../tui/index.ts';
import { parseToolName } from '../tui/index.ts';
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


defineGenericTool<RawToolInput, RawToolResult>({
  post(_input, result, durationMs, ctx): RenderedSection {
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
      lines.push(renderCard({ badges: OUTPUT_BADGE, content: softCollapse(formatted) }));
      if (metadata && Object.keys(metadata).length) {
        lines.push(renderCard({ badges: META_BADGE, content: formatMetadataCustom(metadata) }));
      }
    } else if (result && typeof result === 'object') {
      lines.push(renderCard({ badges: META_BADGE, content: formatMetadataCustom(result) }));
    }

    const operation = playwrightOperation(rawTool);
    return {
      lines,
      isJson: !primary,
      extraBadges: operationBadges(operation ? [operation] : []),
    };
  },
});
