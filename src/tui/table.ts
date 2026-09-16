import { ink } from '../ansi/chalk.ts'
import { formatValue } from '../ansi/highlight.ts'
import { visibleWidth, wrapAnsi } from '../ansi/text.ts'
import { getMaxContentWidth } from './card.ts'

// Box-drawn tables in the style Claude Code renders markdown tables with:
//
//   ┌──────────┬───────┐
//   │ key      │ value │
//   ├──────────┼───────┤
//   │ status   │ ok    │
//   └──────────┴───────┘
//
// Cells may hold ANSI and newlines; columns that would overflow the content
// width are wrapped, never cut, so the table keeps every character.

export type Cell = string | number | boolean | null | undefined

export interface TableProps {
  head?:     readonly Cell[];
  rows:      readonly (readonly Cell[])[];
  maxWidth?: number;

  /** Narrowest a column may be squeezed to before wrapping (default 4). */
  minColumnWidth?: number;
}

const cellText = (cell: Cell): string => cell == null ? '' : String(cell)

/** Column widths that fit `maxWidth`, shrinking the widest columns first. */
function columnWidths (grid: readonly string[][], columns: number, maxWidth: number, minWidth: number): number[] {
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.max(1, ...grid.map(row => Math.max(0, ...(row[column] ?? '').split('\n').map(visibleWidth)))))
  const frame  = columns * 3 + 1
  let total    = widths.reduce((sum, width) => sum + width, 0) + frame
  while (total > maxWidth) {
    const widest = widths.indexOf(Math.max(...widths))
    if (widths[widest]! <= minWidth)
      break
    widths[widest] = widths[widest]! - 1
    total -= 1
  }
  return widths
}

const pad = (text: string, width: number): string => text + ' '.repeat(Math.max(0, width - visibleWidth(text)))

function renderRow (cells: readonly string[], widths: readonly number[]): string[] {
  const wrapped = widths.map((width, column) => (cells[column] ?? '').split('\n').flatMap(line => wrapAnsi(line, width)))
  const height  = Math.max(1, ...wrapped.map(lines => lines.length))
  return Array.from({ length: height }, (_, line) =>
    ink.punct('│') + widths.map((width, column) => ' ' + pad(wrapped[column]![line] ?? '', width) + ' ').join(ink.punct('│')) + ink.punct('│'))
}

const rule = (widths: readonly number[], left: string, mid: string, right: string): string =>
  ink.punct(left + widths.map(width => '─'.repeat(width + 2)).join(mid) + right)

export function renderTable ({ head, rows, maxWidth = getMaxContentWidth(), minColumnWidth = 4 }: TableProps): string {
  const body    = rows.map(row => row.map(cellText))
  const header  = head?.map(cell => ink.strong(cellText(cell)))
  const columns = Math.max(header?.length ?? 0, ...body.map(row => row.length))
  if (columns === 0)
    return ''

  const widths = columnWidths([ ...header ? [ header ] : [], ...body ], columns, maxWidth, minColumnWidth)
  const lines  = [ rule(widths, '┌', '┬', '┐') ]
  if (header)
    lines.push(...renderRow(header, widths), rule(widths, '├', '┼', '┤'))
  for (const row of body)
    lines.push(...renderRow(row, widths))
  lines.push(rule(widths, '└', '┴', '┘'))
  return lines.join('\n')
}

/** An object's fields as a key/value table; nested values keep their own shape. */
export function metadataTable (value: unknown, maxWidth?: number): string {
  const entries = value && typeof value === 'object' ? Object.entries(value as Record<string, unknown>) : []
  if (!entries.length)
    return formatValue(value)
  return renderTable({
    head: [ 'key', 'value' ],
    rows: entries.map(([ key, item ]) => [ ink.key(key), formatValue(item) ]),
    maxWidth,
  })
}
