# claude-code-hooks

Enhanced hooks for Claude Code — beautified terminal output for every event.

Block-letter headings, colored badges, syntax-highlighted diffs, ASCII image
previews and playful kaomoji phrases, across **14 hook events**.

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
| `SessionStart` | ASCII art, `BEGIN AGAIN` block heading, source + model badges, system-prompt confirmation |
| `SessionEnd` / `Stop` | `BYE` / `STOP` block heading with a generated kaomoji phrase |
| `PreToolUse` | Tool badge, the command or arguments, syntax-highlighted search/replace blocks |
| `PostToolUse` | Tool badge, duration, sectioned output, diffs, JSON cards, file previews |
| `PostToolUseFailure` | Failure badge plus the error body |
| `PostToolBatch` | One summary line per tool in a resolved parallel batch |
| `PreCompact` / `PostCompact` | Compaction headings and badges |
| `InstructionsLoaded` | Which CLAUDE.md / rules files entered context |
| `UserPromptSubmit` / `UserPromptExpansion` | The prompt, and what a command expanded into |
| `SubagentStart` / `SubagentStop` | Agent id, type, and lifecycle badges |

Images read through `Read` are rendered as ANSI half-block previews, degrading
from 24-bit color through channel quantization to xterm-256 so the whole preview
fits inside Claude Code's 10KB hook display limit rather than being truncated.

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
hooks/hooks.json     event -> command wiring (all 14 events)
hooks/bin/bind.ts    entrypoint; dispatches one event and exits
src/hooks/           per-event handlers
src/tools/           per-tool renderers, registered into a lookup
src/render/          badges, headings, diffs, file previews, theme
dist/hooks.mjs       committed bundle — the shipped artifact
packages/            @tuomashatakka/ansi-headings, @tuomashatakka/image-to-ascii
public/              the showcase page (GitHub Pages)
scripts/             smoke test, demo capture, ANSI->HTML converter
```

The showcase page never contains hand-written terminal output: every block on it
is captured from the real hook pipeline at deploy time by
`scripts/capture-demo.ts`, so it cannot drift from what the hooks actually render.

## License

MIT © Tuomas Hatakka
