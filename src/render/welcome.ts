import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  imageToAscii,
  costOf,
  type BrailleOptions,
  type BudgetSpec,
} from '@tuomashatakka/image-to-ascii';
import { getMaxLayoutWidth } from '../tui/index.ts';
import { debugLog } from '../runtime/debug.ts';

/**
 * The art is the elastic part of the session banner: everything else — the
 * heading, the badges, the system prompt handed back as `additionalContext` —
 * is fixed, and whatever room they leave inside the hook response is what the
 * picture gets. So `renderWelcome` is handed a byte headroom measured on the
 * serialized response rather than left to guess at a character count.
 *
 * Those bytes are JSON bytes, which is why the budget below is declared the way
 * it is: one ESC costs six of them, one newline two, and a sextant three.
 */
const JSON_ESCAPE_SURCHARGE = 5;   // `\u001b` in place of one ESC
const JSON_NEWLINE_SURCHARGE = 1;  // `\n` in place of one newline

/** Room left for the blank lines this module puts around the art. */
const RESERVE = 8;

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? '';

/** Plugin-relative path of the image printed at every session start. */
const WELCOME_ASSET = path.join('assets', 'welcome.png');

/** Text art dropped in here is the fallback when no image can be rendered. */
const ASCII_DIR = path.join(HOME, 'Documents', 'Prompts', 'anime-ascii');

/**
 * Where the bundled asset lives. The hook runs as `dist/hooks.mjs` when it is
 * installed and as `src/**` under bun in development, so rather than encode
 * either layout this walks up from wherever this module ended up until it finds
 * the asset. `CLAUDE_PLUGIN_ROOT` is honoured first — Claude Code sets it for
 * plugin hooks, and it is the answer whenever it is right.
 */
function findAsset(): string | null {
  const candidates: string[] = [];
  const declared = process.env.CLAUDE_PLUGIN_ROOT;
  if (declared) candidates.push(path.join(declared, WELCOME_ASSET));

  let dir: string;
  try { dir = path.dirname(fileURLToPath(import.meta.url)); }
  catch { dir = process.cwd(); }
  for (let i = 0; i < 6; i++) {
    candidates.push(path.join(dir, WELCOME_ASSET));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const candidate of candidates) {
    try { if (fs.statSync(candidate).isFile()) return candidate; } catch {}
  }
  return null;
}

/** The image to print. An override wins so a session can wear a different face. */
export function welcomeImagePath(): string | null {
  const override = process.env.CLAUDE_HOOKS_WELCOME_IMAGE;
  if (override) return fs.existsSync(override) ? override : null;
  return findAsset();
}

/** How the caller's JSON encoding charges for a block of art. */
function jsonBudget(total: number): BudgetSpec {
  return {
    total,
    bytes: true,
    escapeSurcharge: JSON_ESCAPE_SURCHARGE,
    perRow: JSON_NEWLINE_SURCHARGE,
  };
}

function fits(art: string, spec: BudgetSpec): boolean {
  return costOf(art.split('\n'), spec) <= spec.total;
}

/**
 * Braille, not the colour blocks the file previews use.
 *
 * The banner is line art, so there is no colour to lose — and losing it is what
 * makes the picture large: a block render spends four fifths of its bytes on
 * SGR sequences and fits about 26 columns into this budget, where braille spends
 * none and fits the whole terminal. Dithering is off for the same reason: on
 * strokes it only frays the edges it is meant to smooth.
 */
const BANNER: BrailleOptions = { dither: false, threshold: 0.35 };

/** Past this the art stops being a greeting and starts being the screen. */
const MAX_COLS = 100;

function renderWelcomeImage(spec: BudgetSpec): string | null {
  const file = welcomeImagePath();
  if (!file) return null;
  try {
    const art = imageToAscii(fs.readFileSync(file), path.extname(file), {
      maxWidth: Math.min(MAX_COLS, getMaxLayoutWidth()),
      mode: 'braille',
      braille: BANNER,
      budget: spec,
    });
    // Below about 3KB of headroom even the narrowest render overruns, and
    // imageToAscii hands that back rather than nothing. Printing it would only
    // buy a picture with its middle omitted by the transport.
    return art && fits(art, spec) ? art : null;
  } catch (e) {
    debugLog('SessionStart', 'render-welcome-image', (e as Error).message);
    return null;
  }
}

/**
 * A random text banner from the user's own collection. Oversized files are
 * skipped rather than truncated: half a piece of ASCII art is not art, and
 * printing it would cost the whole message the transport's byte budget anyway.
 */
function loadAsciiArt(spec: BudgetSpec): string | null {
  try {
    if (!fs.existsSync(ASCII_DIR)) return null;
    const files = fs.readdirSync(ASCII_DIR).filter(f => f.endsWith('.txt'));
    for (const pick of files.sort(() => Math.random() - 0.5)) {
      const art = fs.readFileSync(path.join(ASCII_DIR, pick), 'utf8').replace(/\s+$/, '');
      if (fits(art, spec)) return art;
    }
  } catch (e) { debugLog('SessionStart', 'load-ascii', (e as Error).message); }
  return null;
}

/**
 * The session banner's art block, already padded with the blank lines that
 * separate it from the heading below — or an empty string when nothing fits.
 *
 * @param headroom bytes the rest of the serialized hook response has left over.
 */
export function renderWelcome(headroom: number): string {
  if (headroom <= RESERVE) return '';
  const spec = jsonBudget(headroom - RESERVE);
  const art = renderWelcomeImage(spec) ?? loadAsciiArt(spec);
  return art ? `\n${art}\n` : '';
}
