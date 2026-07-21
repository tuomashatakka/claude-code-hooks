import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { shortenPath } from '../parsers/wcgw-trailer.ts';
import { firstLine, pickResultText, pushDurationLine } from '../render/primitives.ts';
import type { WcgwContextSaveInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<WcgwContextSaveInput, RawToolResult>({
  matches: 'mcp__wcgw__ContextSave',
  pre(input) {
    const lines: string[] = [];
    if (input.id)                lines.push(chalk.gray('id: ') + input.id);
    if (input.project_root_path) lines.push(chalk.gray('root: ') + shortenPath(input.project_root_path));
    if (input.description) {
      lines.push(chalk.gray('desc: ') + String(input.description).split('\n')[0]!.slice(0, 120));
    }
    if (input.relevant_file_globs) {
      const globs = Array.isArray(input.relevant_file_globs)
        ? input.relevant_file_globs
        : [input.relevant_file_globs];
      const preview = globs.slice(0, 3).join(', ');
      const suffix  = globs.length > 3 ? chalk.gray(` +${globs.length - 3} more`) : '';
      lines.push(chalk.gray('globs: ') + preview + suffix);
    }
    return { lines };
  },

  post(_input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);
    const text = pickResultText(result, ['text', 'result']);
    if (text) lines.push(chalk.green('⧺ ') + firstLine(text));
    return { lines };
  },
});
