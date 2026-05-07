import chalk from 'chalk';
import { softCollapse } from '../primitives.mjs';

chalk.level = 3;

export const wcgwRead = {
  pre(input, ctx) {
    const paths = input.file_paths ?? input.filePaths ?? [];
    const list  = Array.isArray(paths) ? paths : [paths];
    const lines = list.map(p => chalk.gray('  ▤ ') + p);
    return { lines };
  },

  post(input, result, durationMs, ctx) {
    const lines = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    const res = result;
    if (!res || typeof res !== 'object') {
      if (res) lines.push(String(res));
      return { lines };
    }

    const fileContents =
      res['file-contents-numbered'] ??
      res.file_contets_numbered ??
      res['file-contents'] ??
      res.output;

    if (fileContents && typeof fileContents === 'object') {
      for (const [filePath, content] of Object.entries(fileContents)) {
        if (typeof content !== 'string') continue;
        lines.push(chalk.cyan('  ├ ') + chalk.bold(filePath));
        lines.push(softCollapse(
          content.split('\n').map(l => chalk.gray('  │ ') + l).join('\n'),
          { maxLines: 15, label: 'lines' }
        ));
      }
    } else if (typeof fileContents === 'string' && fileContents.length) {
      lines.push(softCollapse(fileContents, { maxLines: 20, label: 'lines' }));
    }

    if (res.file_paths) {
      for (const p of res.file_paths) lines.push(chalk.gray('  ├ ') + p);
    }

    return { lines };
  },
};
