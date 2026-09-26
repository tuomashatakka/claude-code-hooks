import { debugLog } from './debug.ts'

/** The whole of stdin, parsed as JSON; null when empty or malformed. */
export function readStdin (): Promise<unknown> {
  return new Promise(resolve => {
    const chunks: string[] = []
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => chunks.push(String(chunk)))
    process.stdin.on('end', () => {
      const raw = chunks.join('')
      if (!raw.trim())
        return resolve(null)
      try {
        resolve(JSON.parse(raw))
      }
      catch (error) {
        debugLog('readStdin', 'parse-fail', (error as Error).message, raw.slice(0, 200))
        resolve(null)
      }
    })
  })
}

export interface WriteOptions {

  /** Claude Code's terminal presentation wants a stderr mirror. */
  mirrorToStderr: boolean;
}

export function writeResponse (json: string, systemMessage: string | null, { mirrorToStderr }: WriteOptions): never {
  if (mirrorToStderr && systemMessage)
    process.stderr.write(systemMessage + '\n')
  process.stdout.write(json)
  process.exit(0)
}
