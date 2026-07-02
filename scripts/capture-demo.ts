#!/usr/bin/env bun
// Runs the real hook pipeline (same cases as smoke.ts) and captures its
// actual ANSI output, converted to HTML, for public/index.html's terminal
// demo. Regenerated on every Pages deploy - see .github/workflows/pages.yml -
// so the showcase never drifts from what the hooks actually render.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { CASES, runCase } from './smoke.ts';
import { ansiToHtmlLines } from './ansi-to-html.ts';

const ROOT = path.resolve(import.meta.dir, '..');
const OUT = path.join(ROOT, 'public', 'demo-data.js');

const scenes = [];
for (const c of CASES) {
  const { stderr } = await runCase(c);
  const lines = ansiToHtmlLines(stderr.trim()).filter(Boolean);
  if (lines.length) scenes.push({ label: c.label, event: c.event, lines });
}

writeFileSync(OUT, `window.__DEMO__ = ${JSON.stringify(scenes)};\n`);
console.log(`wrote ${OUT} (${scenes.length} scenes)`);
