#!/usr/bin/env bun
// Captures a whole simulated Claude Code session for the showcase page.
//
// Every `hook` beat below is fed through the real hook pipeline
// (hooks/bin/bind.ts, same binary Claude Code runs) and its actual ANSI
// stderr is converted to HTML. Nothing on the page is hand-authored terminal
// output, so the showcase cannot drift from what the hooks really render.
// Regenerated on every Pages deploy - see .github/workflows/pages.yml.
//
// HOME points at scripts/fixtures/demo-home so SessionStart finds a
// system-prompt.md and an ASCII art file, exercising the branches
// scripts/smoke.ts deliberately leaves empty.

import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCase, type Case } from './smoke.ts';
import { ansiToHtmlLines } from './ansi-to-html.ts';
import { DEMO_PNG, writeImageFixtures, removeImageFixtures } from './fixtures.ts';

const ROOT = path.resolve(import.meta.dir, '..');
const OUT = path.join(ROOT, 'public', 'demo-data.js');
const DEMO_HOME = path.join(ROOT, 'scripts', 'fixtures', 'demo-home');

const MARKETPLACE_ADD = '/plugin marketplace add tuomashatakka/claude-code-hooks';
const PLUGIN_INSTALL = '/plugin install hooks@claude-code-hooks';

/** A line the user types into the composer, then submits. */
interface PromptBeat {
  kind: 'prompt';
  text: string;
  /** Renders a copy button next to the line once it lands in the scrollback. */
  copyable?: boolean;
}

/** A hook firing: payload goes through bind.ts, its ANSI stderr comes back. */
interface HookBeat {
  kind: 'hook';
  caption: string;
  event: string;
  payload: unknown;
}

type Beat = PromptBeat | HookBeat;

const hook = (caption: string, event: string, payload: unknown): HookBeat => ({
  kind: 'hook',
  caption,
  event,
  payload,
});

const AGENT_PROMPT =
  'Audit every hook handler for events that render no badge, and list them (search breadth: medium).';

