import { resultText } from '../lib/data.ts'
import { playwrightOperation } from '../lib/shell.ts'
import { screenshotCard } from '../render/file-card.ts'
import { operationBadges } from './bash.ts'
import { matching, metaCard, outputCard } from './kit.ts'
import type { ToolRenderer } from './kit.ts'

/**
 * Playwright MCP tools. A screenshot's result *is* the picture, so it is drawn
 * in place of the output card; everything else is text or, failing that, the
 * result's fields.
 */
export const browser: ToolRenderer = {
  id:    'browser',
  match: matching(/^mcp__playwright__browser_/i),
  render ({ name, result }, limit) {
    const operation = playwrightOperation(name)
    const text      = resultText(result)
    const shot      = screenshotCard(result, text)
    const body      = shot
      ? shot(limit)
      : text?.trim()
        ? outputCard(text, limit)
        : result && typeof result === 'object' ? metaCard(result, limit) : null
    return { lines: [ body ], badges: operationBadges(operation ? [ operation ] : []) }
  },
}
