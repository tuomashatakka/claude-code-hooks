import chalk from 'chalk';
import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { debugLog } from '../runtime/debug.ts';
import { asObject, pickString } from './_normalize.ts';

chalk.level = 3;

defineHook({
  event: 'UserPromptExpansion',
  parse(raw) {
    const o = asObject(raw);
    const expanded = pickString(o, 'expanded_prompt', 'expandedPrompt', 'expanded', 'prompt') ?? '';
    if (!expanded) debugLog('UserPromptExpansion', 'unknown-shape', Object.keys(o));
    return {
      expandedPrompt: expanded,
      originalPrompt: pickString(o, 'original_prompt', 'originalPrompt'),
    };
  },
  handle(input) {
    const badge = renderBadges(new Badge({ label: 'UserPromptExpansion', color: 'magenta', icon: '✱' }));
    const lines: string[] = [];
    if (input.expandedPrompt) {
      const shown = input.expandedPrompt.length > 300
        ? input.expandedPrompt.slice(0, 300) + '...'
        : input.expandedPrompt;
      lines.push(chalk.gray(shown));
    }
    return { systemMessage: renderSection({ badge, lines }) };
  },
});
