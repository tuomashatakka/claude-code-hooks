import { describe, expect, test } from 'bun:test'
import { compactAnsi, stripAnsi, visibleWidth, wrapAnsi } from '../src/ansi/text.ts'
import { resultText } from '../src/lib/data.ts'


describe('resultText', () => {
  test('unwraps MCP CallToolResult content blocks', () => {
    expect(resultText({
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

describe('compactAnsi', () => {
  test('fuses adjacent sequences and resets once when everything closes', () => {
    expect(compactAnsi('\x1b[1m\x1b[36mhi\x1b[39m\x1b[22m')).toBe('\x1b[1;36mhi\x1b[0m')
  })

  test('drops a close that is reopened before anything but blanks is drawn', () => {
    expect(compactAnsi('\x1b[36ma\x1b[39m \x1b[36mb\x1b[39m')).toBe('\x1b[36ma b\x1b[39m')
    expect(compactAnsi('\x1b[49m\x1b[48;5;236m  x\x1b[49m')).toBe('\x1b[48;5;236m  x\x1b[49m')
  })

  test('keeps what a blank cell shows and closes every style before a newline', () => {
    const input = '\x1b[44m  \x1b[49m\n\x1b[4m \x1b[24mx\n\x1b[31mleaks'
    expect(compactAnsi(input)).toBe('\x1b[44m  \x1b[49m\n\x1b[4m \x1b[24mx\n\x1b[31mleaks\x1b[39m')
  })

  test('re-opens a survivor when bold and dim share a close', () => {
    expect(compactAnsi('\x1b[1m\x1b[2mx\x1b[22m\x1b[1my\x1b[22m')).toBe('\x1b[1;2mx\x1b[22;1my\x1b[22m')
  })

  test('passes non-SGR escapes through and never changes visible text', () => {
    const input = '\x1b[2K\x1b[31mred\x1b[39m\t\x1b]8;;https://x\x07link\x1b]8;;\x07 \x1b[38;2;1;2;3m✓\x1b[39m'
    expect(stripAnsi(compactAnsi(input))).toBe(stripAnsi(input))
    expect(compactAnsi(input)).toStartWith('\x1b[2K\x1b[31mred')
    expect(compactAnsi(input)).toContain('\x1b]8;;https://x\x07link\x1b]8;;\x07')
  })
})
