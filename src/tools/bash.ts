import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderCard, softCollapse, extractResultText, renderRuler, pushDurationLine } from '../render/primitives.ts';
import { RUNNING_BADGE, OUTPUT_BADGE } from '../render/badge.ts';
import { simpleHighlight, formatJSON, detectOutputLanguage } from '../render/highlight.ts';
import { parseWcgwTrailer, shortenPath } from '../parsers/wcgw-trailer.ts';
import type { BashInput, WcgwBashCommandInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

type AnyBashInput = BashInput | WcgwBashCommandInput;

interface CommandRow {
  text: string;
  /** The separator that *terminates* this row, rendered at the end of it. */
  sep: string;
}

/**
 * Splits a command on top-level `;`, `&&` and `||`, ignoring separators inside
 * quotes and heredoc bodies.
 *
 * The separator trails its own row rather than leading the next one, so a
 * chain reads the way it would in a script — `cd $D &&` at the end of a line,
 * the next command starting at the row start:
 *
 *     $ mkdir -p $D &&
 *     cd $D &&
 *     cat reg.ts
 *
 * Heredoc bodies are passed through verbatim. Their content is not shell —
 * splitting a `<<'EOF'` payload on `;` shredded embedded JS/TS across rows and
 * put a stray separator in front of every statement.
 */
function splitCommandRows(cmd: string): CommandRow[] {
  const rows: CommandRow[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let heredoc: string | null = null;

  const push = (sep: string) => {
    rows.push({ text: current.replace(/^\s+|\s+$/g, ''), sep });
    current = '';
  };

  const lines = cmd.split('\n');
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;

    // Inside a heredoc everything is literal until the terminator line.
    if (heredoc !== null) {
      current += (current ? '\n' : '') + line;
      if (line.trim() === heredoc) heredoc = null;
      continue;
    }

    if (li > 0) current += '\n';

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;

      if (quote) {
        current += ch;
        if (quote === '"' && ch === '\\' && i + 1 < line.length) current += line[++i]!;
        else if (ch === quote) quote = null;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        current += ch;
        continue;
      }

      // `<<EOF`, `<<'EOF'`, `<<-"EOF"` — everything up to the terminator is data.
      const here = line.slice(i).match(/^<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/);
      if (here) {
        current += here[0];
        i += here[0].length - 1;
        heredoc = here[2]!;
        continue;
      }

      if (ch === ';') { push(';'); continue; }
      if ((ch === '&' || ch === '|') && line[i + 1] === ch) { push(ch + ch); i++; continue; }

      current += ch;
    }
  }
  push('');

  return rows.filter(r => r.text.length > 0);
}


function commandOf(input: AnyBashInput): string | null {
  const raw = (input as Partial<BashInput & WcgwBashCommandInput>).command
    ?? (input as Partial<WcgwBashCommandInput>).action_json;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/** `$ ` on the first row, separators trailing, every later row flush left. */
function renderCommand(cmd: string): string {
  return splitCommandRows(cmd)
    .map(({ text, sep }, i) => {
      const body = simpleHighlight(text, 'bash') + (sep ? ' ' + chalk.gray(sep) : '');
      return i === 0 ? chalk.gray('$ ') + body : body;
    })
    .join('\n');
}

defineTool<AnyBashInput, RawToolResult>({
  matches: ['Bash', 'mcp__wcgw__BashCommand'],
  pre(input): import('../registry/tool-registry.ts').RenderedSection {
    const lines: string[] = [];
    const cmd = commandOf(input);
    if (cmd) lines.push(renderCard(RUNNING_BADGE, renderCommand(cmd)));

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

    pushDurationLine(lines, durationMs);

    // Input and output get their own labelled cards: what was run and what came
    // back are different things, and running them together made a long command
    // and a long result read as one undifferentiated block.
    const cmd = commandOf(_input);
    if (cmd) lines.push(renderCard(RUNNING_BADGE, renderCommand(cmd)));

    const { stdout, status, cwd, extra } = parseWcgwTrailer(raw);

    if (stdout.trim()) {
      const lang = detectOutputLanguage(stdout);
      const highlighted = simpleHighlight(lang === 'json' ? formatJSON(stdout) : stdout, lang);

      // Ruler lines (`---`, `===== info =====`) become styled dividers with
      // the label centered — but not inside diffs, where `--- a/file` is a header.
      const processedStdout = lang === 'diff'
        ? highlighted
        : highlighted.split('\n').map(line => renderRuler(line) ?? line).join('\n');

      lines.push(renderCard(OUTPUT_BADGE, softCollapse(processedStdout)));
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
