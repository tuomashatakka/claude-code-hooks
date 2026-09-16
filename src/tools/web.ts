import { chalk, ink } from '../ansi/chalk.ts'
import { collapse } from '../ansi/text.ts'
import { asRecord, parseJsonish, pickString, resultText } from '../lib/data.ts'
import type { Limit } from '../render/fit.ts'
import { badge, OUTPUT_BADGE, prose, renderCard, renderTable } from '../tui/index.ts'
import { named } from './kit.ts'
import type { ToolRenderer } from './kit.ts'

// WebSearch answers with a mix of link lists and prose: the links become a
// table, the prose is wrapped underneath, and nothing is dumped as JSON.

interface Link {
  title: string;
  url:   string;
}

/** Every `{ title, url }` pair anywhere in a value, in document order, deduplicated by URL. */
function collectLinks (value: unknown, seen = new Set<string>(), out: Link[] = []): Link[] {
  const record = asRecord(value)
  if (record && typeof record.url === 'string' && (/^https?:/).test(record.url)) {
    if (!seen.has(record.url)) {
      seen.add(record.url)
      out.push({ title: pickString(record, 'title', 'name') ?? record.url, url: record.url })
    }
    return out
  }
  if (Array.isArray(value))
    value.forEach(item => collectLinks(item, seen, out))
  else if (record)
    Object.values(record).forEach(item => collectLinks(item, seen, out))
  else if (typeof value === 'string')
    collectLinks(linksInText(value), seen, out)
  return out
}

// The text form: `Links: [{"title":…,"url":…}, …]` somewhere in the prose.
const LINKS_LINE_RE = /^Links:\s*(\[[\s\S]*?\])\s*$/m

const linksInText = (text: string): unknown => {
  const match = LINKS_LINE_RE.exec(text)
  return match ? parseJsonish(match[1]) : null
}

/** Prose parts of the result — strings that are not link payloads. */
function summaries (value: unknown): string[] {
  const parts = Array.isArray(value) ? value : [ value ]
  return parts
    .filter((part): part is string => typeof part === 'string')
    .map(part => part.replace(LINKS_LINE_RE, '').replace(/^Web search results for query:.*$/m, '')
      .trim())
    .filter(Boolean)
}

function linkTable (links: readonly Link[], limit: Limit): string {
  const table = renderTable({
    head: [ '#', 'title', 'url' ],
    rows: links.map((link, index) => [ ink.num(String(index + 1)), link.title, chalk.gray.underline(link.url) ]),
  })
  return renderCard({ badges: OUTPUT_BADGE, content: collapse(table, limit.lines, { label: 'rows' }) })
}

export const webSearch: ToolRenderer = {
  id:    'web-search',
  match: named('WebSearch'),
  render ({ input, result }, limit) {
    const record  = asRecord(result)
    const payload = record?.results ?? record ?? resultText(result)
    const links   = collectLinks(payload)
    const query   = pickString(input, 'query') ?? pickString(record, 'query')
    const seconds = typeof record?.durationSeconds === 'number' ? record.durationSeconds : null
    return {
      lines: [
        query ? ink.dim('⌕ ') + query : null,
        links.length ? linkTable(links, limit) : null,
        ...summaries(payload).map(text => ink.dim(prose(text, 600))),
      ],
      badges: [
        badge({ label: `${links.length} result${links.length === 1 ? '' : 's'}`, color: links.length ? 'brightGreen' : 'gray' }),
        seconds === null ? null : badge({ label: `${seconds.toFixed(1)}s`, color: 'gray' }),
      ],
    }
  },
}

export const WEB_RENDERERS: readonly ToolRenderer[] = [ webSearch ]
