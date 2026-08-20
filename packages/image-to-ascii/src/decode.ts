import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'


declare module 'jpeg-js' {
  export function decode (
    buf: Buffer | Uint8Array,
    opts?: { useTArray?: boolean }
  ): { width: number; height: number; data: Uint8Array }
}

export interface RGBAImage {
  width:  number;
  height: number;
  data:   Uint8Array | Buffer;
}

// pngjs/jpeg-js can't read WebP's VP8/VP8L codecs. On macOS, `sips` transcodes
// webp -> png in a temp file so we can reuse the existing PNG path. Throws if
// `sips` is absent (non-macOS) or the file is undecodable — the caller's
// try/catch then falls back to "unsupported" (null), same as before.
function decodeWebp (buffer: Buffer): RGBAImage {
  const base    = path.join(os.tmpdir(), `claude-webp-${process.pid}-${Date.now()}`)
  const inPath  = `${base}.webp`
  const outPath = `${base}.png`
  try {
    fs.writeFileSync(inPath, buffer)
    execFileSync('sips', [ '-s', 'format', 'png', inPath, '--out', outPath ], { stdio: 'ignore' })
    return PNG.sync.read(fs.readFileSync(outPath))
  }
  finally {
    try {
      fs.unlinkSync(inPath)
    }
    catch {}
    try {
      fs.unlinkSync(outPath)
    }
    catch {}
  }
}

/** Null for an unsupported extension or an undecodable buffer — never throws. */
export function decodeImage (buffer: Buffer, ext: string): RGBAImage | null {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '')
  let img: RGBAImage
  try {
    if (normalizedExt === 'png')
      img = PNG.sync.read(buffer)
    else if (normalizedExt === 'jpg' || normalizedExt === 'jpeg')
      img = jpeg.decode(buffer, { useTArray: true })
    else if (normalizedExt === 'webp')
      img = decodeWebp(buffer)
    else
      return null
  }
  catch {
    return null
  }
  return img.width && img.height ? img : null
}
