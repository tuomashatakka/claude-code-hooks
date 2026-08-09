import { defineTool } from '../registry/tool-registry.ts';
import { META_BADGE, pushDurationLine, renderCard } from '../tui/index.ts';
import { simpleHighlight, formatMetadataCustom } from '../render/highlight.ts';
import type { TaskInput, RawToolResult } from '../types/tool-io.ts';

defineTool<TaskInput, RawToolResult>({
  matches: ['Agent', 'Task'],
  post(input, result, durationMs) {
    const lines: string[] = [];

    pushDurationLine(lines, durationMs);

    // Get the prompt. Prefer input.prompt (full prompt) over truncated result.prompt.
    const prompt = input.prompt || (result && typeof result === 'object' && (result as any).prompt) || '';

    if (prompt) {
      lines.push(simpleHighlight(prompt, 'markdown'));
    }

    if (result && typeof result === 'object') {
      const metadata = { ...result as Record<string, unknown> };
      delete metadata.prompt;
      delete metadata.description;

      if (Object.keys(metadata).length > 0) {
        lines.push(renderCard({ badges: META_BADGE, content: formatMetadataCustom(metadata) }));
      }
    }

    return { lines };
  },
});
