import chalk from 'chalk';
import fs from 'fs';
import { softCollapse, extractResultText } from '../primitives.mjs';
import { isJSON, formatJSON, simpleHighlight } from '../highlight.mjs';

chalk.level = 3;

const LANG_MAP = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
  json: 'json',
  sh: 'bash', bash: 'bash',
};

function guessLanguage(filePath) {
  if (!filePath) return null;
  const m = String(filePath).match(/\.([^./]+)$/);
  return m ? (LANG_MAP[m[1].toLowerCase()] ?? null) : null;
}

// Detect truncation markers Claude Code appends when file content is too long.
function isTruncated(content) {
  return /\[(?:File\s+)?[Tt]runcated/.test(content)
    || /\.\.\.\s*\(\d+\s+more\s+lines?\)/.test(content)
    || /\.\.\.\s*\+\d+\s+more\s+lines?/.test(content);
}

export const read = {
  pre(input, ctx) {
    const paths = input.file_paths ?? (input.file_path ? [input.file_path] : []);
    const list  = Array.isArray(paths) ? paths : String(paths).split(',');
    const lines = list.map(p => chalk.gray('  ▤ ') + String(p).trim());
    return { lines };
  },

  post(input, result, durationMs, ctx) {
    const lines = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    const filePath = input.file_path ?? input.filePath
      ?? (Array.isArray(input.file_paths) ? input.file_paths[0] : null);

    let content = extractResultText(result);

    // If the tool returned truncated content, read the full file from disk.
    if (content && isTruncated(content) && filePath) {
      try {
        const fromDisk = fs.readFileSync(filePath, 'utf8');
        if (fromDisk) content = fromDisk;
      } catch {}
    }

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
};
