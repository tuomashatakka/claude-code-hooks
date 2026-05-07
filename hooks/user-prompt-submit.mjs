#!/usr/bin/env node
/**
 * UserPromptSubmit hook — render a badge with truncated prompt preview.
 * Spec field: `prompt`.
 */

import chalk from 'chalk';
import { runHook, renderBadges, renderSection, Badge } from './utils.mjs';

chalk.level = 3;

runHook('UserPromptSubmit', (data) => {
  const prompt = data.prompt || data.user_prompt || data.userPrompt || '';

  const badge = renderBadges(new Badge({
    label: 'UserPromptSubmit',
    color: 'yellow',
    icon: '✎',
  }));

  const lines = [];
  if (prompt) {
    const truncated = prompt.length > 200 ? prompt.slice(0, 200) + '...' : prompt;
    lines.push(chalk.gray(truncated));
  }

  return {
    systemMessage: renderSection({ badge, lines }),
  };
});
