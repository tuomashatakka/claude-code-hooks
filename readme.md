# claude-code-hooks

Enhanced hooks for Claude Code — beautified terminal output for post-tool results and lifecycle events.

Block-letter headings, colored badges, syntax-highlighted diffs, box-drawn
tables, compact half-block image previews and playful kaomoji phrases, across
**14 hook events** and **23 tool renderers** — and every card
keeps its colours however much a command prints.

**[See it running →](https://tuomashatakka.github.io/claude-code-hooks/)** — 44
examples, every one captured from the live pipeline at build time. Each links
directly: [an image](https://tuomashatakka.github.io/claude-code-hooks/#read-image),
[a file card](https://tuomashatakka.github.io/claude-code-hooks/#read-source),
[a shell chain](https://tuomashatakka.github.io/claude-code-hooks/#bash-chain),
[browser automation](https://tuomashatakka.github.io/claude-code-hooks/#agent-browser).

## Install

```
/plugin marketplace add tuomashatakka/claude-code-hooks
/plugin install hooks@claude-code-hooks
```

Then `/reload-plugins` (or restart) and the hooks are live.

Codex supplies `PLUGIN_ROOT` and a compatibility `CLAUDE_PLUGIN_ROOT` to plugin
hooks. The plugin uses `PLUGIN_ROOT` (or `PLUGIN_DATA`) to identify Codex.
Codex presents `systemMessage` as a warning and already shows tool results, so
visual-only cards are omitted there. `SessionStart` and `PostToolUseFailure`
keep their `hookSpecificOutput.additionalContext` without a terminal banner.
Claude Code keeps the colored cards and stderr mirror for lifecycle events.

The only requirement is **`node` on your PATH** (v18+). The plugin ships a
prebuilt, dependency-inlined bundle at `dist/hooks.mjs`, so there is no install
step, no `node_modules`, and no Bun needed to *use* it — which matters, because
Claude Code copies installed plugins into `~/.claude/plugins/cache` without
their dependencies.

To try it without installing:

```bash
claude --plugin-dir /path/to/claude-code-hooks
```

## What it renders

| Event | Output |
| --- | --- |
| `SessionStart` | Braille welcome art, `BEGIN AGAIN` block heading, source + model badges, system-prompt confirmation |
| `SessionEnd` / `Stop` | `BYE` / `STOP` block heading with a generated kaomoji phrase |
| `PostToolUse` | Tool badge, duration, tab-titled output cards, diffs, JSON cards, file previews, task state headings |
| `PostToolUseFailure` | Failure badge plus the error body |
| `PreToolUse` / `PostToolBatch` | Registered no-ops: policy remains host-owned, and resolved batches are already represented by their members |
| `PreCompact` / `PostCompact` | Compaction headings and badges |
| `InstructionsLoaded` | Which CLAUDE.md / rules files entered context |
| `UserPromptSubmit` / `UserPromptExpansion` | The prompt, any readable local image path it contains, and what a command expanded into |
| `SubagentStart` / `SubagentStop` | Agent id, type, and lifecycle badges |

Every row above has a live example on the showcase page; the capture fails the
build if one does not, so this table cannot drift from what ships.

### Tool renderers

`PostToolUse` picks the first renderer in `src/tools/index.ts` whose matcher
accepts the tool name, falling back to a generic one that splits any unknown
response into its answer and a key/value table of whatever is left.

| Tool | What it draws | Live |
| --- | --- | --- |
| `Bash`, `wcgw BashCommand` | Command and stdout as darker/regular regions in one card, chains split a row per separator, rulers start new cards below, wcgw metadata becomes an inset footer | [#bash-grep](https://tuomashatakka.github.io/claude-code-hooks/#bash-grep) |
| `Read` | Syntax-highlighted file card, or a compact `imageToAsciiSimple` preview for images | [#read-source](https://tuomashatakka.github.io/claude-code-hooks/#read-source) |
| `Write` | The written file read back off disk, in the same card `Read` draws | [#write](https://tuomashatakka.github.io/claude-code-hooks/#write) |
| `Edit`, `MultiEdit` | The file re-read and cropped to the changed span plus three lines of context | [#edit](https://tuomashatakka.github.io/claude-code-hooks/#edit) |
| `apply_patch` | Successful native patch summaries stay quiet instead of being repeated in a generic output card; unexpected output remains visible | [#apply-patch](https://tuomashatakka.github.io/claude-code-hooks/#apply-patch) |
| `view_image` | The local target or inline data URL as a compact half-block image card | [#view-image](https://tuomashatakka.github.io/claude-code-hooks/#view-image) |
| `wcgw FileWriteOrEdit` | Search/replace blocks parsed to tell an edit from a write, result read back off disk | [#wcgw-write](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-write) |
| `wcgw ReadFiles`, `ReadImage` | One card per path, sharing a single response budget | [#wcgw-read](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-read) |
| `wcgw Initialize`, `ContextSave` | Workspace handshake as three lines; saved context with its inlined files accounted for rather than printed | [#wcgw-ctx](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-ctx) |
| Playwright `browser_*` | Output or JSON card plus a `ƒ` badge naming the operation; a screenshot draws the picture instead | [#pw-navigate](https://tuomashatakka.github.io/claude-code-hooks/#pw-navigate) |
| `agent-browser` (via `Bash`) | One `ƒ` badge per subcommand in the chain; a screenshot it saves is drawn in place of its output | [#agent-browser](https://tuomashatakka.github.io/claude-code-hooks/#agent-browser) |
| `WebSearch` | Numbered `#`/title/url table of every link in the result, the model's summary underneath, result count and duration badges | [#web-search](https://tuomashatakka.github.io/claude-code-hooks/#web-search) |
| `ToolSearch` | Loaded tool names plus compact loaded/deferred counts | [#tool-search](https://tuomashatakka.github.io/claude-code-hooks/#tool-search) |
| `AskUserQuestion` | The questions and selected answers, without unused options or annotations | [#ask-user-question](https://tuomashatakka.github.io/claude-code-hooks/#ask-user-question) |
| `update_plan`, `TodoWrite`, `TodoRead` | Plan steps as a compact status list and completion count | [#update-plan](https://tuomashatakka.github.io/claude-code-hooks/#update-plan) |
| `Agent`, `Task` | Description, launch status, model, id and output path—never the full worker prompt | [#agent-launch](https://tuomashatakka.github.io/claude-code-hooks/#agent-launch) |
| collaboration `spawn_agent`, `wait_agent`, `followup_task`, `send_message`, `interrupt_agent`, `list_agents` | Compact lifecycle status and agent identity without replaying private briefs or raw result JSON | [#collaboration-spawn](https://tuomashatakka.github.io/claude-code-hooks/#collaboration-spawn) |
| `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskStop` | Block-weight checkbox per task, state transitions and compact stop identity | [#task-create](https://tuomashatakka.github.io/claude-code-hooks/#task-create) |
| `ExitPlanMode` | A block-letter sign-off | [#exit-plan](https://tuomashatakka.github.io/claude-code-hooks/#exit-plan) |
| everything else | Generic fallback: answer card plus a key/value metadata table | [#generic-fallback](https://tuomashatakka.github.io/claude-code-hooks/#generic-fallback) |

Metadata — the fields of a result that are not its answer — is always a
box-drawn table in the style Claude Code renders markdown tables with:
`┌─┬─┐` borders, a bold header row, one row per key, nested values kept inline.
Cells that would overflow the card wrap rather than being cut.

### Syntax highlighting

Every language is highlighted by a single left-to-right scanner over an ordered
list of rules anchored at the cursor. The first rule that matches owns the
characters it consumed, which is what makes the results hold up on real code:
a comment swallows the quotes inside it, a string swallows the `#` inside it, a
JavaScript regex literal is one token (and `a / b / c` is not), template
literals highlight their `${…}` interpolations as code, Python triple-quoted
strings and bash multi-line strings span lines, and a heredoc body is consumed
whole and highlighted in its *own* detected language rather than as shell. The
previous regex-replace chains could do none of that — each pass re-matched the
escapes an earlier pass had emitted — and quotes in a comment would bleed a
colour across the rest of the file.

Languages: JavaScript/TypeScript, Bash, Python, JSON, YAML, CSS, SQL, HTML/XML,
Markdown (fenced blocks highlighted in the named language), plus line-based
`diff` and a meaning-based `output` mode for stdout that tints error/warning
lines and accents paths, URLs and metric numbers.

Cards keep one half-line rule (`▁`) under the title badge and drop side borders,
bottom borders and shadows. The title badge carries the path, shortened to
whichever of project-relative or `~`-relative is shorter; detail about the
content — the action, the line range, command metadata — sits inside the
bottom-right backgrounded row instead of trailing the path. Cards always follow
one another vertically. Bash command input uses a slightly darker region than
stdout inside the same card, including its single transition row, while
ruler-led output starts a fresh card below.
Tabs are expanded before width measurement, and foreign background/cursor/OSC
sequences are removed so arbitrary terminal output cannot punch dark holes in a
card or shift its right edge.
Playwright and `agent-browser` calls add a compact operation badge such as
`navigate`, `click`, or `snapshot`. `TaskCreate`, `TaskUpdate`, and `TaskList`
share the same large block-weight checkbox: newly queued or active tasks stay
empty, completed tasks show a checkmark, and descriptions sit directly beneath
the task-state caption.

In Claude Code, `SessionStart` prints `assets/welcome.png` with the same compact half-block
renderer used for file previews. The banner is sized against the remaining
message budget after the heading and badges, so it arrives whole rather than
with its middle omitted.
Point `CLAUDE_HOOKS_WELCOME_IMAGE` at another file to change the face; if no
image can be rendered, a random `.txt` from `$HOME/Documents/Prompts/anime-ascii`
is used instead, skipping any that would not fit.

`imageToMonochromeAscii()` is included as an opt-in literal text renderer using
the ramp ` .:-=+*#%@`. It detects either light or dark dominant backgrounds,
flips polarity accordingly, and emits no colour SGR. File and screenshot
previews and the session banner use `imageToAsciiSimple()`, a compact half-block
renderer with fewer glyph choices and lower rendering cost than the full
`imageToAscii()` renderer. The image cards retain their ANSI colors in
Claude Code.

Braille is a mode of its own (`CLAUDE_HOOKS_IMAGE_MODE=braille`, or
`mode: 'braille'`): 2x4 dots per cell in the terminal's own foreground, with no
colour and therefore no SGR sequences. For line art that is the better trade by
a wide margin — the same budget that fits a 26-column colour render fits a
full-width braille one — and Floyd-Steinberg dithering is available for sources
where it is tonal rather than linear.

Images read through `Read`, screenshots, and the welcome banner use the simple
half-block renderer. Each terminal cell displays up to two vertically stacked
image samples. Claude Code receives ANSI colors; Codex uses its native image
and tool display. `imageToAscii()` remains available to
consumers that need the higher-detail sextant renderer.

Width comes from the terminal rather than from a guess and is capped at 100
columns, or the available terminal width after the host's outer margin,
whichever is smaller. Long content rows hard-wrap inside that width without
dropping characters or replacing their tail with an ellipsis. A hook's stdout
is a pipe — Claude Code reads the response JSON off it — so `process.stdout.columns`
is undefined in exactly the situation that matters, and the fallback that stood
in for it sized every card and every picture to 96 columns however wide the
window was. The controlling terminal is asked directly through `/dev/tty`,
falling back only where there is none to ask.

For Codex, visual-only events return `{}` with exit code 0. No terminal output
is written to stderr, and context-bearing events return JSON only. This avoids
raw ANSI fragments and duplicate warnings in its transcript.

Claude Code caps each hook output string at 10,000 characters, and *characters*
is the whole of it: the limit is `value.length <= 1e4` against the parsed string,
applied one field at a time. An ESC counts once rather than as the six bytes
`JSON.stringify` spends writing `\u001b`, a block glyph counts once rather than
three, and `additionalContext` is weighed on its own instead of competing for the
same room. Budgeting in JSON bytes of the whole envelope — as this plugin used to
— overcharges by roughly five times on output that is mostly escape sequences,
which is all of it.

Fitting under that limit never costs colour. Every renderer is a pure function
of its inputs and a `Limit` — how many body lines a collapsible block may keep,
and how many characters a picture may spend — and the transport
(`src/runtime/transport.ts`) binary-searches that one knob until the finished
message fits. A command that printed a hundred files loses its tail sections
and gains an `… N more lines omitted …` note; a picture is re-rendered smaller;
the badges, the fills and every syntax colour stay exactly as they were. The
complete plain-text render is saved under the system temp directory and the
message ends with its path. Only a message that cannot shrink at all — one
enormous unbreakable line — is cut by characters, and even then every escape
sequence is kept whole. The transport this replaces bought room by stripping
background fills and then all ANSI, which is why a long `cat` used to arrive as
a monochrome card.

Before a candidate is measured it is re-encoded minimally (`compactAnsi` in
`src/ansi/text.ts`): one SGR sequence per style change, none for a close that is
reopened before anything but blanks is drawn, no foreground work over padding,
a bare reset where several attributes close together, and every style closed
before each newline — so `ESC[1m ESC[36m` ships as `ESC[1;36m` and a row of
highlighted JSON spends a third less on escapes. Card fills and rules are
xterm-256 colours (`ESC[48;5;Nm`, 11 characters) rather than truecolor (19),
since a card pays that on every row. And a card settles on the width most of
its lines fit in — the 90th percentile plus a little slack, once there are a
dozen lines to judge by — and hard-wraps the few longer ones, instead of padding
every row out to the longest line; for source files and JSON that padding used
to be half of the message.
The image renderer searches two axes to meet its share of the budget: the
column ladder it always had, and a row cap. The rows matter because width is
not always available to give — a tall, narrow source is already at its
narrowest the moment it is decoded, so every rung of a width-only ladder renders
the identical grid at the identical price. Capping rows resizes it instead, and
the whole picture survives, smaller. On the column axis the renderer bisects to
the widest grid the budget affords and then compares the few grids around it by
how much of the image they explain, so a large picture uses the room it is
given rather than the rung a coarse ladder happened to land on. The showcase
capture fails the build if any example has to shrink.
`PreToolUse` is an intentional no-op. Registering it keeps Codex's configured
wire event valid without emitting a permission decision, intercepting a tool,
or changing host policy. Hook failures append structured one-line diagnostics
to `~/.claude/debug.log`, including stage, details, pid/ppid, runtime, platform,
host, cwd, entrypoint, and event.

## Development

Requires [Bun](https://bun.sh) for the toolchain (the shipped bundle does not).

```bash
bun install
bun run smoke        # feed canned payloads through every event, eyeball the output
bun test             # unit tests
bun run typecheck
bun run lint         # eslint 10, zero warnings or errors
bun run build        # rebuild dist/hooks.mjs — commit the result
bun run demo:capture # regenerate public/demo-data.js from the live pipeline
```

`dist/hooks.mjs` is a committed build artifact: it is what actually runs on a
user's machine. CI rebuilds it and fails if the committed copy is stale, so
**any change under `src/`, `hooks/` or `packages/` needs `bun run build` in the
same commit**.

### Layout

```
hooks/hooks.json       event -> command wiring (14 active events)
src/main.ts            entrypoint: argv event, stdin JSON, one response, exit
src/hooks.ts           HOOKS — one pure handler per event
src/tools/             one ToolRenderer per tool family; index.ts orders them, generic last
src/tui/               badges, cards, sections, tables, rulers, theme, tokens
src/render/fit.ts      Limit, Render and the fitter the transport searches with
src/render/file-card.ts files, pictures and screenshots as elastic cards
src/ansi/              chalk (forced on, once), text metrics, the highlighter scanner
src/lib/               untrusted-JSON picking, shell/heredoc parsing, wcgw trailer
src/runtime/           stdin/stdout, the 10k transport, debug log
dist/hooks.mjs         committed bundle — the shipped artifact
packages/              @tuomashatakka/ansi-headings, @tuomashatakka/image-to-ascii
public/                the showcase page (GitHub Pages)
scripts/               smoke test, demo capture, ANSI->HTML converter
```

The shared hook manifest intentionally limits its top-level keys to
`description` and `hooks`, which keeps the same file valid in both Claude Code
and Codex's strict plugin loader.

There is no registry and no side-effect registration. `HOOKS` is a plain
record from event name to handler; `RENDERERS` is a plain ordered array, and
`rendererFor(name)` is the first whose `match` accepts the name. A handler
returns `HookOutput<string | Render>`: a finished string, or a `Render` — a
function of `Limit` — when something in it is elastic. Badges are frozen data
(`badge({ label, color, icon })`) painted by `renderBadge`; there are no
classes anywhere in `src/`. Everything a renderer needs to read out of a tool
payload goes through `src/lib/data.ts` (`pickString`, `resultText`,
`resultRecord`…), so snake_case/camelCase drift and MCP `content` envelopes are
handled in exactly one place.

The showcase page never contains hand-written terminal output: every block on it
is captured from the real hook pipeline at deploy time by
`scripts/capture-demo.ts`, so it cannot drift from what the hooks actually render.

## License

MIT © Tuomas Hatakka
