import { Badge, renderSection, type BadgeLike } from '../tui/index.ts';
import { getToolDefinition, type ToolContext } from '../registry/tool-registry.ts';
import type { ToolName } from '../types/claude-code.ts';
import type { ToolInputUnion, RawToolResult } from '../types/tool-io.ts';

interface RenderToolArgs {
  toolName: ToolName;
  input: ToolInputUnion;
  result?: RawToolResult;
  durationMs?: number | null;
  extraTopBadges?: Badge[];
}

export function renderToolSection({
  toolName,
  input,
  result,
  durationMs = null,
  extraTopBadges = [],
}: RenderToolArgs): string {
  const def = getToolDefinition(toolName);
  const ctx: ToolContext = { toolName };

  const section = def.post(input as never, result as never, durationMs, ctx);

  const main = new Badge({ toolName });
  const badges: BadgeLike[] = [main, ...extraTopBadges];
  badges.push(
    section.isJson
      ? new Badge({ label: 'JSON', color: 'green' })
      : new Badge({ label: 'OUTPUT', color: 'brightGreen' })
  );
  for (const b of section.extraBadges ?? []) badges.push(b);

  // The clear-line prefix is applied once for every event in runtime/io.ts.
  return renderSection({ badges, lines: section.lines });
}
