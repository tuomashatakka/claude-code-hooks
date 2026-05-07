import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderBox } from '../render/primitives.ts';
import { parseSearchReplaceBlocks, renderSearchReplace } from '../parsers/search-replace.ts';
import type { WcgwFileWriteOrEditInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<WcgwFileWriteOrEditInput, RawToolResult>({
  matches: ['mcp__wcgw__FileWriteOrEdit', 'mcp__wcgw__FileEdit'],
  pre(input) {
    const lines: string[] = [];
    const filePath = input.file_path;
    if (filePath) lines.push(chalk.bold.cyan(filePath));

    const blocks = parseSearchReplaceBlocks(input.text_or_search_replace_blocks);
    if (blocks.length) {
      const rendered = renderSearchReplace(blocks, null);
      if (rendered) lines.push(rendered);
      lines.push(chalk.gray(`  ${blocks.length} hunk${blocks.length > 1 ? 's' : ''}`));
    } else if (input.text_or_search_replace_blocks) {
      const text    = String(input.text_or_search_replace_blocks);
      const parts   = text.split('\n');
      const snippet = parts.slice(0, 6).join('\n');
      lines.push(renderBox(snippet + (parts.length > 6 ? '\n…' : '')));
    }

    const meta: string[] = [];
    if (input.percentage_to_change != null) meta.push(chalk.gray(`±${input.percentage_to_change}%`));
    if (input.thread_id != null)            meta.push(chalk.gray(`thread:${input.thread_id}`));
    if (meta.length) lines.push(meta.join('  '));

    return { lines };
  },

  post(_input, result, durationMs) {
    const lines: string[] = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));
    const text = typeof result === 'string'
      ? result
      : ((result as Record<string, unknown> | null)?.text
        ?? (result as Record<string, unknown> | null)?.result
        ?? JSON.stringify(result, null, 2));
    if (text) lines.push(chalk.green('✓ ') + String(text).split('\n')[0]!);
    return { lines };
  },
});
