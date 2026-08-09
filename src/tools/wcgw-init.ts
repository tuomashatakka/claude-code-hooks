import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { pickResultText } from '../render/primitives.ts';
import { pushDurationLine } from '../tui/index.ts';
import type { WcgwInitializeInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<WcgwInitializeInput, RawToolResult>({
  matches: 'mcp__wcgw__Initialize',
  post(_input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);
    const text = pickResultText(result, ['text', 'output']);
    if (text) {
      const summary = String(text).split('\n').slice(0, 3).join('\n');
      lines.push(chalk.green('⏻ ') + summary);
    }
    return { lines };
  },
});
