#!/usr/bin/env node
/**
 * UserPromptExpansion hook — fires when the prompt is expanded (e.g. slash commands).
 * Field shapes vary; tolerate both expanded_prompt and prompt forms, log unknown shapes.
 */

import chalk from 'chalk';
import { runHook, renderBadges, renderSection, Badge, debugLog } from './utils.mjs';

chalk.level = 3;

runHook('UserPromptExpansion', (data) => {
  const expanded = data.expanded_prompt
    || data.expandedPrompt
    || data.expanded
    || data.prompt
    || '';
  const original = data.original_prompt || data.originalPrompt || '';

  if (!expanded && !original) {
    debugLog('UserPromptExpansion', 'unknown-shape', Object.keys(data || {}));
  }

  const badge = renderBadges(new Badge({
    label: 'UserPromptExpansion',
    color: 'magenta',
    icon: '✱',
  }));

  const lines = [];
  if (expanded) {
    const truncated = expanded.length > 300 ? expanded.slice(0, 300) + '...' : expanded;
    lines.push(chalk.gray(truncated));
  }

  return {
    systemMessage: renderSection({ badge, lines }),
  };
});
