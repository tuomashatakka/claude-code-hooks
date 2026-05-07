import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

chalk.level = 3;

export const DIVIDER_WIDTH = 60;

const DEBUG_LOG = path.resolve('/Users/mia/.claude/debug.log');

export function debugLog(scope, ...parts) {
  try {
    const ts = new Date().toISOString();
    const line = parts.map(p =>
      typeof p === 'string'
        ? p
        : (() => { try { return JSON.stringify(p); } catch { return String(p); } })()
    ).join(' ');
    fs.appendFileSync(DEBUG_LOG, `[${ts}] [${scope}] ${line}\n`);
  } catch {}
}

export function stripAnsi(str) {
  return String(str).replace(/\x1b\[[0-9;]*m/g, '');
}

export function renderBox(content) {
  const lines = String(content).split('\n');
  const maxLen = Math.max(...lines.map(l => stripAnsi(l).length), 0);
  const width = maxLen + 2;
  const bg = chalk.bgHex('#252525');
  const blank = bg(' '.repeat(width));
  const body = lines.map(l =>
    bg(' ' + l + ' '.repeat(Math.max(0, width - 1 - stripAnsi(l).length)))
  );
  return [blank, ...body, blank].join('\n');
}

export function renderSection({ badge, lines = [], divider = '─', dividerColor = 'gray' } = {}) {
  let out = '\n' + badge;
  const body = lines.filter(Boolean);
  if (body.length) {
    out += '\n' + chalk[dividerColor](divider.repeat(DIVIDER_WIDTH)) + '\n';
    out += body.join('\n');
  }
  return out;
}

export function softCollapse(content, { maxLines = 20, label = 'lines' } = {}) {
  const text = String(content);
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  const head = lines.slice(0, maxLines).join('\n');
  return head + '\n' + chalk.gray.italic(`  … +${lines.length - maxLines} more ${label}`);
}

export async function readInput() {
  const input = [];
  return new Promise(resolve => {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => input.push(chunk));
    process.stdin.on('end', () => {
      const raw = input.join('');
      if (!raw.trim()) { resolve(null); return; }
      try { resolve(JSON.parse(raw)); }
      catch (e) {
        debugLog('readInput', 'parse-fail', e.message, raw.slice(0, 200));
        resolve(null);
      }
    });
  });
}

export function writeOutput(data) {
  if (data.systemMessage) process.stderr.write(data.systemMessage + '\n');
  process.stdout.write(JSON.stringify(data, null, 2));
  process.exit(0);
}

export async function runHook(name, handler) {
  try {
    const data = await readInput();
    const out = (await handler(data || {})) || {};
    writeOutput({ continue: true, ...out });
  } catch (err) {
    debugLog(name, 'CRASH', err && (err.stack || err.message) || String(err));
    writeOutput({ continue: true });
  }
}
