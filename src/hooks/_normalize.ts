// Helpers used by every hook's `parse()` to deal with the snake_case ↔ camelCase
// drift in Claude Code hook payloads. All field-name fallback handling lives here
// (and only here) so downstream handlers see one canonical shape.

export function asObject (raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
}

export function pickString (o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string')
      return v
  }
  return undefined
}

export function pickNumber (o: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number')
      return v
  }
  return null
}

export function pickBool (o: Record<string, unknown>, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'boolean')
      return v
  }
  return false
}

export function pickAny (o: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys)
    if (o[k] !== undefined)
      return o[k]
  return undefined
}

export function injectToolDiscriminator (toolName: string, input: unknown): import('../types/tool-io.ts').ToolInputUnion {
  // Freeform tools such as apply_patch put their payload directly in
  // `tool_input`. Preserve it instead of normalizing the useful part away.
  const obj = input && typeof input === 'object'
    ? { ...(input as Record<string, unknown>) }
    : typeof input === 'string' ? { input } : {};
  (obj as Record<string, unknown>).__tool = toolName
  return obj as import('../types/tool-io.ts').ToolInputUnion
}
