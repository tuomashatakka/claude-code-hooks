import { describe, expect, test } from 'bun:test'
import { stripAnsi, visibleWidth } from '../src/ansi/text.ts'
import { metadataTable, renderTable } from '../src/tui/index.ts'


describe('renderTable', () => {
  test('draws a box-bordered table with a header rule', () => {
    const plain = stripAnsi(renderTable({ head: [ 'key', 'value' ], rows: [[ 'a', '1' ], [ 'bb', '22' ]]}))
    const lines = plain.split('\n')

    expect(lines[0]).toBe('┌─────┬───────┐')
    expect(lines[1]).toBe('│ key │ value │')
    expect(lines[2]).toBe('├─────┼───────┤')
    expect(lines[3]).toBe('│ a   │ 1     │')
    expect(lines[4]).toBe('│ bb  │ 22    │')
    expect(lines[5]).toBe('└─────┴───────┘')
  })

  test('wraps wide cells instead of cutting them, and keeps rows aligned', () => {
    const rendered = renderTable({ rows: [[ 'k', 'x'.repeat(300) ]], maxWidth: 40 })
    const rows     = rendered.split('\n')

    expect(Math.max(...rows.map(visibleWidth))).toBeLessThanOrEqual(40)
    expect(new Set(rows.map(visibleWidth)).size).toBe(1)
    expect(stripAnsi(rendered).match(/x/g)).toHaveLength(300)
  })

  test('cells may carry colour and newlines', () => {
    const plain = stripAnsi(renderTable({ rows: [[ '\x1b[31mred\x1b[39m', 'one\ntwo' ]]}))
    expect(plain.split('\n')).toEqual([
      '┌─────┬─────┐',
      '│ red │ one │',
      '│     │ two │',
      '└─────┴─────┘',
    ])
  })

  test('renders nothing for no columns', () => {
    expect(renderTable({ rows: []})).toBe('')
  })
})

describe('metadataTable', () => {
  test('tables an object key by key with typed values', () => {
    const plain = stripAnsi(metadataTable({ hits: 3, source: 'index', nested: { a: true }}))
    expect(plain).toMatch(/│ key\s+│ value\s+│/)
    expect(plain).toMatch(/│ hits\s+│ 3\s+│/)
    expect(plain).toMatch(/│ nested\s+│ \{ a: true \}\s+│/)
  })

  test('falls back to a plain value for non-objects', () => {
    expect(stripAnsi(metadataTable('just text'))).toBe('just text')
    expect(stripAnsi(metadataTable({}))).toBe('{ }')
  })
})