// A believable session, ordered the way Claude Code actually emits these:
// session banner -> install -> a real request -> tool calls -> stop.
const SCRIPT: Beat[] = [
  hook('SessionStart:startup says:', 'SessionStart', { source: 'startup', model: 'claude-opus-5' }),

  { kind: 'prompt', text: MARKETPLACE_ADD, copyable: true },
  { kind: 'prompt', text: PLUGIN_INSTALL, copyable: true },

  { kind: 'prompt', text: 'give the Stop hook a matching badge and check nothing else regressed' },
  hook('UserPromptSubmit says:', 'UserPromptSubmit', {
    prompt: 'give the Stop hook a matching badge and check nothing else regressed',
  }),

  hook('PreToolUse:Bash says:', 'PreToolUse', {
    tool_name: 'Bash',
    tool_input: { command: "rg -n 'renderBadges' src/hooks/index.ts", description: 'find badge call sites' },
  }),
  hook('PostToolUse:Bash says:', 'PostToolUse', {
    tool_name: 'Bash',
    tool_input: { command: "rg -n 'renderBadges' src/hooks/index.ts" },
    tool_response:
      '===== src/hooks/index.ts =====\n' +
      '  67: const badge = input.model\n' +
      '  68:   ? renderBadges(main, new Badge({ label: input.model, color: \'gray\' }))\n' +
      '  95: const badge = renderBadges(new Badge({ label: \'SessionEnd\', color: \'red\', icon: \'⏼\' }));\n' +
      ' 106: const badge = renderBadges(new Badge({ label: \'Stop\', color: \'red\', icon: \'■\' }));\n' +
      '--- 3 matches in 1 file\n' +
      'Done in 42ms — see /tmp/rg.log\n',
    duration_ms: 12,
  }),

  hook('PreToolUse:Edit says:', 'PreToolUse', {
    tool_name: 'mcp__wcgw__FileWriteOrEdit',
    tool_input: {
      file_path: 'src/hooks/index.ts',
      percentage_to_change: 8,
      thread_id: 'i6314',
      text_or_search_replace_blocks:
        '<<<<<<< SEARCH\n' +
        "    const badge = renderBadges(new Badge({ label: 'Stop', color: 'red', icon: '■' }));\n" +
        '=======\n' +
        "    const badge = renderBadges(\n" +
        "      new Badge({ label: 'Stop', color: 'red', icon: '■' }),\n" +
        "      new Badge({ label: 'turn complete', color: 'gray' }),\n" +
        '    );\n' +
        '>>>>>>> REPLACE',
    },
  }),

  hook('PostToolUse:Bash says:', 'PostToolUse', {
    tool_name: 'Bash',
    tool_input: { command: 'git diff --stat && bun test' },
    tool_response:
      'diff --git a/src/hooks/index.ts b/src/hooks/index.ts\n' +
      '--- a/src/hooks/index.ts\n' +
      '+++ b/src/hooks/index.ts\n' +
      '@@ -104,3 +104,6 @@\n' +
      "-    const badge = renderBadges(new Badge({ label: 'Stop', color: 'red', icon: '■' }));\n" +
      "+    const badge = renderBadges(\n" +
      "+      new Badge({ label: 'Stop', color: 'red', icon: '■' }),\n" +
      "+      new Badge({ label: 'turn complete', color: 'gray' }),\n" +
      '+    );\n',
    duration_ms: 340,
  }),

  hook('PostToolUse:TaskCreate says:', 'PostToolUse', {
    tool_name: 'TaskCreate',
    tool_input: {
      subject: 'Badge parity across all 14 hook events',
      description: 'Every event should render a badge row; Stop was the last one missing a secondary badge.',
    },
    tool_response: { success: true, task: { id: 7, subject: 'Badge parity across all 14 hook events' } },
    duration_ms: 34,
  }),

  hook('PreToolUse:Agent says:', 'PreToolUse', {
    tool_name: 'Agent',
    tool_input: { description: 'Audit hook badge coverage', prompt: AGENT_PROMPT },
  }),
  hook('PostToolUse:Agent says:', 'PostToolUse', {
    tool_name: 'Agent',
    tool_input: { description: 'Audit hook badge coverage', prompt: AGENT_PROMPT },
    tool_response: {
      isAsync: true,
      status: 'async_launched',
      agentId: 'ab9e5c61bab1e0212',
      resolvedModel: 'claude-opus-5',
      prompt: AGENT_PROMPT,
      outputFile: '/tmp/claude/agent-ab9e5c61/out',
      canReadOutputFile: true,
    },
    duration_ms: 6,
  }),

  hook('PostToolUse:Read says:', 'PostToolUse', {
    tool_name: 'Read',
    tool_input: { file_path: DEMO_PNG },
    tool_response: '[Image Data]',
    duration_ms: 5,
  }),

  hook('PostToolUse:TaskUpdate says:', 'PostToolUse', {
    tool_name: 'TaskUpdate',
    tool_input: { id: 7, status: 'completed' },
    tool_response: {
      success: true,
      taskId: 7,
      updatedFields: ['status'],
      statusChange: { from: 'in_progress', to: 'completed' },
      task: { id: 7, subject: 'Badge parity across all 14 hook events' },
    },
    duration_ms: 12,
  }),

  hook('Stop says:', 'Stop', {}),
];

// Hooks echo the absolute paths they read, which would otherwise bake this
// machine's (or the CI runner's) checkout location into the published page.
function normalizePaths(text: string): string {
  return text
    .split(DEMO_HOME).join('~')
    .split(ROOT).join('~/claude-code-hooks')
    .split(DEMO_PNG).join('~/claude-code-hooks/docs/sigil.png')
    .split(os.tmpdir()).join('/tmp');
}

writeImageFixtures();

const steps: unknown[] = [];
let captured = 0;

for (const beat of SCRIPT) {
  if (beat.kind === 'prompt') {
    steps.push(beat);
    continue;
  }
  const c: Case = { label: beat.caption, event: beat.event, payload: beat.payload };
  const { stderr, code } = await runCase(c, DEMO_HOME);
  if (code !== 0) throw new Error(`${beat.event} exited ${code}`);
  const lines = ansiToHtmlLines(normalizePaths(stderr.replace(/\n+$/, '')));
  if (!lines.length) throw new Error(`${beat.event} produced no output — hook registry empty?`);
  steps.push({ kind: 'hook', event: beat.event, caption: beat.caption, lines });
  captured++;
}

removeImageFixtures();

const session = { install: MARKETPLACE_ADD, steps };
writeFileSync(OUT, `window.__SESSION__ = ${JSON.stringify(session)};\n`);
console.log(`wrote ${OUT} — ${steps.length} beats, ${captured} captured from the live pipeline`);
