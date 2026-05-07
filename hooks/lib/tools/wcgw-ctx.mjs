import chalk from 'chalk';
import { shortenPath } from '../parsers/wcgw-trailer.mjs';

chalk.level = 3;

export const wcgwCtx = {
  pre(input, ctx) {
    const lines = [];
    if (input.id)                lines.push(chalk.gray('id: ') + input.id);
    if (input.project_root_path) lines.push(chalk.gray('root: ') + shortenPath(input.project_root_path));
    if (input.description) {
      lines.push(chalk.gray('desc: ') + String(input.description).split('\n')[0].slice(0, 120));
    }
    if (input.relevant_file_globs) {
      const globs   = Array.isArray(input.relevant_file_globs)
        ? input.relevant_file_globs
        : [input.relevant_file_globs];
      const preview = globs.slice(0, 3).join(', ');
      const suffix  = globs.length > 3 ? chalk.gray(` +${globs.length - 3} more`) : '';
      lines.push(chalk.gray('globs: ') + preview + suffix);
    }
    return { lines };
  },

  post(input, result, durationMs, ctx) {
    const lines = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));
    const text = typeof result === 'string'
      ? result
      : (result?.text ?? result?.result ?? null);
    if (text) lines.push(chalk.green('⧺ ') + String(text).split('\n')[0]);
    return { lines };
  },
};
