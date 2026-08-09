import { Badge, type BadgeLike } from './badge.ts';
import { renderCard } from './card.ts';

export interface FileCardProps {
  path: string;
  content: string;
  details?: string | null;
  badges?: readonly BadgeLike[];
}

export function renderFileCard({
  path,
  content,
  details = null,
  badges = [],
}: FileCardProps): string {
  return renderCard({
    badges: [
      new Badge({ label: path, color: 'cyan', icon: '▤' }),
      details ? new Badge({ label: details, color: 'gray', icon: '⧖' }) : null,
      ...badges,
    ],
    content,
  });
}
