import { PNG } from 'pngjs'
import { glyphTable } from '@tuomashatakka/image-to-ascii'
import type { Glyph } from '@tuomashatakka/image-to-ascii'

// Turning a render back into pixels is how we score it. The scoring is only as
// trustworthy as this file, and it shares the coverage table with the renderer
// itself — so a wrong coverage map would cancel out and score perfectly.
// `tests/glyph-table.test.ts` guards that with an independently hand-written
// coverage map for the common characters.

const ANSI_RE = /\x1b\[([0-9;]*)m/g

/** The card background the hook renders these previews on top of. */
export const CARD_BG: RGB = { r: 0x25, g: 0x25, b: 0x25 }

export interface RGB { r: number; g: number; b: number }

export interface AnsiCell {
  char: string;
  fg:   RGB | null;
  bg:   RGB | null;
}

let paletteCache: RGB[] | null = null

/** The xterm-256 palette, so `38;5;N` can be resolved back to a colour. */
export function xterm256Palette (): RGB[] {
  if (paletteCache)
    return paletteCache

  const levels     = [ 0, 95, 135, 175, 215, 255 ]
  const out: RGB[] = []
  for (let i = 0; i < 16; i++) {
    const v = i & 8 ? 255 : 128
    out.push({ r: i & 1 ? v : 0, g: i & 2 ? v : 0, b: i & 4 ? v : 0 })
  }
  for (let i = 16; i < 232; i++) {
    const j = i - 16
    out.push({ r: levels[j / 36 | 0]!, g: levels[(j / 6 | 0) % 6]!, b: levels[j % 6]! })
  }
  for (let i = 232; i < 256; i++) {
    const v = 8 + (i - 232) * 10
    out.push({ r: v, g: v, b: v })
  }
  paletteCache = out
  return out
}

export function parseAnsi (text: string): AnsiCell[][] {
  const palette = xterm256Palette()
  return text.split('\n').map(line => {
    const cells: AnsiCell[] = []
    let fg: RGB | null = null
    let bg: RGB | null = null
    let last           = 0
    const emit = (chunk: string) => {
      for (const char of chunk)
        cells.push({ char, fg, bg })
    }
    ANSI_RE.lastIndex = 0

    let m: RegExpExecArray | null
    while (m = ANSI_RE.exec(line)) {
      emit(line.slice(last, m.index))
      last = ANSI_RE.lastIndex

      const params = m[1]!.length ? m[1]!.split(';').map(Number) : [ 0 ]
      let i = 0
      while (i < params.length) {
        const code = params[i]!
        if (code === 38 || code === 48) {
          const kind = params[i + 1]
          let color: RGB | null = null
          if (kind === 5) {
            color = palette[params[i + 2]!] ?? null; i += 3
          }
          else if (kind === 2) {
            color = { r: params[i + 2]!, g: params[i + 3]!, b: params[i + 4]! }; i += 5
          }
          else
            i++
          if (code === 38)
            fg = color; else
            bg = color
        }
        else if (code === 39) {
          fg = null; i++
        }
        else if (code === 49) {
          bg = null; i++
        }
        else if (code === 0) {
          fg = null; bg = null; i++
        }
        else
          i++
      }
    }
    emit(line.slice(last))
    return cells
  })
}

let charIndex: Map<string, Glyph> | null = null

export function glyphFor (char: string): Glyph | null {
  if (!charIndex) {
    charIndex = new Map()
    // Every character any mode can emit, so a render is rasterised the same way
    // whichever glyph set produced it.
    for (const mode of [ 'sextant', 'octant' ] as const)
      for (const palette of [ false, true ])
        for (const g of glyphTable(mode, palette).glyphs)
          if (!charIndex.has(g.char))
            charIndex.set(g.char, g)
  }
  return charIndex.get(char) ?? null
}

// 4x24 subsamples per cell divides evenly by every basis the table uses
// (1, 2, 3, 4, 6, 8 rows and 1, 2, 4, 8 columns), so rasterisation is exact.
export const RASTER_X = 4
export const RASTER_Y = 24

export interface Raster { width: number; height: number; data: Float64Array }

export function rasterizeAnsi (text: string): Raster {
  const rows   = parseAnsi(text)
  const cols   = Math.max(...rows.map(r => r.length), 0)
  const width  = cols * RASTER_X
  const height = rows.length * RASTER_Y
  const data   = new Float64Array(width * height * 3)
  for (let cy = 0; cy < rows.length; cy++) {
    const row = rows[cy]!
    for (let cx = 0; cx < cols; cx++) {
      const cell  = row[cx]
      const glyph = cell ? glyphFor(cell.char) : null
      const fg    = cell?.fg ?? CARD_BG
      const bg    = cell?.bg ?? CARD_BG
      for (let sy = 0; sy < RASTER_Y; sy++)
        for (let sx = 0; sx < RASTER_X; sx++) {
          let w = 0
          if (glyph) {
            const gc = Math.min(glyph.basis.cols - 1, sx * glyph.basis.cols / RASTER_X | 0)
            const gr = Math.min(glyph.basis.rows - 1, sy * glyph.basis.rows / RASTER_Y | 0)
            w = glyph.w[gr * glyph.basis.cols + gc]!
          }

          const px     = ((cy * RASTER_Y + sy) * width + cx * RASTER_X + sx) * 3
          data[px]     = fg.r * w + bg.r * (1 - w)
          data[px + 1] = fg.g * w + bg.g * (1 - w)
          data[px + 2] = fg.b * w + bg.b * (1 - w)
        }
    }
  }
  return { width, height, data }
}

/** Source image area-averaged to the raster's dimensions, composited on CARD_BG. */
export function resampleSource (png: Buffer, width: number, height: number): Raster {
  const img  = PNG.sync.read(png)
  const data = new Float64Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * img.height / height)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * img.height / height))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * img.width / width)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * img.width / width))
      let r = 0,
        g   = 0,
        b   = 0,
        n   = 0
      for (let sy = y0; sy < Math.min(y1, img.height); sy++)
        for (let sx = x0; sx < Math.min(x1, img.width); sx++) {
          const i = (sy * img.width + sx) * 4
          const a = img.data[i + 3]! / 255
          r += img.data[i]! * a + CARD_BG.r * (1 - a)
          g += img.data[i + 1]! * a + CARD_BG.g * (1 - a)
          b += img.data[i + 2]! * a + CARD_BG.b * (1 - a)
          n++
        }

      const px = (y * width + x) * 3
      data[px] = r / n; data[px + 1] = g / n; data[px + 2] = b / n
    }
  }
  return { width, height, data }
}

