#!/usr/bin/env bun
// Captures a whole simulated Claude Code session for the showcase page.
//
// Every `hook` beat below is fed through the real hook pipeline
// (hooks/bin/bind.ts, same binary Claude Code runs) and its actual ANSI
// systemMessage is converted to HTML. Nothing on the page is hand-authored
// terminal output, so the showcase cannot drift from the live hook renderer.
// Regenerated on every Pages deploy - see .github/workflows/pages.yml.
//
// Beats are grouped into chapters; the page turns those into a chapter strip
// and gives every beat a URL hash, so a single renderer is linkable.
//
// The coverage guard at the bottom is the point of the whole file: it fails the
// build when a hook event or a tool strategy exists with nothing on the page
// demonstrating it. Adding a renderer means adding a beat.
//
// HOME points at scripts/fixtures/demo-home so SessionStart finds a
// system-prompt.md and an ASCII art file, exercising the branches
// scripts/smoke.ts deliberately leaves empty.

import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderedHookOutput, runCase, type Case } from './smoke.ts';
import { ansiToHtmlLines } from './ansi-to-html.ts';
import { demoContextPath, demoImagePath, writeDemoFixtures, removeDemoFixtures } from './fixtures.ts';
import { listHooks } from '../src/registry/hook-registry.ts';
import { getToolDefinition, listToolDefinitions } from '../src/registry/tool-registry.ts';
import '../src/hooks/index.ts';
import '../src/tools/index.ts';

const ROOT = path.resolve(import.meta.dir, '..');
const OUT = path.join(ROOT, 'public', 'demo-data.js');
const DEMO_HOME = path.join(ROOT, 'scripts', 'fixtures', 'demo-home');
const DEMO_PNG = demoImagePath(DEMO_HOME);
const DEMO_CONTEXT = demoContextPath(DEMO_HOME);

const MARKETPLACE_ADD = '/plugin marketplace add tuomashatakka/claude-code-hooks';
const PLUGIN_INSTALL = '/plugin install hooks@claude-code-hooks';

// The capture has no TTY, so the renderer would size cards for an assumed
// 96-column terminal. The showcase window is wider than that at every viewport
// the page supports (the type scale shrinks with it), so it states its own.
const CAPTURE_COLUMNS = 112;

// Real files, read off disk by the file-preview renderer exactly as they are in
// a live session — so the syntax highlighting on the page is the real thing.
const SRC_REGISTRY = path.join(ROOT, 'src', 'registry', 'tool-registry.ts');
const SRC_TOKENS = path.join(ROOT, 'src', 'tui', 'tokens.ts');
const SRC_DURATION = path.join(ROOT, 'src', 'tui', 'duration.ts');
const SRC_RULER = path.join(ROOT, 'src', 'tui', 'ruler.ts');

const CHAPTERS = [
  { id: 'session', label: 'session' },
  { id: 'shell', label: 'shell' },
  { id: 'files', label: 'files' },
  { id: 'web', label: 'web' },
  { id: 'tasks', label: 'tasks' },
  { id: 'fail', label: 'failure' },
] as const;

type ChapterId = (typeof CHAPTERS)[number]['id'];

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
  /** URL hash for this beat — stable, so links keep working. */
  id: string;
  chapter: ChapterId;
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
  id: string,
  chapter: ChapterId,
  caption: string,
  event: string,
  payload: unknown,
  extra: Partial<Beat> = {}
): Beat => ({ id, chapter, caption, event, payload, ...extra });

/** PostToolUse beats all share this shape; this keeps the table readable. */
const tool = (
  id: string,
  chapter: ChapterId,
  toolName: string,
  toolInput: unknown,
  toolResponse: unknown,
  durationMs: number,
  extra: Partial<Beat> = {}
): Beat => hook(
  id,
  chapter,
  `PostToolUse:${toolName.replace(/^mcp__/, '')} says:`,
  'PostToolUse',
  { tool_name: toolName, tool_input: toolInput, tool_response: toolResponse, duration_ms: durationMs },
  extra
);

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

