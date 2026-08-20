import { decodeImage } from './decode.ts'


declare module 'jpeg-js' {
  export function decode (
    buf: Buffer | Uint8Array,
    opts?: { useTArray?: boolean }
  ): { width: number; height: number; data: Uint8Array }
}

const MAX_ROWS     = 120 // downscale bound for very tall images — resizes, never crops
const ALPHA_OPAQUE = 128 // below this a pixel renders as the terminal's own background
// Claude Code replaces any hook systemMessage over 10,000 chars with a persisted-output
// stub (2KB preview), so the render must fit the whole message with headroom for the
// badge header. Quality degrades stepwise: full 24-bit color first, then channel
// quantization (which lengthens RLE runs), then narrower output as a last resort.
const BYTE_BUDGET = 9200 // io.ts trims the whole message at 9900 — leave header room
// Quality ladder per width: exact 24-bit first, gentle quantization (longer RLE runs),
// then xterm-256 (codes are half the bytes of truecolor and its 6-level cube + 24-step
// gray ramp beats heavy channel masking) — only then a narrower render.
const ATTEMPTS: ReadonlyArray<{ mask: number; palette?: false } | { palette: true }> = [
  { mask: 0xff }, { mask: 0xfc }, { mask: 0xf8 }, { palette: true },
]
const MIN_COLS = 24

// Nearest xterm-256 index: 24-step grayscale ramp for near-neutral colors (finer than
// the cube's 6 gray levels), 6x6x6 color cube otherwise.
const cubeIdx = (v: number) => v < 48 ? 0 : v < 115 ? 1 : Math.min(5, Math.round((v - 35) / 40))
function to256 (r: number, g: number, b: number): number {
  if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && Math.abs(r - b) < 12) {
    if (r < 8)
      return 16
    if (r > 238)
      return 231
    return 232 + Math.min(23, Math.round((r - 8) / 10))
  }
  return 16 + 36 * cubeIdx(r) + 6 * cubeIdx(g) + cubeIdx(b)
}

const FG_RESET = '\x1b[39m'
const BG_RESET = '\x1b[49m'


export function imageToAsciiSimple (buffer: Buffer, ext: string, maxWidth: number = 80): string | null {
  const img = decodeImage(buffer, ext)
  if (!img)
    return null

  const { width, height, data } = img
  if (!width || !height)
    return null

  // Half-block rendering: a terminal cell is ~2:1 tall, and each cell holds two
  // vertically stacked pixels (▀ with fg = top pixel, bg = bottom pixel), so the
  // sampling grid uses a square pixel aspect. Never upscale.
  const render = (cols: number, attempt: (typeof ATTEMPTS)[number]): string => {
    const scale       = Math.max(1, width / cols, height / (MAX_ROWS * 2))
    const targetWidth = Math.max(1, Math.round(width / scale))
    const pxRows      = Math.max(1, Math.round(height / scale))
    // "2;r;g;b" (truecolor) or "5;n" (xterm-256) — the tail of a 38/48 SGR sequence.
    const sgrTail = attempt.palette
      ? (r: number, g: number, b: number) => `5;${to256(r, g, b)}`
      : (r: number, g: number, b: number) =>
        `2;${r & attempt.mask};${g & attempt.mask};${b & attempt.mask}`

    // Nearest-neighbour sample -> SGR color tail, or null for transparent.
    const px = (col: number, row: number): string | null => {
      const idx =
        (Math.min(height - 1, Math.floor(row * scale)) * width +
          Math.min(width - 1, Math.floor(col * scale))) * 4
      if ((data[idx + 3] ?? 255) < ALPHA_OPAQUE)
        return null
      return sgrTail(data[idx] ?? 0, data[idx + 1] ?? 0, data[idx + 2] ?? 0)
    }

    // Emit a truecolor SGR only when that component changes (run-length encoding),
    // so the output stays a few KB rather than ~40 bytes per cell.
    const lines: string[] = []
    for (let y = 0; y < pxRows; y += 2) {
      let line              = ''
      let fg: string | null = null
      let bg: string | null = null
      // Fold this cell's fg/bg changes into ONE escape (\x1b[38;…;48;…m) — two
      // separate sequences would cost 4-5 extra bytes on every photo-dense cell.
      const put = (char: string, wantFg: string | null, wantBg: string | null) => {
        const parts: string[] = []
        if (wantFg !== null && wantFg !== fg) {
          parts.push(`38;${wantFg}`); fg = wantFg
        }
        if (wantBg !== bg) {
          parts.push(wantBg === null ? '49' : `48;${wantBg}`); bg = wantBg
        }
        line += parts.length ? `\x1b[${parts.join(';')}m${char}` : char
      }
      for (let x = 0; x < targetWidth; x++) {
        const top    = px(x, y)
        const bottom = y + 1 < pxRows ? px(x, y + 1) : null
        const byte   = Number(top !== null) * 1 + Number(bottom !== null) * 2 + Number(bottom === top) * 1
        const symbol = [ '　', '▀', '▄', '█', '▀' ]
        put(symbol[byte] as string, top || bottom, top && bottom)
        // const top    = px(x, y)
        // const bottom = y + 1 < pxRows ? px(x, y + 1) : null
        // if (top === null && bottom === null)
        //   put('　', null, null); else if (top !== null && bottom === null)
        //   put('▀', top, null); else if (top === null && bottom !== null)
        //   put('▄', bottom, null); else if (top === bottom)
        //   put('█', top, bg); else
        //   put('▀', top, bottom)
        // '　─╵╹╴╸╱┌───┐└┘▮▯▖░▒▓╌╍┉┈┄┅━▁▂▃
      }
      if (fg !== null)
        line += FG_RESET
      if (bg !== null)
        line += BG_RESET
      lines.push(line)
    }

    return lines.join('\n')
  }

  let out = ''
  const requestedMax = Number.isFinite(maxWidth) ? Math.max(1, Math.floor(maxWidth)) : 80
  for (let cols = Math.min(width, requestedMax); ;) {
    for (const attempt of ATTEMPTS) {
      out = render(cols, attempt)
      if (out.length <= BYTE_BUDGET)
        return out
    }
    if (cols <= MIN_COLS)
      break
    cols = Math.max(MIN_COLS, Math.floor(cols * 0.85))
  }
  return out // smallest attempt — io's systemMessage guard has the final say
}