export function psnr (a: Raster, b: Raster): number {
  if (a.width !== b.width || a.height !== b.height)
    throw new Error(`raster size mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`)

  let sse = 0
  for (let i = 0; i < a.data.length; i++) {
    const d = a.data[i]! - b.data[i]!
    sse += d * d
  }

  const mse = sse / a.data.length
  return mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse)
}

/** Area-resample a raster to arbitrary dimensions — works up as well as down. */
export function resampleRaster (src: Raster, width: number, height: number): Raster {
  if (src.width === width && src.height === height)
    return src

  const data = new Float64Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    const sy0 = y * src.height / height
    const sy1 = (y + 1) * src.height / height
    for (let x = 0; x < width; x++) {
      const sx0 = x * src.width / width
      const sx1 = (x + 1) * src.width / width
      let r    = 0,
        g      = 0,
        b      = 0,
        weight = 0
      for (let sy = Math.floor(sy0); sy < Math.min(src.height, Math.ceil(sy1)); sy++) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0)
        if (wy <= 0)
          continue
        for (let sx = Math.floor(sx0); sx < Math.min(src.width, Math.ceil(sx1)); sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0)
          if (wx <= 0)
            continue

          const w = wx * wy
          const i = (sy * src.width + sx) * 3
          r += src.data[i]! * w; g += src.data[i + 1]! * w; b += src.data[i + 2]! * w
          weight += w
        }
      }

      const px  = (y * width + x) * 3
      const inv = weight || 1
      data[px]  = r / inv; data[px + 1] = g / inv; data[px + 2] = b / inv
    }
  }
  return { width, height, data }
}

export interface RenderScore {
  psnr:  number;
  chars: number;
  cols:  number;
  rows:  number;
}

/**
 * Longest side of the grid both the render and the source are resampled to
 * before comparison. Fixed on purpose: scoring each render against a truth
 * resampled to its *own* grid would hand a small render a blurrier target and
 * so reward throwing resolution away.
 */
export const REFERENCE_LONG_SIDE = 512

type ReferenceSizeReturnType = { width: number; height: number }

function referenceSize (png: Buffer): ReferenceSizeReturnType {
  const img   = PNG.sync.read(png)
  const scale = Math.min(1, REFERENCE_LONG_SIDE / Math.max(img.width, img.height))
  return {
    width:  Math.max(1, Math.round(img.width * scale)),
    height: Math.max(1, Math.round(img.height * scale)),
  }
}

export function scoreRender (source: Buffer, ansi: string): RenderScore {
  const rendered          = rasterizeAnsi(ansi)
  const { width, height } = referenceSize(source)
  return {
    psnr:  psnr(resampleRaster(rendered, width, height), resampleSource(source, width, height)),
    chars: ansi.length,
    cols:  rendered.width / RASTER_X,
    rows:  rendered.height / RASTER_Y,
  }
}
