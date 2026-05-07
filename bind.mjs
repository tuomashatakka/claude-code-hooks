#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import {
  runHook,
  renderBadges,
  renderSection,
  Badge,
  deconstructToolResult,
  pickPrimaryInput,
  simpleHighlight,
  isJSON,
  formatJSON,
  isCode,
  detectLanguage,
  renderBox,
  formatMetadataCustom,
  stripAnsi,
  renderAnsiShadowText,
  randomFiller,
  debugLog,
  parseToolName,
} from './hooks/utils.mjs';

chalk.level = 3;

const EVENT = process.argv[2];

// ── PreToolUse ────────────────────────────────────────────────────────────────

const FIELD_LABELS = {
  command: 'Command',
  file_path: 'File',
  filePath: 'File',
  file_paths: 'Files',
  pattern: 'Pattern',
  query: 'Query',
  url: 'URL',
  description: 'Description',
  prompt: 'Prompt',
  plan: 'Plan',
};

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}

function handlePreToolUse(data) {
  const rawTool = data.tool_name || data.toolName || 'Unknown';
  const input = data.tool_input || data.toolInput || {};

  const { key: primaryKey, value: primaryValue } = pickPrimaryInput(rawTool, input);

  const lines = [];
  if (primaryValue != null) {
    const formatted = formatValue(primaryValue);
    const highlighted = primaryKey === 'command'
      ? simpleHighlight(formatted, 'bash')
      : simpleHighlight(formatted, detectLanguage(formatted, rawTool));
    lines.push(highlighted);
  }

  for (const [k, label] of Object.entries(FIELD_LABELS)) {
    if (k === primaryKey) continue;
    if (input[k] == null || input[k] === '') continue;
    lines.push(chalk.gray(`${label}: `) + formatValue(input[k]));
  }

  const badge = renderBadges(new Badge({ toolName: rawTool }));
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
    systemMessage: renderSection({ badge, lines }),
  };
}

// ── PostToolUse ───────────────────────────────────────────────────────────────

function handlePostToolUse(data) {
  const rawTool = data.tool_name || data.toolName || 'Unknown';
  const toolResponse = data.tool_response ?? data.tool_result ?? data.toolResult;
  const durationMs = data.duration_ms;

  const { primary, metadata } = deconstructToolResult(rawTool, toolResponse);

  const sectionLines = [];
  if (durationMs != null) {
    sectionLines.push(chalk.gray(`Δ ${durationMs}ms`));
  }

  if (primary) {
    let formattedPrimary = primary;
    if (typeof primary === 'string') {
      if (isJSON(primary)) {
        formattedPrimary = simpleHighlight(formatJSON(primary), 'json');
      } else if (isCode(primary)) {
        formattedPrimary = simpleHighlight(primary, detectLanguage(primary, rawTool));
      }
    } else if (typeof primary === 'object' && primary !== null) {
      formattedPrimary = simpleHighlight(JSON.stringify(primary, null, 2), 'json');
    }
    sectionLines.push(renderBox(formattedPrimary));

    if (metadata && Object.keys(metadata).length > 0) {
      sectionLines.push(chalk.gray('  metadata'));
      sectionLines.push(renderBox(formatMetadataCustom(metadata)));
    }
  } else if (toolResponse && typeof toolResponse === 'object') {
    sectionLines.push(renderBox(formatMetadataCustom(toolResponse)));
  }

  const main = new Badge({ toolName: rawTool });
  const kind = primary
    ? new Badge({ label: 'OUTPUT', color: 'brightGreen' })
    : new Badge({ label: 'JSON', color: 'green' });
  const badge = renderBadges(main, kind);

  return {
    hookSpecificOutput: { hookEventName: 'PostToolUse', toolName: rawTool },
    systemMessage: renderSection({ badge, lines: sectionLines }),
  };
}

// ── PostToolUseFailure ────────────────────────────────────────────────────────

