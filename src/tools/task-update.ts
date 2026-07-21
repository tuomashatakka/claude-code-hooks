import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { pushDurationLine, renderBox } from '../render/primitives.ts';
import { renderHeading } from '@tuomashatakka/ansi-headings';
import { formatMetadataCustom } from '../render/highlight.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<RawToolInput, RawToolResult>({
  matches: 'TaskUpdate',
  pre(input) {
    return { lines: [] };
  },

  post(input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const statusChangeTo = result && typeof result === 'object' && (result as any).statusChange?.to;
    const status = statusChangeTo || (result && typeof result === 'object' && (result as any).status) || (input && typeof input === 'object' && (input as any).status) || '';

    const normalizedStatus = String(status).toLowerCase().trim();
    const task = result && typeof result === 'object' ? (result as any).task : null;
    const subject = task?.subject ?? (input as any)?.subject;

    if (normalizedStatus === 'completed') {
      const heading = renderHeading({
        word: 'COMPLETED',
        color: 'green',
        event: 'agent',
        caption: 'TASK COMPLETED',
      });
      lines.push(...heading.split('\n'));
      if (subject) {
        lines.push('');
        lines.push(renderBadges(new Badge({ label: subject, color: 'green' })));
      }
    } else if (normalizedStatus === 'in_progress' || normalizedStatus === 'in-progress') {
      const heading = renderHeading({
        word: 'IN PROGRESS',
        color: 'yellow',
        event: 'agent',
        caption: 'TASK STARTED',
      });
      lines.push(...heading.split('\n'));
      if (subject) {
        lines.push('');
        lines.push(renderBadges(new Badge({ label: subject, color: 'yellow' })));
      }
    } else {
      if (result && typeof result === 'object') {
        lines.push(renderBox(formatMetadataCustom(result)));
      }
    }

    return { lines };
  },
});
