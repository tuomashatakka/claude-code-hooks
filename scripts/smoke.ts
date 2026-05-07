#!/usr/bin/env bun
// Feeds canned JSON into hooks/bin/bind.ts for each event/tool combo and prints
// stderr (the systemMessage). Used as a quick visual sanity check + smoke test.

import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const BIND = path.join(ROOT, 'hooks', 'bin', 'bind.ts');

interface Case {
  label: string;
  event: string;
  payload: unknown;
}

const CASES: Case[] = [
  {
    label: 'PreToolUse — Bash',
    event: 'PreToolUse',
    payload: { tool_name: 'Bash', tool_input: { command: 'echo "hello"', description: 'demo' } },
  },
  {
    label: 'PostToolUse — Bash',
    event: 'PostToolUse',
    payload: {
      tool_name: 'Bash',
      tool_input: { command: 'echo hi' },
      tool_response: 'hi\n',
      duration_ms: 12,
    },
  },
  {
    label: 'PreToolUse — wcgw FileWriteOrEdit (multi-hunk)',
    event: 'PreToolUse',
    payload: {
      tool_name: 'mcp__wcgw__FileWriteOrEdit',
      tool_input: {
        file_path: '/tmp/example.ts',
        percentage_to_change: 25,
        thread_id: 'i6314',
        text_or_search_replace_blocks:
          '<<<<<<< SEARCH\nconst x = 1\n=======\nconst x = 2\n>>>>>>> REPLACE\n' +
          '<<<<<<< SEARCH\nconst y = 1\n=======\nconst y = 2\n>>>>>>> REPLACE',
      },
    },
  },
  {
    label: 'PostToolUse — wcgw BashCommand (with trailer)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'mcp__wcgw__BashCommand',
      tool_input: { type: 'command', thread_id: 'i6314', command: 'ls' },
      tool_response: 'a\nb\nc\n\n---\nstatus = 0\ncwd = /Users/mia\nThis is the main shell. No command running in background.',
      duration_ms: 21,
    },
  },
  {
    label: 'SessionStart',
    event: 'SessionStart',
    payload: { source: 'startup', model: 'claude-opus-4-7' },
  },
  {
    label: 'Stop',
    event: 'Stop',
    payload: {},
  },
  {
    label: 'UserPromptSubmit',
    event: 'UserPromptSubmit',
    payload: { prompt: 'hello world' },
  },
];

async function runCase(c: Case): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', BIND, c.event], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d.toString()));
    child.stderr.on('data', d => (err += d.toString()));
    child.on('error', reject);
    child.on('close', code => resolve({ stdout: out, stderr: err, code }));
    child.stdin.end(JSON.stringify(c.payload));
  });
}

let failures = 0;
for (const c of CASES) {
  const { stdout, stderr, code } = await runCase(c);
  const ok = code === 0 && stdout.includes('"continue": true');
  process.stdout.write(`\n=== ${c.label} ${ok ? 'OK' : 'FAIL'} (exit ${code}) ===\n`);
  process.stdout.write(stderr);
  if (!ok) {
    failures += 1;
    process.stdout.write('\n--- stdout ---\n' + stdout + '\n');
  }
}

process.stdout.write(`\n${failures === 0 ? 'all cases passed' : failures + ' failures'}\n`);
process.exit(failures === 0 ? 0 : 1);
