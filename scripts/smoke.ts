#!/usr/bin/env bun
// Feeds canned JSON into hooks/bin/bind.ts for each event/tool combo and prints
// stderr (the systemMessage). Used as a quick visual sanity check + smoke test.

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

const ROOT = path.resolve(import.meta.dir, '..');
const BIND = path.join(ROOT, 'hooks', 'bin', 'bind.ts');

export interface Case {
  label: string;
  event: string;
  payload: unknown;
}

export const CASES: Case[] = [
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
      tool_input: { command: 'echo "hello"\necho "==="\necho "world"\necho "--- info"\necho "===== section title ====="\necho "bye"' },
      tool_response: 'hello\n===\nworld\n--- info\n===== section title =====\nbye\nDone in 42ms — see /tmp/out.log\nerror: something exploded\n',
      duration_ms: 12,
    },
  },
  {
    label: 'PostToolUse — Bash (diff output, rulers untouched)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'Bash',
      tool_input: { command: 'git diff' },
      tool_response: 'diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -1,2 +1,2 @@\n-const x = 1\n+const x = 2\n',
      duration_ms: 8,
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
      tool_response: 'a\nb\nc\n\n---\nstatus = 0\ncwd = /home/user\nThis is the main shell. No command running in background.',
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
  {
    label: 'PreToolUse — Agent',
    event: 'PreToolUse',
    payload: {
      tool_name: 'Agent',
      tool_input: {
        description: 'Explore package export structure',
        prompt: 'Explore the repo at /Users/mia/Documents/Projects/ai/skills/threejs-scenes (search breadth: medium). This is an npm package.\n\nHere are some details:\n- list exports\n- compile',
      },
    },
  },
  {
    label: 'PostToolUse — Agent',
    event: 'PostToolUse',
    payload: {
      tool_name: 'Agent',
      tool_input: {
        description: 'Explore package export structure',
        prompt: 'Explore the repo at /Users/mia/Documents/Projects/ai/skills/threejs-scenes (search breadth: medium). This is an npm package.\n\nHere are some details:\n- list exports\n- compile',
      },
      tool_response: {
        isAsync: true,
        status: 'async_launched',
        agentId: 'ab9e5c61bab1e0212',
        resolvedModel: 'claude-opus-4-8',
        prompt: 'Explore the repo at /Users/mia/Documents/Projects/ai/skills/threejs-scenes (search breadth: medium). This is an npm package.\n\nHere are some details:\n- list exports\n- compile',
        outputFile: '/private/tmp/claude-501/-Users-mia-Documents-Projects-ai-skills-threejs-scenes/8b6081c5-93c1-46fe-a72c-05bd382ee8a8/out',
        canReadOutputFile: true,
      },
      duration_ms: 6,
    },
  },
  {
    label: 'PostToolUse — ExitPlanMode',
    event: 'PostToolUse',
    payload: {
      tool_name: 'ExitPlanMode',
      tool_input: { plan: 'The plan is complete.' },
      tool_response: { success: true },
      duration_ms: 1,
    },
  },
  {
    label: 'PostToolUse — TaskCreate',
    event: 'PostToolUse',
    payload: {
      tool_name: 'TaskCreate',
      tool_input: {
        subject: 'M6: @recall/skill + plugin wiring + docs',
        description: 'Wire up the @recall skill, connect it to the plugin, and write docs.',
      },
      tool_response: {
        success: true,
        task: { id: 7, subject: 'M6: @recall/skill + plugin wiring + docs' },
      },
      duration_ms: 34,
    },
  },
  {
    label: 'PostToolUse — TaskUpdate (Completed)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'TaskUpdate',
      tool_input: { id: 1, status: 'completed' },
      tool_response: {
        success: true,
        taskId: 1,
        updatedFields: ['status'],
        statusChange: { from: 'in_progress', to: 'completed' },
        task: { id: 1, subject: 'Fix syntax highlighting for TSX' },
      },
      duration_ms: 12,
    },
  },
  {
    label: 'PostToolUse — TaskUpdate (In Progress)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'TaskUpdate',
      tool_input: { id: 1, status: 'in_progress' },
      tool_response: {
        success: true,
        taskId: 1,
        updatedFields: ['status'],
        statusChange: { from: 'todo', to: 'in_progress' },
        task: { id: 1, subject: 'Fix syntax highlighting for TSX' },
      },
      duration_ms: 15,
    },
  },
  {
    label: 'PostToolUse — Read (PNG Image)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test-smoke.png' },
      tool_response: '[Image Data]',
      duration_ms: 5,
    },
  },
  {
    label: 'PreToolUse — ExitPlanMode',
    event: 'PreToolUse',
    payload: {
      tool_name: 'ExitPlanMode',
      tool_input: { plan: 'Final plan summary' },
    },
  },
  {
    label: 'PreToolUse — TaskUpdate',
    event: 'PreToolUse',
    payload: {
      tool_name: 'TaskUpdate',
      tool_input: { id: 1, status: 'completed' },
    },
  },
  {
    label: 'PostToolUse — Read (JPEG Image)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test-smoke.jpg' },
      tool_response: '[Image Data]',
      duration_ms: 4,
    },
  },
];

// SessionStart reads $HOME/system-prompt.md and $HOME/Documents/Prompts/anime-ascii/*
// if present - point HOME at a directory that won't exist so output is the
// same generic content regardless of whose machine (or CI runner) this runs on.
const SANDBOX_HOME = path.join(ROOT, '.smoke-home');

export async function runCase(c: Case): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', BIND, c.event], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: SANDBOX_HOME, USERPROFILE: SANDBOX_HOME },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d.toString()));
    child.stderr.on('data', d => (err += d.toString()));
    child.on('error', reject);
    child.on('close', code => resolve({ stdout: out, stderr: err, code }));
    child.stdin.end(JSON.stringify(c.payload));
  });
}

if (import.meta.main) {
  // Generate a mock PNG file to test the image-to-ascii conversion
  const png = new PNG({ width: 8, height: 8 });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = x * 32;       // R
      png.data[idx + 1] = y * 32;   // G
      png.data[idx + 2] = 128;      // B
      png.data[idx + 3] = 255;      // A
    }
  }
  fs.writeFileSync('/tmp/test-smoke.png', PNG.sync.write(png));

  // Generate a mock JPEG file to test the image-to-ascii conversion
  const width = 8;
  const height = 8;
  const frameData = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      frameData[idx] = x * 32;       // R
      frameData[idx + 1] = y * 32;   // G
      frameData[idx + 2] = 128;      // B
      frameData[idx + 3] = 255;      // A
    }
  }
  const jpegImageData = {
    data: frameData,
    width: width,
    height: height,
  };
  const jpegBuffer = jpeg.encode(jpegImageData, 50).data;
  fs.writeFileSync('/tmp/test-smoke.jpg', jpegBuffer);

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

  try {
    fs.unlinkSync('/tmp/test-smoke.png');
  } catch {}
  try {
    fs.unlinkSync('/tmp/test-smoke.jpg');
  } catch {}

  process.stdout.write(`\n${failures === 0 ? 'all cases passed' : failures + ' failures'}\n`);
  process.exit(failures === 0 ? 0 : 1);
}
