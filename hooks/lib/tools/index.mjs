import { generic }  from './generic.mjs';
import { bash }     from './bash.mjs';
import { edit }     from './edit.mjs';
import { read }     from './read.mjs';
import { wcgwFile } from './wcgw-file.mjs';
import { wcgwRead } from './wcgw-read.mjs';
import { wcgwInit } from './wcgw-init.mjs';
import { wcgwCtx }  from './wcgw-ctx.mjs';

const REGISTRY = {
  // ── Built-in Claude Code tools ────────────────────────────────────────────
  'Bash':       bash,
  'Edit':       edit,
  'MultiEdit':  edit,
  'Read':       read,

  // ── wcgw MCP tools ────────────────────────────────────────────────────────
  'mcp__wcgw__BashCommand':     bash,
  'mcp__wcgw__FileWriteOrEdit': wcgwFile,
  'mcp__wcgw__FileEdit':        wcgwFile,
  'mcp__wcgw__ReadFiles':       wcgwRead,
  'mcp__wcgw__Initialize':      wcgwInit,
  'mcp__wcgw__ContextSave':     wcgwCtx,
};

export function getStrategy(rawToolName) {
  return REGISTRY[rawToolName] ?? generic;
}
