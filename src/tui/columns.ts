import { visibleWidth } from '../render/primitives.ts';
import { getMaxLayoutWidth } from './card.ts';
import { TUI_TOKENS } from './tokens.ts';

export interface ColumnsProps {
  items: readonly string[];
  gap?: number;
  maximumWidth?: number;
}

interface PreparedColumn {
  lines: string[];
  width: number;
}

function prepareColumn(item: string): PreparedColumn {
  const lines = item.replace(/^\n+|\n+$/g, '').split('\n');
  return {
    lines,
    width: Math.max(...lines.map(visibleWidth), 0),
  };
}

export function renderColumns({
  items,
  gap = TUI_TOKENS.columns.gap,
  maximumWidth = getMaxLayoutWidth() - TUI_TOKENS.columns.comfortMargin,
}: ColumnsProps): string {
  const visibleItems = items.filter(Boolean);
  if (visibleItems.length < 2) return visibleItems[0] ?? '';

  const columns = visibleItems.map(prepareColumn);
  const combinedWidth = columns.reduce((total, column) => total + column.width, 0)
    + gap * (columns.length - 1);

  if (combinedWidth > maximumWidth) return visibleItems.join('\n');

  const height = Math.max(...columns.map(column => column.lines.length));
  const rows = Array.from({ length: height }, (_, row) =>
    columns.map(column => {
      const line = column.lines[row] ?? '';
      return line + ' '.repeat(Math.max(0, column.width - visibleWidth(line)));
    }).join(' '.repeat(gap)).trimEnd()
  );

  return '\n' + rows.join('\n') + '\n';
}
