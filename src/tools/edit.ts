import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { softCollapse } from '../render/primitives.ts';
import type { EditInput, EditInputSingle, EditInputMulti, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

function renderDiff(oldStr: string | null | undefined, newStr: string | null | undefined): string {
  const removed = (oldStr ?? '').replace(/\n$/, '').split('\n');
  const added   = (newStr ?? '').replace(/\n$/, '').split('\n');
  const diffLines = [
    ...removed.map(l => chalk.red('  - ') + chalk.red(l)),
    ...added.map(l   => chalk.green('  + ') + chalk.green(l)),
  ];
  return softCollapse(diffLines.join('\n'), { maxLines: 24, label: 'diff lines' });
}

defineTool<EditInput, RawToolResult>({
  matches: ['Edit', 'MultiEdit'],
  pre(input) {
    const filePath = input.file_path;
    const lines: string[] = [];
    if (filePath) lines.push(chalk.bold.cyan(filePath));

    const multi = input as Partial<EditInputMulti>;
    const single = input as Partial<EditInputSingle>;
    const edits = multi.edits
      ?? (single.old_string !== undefined
          ? [{ old_string: single.old_string!, new_string: single.new_string ?? '' }]
          : []);

    for (const e of edits) {
      if (e.old_string == null && e.new_string == null) continue;
      lines.push(renderDiff(e.old_string, e.new_string));
    }

    if (edits.length > 1) lines.push(chalk.gray(`  ${edits.length} edits`));
    return { lines };
  },

  post(_input, result, durationMs) {
    const lines: string[] = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));
    const text = typeof result === 'string'
      ? result
      : ((result as Record<string, unknown> | null)?.text
        ?? (result as Record<string, unknown> | null)?.result
        ?? (result as Record<string, unknown> | null)?.output
        ?? null);
    if (text) lines.push(chalk.green('✓ ') + String(text).split('\n')[0]!.slice(0, 120));
    return { lines };
  },
});
