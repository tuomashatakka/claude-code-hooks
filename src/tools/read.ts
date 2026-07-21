import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { extractResultText, pushDurationLine } from '../render/primitives.ts';
import { collapsePreview, renderFilePreview, renderTextPreview } from '../render/file-preview.ts';
import type { ReadInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<ReadInput, RawToolResult>({
  matches: 'Read',
  pre(input) {
    const path = input.file_path;
    return { lines: path ? [chalk.gray('  ▤ ') + String(path).trim()] : [] };
  },

  post(input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const filePath = input.file_path;
    const filePreview = filePath ? renderFilePreview(filePath) : null;
    const fallbackText = filePreview ? null : extractResultText(result);
    const rendered = filePreview?.content
      ?? (fallbackText ? renderTextPreview(fallbackText, filePath) : null);

    if (rendered) {
      lines.push(collapsePreview(rendered));
    }

    return { lines };
  },
});
