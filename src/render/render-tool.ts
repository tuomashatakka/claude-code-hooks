import { Badge, renderBadges } from './badge.ts';
import { renderSection } from './primitives.ts';
import { getToolDefinition, type RenderedSection, type ToolContext } from '../registry/tool-registry.ts';
import type { ToolName } from '../types/claude-code.ts';
import type { ToolInputUnion, RawToolResult } from '../types/tool-io.ts';

const CLEAR_LINE_PREFIX = '\x1b[1A\x1b[2K\x1b[1B';

interface RenderToolArgs {
  phase: 'pre' | 'post';
  toolName: ToolName;
  input: ToolInputUnion;
  result?: RawToolResult;
  durationMs?: number | null;
  extraTopBadges?: Badge[];
}

export function renderToolSection({
  phase,
  toolName,
  input,
  result,
  durationMs = null,
  extraTopBadges = [],
}: RenderToolArgs): string {
  const def = getToolDefinition(toolName);
  const ctx: ToolContext = { toolName };

  let section: RenderedSection = { lines: [] };
  if (phase === 'pre' && def.pre) {
    section = def.pre(input as never, ctx);
  } else if (phase === 'post' && def.post) {
    section = def.post(input as never, result as never, durationMs, ctx);
  }

  const main = new Badge({ toolName });
  const badges: Array<Badge | string | null | undefined> = [main, ...extraTopBadges];
  if (phase === 'post') {
    badges.push(
      section.isJson
        ? new Badge({ label: 'JSON', color: 'green' })
        : new Badge({ label: 'OUTPUT', color: 'brightGreen' })
    );
  }
  for (const b of section.extraBadges ?? []) badges.push(b);

  const badge = renderBadges(...badges);
  return CLEAR_LINE_PREFIX + renderSection({ badge, lines: section.lines });
}
