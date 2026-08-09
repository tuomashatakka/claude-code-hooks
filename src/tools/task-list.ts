import { defineTool } from '../registry/tool-registry.ts';
import { formatMetadataCustom } from '../render/highlight.ts';
import { META_BADGE, pushDurationLine, renderCard } from '../tui/index.ts';
import { renderTask, tasksFromResult } from './task-shared.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

defineTool<RawToolInput, RawToolResult>({
  matches: 'TaskList',
  post(_input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);
    const tasks = tasksFromResult(result);
    for (const [index, task] of tasks.entries()) {
      if (index > 0) lines.push('');
      lines.push(...renderTask(task));
    }
    if (!tasks.length && result && typeof result === 'object') {
      lines.push(renderCard({ badges: META_BADGE, content: formatMetadataCustom(result) }));
    }
    return { lines, isJson: !tasks.length };
  },
});
