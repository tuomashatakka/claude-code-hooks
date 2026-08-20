import { describe, expect, test } from 'bun:test'
import {
  Badge,
  OUTPUT_BADGE,
  RUNNING_BADGE,
  renderBox,
  renderCard,
  renderColumns,
  renderSection,
} from '../src/tui/index.ts'
import { stripAnsi, visibleWidth } from '../src/render/primitives.ts'


describe('tui cards', () => {
  test('joins the title badge to a same-color lower rule', () => {
    const lines = renderCard({
      badges:  RUNNING_BADGE,
      content: '$ bun test && bun run typecheck',
    }).split('\n')
    const title    = lines[1]!
    const boxLines = lines.slice(2, -1)

    expect(stripAnsi(title)).toContain('Running')
    expect(stripAnsi(title)).toContain('▁')
    expect(title).toContain('\x1b[35m▁')
    expect(boxLines.every(line => visibleWidth(line) === visibleWidth(title))).toBeTrue()
  })

  test('expands a short body to the ansi-aware badge width', () => {
    const badge  = new Badge({ label: 'an unusually wide title', color: 'magenta' })
    const lines  = renderCard({ badges: badge, content: 'x' }).split('\n')
    const widths = lines.slice(1, -1).map(visibleWidth)

    expect(new Set(widths).size).toBe(1)
    expect(widths[0]).toBe(visibleWidth(badge.toString()) + 4)
    expect(stripAnsi(lines[1]!)).toEndWith('▁▁▁▁')
  })

  test('renders an untitled box through the same layout primitive', () => {
    const lines = renderBox({ content: 'hello' }).split('\n')
    // blank, ▁ top edge, pad, body, pad, blank
    expect(lines.length).toBe(6)
    expect(stripAnsi(lines[3]!)).toContain('hello')
    expect(stripAnsi(lines[1]!)).toMatch(/^▁+$/)
    expect(stripAnsi(lines[4]!)).toMatch(/^\s+$/)
  })

  test('keeps only the top rule with no side, bottom or shadow glyphs', () => {
    const lines = renderCard({ badges: RUNNING_BADGE, content: 'a\nbb\nccc' }).split('\n')
    const body  = lines.slice(2, -1).map(stripAnsi)

    expect(body.join('')).not.toMatch(/[▏▕▔░]/)

    const widths = new Set([ ...body, stripAnsi(lines[1]!) ].map(visibleWidth))
    expect(widths.size).toBe(1)
  })

  test('seats footer badges inside the final backgrounded row', () => {
    const rendered = renderCard({
      badges:  RUNNING_BADGE,
      content: 'x',
      footer:  new Badge({ label: 'exit 0', color: 'brightGreen', icon: '✓' }),
    })
    const lines  = rendered.split('\n')
    const footer = stripAnsi(lines.at(-2)!)

    expect(footer.trimStart()).toStartWith('✓ exit 0')
    expect(footer).not.toMatch(/[▏▕▔░]/)
    expect(lines.at(-2)).toContain('\x1b[48;2;48;47;50m')
  })

  test('supports darker and regular regions inside one aligned card', () => {
    const rendered = renderCard({
      badges:  RUNNING_BADGE,
      content: [
        { content: '$ bun test', background: '#272629' },
        { heading: OUTPUT_BADGE, content: 'all tests passed' },
      ],
    })
    const plain = stripAnsi(rendered)

    expect(plain.indexOf('$ bun test')).toBeLessThan(plain.indexOf('Output'))
    expect(plain.indexOf('Output')).toBeLessThan(plain.indexOf('all tests passed'))
    expect(rendered).toContain('\x1b[48;2;39;38;41m')
    expect(rendered).toContain('\x1b[48;2;48;47;50m')
  })

  test('normalizes tabs and foreign terminal controls before measuring card rows', () => {
    const rendered = renderCard({
      badges:  OUTPUT_BADGE,
      content: 'name\tvalue\n\x1b[48;2;1;2;3mred\x1b[49m\tnext\nbefore\x1b[10Cafter',
    })
    const lines = rendered.split('\n').slice(1, -1)
    const plain = stripAnsi(rendered)

    expect(plain).not.toContain('\t')
    expect(plain).toContain('red next')
    expect(plain).toContain('beforeafter')
    expect(rendered).not.toContain('\x1b[48;2;1;2;3m')
    expect(rendered).not.toContain('\x1b[10C')
    expect(new Set(lines.map(visibleWidth)).size).toBe(1)
  })

  test('always stacks cards even when horizontal space is available', () => {
    const output = stripAnsi(renderColumns({
      items: [
        renderCard({ badges: RUNNING_BADGE, content: '$ bun test' }),
        renderCard({ badges: OUTPUT_BADGE, content: 'all tests passed' }),
      ],
      maximumWidth: 1_000,
    }))
    const titleLines = output.split('\n').filter(line => (/Running|Output/).test(line))

    expect(titleLines).toHaveLength(2)
    expect(titleLines.every(line => !(line.includes('Running') && line.includes('Output')))).toBeTrue()
  })
})

describe('tui sections', () => {
  test('composes typed badges and body lines', () => {
    const output = renderSection({
      badges: [
        new Badge({ label: 'Read', color: 'blue' }),
        new Badge({ label: 'Output', color: 'green' }),
      ],
      lines: [ 'body' ],
    })

    const plain = stripAnsi(output)
    expect(plain).toContain('Read')
    expect(plain).toContain('Output')
    expect(plain).toEndWith('\n\nbody')
  })
})
