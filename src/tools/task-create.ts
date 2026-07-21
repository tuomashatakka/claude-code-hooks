import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderCheckboxHeading } from '../render/headings.ts';
import { pushDurationLine } from '../render/primitives.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<RawToolInput, RawToolResult>({
  matches: 'TaskCreate',
  pre() {
    return { lines: [] };
  },

  post(input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    lines.push(...renderCheckboxHeading('ADDED TASK').split('\n'));

    const task = result && typeof result === 'object' ? (result as any).task : null;
    const subject = task?.subject ?? (input as any)?.subject;
    if (subject) {
      lines.push('');
      lines.push(renderBadges(new Badge({ label: subject, color: 'green', icon: '✓' })));
    }

    return { lines };
  },
});
