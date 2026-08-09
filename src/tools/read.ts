import { defineTool } from '../registry/tool-registry.ts';
import { extractResultText } from '../render/primitives.ts';
import { pushDurationLine } from '../tui/index.ts';
import { renderFileResult, renderTextPreview } from '../render/file-preview.ts';
import type { ReadInput, RawToolResult } from '../types/tool-io.ts';

defineTool<ReadInput, RawToolResult>({
  matches: 'Read',
  post(input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const filePath = input.file_path;
    const fallbackText = extractResultText(result);
    const rendered = filePath
      ? renderFileResult(filePath, { action: 'read', fallbackText })
      : (fallbackText ? renderTextPreview(fallbackText) : null);

    if (rendered) lines.push(rendered);

    return { lines };
  },
});
