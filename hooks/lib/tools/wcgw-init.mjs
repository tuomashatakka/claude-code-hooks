import chalk from 'chalk';
import { shortenPath } from '../parsers/wcgw-trailer.mjs';

chalk.level = 3;

export const wcgwInit = {
  pre(input, ctx) {
    const lines = [];
    if (input.type)               lines.push(chalk.gray('type: ') + input.type);
    if (input.any_workspace_path) lines.push(chalk.gray('workspace: ') + shortenPath(input.any_workspace_path));
    if (input.mode_name)          lines.push(chalk.gray('mode: ') + input.mode_name);
    return { lines };
  },

  post(input, result, durationMs, ctx) {
    const lines = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));
    const text = typeof result === 'string'
      ? result
      : (result?.text ?? result?.output ?? null);
    if (text) {
      const summary = String(text).split('\n').slice(0, 3).join('\n');
      lines.push(chalk.green('⏻ ') + summary);
    }
    return { lines };
  },
};
