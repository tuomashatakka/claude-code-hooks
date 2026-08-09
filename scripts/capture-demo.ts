#!/usr/bin/env bun
// Captures a whole simulated Claude Code session for the showcase page.
//
// Every `hook` beat below is fed through the real hook pipeline
// (hooks/bin/bind.ts, same binary Claude Code runs) and its actual ANSI
// systemMessage is converted to HTML. Nothing on the page is hand-authored
// terminal output, so the showcase cannot drift from the live hook renderer.
// Regenerated on every Pages deploy - see .github/workflows/pages.yml.
//
// HOME points at scripts/fixtures/demo-home so SessionStart finds a
// system-prompt.md and an ASCII art file, exercising the branches
// scripts/smoke.ts deliberately leaves empty.

import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderedHookOutput, runCase, type Case } from './smoke.ts';
import { ansiToHtmlLines } from './ansi-to-html.ts';
import { DEMO_PNG, writeImageFixtures, removeImageFixtures } from './fixtures.ts';

const ROOT = path.resolve(import.meta.dir, '..');
const OUT = path.join(ROOT, 'public', 'demo-data.js');
const DEMO_HOME = path.join(ROOT, 'scripts', 'fixtures', 'demo-home');

const MARKETPLACE_ADD = '/plugin marketplace add tuomashatakka/claude-code-hooks';
const PLUGIN_INSTALL = '/plugin install hooks@claude-code-hooks';

/**
 * One example: a single tool call, framed the way Claude Code frames it.
 *
 *   > give the Stop hook a matching badge          <- prompt (optional)
 *   ⏺ Bash(rg -n 'renderBadges' src/hooks/index.ts) <- header (optional)
 *     ⎿  PostToolUse:Bash says:  ❯ Bash  OUTPUT     <- caption + hook line 0
 *        …                                          <- hook lines, indented 5
 *
 * The page shows exactly one of these at a time; the viewer advances.
 */
interface Beat {
  caption: string;
  event: string;
  payload: unknown;
  /** Claude Code's own tool-call line, minus the ⏺ the page draws. */
  header?: string;
  /** The user turn that led here, shown above the call. */
  prompt?: string;
  /** One line of plain-English context for the viewer. */
  note?: string;
}

const hook = (
  caption: string,
  event: string,
  payload: unknown,
  extra: Partial<Beat> = {}
): Beat => ({ caption, event, payload, ...extra });

const AGENT_PROMPT =
  'Audit every hook handler for events that render no badge, and list them (search breadth: medium).';

const CHAIN_CMD = [
  "D=/tmp/repro && mkdir -p $D && cd $D && cat > reg.ts <<'EOF'",
  'export const REGISTRY = new Map<string, string>();',
  'export function define(k: string, v: string) { REGISTRY.set(k, v); }',
  "export function dispatch(k: string) { return REGISTRY.get(k) ?? 'MISSING'; }",
  'EOF',
  'for t in bun node; do bun build main.ts --target=$t --outfile out-$t.mjs >/dev/null 2>&1; echo "target=$t"; done',
].join('\n');

