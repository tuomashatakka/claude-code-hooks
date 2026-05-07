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

export function writeOutput(data: Record<string, unknown> & { systemMessage?: string }): never {
  if (typeof data.systemMessage === 'string' && data.systemMessage.length > 0) {
    process.stderr.write(data.systemMessage + '\n');
  }
  process.stdout.write(JSON.stringify(data, null, 2));
  process.exit(0);
}
