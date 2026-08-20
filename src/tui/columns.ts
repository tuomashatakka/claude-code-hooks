export interface ColumnsProps {
  items:         readonly string[];
  gap?:          number;
  maximumWidth?: number;
}

export function renderColumns ({ items }: ColumnsProps): string {
  // Terminal history is a timeline. Keeping every card on its own row makes
  // that order stable at every viewport width and prevents unrelated boxes
  // from becoming accidental columns on wide terminals.
  return items
    .filter(Boolean)
    .map(item => item.replace(/^\n+|\n+$/g, ''))
    .join('\n\n')
}
