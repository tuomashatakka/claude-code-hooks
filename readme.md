# claude-code-hooks

Enhanced hooks for Claude Code — beautified terminal output for post-tool results and lifecycle events.

Block-letter headings, colored badges, syntax-highlighted diffs, sextant image
previews and playful kaomoji phrases, across **13 active hook events**.

**[See it running →](https://tuomashatakka.github.io/claude-code-hooks/)**

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

Cards attach their title badge to a lower `▁` rule in the same color, so
`Running`, `Output`, and metadata labels read like tabs instead of floating
chips. Paired command and output cards sit side-by-side when their ANSI-aware
combined width fits comfortably, then fall back to a vertical stack on narrow
terminals. File-content cards always lead with the relative or absolute source path
as a badge; read/edit/write renderers cannot omit it.
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
Single oversized lines use the same strategy at character granularity.
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