function handlePostToolUseFailure(data) {
  const rawTool = data.tool_name || data.toolName || 'Unknown';
  const error = data.error ?? data.tool_result ?? 'Unknown error';
  const isInterrupt = !!data.is_interrupt;
  const durationMs = data.duration_ms;

  const main = new Badge({ toolName: rawTool, color: 'red', icon: '⨂' });
  const badge = isInterrupt
    ? renderBadges(main, new Badge({ label: 'INTERRUPT', color: 'yellow' }))
    : renderBadges(main);

  const lines = [chalk.red('⨂ ') + chalk.bold.red('Tool failed:')];
  if (typeof error === 'string') {
    lines.push(error);
  } else if (error && error.message) {
    lines.push(error.message);
  } else {
    lines.push(JSON.stringify(error, null, 2));
  }
  if (durationMs != null) {
    lines.push(chalk.gray(`Δ ${durationMs}ms`));
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUseFailure',
      additionalContext: typeof error === 'string' ? error : JSON.stringify(error),
    },
    systemMessage: renderSection({ badge, lines, dividerColor: 'red' }),
  };
}

// ── PostToolBatch ─────────────────────────────────────────────────────────────

function handlePostToolBatch(_data) {
  return {};
}

// ── SessionStart ──────────────────────────────────────────────────────────────

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const SYSTEM_PROMPT_PATH = path.join(HOME, 'system-prompt.md');
const ASCII_DIR = path.join(HOME, 'Documents', 'Prompts', 'anime-ascii');

function loadSystemPrompt() {
  try {
    if (fs.existsSync(SYSTEM_PROMPT_PATH)) {
      return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
    }
  } catch (e) {
    debugLog('SessionStart', 'load-system-prompt', e.message);
  }
  return null;
}

function loadRandomAsciiArt() {
  try {
    if (!fs.existsSync(ASCII_DIR)) return null;
    const files = fs.readdirSync(ASCII_DIR).filter(f => f.endsWith('.txt'));
    if (files.length === 0) return null;
    const randomFile = files[Math.floor(Math.random() * files.length)];
    return fs.readFileSync(path.join(ASCII_DIR, randomFile), 'utf8');
  } catch (e) {
    debugLog('SessionStart', 'load-ascii', e.message);
  }
  return null;
}

function handleSessionStart(data) {
  const source = data.source || 'startup';
  const model = data.model || '';
  const agentType = data.agent_type || data.agentType;

  const systemPrompt = loadSystemPrompt();
  const asciiArt = loadRandomAsciiArt();

  const main = new Badge({ label: `Session:${source}`, color: 'green', icon: '⏻' });
  const badge = model
    ? renderBadges(main, new Badge({ label: model, color: 'gray' }))
    : renderBadges(main);

  const lines = [chalk.green('Session started')];
  if (agentType) lines.push(chalk.gray('Agent: ') + agentType);
  if (systemPrompt) lines.push(chalk.cyan('✓ ') + 'System prompt loaded from: ' + SYSTEM_PROMPT_PATH);

  const headingWord = source === 'compact' ? 'WAKE UP' : 'START';
  const heading = renderAnsiShadowText(headingWord, 'cyan');
  const filler = chalk.magenta(randomFiller());
  const asciiBlock = asciiArt ? '\n' + asciiArt + '\n' : '';

  const out = {
    hookSpecificOutput: { hookEventName: 'SessionStart' },
    systemMessage: asciiBlock + heading + '\n' + filler + '\n' + renderSection({ badge, lines }),
  };
  if (systemPrompt) {
    out.hookSpecificOutput.appendToSystemPrompt = systemPrompt;
  }
  return out;
}

// ── SessionEnd ────────────────────────────────────────────────────────────────

function handleSessionEnd(_data) {
  const heading = renderAnsiShadowText('BYE', 'red');
  const filler = chalk.magenta(randomFiller());
  const badge = renderBadges(new Badge({ label: 'SessionEnd', color: 'red', icon: '⏼' }));
  return {
    systemMessage: heading + '\n' + filler + '\n' + renderSection({ badge, lines: [] }),
  };
}

// ── PostCompact ───────────────────────────────────────────────────────────────

function handlePostCompact(data) {
  const summary = data.summary || data.compact_summary || '';
  const heading = renderAnsiShadowText('COMPACT', 'yellow');
  const filler = chalk.magenta(randomFiller());
  const badge = renderBadges(new Badge({ label: 'PostCompact', color: 'yellow', icon: '⟳' }));
  const lines = summary ? [chalk.gray(summary.slice(0, 200))] : [];
  return {
    systemMessage: heading + '\n' + filler + '\n' + renderSection({ badge, lines }),
  };
}

