import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { renderHeading } from '../render/headings.ts';

defineHook({
  event: 'Stop',
  parse() { return {}; },
  handle() {
    const heading = renderHeading({ word: 'STOP', color: 'red', event: 'stop' });
    const badge = renderBadges(new Badge({ label: 'Stop', color: 'red', icon: '■' }));
    return { systemMessage: heading + renderSection({ badge, lines: [] }) };
  },
});
