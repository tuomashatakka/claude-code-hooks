import { renderBadges, type BadgeLike } from './badge.ts';

export interface SectionProps {
  badges: BadgeLike | readonly BadgeLike[];
  lines?: Array<string | false | null | undefined>;
}

export function renderSection({ badges, lines = [] }: SectionProps): string {
  const badgeList = Array.isArray(badges) ? badges : [badges];
  let output = renderBadges(...badgeList);
  const body = lines.filter((line): line is string => Boolean(line));
  if (body.length) output += '\n\n' + body.join('\n');
  return output;
}
