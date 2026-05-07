#!/usr/bin/env node
/**
 * PreToolUse hook — render a badge with the prettified tool name and the
 * canonical "primary" input key (per Claude Code hooks spec) as the main body.
 */

import chalk from 'chalk';
import {
  runHook,
  renderBadges,
  renderSection,
  Badge,
  pickPrimaryInput,
  simpleHighlight,
  detectLanguage,
} from './utils.mjs';

chalk.level = 3;

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

runHook('PreToolUse', (data) => {
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
});
