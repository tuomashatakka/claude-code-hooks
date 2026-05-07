import chalk from 'chalk';
import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { asObject, pickString } from './_normalize.ts';

chalk.level = 3;

defineHook({
  event: 'UserPromptSubmit',
  parse(raw) {
    const o = asObject(raw);
    return { prompt: pickString(o, 'prompt', 'user_prompt', 'userPrompt') ?? '' };
  },
  handle(input) {
    const badge = renderBadges(new Badge({ label: 'UserPromptSubmit', color: 'yellow', icon: '✎' }));
    const lines: string[] = [];
    if (input.prompt) {
      const shown = input.prompt.length > 200 ? input.prompt.slice(0, 200) + '...' : input.prompt;
      lines.push(chalk.gray(shown));
    }
    return { systemMessage: renderSection({ badge, lines }) };
  },
});
