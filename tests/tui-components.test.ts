import { describe, expect, test } from 'bun:test';
import {
  Badge,
  OUTPUT_BADGE,
  RUNNING_BADGE,
  renderBox,
  renderCard,
  renderColumns,
  renderSection,
} from '../src/tui/index.ts';
import { stripAnsi, visibleWidth } from '../src/render/primitives.ts';

describe('tui cards', () => {
  test('joins the title badge to a same-color lower rule', () => {
    const lines = renderCard({
      badges: RUNNING_BADGE,
      content: '$ bun test && bun run typecheck',
    }).split('\n');
    const title = lines[1]!;
    const boxLines = lines.slice(2, -1);

    expect(stripAnsi(title)).toContain('Running');
    expect(stripAnsi(title)).toContain('▁');
    expect(title).toContain('\x1b[35m▁');
    expect(boxLines.every(line => visibleWidth(line) === visibleWidth(title))).toBeTrue();
  });

  test('expands a short body to the ansi-aware badge width', () => {
    const badge = new Badge({ label: 'an unusually wide title', color: 'magenta' });
    const lines = renderCard({ badges: badge, content: 'x' }).split('\n');
    const widths = lines.slice(1, -1).map(visibleWidth);

    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBe(visibleWidth(badge.toString()) + 4);
    expect(stripAnsi(lines[1]!)).toEndWith('▁▁▁▁');
  });

  test('renders an untitled box through the same layout primitive', () => {
    const lines = renderBox({ content: 'hello' }).split('\n');
    expect(lines.length).toBe(5);
    expect(stripAnsi(lines[2]!)).toContain('hello');
  });

  test('places cards in columns when their combined width fits comfortably', () => {
    const output = stripAnsi(renderColumns({
      items: [
        renderCard({ badges: RUNNING_BADGE, content: '$ bun test' }),
        renderCard({ badges: OUTPUT_BADGE, content: 'all tests passed' }),
      ],
      maximumWidth: 80,
    }));
    const titleLine = output.split('\n').find(line => line.includes('Running'))!;

    expect(titleLine).toContain('Output');
  });

  test('stacks cards when columns would be cramped', () => {
    const output = stripAnsi(renderColumns({
      items: [
        renderCard({ badges: RUNNING_BADGE, content: '$ bun test' }),
        renderCard({ badges: OUTPUT_BADGE, content: 'all tests passed' }),
      ],
      maximumWidth: 30,
    }));
    const titleLines = output.split('\n').filter(line => /Running|Output/.test(line));

    expect(titleLines).toHaveLength(2);
    expect(titleLines.every(line => !(line.includes('Running') && line.includes('Output')))).toBeTrue();
  });
});

describe('tui sections', () => {
  test('composes typed badges and body lines', () => {
    const output = renderSection({
      badges: [
        new Badge({ label: 'Read', color: 'blue' }),
        new Badge({ label: 'Output', color: 'green' }),
      ],
      lines: ['body'],
    });

    const plain = stripAnsi(output);
    expect(plain).toContain('Read');
    expect(plain).toContain('Output');
    expect(plain).toEndWith('\n\nbody');
  });
});
