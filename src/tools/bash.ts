import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderBox, softCollapse, extractResultText, stripAnsi } from '../render/primitives.ts';
import { simpleHighlight, isJSON, formatJSON } from '../render/highlight.ts';
import { parseWcgwTrailer, shortenPath } from '../parsers/wcgw-trailer.ts';
import type { BashInput, WcgwBashCommandInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

type AnyBashInput = BashInput | WcgwBashCommandInput;

defineTool<AnyBashInput, RawToolResult>({
  matches: ['Bash', 'mcp__wcgw__BashCommand'],
  pre(input): import('../registry/tool-registry.ts').RenderedSection {
    const lines: string[] = [];
    const cmd = (input as Partial<BashInput & WcgwBashCommandInput>).command
      ?? (input as Partial<WcgwBashCommandInput>).action_json
      ?? null;
    if (cmd) lines.push(simpleHighlight(String(cmd), 'bash'));

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
      lines.push(chalk.gray('$ ') + simpleHighlight(String(cmd).trim(), 'bash'));
    }

    const { stdout, status, cwd, extra } = parseWcgwTrailer(raw);

    if (stdout.trim()) {
      const highlighted = isJSON(stdout)
        ? simpleHighlight(formatJSON(stdout), 'json')
        : simpleHighlight(stdout, 'bash');

      const processedStdout = highlighted.split('\n').map(line => {
        const plain = stripAnsi(line).trim();
        if (plain.startsWith('---') || plain.startsWith('===')) {
          return chalk.gray('─'.repeat(60));
        }
        return line;
      }).join('\n');

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
