import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { imageToAscii, costOf } from '@tuomashatakka/image-to-ascii'
import type { BudgetSpec } from '@tuomashatakka/image-to-ascii'
import { getMaxLayoutWidth } from '../tui/index.ts'
import { debugLog } from '../runtime/debug.ts'

// The art is the elastic part of the session banner: heading and badges are
// fixed, and whatever room they leave is what the picture gets.

/** Room for the blank lines this module puts around the art. */
const RESERVE = 8

/** Past this the art stops being a greeting and starts being the screen. */
const MAX_COLS = 100

const HOME          = process.env.HOME ?? process.env.USERPROFILE ?? ''
const WELCOME_ASSET = path.join('assets', 'welcome.png')
const ASCII_DIR     = path.join(HOME, 'Documents', 'Prompts', 'anime-ascii')

/**
 * The bundled asset, wherever this module ended up: `dist/hooks.mjs` when
 * installed, `src/**` under bun in development. `CLAUDE_PLUGIN_ROOT` wins.
 */
function findAsset (): string | null {
  const candidates: string[] = []
  if (process.env.CLAUDE_PLUGIN_ROOT)
    candidates.push(path.join(process.env.CLAUDE_PLUGIN_ROOT, WELCOME_ASSET))

  let dir: string
  try {
    dir = path.dirname(fileURLToPath(import.meta.url))
  }
  catch {
    dir = process.cwd()
  }
  for (let depth = 0; depth < 6; depth++) {
    candidates.push(path.join(dir, WELCOME_ASSET))

    const parent = path.dirname(dir)
    if (parent === dir)
      break
    dir = parent
  }
  return candidates.find(candidate => {
    try {
      return fs.statSync(candidate).isFile()
    }
    catch {
      return false
    }
  }) ?? null
}

/** The image to print. An override wins so a session can wear a different face. */
export function welcomeImagePath (): string | null {
  const override = process.env.CLAUDE_HOOKS_WELCOME_IMAGE
  if (override)
    return fs.existsSync(override) ? override : null
  return findAsset()
}

const fits = (art: string, spec: BudgetSpec): boolean => costOf(art.split('\n'), spec) <= spec.total

function welcomeImage (spec: BudgetSpec): string | null {
  const file = welcomeImagePath()
  if (!file)
    return null
  try {
    const art = imageToAscii(fs.readFileSync(file), path.extname(file), {
      maxWidth: Math.min(MAX_COLS, getMaxLayoutWidth()),
      budget:   spec,
    })
    return art && fits(art, spec) ? art : null
  }
  catch (error) {
    debugLog('SessionStart', 'render-welcome-image', (error as Error).message)
    return null
  }
}

/** A random text banner from the user's own collection; oversized pieces are skipped, not cut. */
function asciiArt (spec: BudgetSpec): string | null {
  try {
    if (!fs.existsSync(ASCII_DIR))
      return null

    const files = fs.readdirSync(ASCII_DIR).filter(name => name.endsWith('.txt'))
    for (const pick of files.sort(() => Math.random() - 0.5)) {
      const art = fs.readFileSync(path.join(ASCII_DIR, pick), 'utf8').replace(/\s+$/, '')
      if (fits(art, spec))
        return art
    }
  }
  catch (error) {
    debugLog('SessionStart', 'load-ascii', (error as Error).message)
  }
  return null
}

/**
 * The banner's art block, padded with the blank lines that separate it from
 * the heading below — or '' when nothing fits in `headroom` characters.
 */
export function renderWelcome (headroom: number): string {
  if (headroom <= RESERVE)
    return ''

  const spec = { total: headroom - RESERVE }
  const art  = welcomeImage(spec) ?? asciiArt(spec)
  return art ? `\n${art}\n` : ''
}
