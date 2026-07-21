import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { shortenPath } from '../parsers/wcgw-trailer.ts';
import { pickResultText, pushDurationLine } from '../render/primitives.ts';
import type { WcgwInitializeInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<WcgwInitializeInput, RawToolResult>({
  matches: 'mcp__wcgw__Initialize',
  pre(input) {
    const lines: string[] = [];
    if (input.type)               lines.push(chalk.gray('type: ') + input.type);
    if (input.any_workspace_path) lines.push(chalk.gray('workspace: ') + shortenPath(input.any_workspace_path));
    if (input.mode_name)          lines.push(chalk.gray('mode: ') + input.mode_name);
    return { lines };
  },

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
