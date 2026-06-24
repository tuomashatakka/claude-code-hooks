import chalk from 'chalk';
import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { renderHeading } from '../render/headings.ts';
import { asObject, pickString } from './_normalize.ts';

chalk.level = 3;

defineHook({
  event: 'PreCompact',
  parse(raw) {
    const o = asObject(raw);
    return {
      trigger: pickString(o, 'trigger') as 'manual' | 'auto' | undefined,
      customInstructions: pickString(o, 'custom_instructions', 'customInstructions'),
    };
  },
  handle(input) {
    const heading = renderHeading({ word: 'COMPACT', color: 'yellow', event: 'compact' });
    const main = new Badge({ label: 'PreCompact', color: 'yellow', icon: '⟳' });
    const badge = input.trigger
      ? renderBadges(main, new Badge({ label: input.trigger, color: 'gray' }))
      : renderBadges(main);
    const lines = input.customInstructions
      ? [chalk.gray(input.customInstructions.slice(0, 200))]
      : [];
    return { systemMessage: heading + renderSection({ badge, lines }) };
  },
});
