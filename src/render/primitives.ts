import chalk, { type ColorName } from 'chalk';

chalk.level = 3;

export const DIVIDER_WIDTH = 60;

export function stripAnsi(str: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(str).replace(/\x1b\[[0-9;]*m/g, '');
}

export function renderBox(content: string): string {
  const lines = String(content).split('\n');
  const maxLen = Math.max(...lines.map(l => stripAnsi(l).length), 0);
  const width = maxLen + 2;
  const bg = chalk.bgHex('#252525');
  const blank = bg(' '.repeat(width));
  const body = lines.map(l =>
    bg(' ' + l + ' '.repeat(Math.max(0, width - 1 - stripAnsi(l).length)))
  );
  return [blank, ...body, blank].join('\n');
}

export interface RenderSectionOptions {
  badge: string;
  lines?: Array<string | false | null | undefined>;
  divider?: string;
  dividerColor?: ColorName;
}

export function renderSection({ badge, lines = [], divider = '─', dividerColor = 'gray' }: RenderSectionOptions): string {
  let out = '\n' + badge;
  const body = lines.filter((l): l is string => Boolean(l));
  if (body.length) {
    const colorize = (chalk[dividerColor] ?? chalk.gray) as (s: string) => string;
    out += '\n' + colorize(divider.repeat(DIVIDER_WIDTH)) + '\n';
    out += body.join('\n');
  }
  return out;
}

export interface SoftCollapseOptions {
  maxLines?: number;
  label?: string;
}

export function softCollapse(content: unknown, { maxLines = 20, label = 'lines' }: SoftCollapseOptions = {}): string {
  const text = String(content);
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  const head = lines.slice(0, maxLines).join('\n');
  return head + '\n' + chalk.gray.italic(`  … +${lines.length - maxLines} more ${label}`);
}

// Extract plain text from any tool response shape (string, array of content blocks, object).
export function extractResultText(toolResponse: unknown): string | null {
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
