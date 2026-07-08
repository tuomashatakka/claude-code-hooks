import chalk from 'chalk';
import fs from 'node:fs';
import { defineTool } from '../registry/tool-registry.ts';
import { softCollapse, extractResultText } from '../render/primitives.ts';
import { isJSON, formatJSON, simpleHighlight, type SupportedLanguage } from '../render/highlight.ts';
import type { ReadInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

const LANG_MAP: Record<string, SupportedLanguage> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
  json: 'json',
  sh: 'bash', bash: 'bash',
};

function guessLanguage(filePath: string | null | undefined): SupportedLanguage | null {
  if (!filePath) return null;
  const m = String(filePath).match(/\.([^./]+)$/);
  return m ? (LANG_MAP[m[1]!.toLowerCase()] ?? null) : null;
}

defineTool<ReadInput, RawToolResult>({
  matches: 'Read',
  pre(input) {
    const path = input.file_path;
    return { lines: path ? [chalk.gray('  ▤ ') + String(path).trim()] : [] };
  },

  post(input, result, durationMs) {
    const lines: string[] = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    const filePath = input.file_path;
    let content: string | null = null;
    if (filePath) {
      try { content = fs.readFileSync(filePath, 'utf8'); } catch {}
    }
    if (!content) content = extractResultText(result);

    if (content) {
      const lang = guessLanguage(filePath);
      let rendered = content;
      if (isJSON(content)) {
        rendered = simpleHighlight(formatJSON(content), 'json');
      } else if (lang) {
        rendered = simpleHighlight(content, lang);
      }
      lines.push(softCollapse(rendered, { maxLines: 40, label: 'lines' }));
    }

    return { lines };
  },
});
