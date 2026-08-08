import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { META_BADGE, OUTPUT_BADGE } from '../render/badge.ts';
import {
  extractResultText,
  pushDurationLine,
  renderCard,
  softCollapse,
} from '../render/primitives.ts';
import {
  detectOutputLanguage,
  formatJSON,
  formatMetadataCustom,
  simpleHighlight,
} from '../render/highlight.ts';
import { operationBadges, playwrightOperation } from './browser-operations.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

const PRIMARY_KEYS = [
  'url', 'element', 'ref', 'selector', 'text', 'key', 'code',
  'function', 'filename', 'path',
];

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

defineTool<RawToolInput, RawToolResult>({
  matches: rawName => /^mcp__playwright__browser_/i.test(rawName),

  pre(input, ctx) {
    const operation = playwrightOperation(ctx.toolName);
    const lines: string[] = [];
    const primaryKey = PRIMARY_KEYS.find(key => input[key] != null);
    if (primaryKey) lines.push(formatValue(input[primaryKey]));
    for (const [key, value] of Object.entries(input)) {
      if (key === primaryKey || value == null || value === '') continue;
      lines.push(chalk.gray(`${key}: `) + formatValue(value));
    }
    return { lines, extraBadges: operationBadges(operation ? [operation] : []) };
  },

  post(_input, result, durationMs, ctx) {
    const operation = playwrightOperation(ctx.toolName);
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const text = extractResultText(result);
    if (text?.trim()) {
      const language = detectOutputLanguage(text);
      const formatted = language === 'json' ? formatJSON(text) : text;
      lines.push(renderCard(OUTPUT_BADGE, softCollapse(simpleHighlight(formatted, language))));
    } else if (result && typeof result === 'object') {
      lines.push(renderCard(META_BADGE, formatMetadataCustom(result)));
    }

    return {
      lines,
      isJson: !text?.trim(),
      extraBadges: operationBadges(operation ? [operation] : []),
    };
  },
});