// `--session qa` takes a value, so the operation parser has to step over it to
// reach `open`/`click`/`screenshot` — which is exactly the branch the ƒ badges
// on this beat are proving.
const AGENT_BROWSER_CMD = [
  'agent-browser --session qa open https://tuomashatakka.github.io/claude-code-hooks/',
  "agent-browser --session qa click 'button#next'",
  'agent-browser --session qa screenshot --screenshot-format png',
].join(' && ');

const SEARCH_REPLACE = [
  '<<<<<<< SEARCH',
  '  card: {',
  "    background: '#252525',",
  '=======',
  '  card: {',
  "    background: '#302f32',",
  '>>>>>>> REPLACE',
].join('\n');

const EXPANDED_PROMPT =
  'Review the changed code for reuse, simplification, efficiency and altitude cleanups, '
  + 'then apply the fixes. Quality only — do not hunt for bugs; use /code-review for that. '
  + 'Start from the diff against the merge base, not the whole tree.';

// One tool call per example, ordered as a session would run them.
const SCRIPT: Beat[] = [
  /* ---------------------------------------------------------- session ---- */

  hook('session-start', 'session', 'SessionStart:startup says:', 'SessionStart',
    { source: 'startup', model: 'claude-opus-5' }, {
    note: 'Session banner: braille welcome art sized to the byte budget, a block-letter heading, and the source + model badges.',
  }),

  hook('instructions-loaded', 'session', 'InstructionsLoaded says:', 'InstructionsLoaded', {
    file_path: path.join(ROOT, 'CLAUDE.md'),
    memory_type: 'Project',
    load_reason: 'startup',
  }, {
    note: 'Every CLAUDE.md that enters context announces itself — which file, which memory type, and why it loaded.',
  }),

  hook('prompt-submit', 'session', 'UserPromptSubmit says:', 'UserPromptSubmit', {
    prompt: 'give the Stop hook a matching badge and check nothing else regressed',
  }, {
    prompt: 'give the Stop hook a matching badge and check nothing else regressed',
    note: 'Every prompt you submit is echoed back through the hook.',
  }),

  hook('prompt-expansion', 'session', 'UserPromptExpansion says:', 'UserPromptExpansion', {
    original_prompt: '/simplify',
    expanded_prompt: EXPANDED_PROMPT,
  }, {
    prompt: '/simplify',
    note: 'A slash command is a prompt in disguise — this shows what the skill actually asked for.',
  }),

  tool('wcgw-init', 'session', 'mcp__wcgw__Initialize',
    { type: 'first_call', any_workspace_path: ROOT, mode_name: 'wcgw' },
    {
      content: [{
        type: 'text',
        text: '# Environment\nsystem: Darwin  cwd: ~/claude-code-hooks\n'
          + '# Repository\nbranch: feat/image-preview-fidelity, clean\n'
          + '# Mode\nwcgw — all tools unrestricted',
      }],
      isError: false,
    }, 44, {
    header: 'wcgw ▸ Initialize(~/claude-code-hooks)',
    note: 'MCP servers get the same treatment: wcgw\'s workspace handshake collapses to the three lines that matter.',
  }),

  hook('pre-compact', 'session', 'PreCompact says:', 'PreCompact', {
    trigger: 'auto',
    custom_instructions: 'Keep the badge audit findings and the file paths; drop the tool transcripts.',
  }, {
    note: 'Before the context window is compacted: the trigger, and whatever instructions steer the summary.',
  }),

  hook('post-compact', 'session', 'PostCompact says:', 'PostCompact', {
    summary: 'Audited all 13 hook handlers; Stop and SessionEnd were the two missing a secondary badge. '
      + 'Fix is in src/hooks/index.ts, tests updated, nothing else touched.',
  }, {
    note: 'And after: the same heading, the other badge, and what survived the compaction.',
  }),

  hook('wake-up', 'session', 'SessionStart:compact says:', 'SessionStart',
    { source: 'compact', model: 'claude-opus-5' }, {
    note: 'Coming back from a compaction takes the other branch of the same heading — WAKE UP instead of BEGIN AGAIN.',
  }),

  tool('wcgw-ctx', 'session', 'mcp__wcgw__ContextSave',
    { id: 'hooks-badge-parity', project_root_path: ROOT, description: 'Badge parity audit' },
    `Context saved successfully at ${DEMO_CONTEXT}`,
    58, {
    header: 'wcgw ▸ ContextSave(hooks-badge-parity)',
    note: 'The saved context inlines every matched file — megabytes of it — so the preview keeps the head and accounts for the rest.',
  }),

  hook('stop', 'session', 'Stop says:', 'Stop', {}, {
    note: 'End of turn: a block-letter sign-off with a generated kaomoji phrase.',
  }),

  hook('session-end', 'session', 'SessionEnd says:', 'SessionEnd', {}, {
    note: 'And the door closing behind you.',
  }),

  /* ------------------------------------------------------------ shell ---- */

  tool('bash-grep', 'shell', 'Bash',
    { command: "rg -n 'renderBadges' src/hooks/index.ts" },
    '===== src/hooks/index.ts =====\n'
    + '  67: const badge = input.model\n'
    + "  68:   ? renderBadges(main, new Badge({ label: input.model, color: 'gray' }))\n"
    + "  95: const badge = renderBadges(new Badge({ label: 'SessionEnd', color: 'red', icon: '⏼' }));\n"
    + " 106: const badge = renderBadges(new Badge({ label: 'Stop', color: 'red', icon: '■' }));\n"
    + '--- 3 matches in 1 file\n'
    + 'Done in 42ms — see /tmp/rg.log\n',
    12, {
    header: "Bash(rg -n 'renderBadges' src/hooks/index.ts)",
    note: 'After it returns: input and output as separate cards, rulers turned into dividers.',
  }),

  tool('bash-chain', 'shell', 'Bash',
    { command: CHAIN_CMD },
    'target=bun copies=1 run=hello\ntarget=node copies=1 run=hello\n',
    118, {
    header: 'Bash(D=/tmp/repro && mkdir -p $D && cd $D && …)',
    note: 'A chained command: each separator ends its own row, and heredoc bodies pass through untouched.',
  }),

  tool('bash-diff', 'shell', 'Bash',
    { command: 'git diff --stat && bun test' },
    'diff --git a/src/hooks/index.ts b/src/hooks/index.ts\n'
    + '--- a/src/hooks/index.ts\n'
    + '+++ b/src/hooks/index.ts\n'
    + '@@ -104,3 +104,6 @@\n'
    + "-    const badge = renderBadges(new Badge({ label: 'Stop', color: 'red', icon: '■' }));\n"
    + '+    const badge = renderBadges(\n'
    + "+      new Badge({ label: 'Stop', color: 'red', icon: '■' }),\n"
    + "+      new Badge({ label: 'turn complete', color: 'gray' }),\n"
    + '+    );\n',
    340, {
    header: 'Bash(git diff --stat && bun test)',
    note: 'Diff output keeps its own colouring — the ruler pass leaves --- and +++ headers alone.',
  }),

  tool('wcgw-bash', 'shell', 'mcp__wcgw__BashCommand',
    { type: 'command', thread_id: 'i6314', command: 'bun test 2>&1 | tail -3' },
    '102 pass\n0 fail\nRan 102 tests across 11 files.\n\n'
    + '---\nstatus = 0\n'
    + `cwd = ${ROOT}\n`
    + 'This is the main shell. No command running in background.',
    2140, {
    header: 'wcgw ▸ BashCommand(bun test 2>&1 | tail -3)',
    note: 'wcgw appends a trailer to stdout; it is parsed off and rendered as a status row instead of trailing noise.',
  }),

  /* ------------------------------------------------------------ files ---- */

  tool('read-source', 'files', 'Read',
    { file_path: SRC_REGISTRY },
    '[file contents]',
    9, {
    header: 'Read(src/registry/tool-registry.ts)',
    note: 'A source file comes back syntax-highlighted, in a file card titled with its path — language picked from the extension.',
  }),

  tool('edit', 'files', 'Edit',
    {
      file_path: SRC_TOKENS,
      old_string: "background: '#252525',",
      new_string: "background: '#302f32',",
    },
    {
      filePath: SRC_TOKENS,
      structuredPatch: [{ oldStart: 7, oldLines: 6, newStart: 7, newLines: 12 }],
    },
    27, {
    header: 'Edit(src/tui/tokens.ts)',
    note: 'Edit answers with a structured patch, so the file is re-read and cropped to the changed span plus three lines — not dumped whole.',
  }),

  tool('wcgw-write', 'files', 'mcp__wcgw__FileWriteOrEdit',
    { file_path: SRC_TOKENS, percentage_to_change: 8, text_or_search_replace_blocks: SEARCH_REPLACE },
    { content: [{ type: 'text', text: 'Success' }], isError: false },
    61, {
    header: 'wcgw ▸ FileWriteOrEdit(src/tui/tokens.ts)',
    note: 'wcgw only ever answers "Success", so the search/replace blocks are parsed to tell an edit from a write, and the result is read back off disk.',
  }),

  tool('wcgw-read', 'files', 'mcp__wcgw__ReadFiles',
    { file_paths: [SRC_DURATION, SRC_RULER] },
    { content: [{ type: 'text', text: 'ok' }], isError: false },
    18, {
    header: 'wcgw ▸ ReadFiles(2 files)',
    note: 'Several files at once, each in its own card — the opaque MCP payload is ignored in favour of what is actually on disk.',
  }),

  tool('read-image', 'files', 'Read',
    { file_path: DEMO_PNG },
    '[Image Data]',
    5, {
    header: 'Read(docs/sigil.png)',
    note: 'Images become high-fidelity ANSI sextant previews, with a half-block fallback for limited fonts.',
  }),

  /* -------------------------------------------------------------- web ---- */

  tool('pw-navigate', 'web', 'mcp__playwright__browser_navigate',
    { url: 'https://tuomashatakka.github.io/claude-code-hooks/' },
    {
      content: [{
        type: 'text',
        text: '### Page state\n- Page URL: https://tuomashatakka.github.io/claude-code-hooks/\n'
          + '- Page Title: claude-code-hooks — beautified hook output for Claude Code\n'
          + '- Page Snapshot:\n  - main "Simulated Claude Code session"\n    - button "Next example"',
      }],
      isError: false,
    },
    412, {
    header: 'playwright ▸ browser navigate(…/claude-code-hooks/)',
    note: 'Browser tools get an extra ƒ badge naming the operation, so a wall of MCP calls stays scannable.',
  }),

  tool('pw-evaluate', 'web', 'mcp__playwright__browser_evaluate',
    { function: '() => ({ examples: window.__SESSION__.examples.length })' },
    {
      content: [{
        type: 'text',
        text: '{"examples": 31, "chapters": 6, "hash": "#read-image", "reduceMotion": false}',
      }],
      isError: false,
    },
    38, {
    header: 'playwright ▸ browser evaluate(() => …)',
    note: 'A JSON answer is detected, re-indented and highlighted rather than printed as one long line.',
  }),

  tool('agent-browser', 'web', 'Bash',
    { command: AGENT_BROWSER_CMD },
    'session qa: opened https://tuomashatakka.github.io/claude-code-hooks/\n'
    + 'session qa: clicked button#next\n'
    + 'session qa: wrote .agent-browser/screenshots/qa-002.png\n',
    3180, {
    header: 'Bash(agent-browser --session qa open … && …)',
    note: 'agent-browser runs through plain Bash, so the command is parsed for its subcommands — one ƒ badge per operation in the chain.',
  }),

  tool('generic-fallback', 'web', 'WebFetch',
    { url: 'https://bun.sh/docs/bundler', prompt: 'What targets does bun build support?' },
    {
      code: 200,
      codeText: 'OK',
      url: 'https://bun.sh/docs/bundler',
      durationMs: 806,
      result: '`bun build` targets `bun`, `node` and `browser`. `--target=bun` emits a bundle\n'
        + 'with the Bun runtime APIs left as imports; `--target=node` shims them.',
    },
    806, {
    header: 'WebFetch(https://bun.sh/docs/bundler)',
    note: 'A tool with no dedicated renderer still gets split into its answer and its metadata, instead of one JSON blob.',
  }),

  /* ------------------------------------------------------------ tasks ---- */

  tool('task-create', 'tasks', 'TaskCreate',
    {
      subject: 'Badge parity across all 13 active hook events',
      description: 'Every active event should render a badge row; Stop was the last one missing a secondary badge.',
    },
    { success: true, task: { id: 7, subject: 'Badge parity across all 13 active hook events' } },
    34, {
    header: 'TaskCreate(Badge parity across all 13 active hook events)',
    note: 'Tasks get a giant checkbox so a created task is unmissable in the scrollback.',
  }),

  tool('agent-launch', 'tasks', 'Agent',
    { description: 'Audit hook badge coverage', prompt: AGENT_PROMPT },
    {
      isAsync: true,
      status: 'async_launched',
      agentId: 'ab9e5c61bab1e0212',
      resolvedModel: 'claude-opus-5',
      prompt: AGENT_PROMPT,
      outputFile: '/tmp/claude/agent-ab9e5c61/out',
      canReadOutputFile: true,
    },
    6, {
    header: 'Agent(Audit hook badge coverage)',
    note: 'A launched subagent renders as a metadata card instead of raw JSON.',
  }),

  hook('subagent-start', 'tasks', 'SubagentStart says:', 'SubagentStart', {
    agent_id: 'ab9e5c61bab1e0212',
    agent_type: 'Explore',
  }, {
    note: 'The subagent itself announces both ends of its life — this is the near side.',
  }),

  hook('subagent-stop', 'tasks', 'SubagentStop says:', 'SubagentStop', {
    agent_type: 'Explore',
  }, {
    note: 'And the far side, so a fan-out of agents reads as pairs instead of noise.',
  }),

  tool('task-update', 'tasks', 'TaskUpdate',
    { id: 7, status: 'completed' },
    {
      success: true,
      taskId: 7,
      updatedFields: ['status'],
      statusChange: { from: 'in_progress', to: 'completed' },
      task: { id: 7, subject: 'Badge parity across all 13 active hook events' },
    },
    12, {
    header: 'TaskUpdate(7 → completed)',
    note: 'Completing a task ticks the box and states the transition.',
  }),

  tool('task-list', 'tasks', 'TaskList',
    {},
    {
      success: true,
      tasks: [
        { id: 7, subject: 'Badge parity across all 13 active hook events', status: 'completed' },
        { id: 8, subject: 'Cover every renderer on the showcase page', status: 'in_progress' },
        { id: 9, subject: 'Retheme the terminal to match Hyper', status: 'pending' },
      ],
    },
    8, {
    header: 'TaskList()',
    note: 'The whole list, each task drawn in the state it is actually in.',
  }),

  tool('exit-plan', 'tasks', 'ExitPlanMode',
    { plan: '1. Extend the beat script\n2. Retheme the page\n3. Update the readme' },
    { success: true },
    3, {
    header: 'ExitPlanMode(3 steps)',
    note: 'Leaving plan mode is the loudest thing the plugin draws, on purpose.',
  }),

  /* ----------------------------------------------------------- failure --- */

  hook('tool-failure', 'fail', 'PostToolUseFailure says:', 'PostToolUseFailure', {
    tool_name: 'Bash',
    tool_input: { command: 'bun run typecheck' },
    error: "src/tui/card.ts(88,11): error TS2554: Expected 1 arguments, but got 2.\n"
      + 'Found 1 error in src/tui/card.ts:88',
    duration_ms: 1870,
  }, {
    header: 'Bash(bun run typecheck)',
    note: 'A failed tool call gets its own red badge and keeps the error body intact — it is the one thing you actually need to read.',
  }),

  hook('interrupt', 'fail', 'PostToolUseFailure says:', 'PostToolUseFailure', {
    tool_name: 'Bash',
    tool_input: { command: 'bun test --watch' },
    error: 'Interrupted by user',
    is_interrupt: true,
    duration_ms: 9400,
  }, {
    header: 'Bash(bun test --watch)',
    note: 'Escape is not a failure, so an interrupt is badged apart from one.',
  }),
];

