import { describe, expect, test } from 'bun:test'
import { formatDebugEntry } from '../src/runtime/debug.ts'


describe('structured hook diagnostics', () => {
  test('records execution context and serializes errors usefully', () => {
    const line   = formatDebugEntry('bind', [ 'unknown-event', new Error('no handler'), 'PreToolUse' ], new Date(0))
    const record = JSON.parse(line.replace(/^\[[^\]]+\] \[[^\]]+\] /, '')) as Record<string, unknown>

    expect(line).toStartWith('[1970-01-01T00:00:00.000Z] [bind] ')
    expect(record.stage).toBe('unknown-event')
    expect(record.details).toEqual([
      expect.objectContaining({ name: 'Error', message: 'no handler' }),
      'PreToolUse',
    ])
    expect(record).toEqual(expect.objectContaining({
      pid:      process.pid,
      ppid:     process.ppid,
      runtime:  `${process.release.name}@${process.version}`,
      platform: `${process.platform}-${process.arch}`,
      cwd:      process.cwd(),
    }))
  })
})
