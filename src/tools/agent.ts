import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderBox, pushDurationLine } from '../render/primitives.ts';
import { simpleHighlight, formatMetadataCustom } from '../render/highlight.ts';
import type { TaskInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<TaskInput, RawToolResult>({
  matches: ['Agent', 'Task'],
  pre(input) {
    const lines: string[] = [];
    if (input.description) {
      lines.push(input.description);
    }
    return { lines };
  },

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
        lines.push(chalk.gray('  metadata'));
        lines.push(renderBox(formatMetadataCustom(metadata)));
      }
    }

    return { lines };
  },
});
