import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderBox } from '../render/primitives.ts';
import { renderHeading } from '../render/headings.ts';
import { formatMetadataCustom } from '../render/highlight.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<RawToolInput, RawToolResult>({
  matches: 'TaskUpdate',
  pre(input) {
    return { lines: [] };
  },

  post(input, result, durationMs) {
    const lines: string[] = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    const statusChangeTo = result && typeof result === 'object' && (result as any).statusChange?.to;
    const status = statusChangeTo || (result && typeof result === 'object' && (result as any).status) || (input && typeof input === 'object' && (input as any).status) || '';

    const normalizedStatus = String(status).toLowerCase().trim();
    if (normalizedStatus === 'completed') {
      const heading = renderHeading({
        word: 'COMPLETED',
        color: 'green',
        event: 'agent',
      });
      lines.push(...heading.split('\n'));
    } else if (normalizedStatus === 'in_progress' || normalizedStatus === 'in-progress') {
      const heading = renderHeading({
        word: 'IN PROGRESS',
        color: 'yellow',
        event: 'agent',
      });
      lines.push(...heading.split('\n'));
    } else {
      if (result && typeof result === 'object') {
        lines.push(renderBox(formatMetadataCustom(result)));
      }
    }

    return { lines };
  },
});