// One tool call per example, ordered as a session would run them.
const SCRIPT: Beat[] = [
  hook('SessionStart:startup says:', 'SessionStart', { source: 'startup', model: 'claude-opus-5' }, {
    note: 'Session banner: ASCII art, a block-letter heading and the source + model badges.',
  }),

  hook('UserPromptSubmit says:', 'UserPromptSubmit', {
    prompt: 'give the Stop hook a matching badge and check nothing else regressed',
  }, {
    prompt: 'give the Stop hook a matching badge and check nothing else regressed',
    note: 'Every prompt you submit is echoed back through the hook.',
  }),

  hook('PostToolUse:Bash says:', 'PostToolUse', {
    tool_name: 'Bash',
    tool_input: { command: "rg -n 'renderBadges' src/hooks/index.ts" },
    tool_response:
      '===== src/hooks/index.ts =====\n' +
      '  67: const badge = input.model\n' +
      "  68:   ? renderBadges(main, new Badge({ label: input.model, color: 'gray' }))\n" +
      "  95: const badge = renderBadges(new Badge({ label: 'SessionEnd', color: 'red', icon: '⏼' }));\n" +
      " 106: const badge = renderBadges(new Badge({ label: 'Stop', color: 'red', icon: '■' }));\n" +
      '--- 3 matches in 1 file\n' +
      'Done in 42ms — see /tmp/rg.log\n',
    duration_ms: 12,
  }, {
    header: "Bash(rg -n 'renderBadges' src/hooks/index.ts)",
    note: 'After it returns: input and output as separate cards, rulers turned into dividers.',
  }),

  hook('PostToolUse:Bash says:', 'PostToolUse', {
    tool_name: 'Bash',
    tool_input: { command: CHAIN_CMD },
    tool_response: 'target=bun copies=1 run=hello\ntarget=node copies=1 run=hello\n',
    duration_ms: 118,
  }, {
    header: 'Bash(D=/tmp/repro && mkdir -p $D && cd $D && …)',
    note: 'A chained command: each separator ends its own row, and heredoc bodies pass through untouched.',
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
      '+    const badge = renderBadges(\n' +
      "+      new Badge({ label: 'Stop', color: 'red', icon: '■' }),\n" +
      "+      new Badge({ label: 'turn complete', color: 'gray' }),\n" +
      '+    );\n',
    duration_ms: 340,
  }, {
    header: 'Bash(git diff --stat && bun test)',
    note: 'Diff output keeps its own colouring — the ruler pass leaves --- and +++ headers alone.',
  }),

  hook('PostToolUse:TaskCreate says:', 'PostToolUse', {
    tool_name: 'TaskCreate',
    tool_input: {
      subject: 'Badge parity across all 13 active hook events',
      description: 'Every active event should render a badge row; Stop was the last one missing a secondary badge.',
    },
    tool_response: { success: true, task: { id: 7, subject: 'Badge parity across all 13 active hook events' } },
    duration_ms: 34,
  }, {
    header: 'TaskCreate(Badge parity across all 13 active hook events)',
    note: 'Tasks get a giant checkbox so a created task is unmissable in the scrollback.',
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
  }, {
    header: 'Agent(Audit hook badge coverage)',
    note: 'A launched subagent renders as a metadata card instead of raw JSON.',
  }),

  hook('PostToolUse:Read says:', 'PostToolUse', {
    tool_name: 'Read',
    tool_input: { file_path: DEMO_PNG },
    tool_response: '[Image Data]',
    duration_ms: 5,
  }, {
    header: 'Read(docs/sigil.png)',
    note: 'Images become high-fidelity ANSI sextant previews, with a half-block fallback for limited fonts.',
  }),

  hook('PostToolUse:TaskUpdate says:', 'PostToolUse', {
    tool_name: 'TaskUpdate',
    tool_input: { id: 7, status: 'completed' },
    tool_response: {
      success: true,
      taskId: 7,
      updatedFields: ['status'],
      statusChange: { from: 'in_progress', to: 'completed' },
      task: { id: 7, subject: 'Badge parity across all 13 active hook events' },
    },
    duration_ms: 12,
  }, {
    header: 'TaskUpdate(7 → completed)',
    note: 'Completing a task ticks the box and states the transition.',
  }),

  hook('Stop says:', 'Stop', {}, {
    note: 'End of turn: a block-letter sign-off with a generated kaomoji phrase.',
  }),
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

const examples: unknown[] = [];

for (const beat of SCRIPT) {
  const c: Case = { label: beat.caption, event: beat.event, payload: beat.payload };
  const { stdout, stderr, code } = await runCase(c, DEMO_HOME);
  if (code !== 0) throw new Error(beat.event + ' exited ' + code);
  const rendered = renderedHookOutput(stdout, stderr);
  const lines = ansiToHtmlLines(normalizePaths(rendered.replace(/\n+$/, '')));
  if (!lines.length) throw new Error(beat.event + ' produced no output — hook registry empty?');
  examples.push({
    event: beat.event,
    caption: beat.caption,
    header: beat.header ?? null,
    prompt: beat.prompt ?? null,
    note: beat.note ?? null,
    lines,
  });
}

removeImageFixtures();

const session = { install: MARKETPLACE_ADD, installPlugin: PLUGIN_INSTALL, examples };
writeFileSync(OUT, 'window.__SESSION__ = ' + JSON.stringify(session) + ';\n');
console.log('wrote ' + OUT + ' — ' + examples.length + ' examples captured from the live pipeline');
