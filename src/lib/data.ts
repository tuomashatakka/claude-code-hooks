import fs from 'node:fs'
import path from 'node:path'
import type { Json, ToolResult } from '../types.ts'

// Reading untrusted JSON. Every "is it an object / first string among these
// keys / maybe it is JSON in a string" question in the codebase goes through
// here, so snake_case ↔ camelCase drift and MCP envelopes are handled once.

export function asRecord (value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : null
}

export function pickString (source: unknown, ...keys: string[]): string | null {
  const record = asRecord(source)
  for (const key of keys) {
    const value = record?.[key]
    if (typeof value === 'string' && value.trim())
      return value
  }
  return null
}

export function pickNumber (source: unknown, ...keys: string[]): number | null {
  const record = asRecord(source)
  for (const key of keys) {
    const value = record?.[key]
    if (typeof value === 'number' && Number.isFinite(value))
      return value
  }
  return null
}

export function pickBool (source: unknown, ...keys: string[]): boolean {
  const record = asRecord(source)
  return keys.some(key => record?.[key] === true)
}

export function pickAny (source: unknown, ...keys: string[]): unknown {
  const record = asRecord(source)
  for (const key of keys)
    if (record?.[key] !== undefined && record[key] !== null)
      return record[key]
  return undefined
}

/** An id as tools report it — string or number, never anything else. */
export function pickId (source: unknown, ...keys: string[]): string | null {
  const value = pickAny(source, ...keys)
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null
}

/** Parses a string that looks like JSON; hands anything else back untouched. */
export function parseJsonish (value: unknown): unknown {
  if (typeof value !== 'string')
    return value

  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('['))
    return value
  try {
    return JSON.parse(trimmed)
  }
  catch {
    return value
  }
}

// Claude Code wraps tool output past its inline limit in
// <persisted-output>…saved to: /path…</persisted-output>. Prefer the file.
const PERSISTED_RE = /<persisted-output>[\s\S]*?(?:saved to:|→)\s*(\S+)[\s\S]*?<\/persisted-output>/g

export function expandPersistedOutput (text: string): string {
  if (!text.includes('<persisted-output>'))
    return text
  return text.replace(PERSISTED_RE, (match, file: string) => {
    try {
      return fs.readFileSync(file, 'utf8')
    }
    catch {
      return match
    }
  })
}

function textOfBlocks (blocks: unknown[]): string | null {
  const text = blocks
    .map(block => typeof block === 'string' ? block : pickString(block, 'text', 'output'))
    .filter((part): part is string => part !== null)
    .join('\n')
  return text || null
}

function rawResultText (result: unknown): string | null {
  if (typeof result === 'string')
    return result
  if (Array.isArray(result))
    return textOfBlocks(result)

  const record = asRecord(result)
  if (!record)
    return null
  // `{ '0': { type: 'text' } }` — an array that lost its prototype in transit.
  if (asRecord(record['0'])?.type === 'text')
    return textOfBlocks(Object.values(record))

  const candidate = pickAny(record, 'stdout', 'output', 'text', 'content')
  if (typeof candidate === 'string')
    return candidate
  // MCP CallToolResult: `{ content: [{ type: 'text', text }], isError }`.
  return candidate && typeof candidate === 'object' ? rawResultText(candidate) : null
}

/** Plain text out of any tool-result shape, persisted output expanded. */
export function resultText (result: ToolResult | unknown): string | null {
  const text = rawResultText(result)
  return text === null ? null : expandPersistedOutput(text)
}

/** The result as an object — direct, or parsed out of a JSON text block. */
export function resultRecord (result: ToolResult | unknown): Json | null {
  return asRecord(result) ?? asRecord(parseJsonish(resultText(result)))
}

/**
 * A path as a person would say it: project-relative inside the project,
 * `~`-shortened outside it, whichever is shorter.
 */
export function displayPath (filePath: string, cwd = process.cwd(), home = process.env.HOME ?? process.env.USERPROFILE ?? ''): string {
  const text       = String(filePath)
  const candidates = [ text ]
  if (cwd && text.startsWith(cwd + path.sep))
    candidates.push(text.slice(cwd.length + 1))
  if (home && (text === home || text.startsWith(home + path.sep)))
    candidates.push('~' + text.slice(home.length))
  return candidates.reduce((best, candidate) => candidate.length < best.length ? candidate : best)
}
