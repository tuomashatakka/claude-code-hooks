#!/usr/bin/env bun
// Feeds canned JSON into hooks/bin/bind.ts for each event/tool combo and prints
// the rendered systemMessage. Tool hooks carry it on stdout only; lifecycle
// hooks keep the legacy stderr mirror used by Claude Code.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { SMOKE_PNG, SMOKE_JPG, writeImageFixtures, removeImageFixtures } from './fixtures.ts';

const ROOT = path.resolve(import.meta.dir, '..');
const BIND = path.join(ROOT, 'hooks', 'bin', 'bind.ts');

export interface Case {
  label: string;
  event: string;
  payload: unknown;
  expectAsciiImage?: boolean;
}

export const CASES: Case[] = [
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
    label: 'PostToolUse — wcgw BashCommand (nested MCP content)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'mcp__wcgw__BashCommand',
      tool_input: { type: 'command', thread_id: 'i6314', command: 'git diff --cached --shortstat' },
      tool_response: {
        content: [{
          type: 'text',
          text: '37 files changed, 1434 insertions(+), 245 deletions(-)\n\n---\nstatus = process exited\ncwd = /home/user',
        }],
        isError: false,
      },
      duration_ms: 19,
    },
  },
  {
    label: 'PostToolUse — Playwright navigate',
    event: 'PostToolUse',
    payload: {
      tool_name: 'mcp__playwright__browser_navigate',
      tool_input: { url: 'https://example.com' },
      tool_response: { content: [{ type: 'text', text: 'page loaded' }], isError: false },
      duration_ms: 31,
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
    label: 'PostToolUse — TaskList',
    event: 'PostToolUse',
    payload: {
      tool_name: 'TaskList',
      tool_input: {},
      tool_response: {
        tasks: [
          {
            id: 1,
            subject: 'Fix syntax highlighting for TSX',
            description: 'Keep terminal colours intact while parsing output.',
            status: 'completed',
          },
          {
            id: 2,
            subject: 'Verify the hook bundle',
            description: 'Replay the compiled post-tool wire format.',
            status: 'pending',
          },
        ],
      },
      duration_ms: 9,
    },
  },
  {
    label: 'PostToolUse — Read (PNG Image)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'Read',
      tool_input: { file_path: SMOKE_PNG },
      tool_response: '[Image Data]',
      duration_ms: 5,
    },
    expectAsciiImage: true,
  },
  {
    label: 'PostToolUse — Read (JPEG Image)',
    event: 'PostToolUse',
    payload: {
      tool_name: 'Read',
      tool_input: { file_path: SMOKE_JPG },
      tool_response: '[Image Data]',
      duration_ms: 4,
    },
    expectAsciiImage: true,
  },
];

// SessionStart reads $HOME/system-prompt.md, and falls back to a random
// $HOME/Documents/Prompts/anime-ascii/*.txt when the bundled welcome image
// cannot be rendered - point HOME at a directory that won't exist so output is
// the same generic content regardless of whose machine (or CI runner) this runs on.
const SANDBOX_HOME = path.join(ROOT, '.smoke-home');

// capture-demo.ts passes a populated fixture home instead, so the showcase
// capture exercises the branches this sandbox deliberately leaves empty.
export async function runCase(
  c: Case,
  homeDir: string = SANDBOX_HOME,
  // Neither the smoke run nor the Pages build has a TTY, so the renderer falls
  // back to TUI_TOKENS.width.fallbackContent unless a width is stated. The
  // showcase states one, to fill the window it is drawn into.
  columns?: number
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', BIND, c.event], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: homeDir,
        USERPROFILE: homeDir,
        ...(columns ? { COLUMNS: String(columns) } : {}),
      },
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

export function renderedHookOutput(stdout: string, stderr: string): string {
  if (stderr.trim()) return stderr;
  try {
    const output = JSON.parse(stdout) as { systemMessage?: unknown };
    return typeof output.systemMessage === 'string' ? output.systemMessage : '';
  } catch {
    return '';
  }
}

if (import.meta.main) {
  writeImageFixtures();

  let failures = 0;
  for (const c of CASES) {
    const { stdout, stderr, code } = await runCase(c);
    let output: Record<string, unknown> | null = null;
    try {
      output = JSON.parse(stdout) as Record<string, unknown>;
    } catch {
      // Reported below with the raw stdout payload.
    }
    const rendered = renderedHookOutput(stdout, stderr);
    const isToolHook = c.event === 'PostToolUse';
    const imageAssertion = c.expectAsciiImage && (
      rendered.includes('[Image Data]')
      || !/[\u2580\u2584\u2588\u{1FB00}-\u{1FB3B}\u{1CE51}-\u{1CE8F}]/u.test(rendered)
    )
      ? 'expected image read to render ANSI block ascii instead of the raw image placeholder'
      : null;
    const wireAssertion = output === null
      ? 'stdout was not valid hook JSON'
      : typeof output.systemMessage !== 'string'
        ? 'hook JSON did not contain a systemMessage'
        : isToolHook && stderr !== ''
          ? 'tool hook mirrored its systemMessage to stderr'
          : isToolHook && ('continue' in output || 'hookSpecificOutput' in output)
            ? 'tool hook emitted unsupported wire fields'
            : null;
    const ok = code === 0 && !wireAssertion && !imageAssertion;
    process.stdout.write(`\n=== ${c.label} ${ok ? 'OK' : 'FAIL'} (exit ${code}) ===\n`);
    process.stdout.write(rendered);
    if (!ok) {
      failures += 1;
      if (wireAssertion) process.stdout.write('\n--- assertion ---\n' + wireAssertion + '\n');
      if (imageAssertion) process.stdout.write('\n--- assertion ---\n' + imageAssertion + '\n');
      process.stdout.write('\n--- stdout ---\n' + stdout + '\n');
      if (stderr) process.stdout.write('\n--- stderr ---\n' + stderr + '\n');
    }
  }

  removeImageFixtures();

  process.stdout.write(`\n${failures === 0 ? 'all cases passed' : failures + ' failures'}\n`);
  process.exit(failures === 0 ? 0 : 1);
}
