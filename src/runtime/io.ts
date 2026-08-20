import { debugLog } from './debug.ts'
import { serializeHookResponse } from './output-transport.ts'


export function readInput (): Promise<unknown | null> {
  return new Promise(resolve => {
    const chunks: string[] = []
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8')))
    process.stdin.on('end', () => {
      const raw = chunks.join('')
      if (!raw.trim()) {
        resolve(null); return
      }
      try {
        resolve(JSON.parse(raw))
      }
      catch (e) {
        debugLog('readInput', 'parse-fail', (e as Error).message, raw.slice(0, 200))
        resolve(null)
      }
    })
  })
}

export interface WriteOutputOptions {
  mirrorSystemMessageToStderr?: boolean;
}

export function writeOutput (
  data: Record<string, unknown> & { systemMessage?: string },
  { mirrorSystemMessageToStderr = true }: WriteOutputOptions = {},
): never {
  const response = serializeHookResponse(data)
  if (mirrorSystemMessageToStderr && response.systemMessage)
    process.stderr.write(response.systemMessage + '\n')
  process.stdout.write(response.json)
  process.exit(0)
}
