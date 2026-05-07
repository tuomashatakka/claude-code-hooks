import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const DEBUG_LOG = path.join(HOME, '.claude', 'debug.log');

export function debugLog(scope: string, ...parts: unknown[]): void {
  try {
    const ts = new Date().toISOString();
    const line = parts
      .map(p =>
        typeof p === 'string'
          ? p
          : (() => { try { return JSON.stringify(p); } catch { return String(p); } })()
      )
      .join(' ');
    fs.appendFileSync(DEBUG_LOG, `[${ts}] [${scope}] ${line}\n`);
  } catch {
    // Logging must never crash a hook.
  }
}
