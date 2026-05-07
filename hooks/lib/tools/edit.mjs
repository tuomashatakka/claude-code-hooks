import chalk from 'chalk';
import { softCollapse } from '../primitives.mjs';

chalk.level = 3;

function renderDiff(oldStr, newStr) {
  const removed = (oldStr ?? '').replace(/\n$/, '').split('\n');
  const added   = (newStr ?? '').replace(/\n$/, '').split('\n');
  const diffLines = [
    ...removed.map(l => chalk.red('  - ') + chalk.red(l)),
    ...added.map(l   => chalk.green('  + ') + chalk.green(l)),
  ];
  return softCollapse(diffLines.join('\n'), { maxLines: 24, label: 'diff lines' });
}

export const edit = {
  pre(input, ctx) {
    const filePath = input.file_path ?? input.filePath ?? null;
    const lines = [];
    if (filePath) lines.push(chalk.bold.cyan(filePath));

    // MultiEdit uses `edits` array; single Edit uses `old_string`/`new_string`
    const edits = input.edits
      ?? (input.old_string !== undefined
          ? [{ old_string: input.old_string, new_string: input.new_string }]
          : []);

    for (const e of edits) {
      if (e.old_string == null && e.new_string == null) continue;
      lines.push(renderDiff(e.old_string, e.new_string));
    }

    if (edits.length > 1) lines.push(chalk.gray(`  ${edits.length} edits`));
    return { lines };
  },

  post(input, result, durationMs, ctx) {
    const lines = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));
    const text = typeof result === 'string'
      ? result
      : (result?.text ?? result?.result ?? result?.output ?? null);
    if (text) lines.push(chalk.green('✓ ') + String(text).split('\n')[0].slice(0, 120));
    return { lines };
  },
};
