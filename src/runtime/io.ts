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

export function writeOutput(data: Record<string, unknown> & { systemMessage?: string }): never {
  if (typeof data.systemMessage === 'string' && data.systemMessage.length > 0) {
    data.systemMessage = fitSystemMessage(data.systemMessage);
    process.stderr.write(data.systemMessage + '\n');
  }
  process.stdout.write(JSON.stringify(data, null, 2));
  process.exit(0);
}
