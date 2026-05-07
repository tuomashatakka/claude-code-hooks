#!/usr/bin/env node
/**
 * PostToolUseFailure hook — render a red badge with the error string.
 * Spec: receives `error` (string), `is_interrupt` (bool, optional), `duration_ms` (optional).
 */

import chalk from 'chalk';
import { runHook, renderBadges, renderSection, Badge } from './utils.mjs';

chalk.level = 3;

runHook('PostToolUseFailure', (data) => {
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
});
