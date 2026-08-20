import { Badge, renderSection } from '../tui/index.ts'
import type { BadgeLike } from '../tui/index.ts'
import { getToolDefinition } from '../registry/tool-registry.ts'
import type { ToolContext } from '../registry/tool-registry.ts'
import type { ToolName } from '../types/claude-code.ts'
import type { ToolInputUnion, RawToolResult } from '../types/tool-io.ts'


interface RenderToolArgs {
  toolName:        ToolName;
  input:           ToolInputUnion;
  result?:         RawToolResult;
  durationMs?:     number | null;
  extraTopBadges?: Badge[];
}

export function renderToolSection ({
  toolName,
  input,
  result,
  durationMs = null,
  extraTopBadges = [],
}: RenderToolArgs): string {
  const def              = getToolDefinition(toolName)
  const ctx: ToolContext = { toolName }

  const section = def.post(input as never, result as never, durationMs, ctx)

  // No OUTPUT badge: every tool call has output, so a badge saying so on every
  // single one carried no information and crowded out the ones that do — the
  // tool, and whatever operation badges the strategy contributed.
  const main                = new Badge({ toolName })
  const badges: BadgeLike[] = [ main, ...extraTopBadges, ...section.extraBadges ?? [] ]

  // The clear-line prefix is applied once for every event in runtime/io.ts.
  return renderSection({ badges, lines: section.lines })
}
