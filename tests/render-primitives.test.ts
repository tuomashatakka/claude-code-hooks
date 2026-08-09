import { describe, expect, test } from 'bun:test';
import { extractResultText } from '../src/render/primitives.ts';

describe('extractResultText', () => {
  test('unwraps MCP CallToolResult content blocks', () => {
    expect(extractResultText({
      content: [{ type: 'text', text: '37 files changed' }],
      isError: false,
    })).toBe('37 files changed');
  });
});
