import chalk, { type ColorName } from 'chalk';
import { generatePhrase, type PhraseContext, type PhraseEvent } from './phrase.ts';

chalk.level = 3;

// 3-row block letters. Each glyph is exactly 4 cells wide:
//   leading ' ' (letter spacing)
//   3 cells of glyph body using █ (full), ▀ (top half), ▄ (bottom half), ' ' (empty)
// Avoids ░ (light shade) — when single-colored, ░ rendered muddy and obscured the
// letter shape; pure space + half-blocks give clean, readable glyphs.

type Row3 = readonly [string, string, string];

const GLYPHS: Record<string, Row3> = {
  ' ': ['    ', '    ', '    '],

  A: [' ▄▀▄', ' █▀█', ' ▀ ▀'],
  B: [' █▀▄', ' █▀▄', ' ▀▀ '],
  C: [' ▄▀▀', ' █  ', ' ▀▀▀'],
  D: [' █▀▄', ' █ █', ' ▀▀ '],
  E: [' █▀▀', ' █▀ ', ' ▀▀▀'],
  F: [' █▀▀', ' █▀ ', ' ▀  '],
  G: [' ▄▀▀', ' █ ▄', ' ▀▀▀'],
  H: [' █ █', ' █▀█', ' ▀ ▀'],
  I: [' ▀█▀', '  █ ', '  ▀ '],
  J: ['   █', '   █', ' ▀▀ '],
  K: [' █ ▄', ' █▀ ', ' ▀ ▀'],
  L: [' █  ', ' █  ', ' ▀▀▀'],
  M: [' █▄█', ' █ █', ' ▀ ▀'],
  N: [' █▄█', ' █ █', ' ▀ ▀'],
  O: [' ▄▀▄', ' █ █', ' ▀▄▀'],
  P: [' █▀▄', ' █▀ ', ' ▀  '],
  Q: [' ▄▀▄', ' █ █', ' ▀▀▄'],
  R: [' █▀▄', ' █▀▄', ' ▀ ▀'],
  S: [' ▄▀▀', '  ▀▄', ' ▀▀ '],
  T: [' ▀█▀', '  █ ', '  ▀ '],
  U: [' █ █', ' █ █', ' ▀▀▀'],
  V: [' █ █', ' █ █', '  ▀ '],
  W: [' █ █', ' █ █', ' ▀█▀'],
  X: [' █ █', '  █ ', ' ▀ ▀'],
  Y: [' █ █', '  █ ', '  ▀ '],
  Z: [' ▀▀█', '  ▄ ', ' █▀▀'],

  '0': [' ▄▀▄', ' █ █', ' ▀▄▀'],
  '1': ['  █ ', '  █ ', '  ▀ '],
  '2': [' ▄▀▄', '  ▄▀', ' ▀▀▀'],
  '3': [' ▀▀▄', '  ▀▄', ' ▀▀ '],
  '4': [' █ █', ' ▀▀█', '   ▀'],
  '5': [' █▀▀', ' ▀▀▄', ' ▀▀ '],
  '6': [' ▄▀▀', ' █▀▄', ' ▀▀ '],
  '7': [' ▀▀█', '  ▄▀', '  █ '],
  '8': [' ▄▀▄', ' ▄▀▄', ' ▀▄▀'],
  '9': [' ▄▀▄', ' ▀▀█', ' ▀▀ '],

  '!': ['  █ ', '  █ ', '  ▄ '],
  '?': [' ▀▀▄', '  ▄▀', '  ▄ '],
  '.': ['    ', '    ', '  ▄ '],
  ':': ['  ▄ ', '    ', '  ▄ '],
  '-': ['    ', ' ▄▄▄', '    '],
  '_': ['    ', '    ', ' ▄▄▄'],
  '/': ['   ▄', '  █ ', ' ▀  '],
};

function renderGlyphs(text: string, color: ColorName): string {
  const chars = text.toUpperCase().split('');
  const rows: [string, string, string] = ['  ', '  ', '  '];
  for (const ch of chars) {
    const glyph = GLYPHS[ch] ?? GLYPHS[' ']!;
    rows[0] += glyph[0];
    rows[1] += glyph[1];
    rows[2] += glyph[2];
  }
  const colorize = (chalk[color] ?? chalk.cyan) as (s: string) => string;
  return colorize(rows.join('\n'));
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface HeadingArgs {
  word: string;
  color?: ColorName;
  event: PhraseEvent;
  tone?: PhraseContext['tone'];
  width?: number;
}

export function renderHeading({ word, color = 'cyan', event, tone, width = 60 }: HeadingArgs): string {
  const pagga  = renderGlyphs(word, color);
  const phrase = generatePhrase({ event, word, color, tone, width, minTokens: 7, maxTokens: 16 });
  return '\n\n' + pagga + '\n' + phrase + '\n';
}

// Back-compat shim — emits glyphs only. Used where callers compose phrase
// themselves; new code should prefer renderHeading().
export function renderAnsiShadowText(text: string, color: ColorName = 'cyan'): string {
  return '\n\n' + renderGlyphs(text, color);
}

// Legacy single-line filler. Kept for any caller that still wants a one-shot
// playful line (e.g. log decorations).
export function randomFiller(event: PhraseEvent = 'idle'): string {
  return generatePhrase({ event, word: event, minTokens: 3, maxTokens: 5, width: 40 });
}
