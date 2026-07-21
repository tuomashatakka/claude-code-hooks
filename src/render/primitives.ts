import chalk, { type ColorName } from 'chalk';
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

export const DIVIDER_WIDTH = 60;

// Turns plain-text ruler lines into styled dividers. Lines made only of ruler
// chars (`---`, `====`) become a full-width rule; lines carrying a label
// (`--- info`, `===== info =====`) center the label inside the rule. `=`
// rulers render with the double-line glyph so the source's visual weight
// survives the transform. Returns null when the line isn't a ruler.
export function renderRuler(line: string): string | null {
  const plain = stripAnsi(line).trim();
  const m = plain.match(/^(-{3,}|={3,}|─{3,}|═{3,})(.*)$/);
  if (!m) return null;
  const ch = m[1]![0] === '=' || m[1]![0] === '═' ? '═' : '─';
  const text = m[2]!.replace(/[-=─═]{3,}\s*$/, '').trim();
  if (!text) return chalk.gray(ch.repeat(DIVIDER_WIDTH));
  const label = ` ${text} `;
  const remaining = Math.max(6, DIVIDER_WIDTH - label.length);
  const left = Math.floor(remaining / 2);
  return chalk.gray(ch.repeat(left)) + chalk.bold(label) + chalk.gray(ch.repeat(remaining - left));
}

// Metadata tag: bgDarkGrey black label, darkGrey corner, value, terminator.
// Render as inline tag — caller decides whether to append a newline.
export function renderMetaTag(label: string, value: string): string {
  const labelChip = chalk.bgHex('#3a3a3a').black(` ${label} `);
  const corner    = chalk.hex('#3a3a3a')('◤');
  return labelChip + corner + ` ${value} ` + chalk.hex('#3a3a3a')('❚');
}

export function stripAnsi(str: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(str).replace(/\x1b\[[0-9;]*m/g, '');
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
// lines, narrow enough that a stray huge line can't blow the box past a typical
// terminal once the harness's own tree indentation is added on top.
const FALLBACK_CONTENT_WIDTH = 96;
const OUTER_INDENT_MARGIN = 6;
const H_PADDING = 2;

export function getMaxContentWidth(): number {
  const cols = process.stdout.columns || Number(process.env.COLUMNS) || 0;
  const usable = (cols > 0 ? cols : FALLBACK_CONTENT_WIDTH) - OUTER_INDENT_MARGIN - H_PADDING * 2;
  return Math.max(20, usable);
}

export function renderDuration(durationMs: number | null | undefined): string | null {
  return durationMs == null ? null : chalk.gray(`Δ ${durationMs}ms`);
}

export function pushDurationLine(lines: string[], durationMs: number | null | undefined): void {
  const line = renderDuration(durationMs);
  if (line) lines.push(line);
}

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

export function renderBox(content: string): string {
  const maxWidth = getMaxContentWidth();
  const lines = String(content)
    .split('\n')
    .map(l => (stripAnsi(l).length > maxWidth ? truncateAnsi(l, maxWidth - 1) : l));
  const maxLen = Math.min(Math.max(...lines.map(l => stripAnsi(l).length), 0), maxWidth);
  const width = maxLen + H_PADDING * 2;
  const bg = chalk.bgHex('#252525');
  const pad = bg(' '.repeat(width));
  const body = lines.map(l =>
    bg(' '.repeat(H_PADDING) + l + ' '.repeat(Math.max(0, width - H_PADDING - stripAnsi(l).length)))
  );
  return [pad, ...body, pad].join('\n');
}

export interface RenderSectionOptions {
  badge: string;
  lines?: Array<string | false | null | undefined>;
  divider?: string;
  dividerColor?: ColorName;
}

export function renderSection({ badge, lines = [] }: RenderSectionOptions): string {
  let out = badge;
  const body = lines.filter((l): l is string => Boolean(l));
  if (body.length) {
    out += '\n\n' + body.join('\n');
  }
  return out;
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
  return typeof candidate === 'string' ? candidate : null;
}
