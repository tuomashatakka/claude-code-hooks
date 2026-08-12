# claude-code-hooks

Enhanced hooks for Claude Code — beautified terminal output for post-tool results and lifecycle events.

Block-letter headings, colored badges, syntax-highlighted diffs, sextant image
previews and playful kaomoji phrases, across **13 active hook events** and
**15 tool renderers**.

**[See it running →](https://tuomashatakka.github.io/claude-code-hooks/)** — 33
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
| `PostToolBatch` | One summary line per tool in a resolved parallel batch |
| `PreCompact` / `PostCompact` | Compaction headings and badges |
| `InstructionsLoaded` | Which CLAUDE.md / rules files entered context |
| `UserPromptSubmit` / `UserPromptExpansion` | The prompt, and what a command expanded into |
| `SubagentStart` / `SubagentStop` | Agent id, type, and lifecycle badges |
| `PostToolBatch` | Registered but silent — a resolved batch is already summarised by its members |

Every row above has a live example on the showcase page; the capture fails the
build if one does not, so this table cannot drift from what ships.

### Tool renderers

`PostToolUse` dispatches to a strategy per tool, or to a generic fallback that
splits any unknown response into its answer and its metadata.

| Tool | What it draws | Live |
| --- | --- | --- |
| `Bash`, `wcgw BashCommand` | Command and output as paired cards, chains split a row per separator, heredocs verbatim, rulers turned into dividers, wcgw's trailer parsed into an exit/cwd row | [#bash-grep](https://tuomashatakka.github.io/claude-code-hooks/#bash-grep) |
| `Read` | Syntax-highlighted file card, or an ANSI sextant preview for images | [#read-source](https://tuomashatakka.github.io/claude-code-hooks/#read-source) |
| `Edit`, `MultiEdit` | The file re-read and cropped to the changed span plus three lines of context | [#edit](https://tuomashatakka.github.io/claude-code-hooks/#edit) |
| `wcgw FileWriteOrEdit` | Search/replace blocks parsed to tell an edit from a write, result read back off disk | [#wcgw-write](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-write) |
| `wcgw ReadFiles`, `ReadImage` | One card per path, sharing a single response budget | [#wcgw-read](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-read) |
| `wcgw Initialize`, `ContextSave` | Workspace handshake as three lines; saved context with its inlined files accounted for rather than printed | [#wcgw-ctx](https://tuomashatakka.github.io/claude-code-hooks/#wcgw-ctx) |
| Playwright `browser_*` | Output or JSON card plus a `ƒ` badge naming the operation | [#pw-navigate](https://tuomashatakka.github.io/claude-code-hooks/#pw-navigate) |
| `agent-browser` (via `Bash`) | One `ƒ` badge per subcommand in the chain | [#agent-browser](https://tuomashatakka.github.io/claude-code-hooks/#agent-browser) |
| `Agent`, `Task` | Launch metadata as a card instead of raw JSON | [#agent-launch](https://tuomashatakka.github.io/claude-code-hooks/#agent-launch) |
| `TaskCreate`, `TaskUpdate`, `TaskList` | Block-weight checkbox per task, state transitions spelled out | [#task-create](https://tuomashatakka.github.io/claude-code-hooks/#task-create) |
| `ExitPlanMode` | A block-letter sign-off | [#exit-plan](https://tuomashatakka.github.io/claude-code-hooks/#exit-plan) |
| everything else | Generic fallback: answer card plus metadata card | [#generic-fallback](https://tuomashatakka.github.io/claude-code-hooks/#generic-fallback) |

Cards are framed with the half-line glyphs — `▁` under the title badge, `▔`
under the last row, `▏` and `▕` down the sides — because each sits against a
different edge of its own cell and so closes flush around the fill. File cards
additionally cast a `░` shadow, the one place the extra column earns its bytes.
The title badge carries the path, shortened to whichever of project-relative or
`~`-relative is shorter; detail about the content — the action, the line range —
sits in the bottom-right corner of the frame instead of trailing the path.
Paired command and output cards sit side-by-side when their ANSI-aware combined
width fits comfortably, then fall back to a vertical stack on narrow terminals.
Playwright and `agent-browser` calls add a compact operation badge such as
`navigate`, `click`, or `snapshot`. `TaskCreate`, `TaskUpdate`, and `TaskList`
share the same large block-weight checkbox: newly queued or active tasks stay
empty, completed tasks show a checkmark, and descriptions sit directly beneath
the task-state caption.

`SessionStart` prints `assets/welcome.png` as braille. The banner is sized
against what is actually left of the hook transport's byte budget once the
heading, the badges and the system prompt handed back as `additionalContext`
have taken their share, so it arrives whole rather than with its middle omitted.
Point `CLAUDE_HOOKS_WELCOME_IMAGE` at another file to change the face; if no
image can be rendered, a random `.txt` from `$HOME/Documents/Prompts/anime-ascii`
is used instead, skipping any that would not fit.

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

For Codex, `PostToolUse` output is emitted once as stdout JSON and does not
mirror the same `systemMessage` to stderr, preventing doubled cards while
preserving the strict hook wire envelope. When a composed render exceeds Claude
Code's 10KB hook transport budget, the final transport layer retains as many
leading and trailing lines as fit and inserts a compact omitted-line count.
Single oversized lines use the same strategy at character granularity. That is a
backstop, not a plan: previews size themselves first, weighing the finished card
in JSON bytes and re-rendering — fewer lines for text, a smaller picture for
images — until it fits, because a picture with its middle cut out is worse than
a smaller one. The image renderer is handed the card's own byte budget (JSON
escapes, UTF-8 glyph widths and the card's per-row background fill all charged
up front) and searches two axes to meet it: the column ladder it always had, and
a row cap. The rows matter because width is not always available to give — a
tall, narrow source is already at its narrowest the moment it is decoded, so
every rung of a width-only ladder renders the identical grid at the identical
price. Capping rows resizes it instead, and the whole picture survives, smaller.
The showcase capture fails the build if any example reaches the backstop.
`PreToolUse` is intentionally not registered, so this plugin never intercepts
or delays a tool before it runs.

## Development

Requires [Bun](https://bun.sh) for the toolchain (the shipped bundle does not).

```bash
bun install
bun run smoke        # feed canned payloads through every event, eyeball the output
bun test             # unit tests
bun run typecheck
bun run build        # rebuild dist/hooks.mjs — commit the result
bun run demo:capture # regenerate public/demo-data.js from the live pipeline
```

`dist/hooks.mjs` is a committed build artifact: it is what actually runs on a
user's machine. CI rebuilds it and fails if the committed copy is stale, so
**any change under `src/`, `hooks/` or `packages/` needs `bun run build` in the
same commit**.

### Layout

```
hooks/hooks.json     event -> command wiring (13 active events)
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
