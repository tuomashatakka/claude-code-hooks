// Parses the "--- status = N\ncwd = ...\n..." trailer that wcgw BashCommand
// appends to stdout. Returns clean stdout + structured metadata.

const TRAILER_SEP = /\n---\s*\n/;

export function parseWcgwTrailer(rawOutput) {
  if (typeof rawOutput !== 'string') {
    return { stdout: String(rawOutput ?? ''), status: null, cwd: null, extra: {} };
  }

  const sepMatch = TRAILER_SEP.exec(rawOutput);
  if (!sepMatch) {
    return { stdout: rawOutput, status: null, cwd: null, extra: {} };
  }

  const stdout = rawOutput.slice(0, sepMatch.index);
  const trailerRaw = rawOutput.slice(sepMatch.index + sepMatch[0].length);

  const status = extractField(trailerRaw, 'status');
  const cwd    = extractField(trailerRaw, 'cwd');

  const knownKeys = new Set(['status', 'cwd']);
  const extra = {};
  for (const line of trailerRaw.split('\n')) {
    const m = /^([a-z_][a-z0-9_ ]*?)\s*=\s*(.*)$/.exec(line.trim());
    if (m && !knownKeys.has(m[1].trim())) {
      extra[m[1].trim()] = m[2].trim();
    }
  }

  return { stdout, status, cwd, extra };
}

function extractField(text, key) {
  const re = new RegExp(`(?:^|\\n)${key}\\s*=\\s*([^\\n]*)`, 'i');
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

// Shortens an absolute path by replacing $HOME with ~
export function shortenPath(p, home) {
  if (!p) return p;
  const h = home || process.env.HOME || process.env.USERPROFILE || '';
  if (h && p.startsWith(h)) return '~' + p.slice(h.length);
  return p;
}
