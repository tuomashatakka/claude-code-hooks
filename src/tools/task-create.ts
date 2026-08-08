import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { pushDurationLine } from '../render/primitives.ts';
import { renderTask, taskFromResult } from './task-shared.ts';
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

    const task = taskFromResult(input, result, 'pending');
    if (task) lines.push(...renderTask(task, 'ADDED TASK'));

    return { lines };
  },
});
