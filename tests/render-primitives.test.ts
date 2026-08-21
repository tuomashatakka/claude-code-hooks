import { describe, expect, test } from 'bun:test'
import { extractResultText, stripAnsi, visibleWidth, wrapAnsi } from '../src/render/primitives.ts'


describe('extractResultText', () => {
  test('unwraps MCP CallToolResult content blocks', () => {
    expect(extractResultText({
      content: [{ type: 'text', text: '37 files changed' }],
      isError: false,
    })).toBe('37 files changed')
  })
})

describe('wrapAnsi', () => {
  test('wraps styled rows by visible columns without losing content', () => {
    const rows = wrapAnsi('\x1b[31mabcdefghij\x1b[39m', 4)

    expect(rows.map(stripAnsi)).toEqual([ 'abcd', 'efgh', 'ij' ])
    expect(rows.every(row => visibleWidth(row) <= 4)).toBeTrue()
    expect(stripAnsi(rows.join(''))).toBe('abcdefghij')
  })
})
