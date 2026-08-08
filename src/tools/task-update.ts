import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { pushDurationLine, renderCard } from '../render/primitives.ts';
import { formatMetadataCustom } from '../render/highlight.ts';
import { META_BADGE } from '../render/badge.ts';
import { normalizeStatus, renderTask, taskFromResult } from './task-shared.ts';
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

    const normalizedStatus = normalizeStatus(status, 'updated');
    const task = taskFromResult(input, result, normalizedStatus);
    if (task) lines.push(...renderTask({ ...task, status: normalizedStatus }));
    else if (result && typeof result === 'object') {
      lines.push(renderCard(META_BADGE, formatMetadataCustom(result)));
    }

    return { lines };
  },
});
