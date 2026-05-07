import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { renderHeading } from '../render/headings.ts';

defineHook({
  event: 'SessionEnd',
  parse() { return {}; },
  handle() {
    const heading = renderHeading({ word: 'BYE', color: 'red', event: 'bye' });
    const badge = renderBadges(new Badge({ label: 'SessionEnd', color: 'red', icon: '⏼' }));
    return { systemMessage: heading + renderSection({ badge, lines: [] }) };
  },
});
