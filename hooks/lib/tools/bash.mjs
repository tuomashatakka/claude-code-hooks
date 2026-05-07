import chalk from 'chalk';
import { renderBox, softCollapse, extractResultText } from '../primitives.mjs';
import { simpleHighlight } from '../highlight.mjs';
import { parseWcgwTrailer, shortenPath } from '../parsers/wcgw-trailer.mjs';

chalk.level = 3;

export const bash = {
  pre(input, ctx) {
    const lines = [];
    const cmd = input.command ?? input.action_json ?? null;
    if (cmd) lines.push(simpleHighlight(String(cmd), 'bash'));

    const meta = [];
    if (input.wait_for_seconds != null) meta.push(chalk.gray(`wait: ${input.wait_for_seconds}s`));
    if (input.timeout != null)          meta.push(chalk.gray(`timeout: ${input.timeout}s`));
    if (input.chats_id != null)         meta.push(chalk.gray(`chat: ${input.chats_id}`));
    if (meta.length) lines.push(meta.join('  '));

    return { lines };
  },

  post(input, result, durationMs, ctx) {
    const raw = extractResultText(result) ?? '';
    const lines = [];

    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    const { stdout, status, cwd, extra } = parseWcgwTrailer(raw);

    if (stdout.trim()) lines.push(renderBox(softCollapse(stdout)));

    const trailerParts = [];
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
};