// Hooks echo the absolute paths they read, which would otherwise bake this
// machine's (or the CI runner's) checkout location into the published page.
function normalizePaths(text: string): string {
  return text
    .split(DEMO_HOME).join('~')
    .split(ROOT).join('~/claude-code-hooks')
    .split(os.tmpdir()).join('/tmp');
}

/**
 * Fails the build when a renderer exists with nothing on the page showing it.
 *
 * Events are matched by name; tool strategies by identity — whatever
 * `getToolDefinition` hands back for a beat's tool name is the strategy that
 * beat proves, so no strategy needs to carry an id for this to work.
 */
const SILENT_EVENTS = new Set(['PostToolBatch']); // handled, renders nothing by design

function assertFullCoverage(beats: readonly Beat[]): void {
  const shownEvents = new Set(beats.map(b => b.event));
  const missingEvents = listHooks().filter(e => !SILENT_EVENTS.has(e) && !shownEvents.has(e));

  const shownStrategies = new Set(
    beats
      .map(b => (b.payload as { tool_name?: string })?.tool_name)
      .filter((name): name is string => Boolean(name))
      .map(name => getToolDefinition(name))
  );
  const missingStrategies = listToolDefinitions().filter(def => !shownStrategies.has(def));

  const problems = [
    missingEvents.length ? `hook events with no beat: ${missingEvents.join(', ')}` : null,
    missingStrategies.length
      ? `tool strategies with no beat: ${missingStrategies.map(d => String(d.matches)).join(' | ')}`
      : null,
  ].filter(Boolean);

  if (problems.length) {
    throw new Error(
      'showcase coverage gap — add a beat to SCRIPT (or SILENT_EVENTS):\n  ' + problems.join('\n  ')
    );
  }
}

