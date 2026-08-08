import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { pushDurationLine, renderCard } from '../render/primitives.ts';
import { formatMetadataCustom } from '../render/highlight.ts';
import { META_BADGE } from '../render/badge.ts';
import { renderTask, tasksFromResult } from './task-shared.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<RawToolInput, RawToolResult>({
  matches: 'TaskList',
  pre() {
    return { lines: [] };
  },

  post(_input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);
    const tasks = tasksFromResult(result);
    for (const [index, task] of tasks.entries()) {
      if (index > 0) lines.push('');
      lines.push(...renderTask(task));
    }
    if (!tasks.length && result && typeof result === 'object') {
      lines.push(renderCard(META_BADGE, formatMetadataCustom(result)));
    }
    return { lines, isJson: !tasks.length };
  },
});
