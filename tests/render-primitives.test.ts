import { describe, expect, test } from 'bun:test';
import chalk from 'chalk';
import {
  extractResultText,
  renderCard,
  stripAnsi,
  visibleWidth,
} from '../src/render/primitives.ts';
import { RUNNING_BADGE } from '../src/render/badge.ts';

chalk.level = 3;

describe('renderCard', () => {
  test('joins the title badge to a hairline matching the box width', () => {
    const lines = renderCard(RUNNING_BADGE, '$ bun test && bun run typecheck').split('\n');
    const title = lines[1]!;
    const boxLines = lines.slice(2, -1);

    expect(stripAnsi(title)).toContain('Running');
    expect(stripAnsi(title)).toContain('─');
    expect(boxLines.every(line => visibleWidth(line) === visibleWidth(title))).toBeTrue();
  });

  test('expands a short body to the ansi-aware badge width', () => {
    const badge = chalk.bgMagenta.black(' an unusually wide title ');
    const lines = renderCard(badge, 'x').split('\n');
    const widths = lines.slice(1, -1).map(visibleWidth);

    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBe(visibleWidth(badge) + 4);
    expect(stripAnsi(lines[1]!)).toEndWith('────');
  });
});

describe('extractResultText', () => {
  test('unwraps MCP CallToolResult content blocks', () => {
    expect(extractResultText({
      content: [{ type: 'text', text: '37 files changed' }],
      isError: false,
    })).toBe('37 files changed');
  });
});
