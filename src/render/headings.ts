import chalk, { type ColorName } from 'chalk';
import { generatePhrase, type PhraseContext, type PhraseEvent } from './phrase.ts';
import { stripAnsi } from './primitives.ts';

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
  I: [' █', ' █', ' ▀'],
  J: ['   █', ' ▄ █', ' ▀▀ '],
  K: [' █ █', ' █▀▄', ' ▀ ▀'],
  L: [' █  ', ' █  ', ' ▀▀▀'],
  M: [' █▄█▄█', ' █ █ █', ' ▀ ▀ ▀'],
  N: [' █▄ █', ' █ ▀█', ' ▀  ▀'],
  O: [' █▀█', ' █ █', ' ▀▀▀'],
  P: [' █▀▄', ' █▀ ', ' ▀  '],
  Q: [' ▄▀▄', ' █ █', ' ▀▀▄'],
  R: [' █▀▄', ' █▀▄', ' ▀ ▀'],
  S: [' ▄▀▀', '  ▀▄', ' ▀▀ '],
  T: [' ▀█▀', '  █ ', '  ▀ '],
  U: [' █ █', ' █ █', ' ▀▀▀'],
  V: [' █ █', ' █ █', '  ▀ '],
  W: [' █ █ █', ' █ █ █', '  ▀ ▀ '],
  X: [' █ █', '  █ ', ' ▀ ▀'],
  Y: [' █ █', '  █ ', '  ▀ '],
  Z: [' ▀▀█', ' ▄▄ ', ' ▀▀▀'],

  '0': [' ▄▀▄', ' █ █', ' ▀▄▀'],
  '1': [' █ ', ' █ ', ' ▀ '],
  '2': [' ▄▀▄', '  ▄▀', ' ▀▀▀'],
  '3': [' ▀▀▄', '  ▀▄', ' ▀▀ '],
  '4': [' █ █', ' ▀▀█', '   ▀'],
  '5': [' █▀▀', ' ▀▀▄', ' ▀▀ '],
  '6': [' ▄▀▀', ' █▀▄', ' ▀▀ '],
  '7': [' ▀▀█', '  ▄▀', '  █ '],
  '8': [' ▄▀▄', ' ▄▀▄', ' ▀▄▀'],
  '9': [' ▄▀▄', ' ▀▀█', ' ▀▀ '],

  '!': [' █ ', ' █ ', ' ▄ '],
  '?': [' ▀▀▄', '  ▄▀', '  ▄ '],
  '.': ['   ', '   ', ' ▄ '],
  ':': [' ▄ ', '   ', ' ▄ '],
  '-': ['     ', ' ▄▄▄ ', '     '],
  '_': ['     ', '     ', ' ▄▄▄ '],
  '/': ['   ▄ ', '  █  ', ' ▀   '],
};

function renderGlyphRows(text: string, color: ColorName): [string, string, string] {
  const chars = text.toUpperCase().split('');
  const rows: [string, string, string] = ['  ', '  ', '  '];
  for (const ch of chars) {
    const glyph = GLYPHS[ch] ?? GLYPHS[' ']!;
    rows[0] += glyph[0];
    rows[1] += glyph[1];
    rows[2] += glyph[2];
  }
  const colorize = (chalk[color] ?? chalk.cyan) as (s: string) => string;
  return [colorize(rows[0]), colorize(rows[1]), colorize(rows[2])];
}

function renderGlyphs(text: string, color: ColorName): string {
  return renderGlyphRows(text, color).join('\n');
}

function glyphWidth(text: string): number {
  return 2 + text.length * 4;
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
  const glyphRows = renderGlyphRows(word, color);
  const gw = glyphWidth(word);
  const gutter = 2;
  const phraseWidth = Math.max(20, width - gw - gutter);

  const phrase = generatePhrase({ event, word, color, tone, width: phraseWidth, minTokens: 4, maxTokens: 10 });
  const phraseLines = phrase.split('\n');

  // Pad/truncate to exactly 3 rows; place text on rows 1 (top) and 2 (middle)
  // for a vertically-centered look against the 3-row glyph block.
  const slots: [string, string, string] = ['', '', ''];
  if (phraseLines.length === 1) {
    slots[1] = phraseLines[0]!;
  } else if (phraseLines.length === 2) {
    slots[0] = phraseLines[0]!;
    slots[1] = phraseLines[1]!;
  } else {
    slots[0] = phraseLines[0]!;
    slots[1] = phraseLines[1]!;
    const tail = phraseLines.slice(2).join(' ');
    slots[2] = stripAnsi(tail).length > phraseWidth
      ? tail.slice(0, Math.max(0, phraseWidth - 1)) + '…'
      : tail;
  }

  const composed = glyphRows
    .map((g, i) => g + ' '.repeat(gutter) + (slots[i] ?? ''))
    .join('\n');
  return '\n' + composed;
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
