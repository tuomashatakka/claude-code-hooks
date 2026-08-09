import chalk from 'chalk';
import { readFileSync } from 'node:fs';

chalk.level = 3;

// The Claude Code harness wraps tool/hook output that exceeds its inline limit
// in <persisted-output>…Full output saved to: /path/…</persisted-output>. When
// rendering, prefer the on-disk content over the truncated preview so the user
// sees the whole thing. Errors fall back to the original text.
const PERSISTED_RE = /<persisted-output>[\s\S]*?(?:saved to:|→)\s*(\S+)[\s\S]*?<\/persisted-output>/g;

export function expandPersistedOutput(text: string): string {
  if (typeof text !== 'string' || !text.includes('<persisted-output>')) return text;
  return text.replace(PERSISTED_RE, (match, path: string) => {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return match;
    }
  });
}

export function stripAnsi(str: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(str).replace(/\x1b\[[0-9;]*m/g, '');
}

/** Terminal-cell width for the glyphs this renderer emits (ANSI is zero-width). */
export function visibleWidth(str: unknown): number {
  return Array.from(stripAnsi(str)).length;
}

// Truncates by visible-character count, passing ANSI escape sequences
// through untouched (they don't count against the budget) so a cut never
// lands mid-sequence and drops a style's closing reset code - which would
// otherwise leak that style into everything rendered after it.
export function truncateAnsi(text: string, maxVisibleLen: number, ellipsis = '…'): string {
  // eslint-disable-next-line no-control-regex
  const csi = /\x1b\[[0-9;]*m/y;
  let out = '';
  let visible = 0;
  let i = 0;
  while (i < text.length && visible < maxVisibleLen) {
    csi.lastIndex = i;
    const m = csi.exec(text);
    if (m) {
      out += m[0];
      i += m[0].length;
      continue;
    }
    out += text[i];
    visible += 1;
    i += 1;
  }
  return out + '\x1b[0m' + ellipsis;
}

// Fallback content width when we can't see the real terminal (hooks are almost
// always spawned with piped, non-TTY stdio) - wide enough for normal code/output
export function firstLine(value: unknown, maxLength?: number): string {
  const line = String(value ?? '').split('\n')[0] ?? '';
  return maxLength == null ? line : line.slice(0, maxLength);
}

export function pickResultText(
  result: unknown,
  keys: readonly string[] = ['text', 'result', 'output']
): string | null {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return null;
}


export interface SoftCollapseOptions {
  maxLines?: number;
  label?: string;
}

// Safety ceiling, not a summary cap: this output is user-only (systemMessage on
// stderr, never model context), so it should render complete — the cap only stops
// a pathological multi-megabyte dump from flooding the terminal.
export const SAFETY_MAX_LINES = 2000;

export function softCollapse(content: unknown, { maxLines = SAFETY_MAX_LINES, label = 'lines' }: SoftCollapseOptions = {}): string {
  const text = String(content);
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  const head = lines.slice(0, maxLines).join('\n');
  return head + '\n' + chalk.gray.italic(`  … +${lines.length - maxLines} more ${label}`);
}

// Extract plain text from any tool response shape (string, array of content blocks, object).
export function extractResultText(toolResponse: unknown): string | null {
  const raw = extractResultTextRaw(toolResponse);
  return raw === null ? null : expandPersistedOutput(raw);
}

function extractResultTextRaw(toolResponse: unknown): string | null {
  if (typeof toolResponse === 'string') return toolResponse;
  if (!toolResponse || typeof toolResponse !== 'object') return null;
  if (Array.isArray(toolResponse)) {
    return (
      (toolResponse as Array<{ type?: string; text?: string }>)
        .filter(b => b?.type === 'text' && typeof b.text === 'string')
        .map(b => b.text!)
        .join('\n') || null
    );
  }
  const indexed = (toolResponse as Record<string, { type?: string; text?: string }>);
  if (indexed['0']?.type === 'text') {
    return (
      Object.values(indexed)
        .filter(b => b?.type === 'text' && typeof b.text === 'string')
        .map(b => b.text!)
        .join('\n') || null
    );
  }
  const o = toolResponse as Record<string, unknown>;
  const candidate = o.stdout ?? o.output ?? o.text ?? o.content;
  if (typeof candidate === 'string') return candidate;
  // MCP clients commonly wrap content blocks in a CallToolResult object:
  // `{ content: [{ type: 'text', text: '…' }], isError: false }`.
  // Re-enter the same normalizer so Bash/wcgw and generic tools do not lose
  // otherwise valid output merely because the blocks gained an outer envelope.
  if (candidate && typeof candidate === 'object' && candidate !== toolResponse) {
    return extractResultTextRaw(candidate);
  }
  return null;
}
