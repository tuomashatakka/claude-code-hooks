import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { firstLine, pickResultText, pushDurationLine, renderMetaTag } from '../render/primitives.ts';
import { renderFileResult, type LineRange } from '../render/file-preview.ts';
import { Badge } from '../render/badge.ts';
import type { EditInput, EditInputSingle, EditInputMulti, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

// Lines of untouched file kept on either side of the edited region.
const CONTEXT_LINES = 3;

function countLines(s: string | null | undefined): number {
  if (!s) return 0;
  return s.replace(/\n$/, '').split('\n').length;
}

// Edit's response carries a jsdiff structuredPatch. Collapsing its hunks to one
// span lets the post-write file render focus on what changed — dumping a whole
// 2k-line file after a three-line edit just hits the harness's display cap.
function editedSpan(result: RawToolResult): LineRange | null {
  const hunks = (result as { structuredPatch?: unknown })?.structuredPatch;
  if (!Array.isArray(hunks) || !hunks.length) return null;

  let start = Infinity;
  let end = 0;
  for (const hunk of hunks as Array<{ newStart?: number; newLines?: number }>) {
    const at = Number(hunk?.newStart);
    if (!Number.isFinite(at)) continue;
    const span = Number.isFinite(Number(hunk?.newLines)) ? Number(hunk!.newLines) : 1;
    start = Math.min(start, at);
    end   = Math.max(end, at + Math.max(span, 1) - 1);
  }

  if (!Number.isFinite(start) || end < start) return null;
  return { start: Math.max(1, start - CONTEXT_LINES), end: end + CONTEXT_LINES };
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

  post(input, result, durationMs, ctx) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const filePath = input.file_path ?? (result as { filePath?: string })?.filePath;
    const box = filePath
      ? renderFileResult(filePath, {
          action: ctx.toolName === 'MultiEdit' ? 'multi-edit' : 'edit',
          range: editedSpan(result),
        })
      : null;

    if (box) lines.push(box);
    else {
      const text = pickResultText(result);
      if (text) lines.push(chalk.green('✓ ') + firstLine(text, 120));
    }

    return { lines };
  },
});