assertFullCoverage(SCRIPT);

const duplicateId = SCRIPT.map(b => b.id).find((id, i, all) => all.indexOf(id) !== i);
if (duplicateId) throw new Error(`duplicate beat id "${duplicateId}" — hashes must be unique`);

writeDemoFixtures(DEMO_HOME);

const examples: unknown[] = [];

for (const beat of SCRIPT) {
  const c: Case = { label: beat.caption, event: beat.event, payload: beat.payload };
  const { stdout, stderr, code } = await runCase(c, DEMO_HOME, CAPTURE_COLUMNS);
  if (code !== 0) throw new Error(beat.event + ' exited ' + code);
  const rendered = renderedHookOutput(stdout, stderr);
  const lines = ansiToHtmlLines(normalizePaths(rendered.replace(/\n+$/, '')));
  if (!lines.length) throw new Error(beat.id + ' produced no output — hook registry empty?');
  // The transport's last resort is to cut the middle out of the message. That
  // is never something to publish — a preview with a hole in it means the
  // renderer sized its content against the wrong budget.
  if (/\bomitted …/.test(rendered)) {
    throw new Error(
      beat.id + ' overran the response budget — the transport cut its middle out. '
      + 'Size the preview (src/render/file-preview.ts) rather than letting the transport trim it.'
    );
  }
  examples.push({
    id: beat.id,
    chapter: beat.chapter,
    event: beat.event,
    caption: beat.caption,
    header: beat.header ?? null,
    prompt: beat.prompt ?? null,
    note: beat.note ?? null,
    lines,
  });
}

removeDemoFixtures(DEMO_HOME);

// Chapters carry the index of their first beat so the strip can jump straight
// there; SCRIPT is authored in chapter order, which this asserts.
const chapters = CHAPTERS.map(({ id, label }) => {
  const start = SCRIPT.findIndex(b => b.chapter === id);
  const end = SCRIPT.map(b => b.chapter).lastIndexOf(id);
  if (start === -1) throw new Error(`chapter "${id}" has no beats`);
  if (SCRIPT.slice(start, end + 1).some(b => b.chapter !== id)) {
    throw new Error(`chapter "${id}" is not contiguous in SCRIPT`);
  }
  return { id, label, start, count: end - start + 1 };
});

const session = { install: MARKETPLACE_ADD, installPlugin: PLUGIN_INSTALL, chapters, examples };
writeFileSync(OUT, 'window.__SESSION__ = ' + JSON.stringify(session) + ';\n');
console.log(
  'wrote ' + OUT + ' — ' + examples.length + ' examples in ' + chapters.length
  + ' chapters, captured from the live pipeline'
);
