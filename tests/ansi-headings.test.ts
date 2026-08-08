import { describe, expect, test } from 'bun:test';
import { renderCheckboxHeading } from '@tuomashatakka/ansi-headings';
import { stripAnsi } from '../src/render/primitives.ts';

describe('renderCheckboxHeading', () => {
  test('renders a large empty box and places the description under the caption', () => {
    const plain = stripAnsi(renderCheckboxHeading({
      caption: 'ADDED TASK',
      checked: false,
      color: 'cyan',
      description: 'Unwrap nested MCP output without inventing output for silent commands.',
    }));
    const lines = plain.split('\n');

    expect(lines[1]).toContain('█▀▀▀█');
    expect(lines[1]).toContain('ADDED TASK');
    expect(lines[2]).toContain('█   █');
    expect(lines[2]).toContain('Unwrap nested MCP output');
    expect(lines[3]).toContain('█▄▄▄█');
    expect(plain).not.toContain('█▄█▄█');
  });

  test('fills the box with a block-weight checkmark when completed', () => {
    const plain = stripAnsi(renderCheckboxHeading({
      caption: 'TASK COMPLETED',
      checked: true,
      color: 'green',
    }));

    expect(plain).toContain('█▄ ██');
    expect(plain).toContain('█▄█▄█');
  });
});
