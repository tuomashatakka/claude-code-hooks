// Regenerates tests/fixtures/image-baseline.json. Run after a deliberate
// change to sampling, glyph set or encoding; the diff is the evidence that the
// change did what it claimed.
import fs from 'node:fs'
import path from 'node:path'
import { imageToAscii } from '@tuomashatakka/image-to-ascii'
import { IMAGE_FIXTURES, fixture } from '../tests/helpers/image-fixtures.ts'
import { scoreRender } from '../tests/helpers/ansi-raster.ts'


const RENDER_WIDTH = 86
const target       = path.join(import.meta.dir, '..', 'tests', 'fixtures', 'image-baseline.json')

const previous: Record<string, { psnr: number }> = fs.existsSync(target)
  ? JSON.parse(fs.readFileSync(target, 'utf8'))
  : {}

const out: Record<string, { psnr: number; chars: number; cols: number; rows: number }> = {}
for (const name of Object.keys(IMAGE_FIXTURES)) {
  const source  = fixture(name)
  const started = performance.now()
  const ansi    = imageToAscii(source, 'png', RENDER_WIDTH)
  const ms      = performance.now() - started
  if (!ansi)
    throw new Error(`fixture ${name} failed to render`)

  const score = scoreRender(source, ansi)
  out[name]   = {
    psnr:  Number(score.psnr.toFixed(2)),
    chars: score.chars,
    cols:  score.cols,
    rows:  score.rows,
  }

  const was   = previous[name]?.psnr
  const delta = was === undefined ? '' : `  (${score.psnr - was >= 0 ? '+' : ''}${(score.psnr - was).toFixed(2)} dB)`
  console.log(
    `${name.padEnd(16)} ${`${score.cols}x${score.rows}`.padStart(7)} ${String(score.chars).padStart(5)} chars  ` +
    `${score.psnr.toFixed(2)} dB${delta}  ${ms.toFixed(0)}ms`,
  )
}

fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`)
console.log(`\nwrote ${path.relative(process.cwd(), target)}`)
