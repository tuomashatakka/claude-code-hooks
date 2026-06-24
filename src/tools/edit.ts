import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderMetaTag } from '../render/primitives.ts';
import { Badge } from '../render/badge.ts';
import type { EditInput, EditInputSingle, EditInputMulti, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

function countLines(s: string | null | undefined): number {
  if (!s) return 0;
  return s.replace(/\n$/, '').split('\n').length;
}

defineTool<EditInput, RawToolResult>({
  matches: ['Edit', 'MultiEdit'],
  pre(input) {
    const filePath = input.file_path;
    const lines: string[] = [];

    const multi = input as Partial<EditInputMulti>;
    const single = input as Partial<EditInputSingle>;
    const edits = multi.edits
      ?? (single.old_string !== undefined
          ? [{ old_string: single.old_string!, new_string: single.new_string ?? '' }]
          : []);

    let removed = 0;
    let added = 0;
    for (const e of edits) {
      removed += countLines(e.old_string);
      added += countLines(e.new_string);
    }

    if (filePath) lines.push(renderMetaTag('file', filePath));

    const removedBadge = new Badge({ label: `- ${removed}`, color: 'red' }).toString();
    const addedBadge   = new Badge({ label: `+ ${added}`, color: 'green' }).toString();
    lines.push(removedBadge + addedBadge);

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
