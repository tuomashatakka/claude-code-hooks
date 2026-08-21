# claude-code-hooks

Enhanced hooks for Claude Code — beautified terminal output for post-tool results and lifecycle events.

Block-letter headings, colored badges, syntax-highlighted diffs, sextant or
opt-in literal-ASCII image previews and playful kaomoji phrases, across **14 hook events** and
**21 tool renderers**.

**[See it running →](https://tuomashatakka.github.io/claude-code-hooks/)** — 42
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

`PostToolUse` dispatches to a strategy per tool, or to a generic fallback that
splits any unknown response into its answer and its metadata.

| Tool | What it draws | Live |
| --- | --- | --- |
| `Bash`, `wcgw BashCommand` | Command and stdout as darker/regular regions in one card, chains split a row per separator, rulers start new cards below, wcgw metadata becomes an inset footer | [#bash-grep](https://tuomashatakka.github.io/claude-code-hooks/#bash-grep) |
| `Read` | Syntax-highlighted file card, or the established ANSI `imageToAscii` preview for images | [#read-source](https://tuomashatakka.github.io/claude-code-hooks/#read-source) |
| `Edit`, `MultiEdit` | The file re-read and cropped to the changed span plus three lines of context | [#edit](https://tuomashatakka.github.io/claude-code-hooks/#edit) |
| `apply_patch` | Successful native patch summaries stay quiet instead of being repeated in a generic output card; unexpected output remains visible | [#apply-patch](https://tuomashatakka.github.io/claude-code-hooks/#apply-patch) |
| `view_image` | The local target or inline data URL as a fitted ANSI image card | [#view-image](https://tuomashatakka.github.io/claude-code-hooks/#view-image) |
| `wcgw FileWriteOrEdit` | Search/replace blocks parsed to tell an edit from a write, result read back off disk | [#wcgw-write](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-write) |
| `wcgw ReadFiles`, `ReadImage` | One card per path, sharing a single response budget | [#wcgw-read](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-read) |
| `wcgw Initialize`, `ContextSave` | Workspace handshake as three lines; saved context with its inlined files accounted for rather than printed | [#wcgw-ctx](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-ctx) |
| Playwright `browser_*` | Output or JSON card plus a `ƒ` badge naming the operation; a screenshot draws the picture instead | [#pw-navigate](https://tuomashatakka.github.io/claude-code-hooks/#pw-navigate) |
| `agent-browser` (via `Bash`) | One `ƒ` badge per subcommand in the chain; a screenshot it saves is drawn in place of its output | [#agent-browser](https://tuomashatakka.github.io/claude-code-hooks/#agent-browser) |
| `ToolSearch` | Loaded tool names plus compact loaded/deferred counts | [#tool-search](https://tuomashatakka.github.io/claude-code-hooks/#tool-search) |
| `AskUserQuestion` | The questions and selected answers, without unused options or annotations | [#ask-user-question](https://tuomashatakka.github.io/claude-code-hooks/#ask-user-question) |
| `update_plan`, `TodoWrite`, `TodoRead` | Plan steps as a compact status list and completion count | [#update-plan](https://tuomashatakka.github.io/claude-code-hooks/#update-plan) |
| `Agent`, `Task` | Description, launch status, model, id and output path—never the full worker prompt | [#agent-launch](https://tuomashatakka.github.io/claude-code-hooks/#agent-launch) |
| collaboration `spawn_agent`, `wait_agent`, `followup_task`, `send_message`, `interrupt_agent`, `list_agents` | Compact lifecycle status and agent identity without replaying private briefs or raw result JSON | [#collaboration-spawn](https://tuomashatakka.github.io/claude-code-hooks/#collaboration-spawn) |
| `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskStop` | Block-weight checkbox per task, state transitions and compact stop identity | [#task-create](https://tuomashatakka.github.io/claude-code-hooks/#task-create) |
| `ExitPlanMode` | A block-letter sign-off | [#exit-plan](https://tuomashatakka.github.io/claude-code-hooks/#exit-plan) |
| everything else | Generic fallback: answer card plus metadata card | [#generic-fallback](https://tuomashatakka.github.io/claude-code-hooks/#generic-fallback) |

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

`SessionStart` prints `assets/welcome.png` as colored half-block art. The banner is sized
against what is actually left of the message's character budget once the
heading and the badges have taken their share, so it arrives whole rather than
with its middle omitted.
Point `CLAUDE_HOOKS_WELCOME_IMAGE` at another file to change the face; if no
image can be rendered, a random `.txt` from `$HOME/Documents/Prompts/anime-ascii`
is used instead, skipping any that would not fit.

`imageToMonochromeAscii()` is included as an opt-in literal text renderer using
the ramp ` .:-=+*#%@`. It detects either light or dark dominant backgrounds,
flips polarity accordingly, emits no colour SGR, and spends far fewer tokens
than a photographic ANSI preview. File and screenshot previews continue to use
the full `imageToAscii()` renderer, while the session banner temporarily uses
the simpler colored half-block renderer. `CLAUDE_HOOKS_IMAGE_MODE=ascii`
explicitly selects the monochrome path for the full renderer.

Braille is a mode of its own (`CLAUDE_HOOKS_IMAGE_MODE=braille`, or
`mode: 'braille'`): 2x4 dots per cell in the terminal's own foreground, with no
colour and therefore no SGR sequences. For line art that is the better trade by
a wide margin — the same budget that fits a 26-column colour render fits a
full-width braille one — and Floyd-Steinberg dithering is available for sources
where it is tonal rather than linear.

Images read through `Read` are rendered as ANSI 2x3 sextant previews. Each cell
chooses an exact two-colour clustering of six image samples, using Unicode block
sextants and separated sextants through U+1CE86 for sharper edges. The renderer
can degrade from 24-bit color through channel quantization to xterm-256 when a
smaller representation scores better. Set `CLAUDE_HOOKS_IMAGE_MODE=half` (or
use `TERM=dumb`) for the legacy half-block fallback when a terminal font does
not cover the sextant glyphs.

Width comes from the terminal rather than from a guess and is capped at 100
columns, or the available terminal width after the host's outer margin,
whichever is smaller. Long content rows hard-wrap inside that width without
dropping characters or replacing their tail with an ellipsis. A hook's stdout
is a pipe — Claude Code reads the response JSON off it — so `process.stdout.columns`
is undefined in exactly the situation that matters, and the fallback that stood
in for it sized every card and every picture to 96 columns however wide the
window was. The controlling terminal is asked directly through `/dev/tty`,
falling back only where there is none to ask.

For Codex, `PostToolUse` output is emitted once as stdout JSON and does not
mirror the same `systemMessage` to stderr, preventing doubled cards while
preserving the strict hook wire envelope.

Claude Code caps each hook output string at 10,000 characters, and *characters*
is the whole of it: the limit is `value.length <= 1e4` against the parsed string,
applied one field at a time. An ESC counts once rather than as the six bytes
`JSON.stringify` spends writing `\u001b`, a block glyph counts once rather than
three, and `additionalContext` is weighed on its own instead of competing for the
same room. Budgeting in JSON bytes of the whole envelope — as this plugin used to
— overcharges by roughly five times on output that is mostly escape sequences,
which is all of it.

When ANSI styling alone pushes a complete render over the limit, the transport
keeps every row and falls back to plain text. If visible content itself is
larger than the field limit, the complete plain result is saved under the
system temp directory and the valid under-10k hook response carries a head/tail
preview plus its exact path. This keeps Codex from rejecting the envelope and
never invents a lossy `… rows omitted …` claim. Previews still size themselves
first, weighing the finished card in the same characters Claude Code counts and
re-rendering — fewer lines for text, a smaller picture for images — until they
fit, because a picture with its middle cut out is worse than a smaller one. A
picture that fits with room to spare is then re-aimed upward against its own
measured cost, because the wrapper model is deliberately pessimistic and the
renderer can only pick whole cells.
The image renderer searches two axes to meet the budget: the column ladder it
always had, and a row cap. The rows matter because width is not always available to give — a
tall, narrow source is already at its narrowest the moment it is decoded, so
every rung of a width-only ladder renders the identical grid at the identical
price. Capping rows resizes it instead, and the whole picture survives, smaller.
The showcase capture fails the build if any example reaches the backstop.
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
hooks/hooks.json     event -> command wiring (14 active events)
hooks/bin/bind.ts    entrypoint; dispatches one event and exits
src/hooks/           per-event handlers
src/tools/           per-tool renderers, registered into a lookup
src/tui/             shared components, layout tokens and tool theme
src/render/          content parsing, highlighting and file previews
dist/hooks.mjs       committed bundle — the shipped artifact
packages/            @tuomashatakka/ansi-headings, @tuomashatakka/image-to-ascii
public/              the showcase page (GitHub Pages)
scripts/             smoke test, demo capture, ANSI->HTML converter
```

The shared hook manifest intentionally limits its top-level keys to
`description` and `hooks`, which keeps the same file valid in both Claude Code
and Codex's strict plugin loader.

The TUI has one public component surface at `src/tui/index.ts`. Tool and event
renderers compose typed `Badge`, `Box`/`Card`, `FileCard`, output limiter,
`Heading`, `Section`, duration, and ruler components from there. Layout
constants live in `src/tui/tokens.ts`; content parsing and syntax highlighting
stay under
`src/render/`.

The showcase page never contains hand-written terminal output: every block on it
is captured from the real hook pipeline at deploy time by
`scripts/capture-demo.ts`, so it cannot drift from what the hooks actually render.

## License

MIT © Tuomas Hatakka