// ── InstructionsLoaded ────────────────────────────────────────────────────────

function handleInstructionsLoaded(data) {
  const filePath = data.file_path || data.filePath || '';
  const memoryType = data.memory_type || data.memoryType || 'Unknown';
  const loadReason = data.load_reason || data.loadReason || '';

  const main = new Badge({ label: `Instructions:${memoryType}`, color: 'cyan', icon: '✓' });
  const badge = loadReason
    ? renderBadges(main, new Badge({ label: loadReason, color: 'gray' }))
    : renderBadges(main);

  const lines = [];
  if (filePath) lines.push(chalk.gray('File: ') + filePath);

  return {
    systemMessage: renderSection({ badge, lines }),
  };
}

// ── UserPromptSubmit ──────────────────────────────────────────────────────────

function handleUserPromptSubmit(data) {
  const prompt = data.prompt || data.user_prompt || data.userPrompt || '';

  const badge = renderBadges(new Badge({ label: 'UserPromptSubmit', color: 'yellow', icon: '✎' }));
  const lines = [];
  if (prompt) {
    const truncated = prompt.length > 200 ? prompt.slice(0, 200) + '...' : prompt;
    lines.push(chalk.gray(truncated));
  }

  return {
    systemMessage: renderSection({ badge, lines }),
  };
}

// ── UserPromptExpansion ───────────────────────────────────────────────────────

function handleUserPromptExpansion(data) {
  const expanded = data.expanded_prompt
    || data.expandedPrompt
    || data.expanded
    || data.prompt
    || '';
  const original = data.original_prompt || data.originalPrompt || '';

  if (!expanded && !original) {
    debugLog('UserPromptExpansion', 'unknown-shape', Object.keys(data || {}));
  }

  const badge = renderBadges(new Badge({ label: 'UserPromptExpansion', color: 'magenta', icon: '✱' }));
  const lines = [];
  if (expanded) {
    const truncated = expanded.length > 300 ? expanded.slice(0, 300) + '...' : expanded;
    lines.push(chalk.gray(truncated));
  }

  return {
    systemMessage: renderSection({ badge, lines }),
  };
}

// ── SubagentStop ──────────────────────────────────────────────────────────────

function handleSubagentStop(data) {
  const agentType = data.agent_type || data.agentType || '';
  const heading = renderAnsiShadowText('AGENT', 'green');
  const filler = chalk.magenta(randomFiller());
  const main = new Badge({ label: 'SubagentStop', color: 'green', icon: '⬡' });
  const badge = agentType
    ? renderBadges(main, new Badge({ label: agentType, color: 'gray' }))
    : renderBadges(main);
  return {
    systemMessage: heading + '\n' + filler + '\n' + renderSection({ badge, lines: [] }),
  };
}

// ── Stop ──────────────────────────────────────────────────────────────────────

function handleStop(_data) {
  const heading = renderAnsiShadowText('STOP', 'red');
  const filler = chalk.magenta(randomFiller());
  const badge = renderBadges(new Badge({ label: 'Stop', color: 'red', icon: '■' }));
  return {
    systemMessage: heading + '\n' + filler + '\n' + renderSection({ badge, lines: [] }),
  };
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

const HANDLERS = {
  PreToolUse:          handlePreToolUse,
  PostToolUse:         handlePostToolUse,
  PostToolUseFailure:  handlePostToolUseFailure,
  PostToolBatch:       handlePostToolBatch,
  SessionStart:        handleSessionStart,
  SessionEnd:          handleSessionEnd,
  PostCompact:         handlePostCompact,
  InstructionsLoaded:  handleInstructionsLoaded,
  UserPromptSubmit:    handleUserPromptSubmit,
  UserPromptExpansion: handleUserPromptExpansion,
  SubagentStop:        handleSubagentStop,
  Stop:                handleStop,
};

const handler = HANDLERS[EVENT] ?? (() => ({}));
runHook(EVENT, (data) => {
  const result = handler(data);
  if (result.systemMessage) result.systemMessage = '\x1b[1A\x1b[2K\x1b[1B' + result.systemMessage;
  return result;
});
