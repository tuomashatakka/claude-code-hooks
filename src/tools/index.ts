import type { Render } from '../render/fit.ts'
import { durationLine, section, toolBadge } from '../tui/index.ts'
import type { ToolView } from '../types.ts'
import { AGENT_RENDERERS } from './agents.ts'
import { bash } from './bash.ts'
import { browser } from './browser.ts'
import { FILE_RENDERERS } from './files.ts'
import { generic } from './generic.ts'
import type { ToolRenderer } from './kit.ts'
import { MISC_RENDERERS } from './misc.ts'
import { TASK_RENDERERS } from './tasks.ts'
import { WEB_RENDERERS } from './web.ts'


export type { Section, ToolRenderer } from './kit.ts'

/** Every renderer, most specific first; `generic` matches anything and goes last. */
export const RENDERERS: readonly ToolRenderer[] = [
  bash,
  ...FILE_RENDERERS,
  ...TASK_RENDERERS,
  ...AGENT_RENDERERS,
  ...WEB_RENDERERS,
  ...MISC_RENDERERS,
  browser,
  generic,
]

export const rendererFor = (toolName: string): ToolRenderer =>
  RENDERERS.find(renderer => renderer.match(toolName)) ?? generic

/**
 * A tool call as an elastic message: the tool badge, whatever badges the
 * renderer adds, the duration, then the renderer's lines at the given limit.
 */
export const renderTool = (view: ToolView): Render => limit => {
  const { lines, badges = []} = rendererFor(view.name).render(view, limit)
  return section([ toolBadge(view.name), ...badges ], [ durationLine(view.durationMs), ...lines ])
}
