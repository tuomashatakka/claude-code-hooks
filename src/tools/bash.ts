import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderBox, softCollapse, extractResultText, renderRuler } from '../render/primitives.ts';
import { simpleHighlight, formatJSON, detectOutputLanguage } from '../render/highlight.ts';
import { parseWcgwTrailer, shortenPath } from '../parsers/wcgw-trailer.ts';
import type { BashInput, WcgwBashCommandInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

type AnyBashInput = BashInput | WcgwBashCommandInput;

interface CommandRow {
  sep: string;
  text: string;
}

/** Splits a command on top-level `;` and `&&`, ignoring separators inside quotes. */
function splitCommandRows(cmd: string): CommandRow[] {
  const rows: CommandRow[] = [];
  let current = '';
  let sep = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]!;

    if (quote) {
      current += ch;
      if (quote === '"' && ch === '\\' && i + 1 < cmd.length) current += cmd[++i];
      else if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === ';') {
      rows.push({ sep, text: current.trim() });
      current = '';
      sep = '; ';
      continue;
    }

    if (ch === '&' && cmd[i + 1] === '&') {
      rows.push({ sep, text: current.trim() });
      current = '';
      sep = '&& ';
      i++;
      continue;
    }

    current += ch;
  }
  rows.push({ sep, text: current.trim() });

  return rows.filter(r => r.text.length > 0);
}

defineTool<AnyBashInput, RawToolResult>({
  matches: ['Bash', 'mcp__wcgw__BashCommand'],
  pre(input): import('../registry/tool-registry.ts').RenderedSection {
    const lines: string[] = [];
    const cmd = (input as Partial<BashInput & WcgwBashCommandInput>).command
      ?? (input as Partial<WcgwBashCommandInput>).action_json
      ?? null;
    if (cmd) {
      for (const { sep, text } of splitCommandRows(String(cmd))) {
        lines.push((sep ? chalk.gray(sep) : '') + simpleHighlight(text, 'bash'));
      }
    }

    const meta: string[] = [];
    const w = (input as WcgwBashCommandInput).wait_for_seconds;
    const t = (input as Partial<{ timeout: number }>).timeout;
    const c = (input as WcgwBashCommandInput).chats_id;
    if (w != null) meta.push(chalk.gray(`wait: ${w}s`));
    if (t != null) meta.push(chalk.gray(`timeout: ${t}s`));
    if (c != null) meta.push(chalk.gray(`chat: ${c}`));
    if (meta.length) lines.push(meta.join('  '));

    return { lines };
  },

  post(_input, result, durationMs): import('../registry/tool-registry.ts').RenderedSection {
    const raw = extractResultText(result) ?? '';
    const lines: string[] = [];

    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    const cmd = (_input as Partial<BashInput & WcgwBashCommandInput>).command
      ?? (_input as Partial<WcgwBashCommandInput>).action_json
      ?? null;
    if (cmd) {
      splitCommandRows(String(cmd).trim()).forEach(({ sep, text }, i) => {
        const marker = i === 0 ? chalk.gray('$ ') : chalk.gray('  ' + sep);
        lines.push(marker + simpleHighlight(text, 'bash'));
      });
    }

    const { stdout, status, cwd, extra } = parseWcgwTrailer(raw);

    if (stdout.trim()) {
      const lang = detectOutputLanguage(stdout);
      const highlighted = simpleHighlight(lang === 'json' ? formatJSON(stdout) : stdout, lang);

      // Ruler lines (`---`, `===== info =====`) become styled dividers with
      // the label centered — but not inside diffs, where `--- a/file` is a header.
      const processedStdout = lang === 'diff'
        ? highlighted
        : highlighted.split('\n').map(line => renderRuler(line) ?? line).join('\n');

      lines.push(renderBox(softCollapse(processedStdout)));
    }

    const trailerParts: string[] = [];
    if (status !== null) {
      trailerParts.push(status === '0' ? chalk.green(`exit:${status}`) : chalk.red(`exit:${status}`));
    }
    if (cwd) trailerParts.push(chalk.gray('cwd:') + chalk.cyan(shortenPath(cwd)));
    for (const [k, v] of Object.entries(extra)) {
      trailerParts.push(chalk.gray(`${k}:`) + v);
    }
    if (trailerParts.length) lines.push('  ' + trailerParts.join('  '));

    return { lines };
  },
});
