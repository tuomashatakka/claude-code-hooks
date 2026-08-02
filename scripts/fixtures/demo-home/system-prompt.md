# Demo system prompt

Placeholder `$HOME/system-prompt.md` for the showcase capture. The SessionStart
hook appends whatever it finds here to the session's system prompt and prints a
`✓ System prompt loaded from:` confirmation line — this file exists so the
captured demo shows that line instead of silently omitting it.

Nothing here is used by Claude Code at runtime; only `scripts/capture-demo.ts`
points `HOME` at this directory.
