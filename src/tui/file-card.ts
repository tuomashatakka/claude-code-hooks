import nodePath from 'node:path';
import { Badge, type BadgeLike } from './badge.ts';
import { renderCard } from './card.ts';

/**
 * A path as a person would say it: relative to the project when the file is
 * inside it, `~`-shortened when it is not.
 *
 * The absolute form eats most of a card title, and it is the same thirty-odd
 * leading characters on every card — precisely the part nobody reads.
 */
export function displayPath(filePath: string): string {
  const text = String(filePath);
  const cwd = process.cwd();
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';

  const candidates = [text];
  if (text.startsWith(cwd + nodePath.sep)) candidates.push(text.slice(cwd.length + 1));
  if (home && text.startsWith(home + nodePath.sep)) candidates.push('~' + text.slice(home.length));

  // Shortest wins rather than a fixed precedence: project-relative is normally
  // the shorter of the two, but not when the file sits above the project.
  return candidates.reduce((best, c) => (c.length < best.length ? c : best));
}

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
      new Badge({ label: displayPath(path), color: 'cyan', icon: '▤' }),
      ...badges,
    ],
    // The action and line range describe the content, not the file, so they
    // close the box off at the bottom right instead of trailing the path.
    footer: details ? new Badge({ label: details, color: 'gray', icon: '⧖' }) : undefined,
    content,
    // The one card that earns the extra glyph column: a file preview is the
    // tallest thing a tool renders, and the shadow keeps it from reading as
    // part of the surrounding scrollback.
    shadow: true,
  });
}
