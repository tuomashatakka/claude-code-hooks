import { defineTool } from '../registry/tool-registry.ts';
import { formatMetadataCustom } from '../render/highlight.ts';
import { META_BADGE, pushDurationLine, renderCard } from '../tui/index.ts';
import { normalizeStatus, renderTask, taskFromResult } from './task-shared.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

defineTool<RawToolInput, RawToolResult>({
  matches: 'TaskUpdate',
  post(input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const statusChangeTo = result && typeof result === 'object' && (result as any).statusChange?.to;
    const status = statusChangeTo || (result && typeof result === 'object' && (result as any).status) || (input && typeof input === 'object' && (input as any).status) || '';

    const normalizedStatus = normalizeStatus(status, 'updated');
    const task = taskFromResult(input, result, normalizedStatus);
    if (task) lines.push(...renderTask({ ...task, status: normalizedStatus }));
    else if (result && typeof result === 'object') {
      lines.push(renderCard({ badges: META_BADGE, content: formatMetadataCustom(result) }));
    }

    return { lines };
  },
});
