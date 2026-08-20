import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { imageToAsciiSimple, costOf } from '@tuomashatakka/image-to-ascii'
import type { BudgetSpec } from '@tuomashatakka/image-to-ascii'
import { getMaxLayoutWidth } from '../tui/index.ts'
import { debugLog } from '../runtime/debug.ts'

/**
 * The art is the elastic part of the session banner: everything else — the
 * heading, the badges, the system prompt handed back as `additionalContext` —
 * is fixed, and whatever room they leave in the message is what the picture
 * gets. So `renderWelcome` is handed a headroom measured off the response
 * rather than left to guess at one.
 *
 * That headroom is counted in the unit Claude Code enforces the limit in —
 * UTF-16 code units of the message itself — so the budget below declares no
 * surcharges at all. The JSON encoding it used to charge for is not something
 * the limit ever looked at.
 */

/** Room left for the blank lines this module puts around the art. */
const RESERVE = 8

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? ''

/** Plugin-relative path of the image printed at every session start. */
const WELCOME_ASSET = path.join('assets', 'welcome.png')

/** Text art dropped in here is the fallback when no image can be rendered. */
const ASCII_DIR = path.join(HOME, 'Documents', 'Prompts', 'anime-ascii')

/**
 * Where the bundled asset lives. The hook runs as `dist/hooks.mjs` when it is
 * installed and as `src/**` under bun in development, so rather than encode
 * either layout this walks up from wherever this module ended up until it finds
 * the asset. `CLAUDE_PLUGIN_ROOT` is honoured first — Claude Code sets it for
 * plugin hooks, and it is the answer whenever it is right.
 */
function findAsset (): string | null {
  const candidates: string[] = []
  const declared             = process.env.CLAUDE_PLUGIN_ROOT
  if (declared)
    candidates.push(path.join(declared, WELCOME_ASSET))

  let dir: string
  try {
    dir = path.dirname(fileURLToPath(import.meta.url))
  }
  catch {
    dir = process.cwd()
  }
  for (let i = 0; i < 6; i++) {
    candidates.push(path.join(dir, WELCOME_ASSET))

    const parent = path.dirname(dir)
    if (parent === dir)
      break
    dir = parent
  }

  for (const candidate of candidates)
    try {
      if (fs.statSync(candidate).isFile())
        return candidate
    }
    catch {}
  return null
}

/** The image to print. An override wins so a session can wear a different face. */
export function welcomeImagePath (): string | null {
  const override = process.env.CLAUDE_HOOKS_WELCOME_IMAGE
  if (override)
    return fs.existsSync(override) ? override : null
  return findAsset()
}

/** What a block of art costs the message it ships in: its own characters. */
function charBudget (total: number): BudgetSpec {
  return { total }
}

function fits (art: string, spec: BudgetSpec): boolean {
  return costOf(art.split('\n'), spec) <= spec.total
}

/** Past this the art stops being a greeting and starts being the screen. */
const MAX_COLS = 100

function renderWelcomeImage (spec: BudgetSpec): string | null {
  const file = welcomeImagePath()
  if (!file)
    return null
  try {
    const art = imageToAsciiSimple(fs.readFileSync(file), path.extname(file), Math.min(MAX_COLS, getMaxLayoutWidth()))

    // Below about 3KB of headroom even the narrowest render overruns, and the
    // simple renderer hands that back rather than nothing. Printing it would only
    // buy a picture with its middle omitted by the transport.
    return art && fits(art, spec) ? art : null
  }
  catch (e) {
    debugLog('SessionStart', 'render-welcome-image', (e as Error).message)
    return null
  }
}

/**
 * A random text banner from the user's own collection. Oversized files are
 * skipped rather than truncated: half a piece of ASCII art is not art, and
 * printing it would cost the whole message the transport's byte budget anyway.
 */
function loadAsciiArt (spec: BudgetSpec): string | null {
  try {
    if (!fs.existsSync(ASCII_DIR))
      return null

    const files = fs.readdirSync(ASCII_DIR).filter(f => f.endsWith('.txt'))
    for (const pick of files.sort(() => Math.random() - 0.5)) {
      const art = fs.readFileSync(path.join(ASCII_DIR, pick), 'utf8').replace(/\s+$/, '')
      if (fits(art, spec))
        return art
    }
  }
  catch (e) {
    debugLog('SessionStart', 'load-ascii', (e as Error).message)
  }
  return null
}

/**
 * The session banner's art block, already padded with the blank lines that
 * separate it from the heading below — or an empty string when nothing fits.
 *
 * @param headroom characters the rest of the hook's message has left over.
 */
export function renderWelcome (headroom: number): string {
  if (headroom <= RESERVE)
    return ''

  const spec = charBudget(headroom - RESERVE)
  const art  = renderWelcomeImage(spec) ?? loadAsciiArt(spec)
  return art ? `\n${art}\n` : ''
}
