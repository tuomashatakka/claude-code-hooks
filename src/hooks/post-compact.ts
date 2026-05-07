import chalk from 'chalk';
import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { renderHeading } from '../render/headings.ts';
import { asObject, pickString } from './_normalize.ts';

chalk.level = 3;

defineHook({
  event: 'PostCompact',
  parse(raw) {
    const o = asObject(raw);
    return { summary: pickString(o, 'summary', 'compact_summary') };
  },
  handle(input) {
    const heading = renderHeading({ word: 'COMPACT', color: 'yellow', event: 'compact' });
    const badge = renderBadges(new Badge({ label: 'PostCompact', color: 'yellow', icon: '⟳' }));
    const lines = input.summary ? [chalk.gray(input.summary.slice(0, 200))] : [];
    return { systemMessage: heading + renderSection({ badge, lines }) };
  },
});
