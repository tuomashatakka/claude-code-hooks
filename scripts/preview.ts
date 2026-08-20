// Render an image the way the Read hook does, with the numbers that matter.
// This subsystem cannot be developed without looking at it.
//
//   bun run preview <image> [--width 86] [--mode sextant|octant|half] [--palette]
import fs from 'node:fs'
import path from 'node:path'
import { imageToAscii, glyphTable, resolveGlyphMode } from '@tuomashatakka/image-to-ascii'
import type { GlyphMode } from '@tuomashatakka/image-to-ascii'


const args            = process.argv.slice(2)
const files: string[] = []
let width = Number(process.env.COLUMNS) || 86
let mode: GlyphMode | undefined
let palette = false

for (let i = 0; i < args.length; i++) {
  const arg = args[i]!
  if (arg === '--width' || arg === '-w')
    width = Number(args[++i])
  else if (arg === '--mode' || arg === '-m')
    mode = args[++i] as GlyphMode
  else if (arg === '--palette')
    palette = true
  else
    files.push(arg)
}

if (!files.length) {
  console.error('usage: bun run preview <image...> [--width N] [--mode sextant|octant|half] [--palette]')
  process.exit(1)
}

if (mode)
  process.env.CLAUDE_HOOKS_IMAGE_MODE = mode

const active = resolveGlyphMode()

const family = new Map<string, string>()
for (const glyph of glyphTable(active === 'half' ? 'sextant' : active, palette).glyphs)
  if (!family.has(glyph.char))
    family.set(glyph.char, glyph.family)

for (const file of files) {
  const ext     = path.extname(file)
  const started = performance.now()
  const ansi    = imageToAscii(fs.readFileSync(file), ext, {
    maxWidth: width,
    ...palette ? { colorMode: 'palette' as const } : {},
  })
  const ms = performance.now() - started

  if (!ansi) {
    console.log(`\n${file}: not a supported image`)
    continue
  }

  const lines       = ansi.split('\n')
  const visible     = lines.map(line => [ ...line.replace(/\x1b\[[0-9;]*m/g, '') ])
  const cols        = Math.max(...visible.map(row => row.length))
  const escapes     = ansi.match(/\x1b\[[0-9;]*m/g) ?? []
  const escapeChars = escapes.join('').length

  const histogram = new Map<string, number>()
  for (const row of visible)
    for (const char of row) {
      const key = family.get(char) ?? (char === ' ' ? 'space' : 'other')
      histogram.set(key, (histogram.get(key) ?? 0) + 1)
    }

  console.log(`\n${ansi}`)
  console.log(
    `${path.basename(file)}  ${cols}x${lines.length} cells  ${ansi.length} chars ` +
    `(${Math.round(100 * escapeChars / ansi.length)}% escapes, ${escapes.length} sequences)  ` +
    `${active}${palette ? '/palette' : ''}  ${ms.toFixed(0)}ms`,
  )
  console.log(
    '  glyphs: ' +
    [ ...histogram ].sort((a, b) => b[1] - a[1]).map(([ k, v ]) => `${k} ${v}`)
      .join('  '),
  )
}
