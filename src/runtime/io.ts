import { debugLog } from './debug.ts';

export function readInput(): Promise<unknown | null> {
  return new Promise(resolve => {
    const chunks: string[] = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8')));
    process.stdin.on('end', () => {
      const raw = chunks.join('');
      if (!raw.trim()) { resolve(null); return; }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        debugLog('readInput', 'parse-fail', (e as Error).message, raw.slice(0, 200));
        resolve(null);
      }
    });
  });
}

// Claude Code (≥2.1.x) replaces any hook systemMessage over 10,000 chars with a
// persisted-output stub showing only a 2KB preview. Trimming whole lines just under
// that gate keeps ~10KB visible instead of losing everything to the stub.
const MAX_SYSTEM_MESSAGE_CHARS = 9980;
const TRIM_MARKER = '\x1b[0m\n\x1b[90m\x1b[3m  … trimmed to fit the 10KB hook display limit\x1b[0m';

function fitSystemMessage(message: string): string {
  if (message.length <= MAX_SYSTEM_MESSAGE_CHARS) return message;
  const budget = MAX_SYSTEM_MESSAGE_CHARS - TRIM_MARKER.length;
  const kept: string[] = [];
  let used = 0;
  for (const line of message.split('\n')) {
    if (used + line.length + 1 > budget) break;
    kept.push(line);
    used += line.length + 1;
  }
  return kept.join('\n') + TRIM_MARKER;
}

/**
 * Cursor up, erase that whole line, return to column 0.
 *
 * Claude Code prints a `⎿  <Event>:<Tool> says:` label on the line above a
 * hook's output. That label repeats what the badges already say, and it costs
 * a row plus a five-column indent on every single hook. Overwriting it means
 * output starts flush at the left of that row instead.
 *
 * Applied here rather than per-hook so it holds for all fourteen events —
 * anything that returns a systemMessage gets it, with no way to forget.
 */
export const CLEAR_LINE_PREFIX = '\x1b[1A\x1b[2K\r';

export interface WriteOutputOptions {
  mirrorSystemMessageToStderr?: boolean;
}

export function writeOutput(
  data: Record<string, unknown> & { systemMessage?: string },
  { mirrorSystemMessageToStderr = true }: WriteOutputOptions = {},
): never {
  if (typeof data.systemMessage === 'string' && data.systemMessage.length > 0) {
    data.systemMessage = CLEAR_LINE_PREFIX + fitSystemMessage(data.systemMessage);
    if (mirrorSystemMessageToStderr) process.stderr.write(data.systemMessage + '\n');
  }
  process.stdout.write(JSON.stringify(data, null, 2));
  process.exit(0);
}
