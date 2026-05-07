import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { renderHeading } from '../render/headings.ts';
import { asObject, pickString } from './_normalize.ts';

defineHook({
  event: 'SubagentStop',
  parse(raw) {
    const o = asObject(raw);
    return { agentType: pickString(o, 'agent_type', 'agentType') };
  },
  handle(input) {
    const heading = renderHeading({ word: 'AGENT', color: 'green', event: 'agent' });
    const main = new Badge({ label: 'SubagentStop', color: 'green', icon: '⬡' });
    const badge = input.agentType
      ? renderBadges(main, new Badge({ label: input.agentType, color: 'gray' }))
      : renderBadges(main);
    return { systemMessage: heading + renderSection({ badge, lines: [] }) };
  },
});
