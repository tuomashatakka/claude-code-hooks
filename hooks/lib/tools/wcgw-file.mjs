import chalk from 'chalk';
import { renderBox } from '../primitives.mjs';
import { parseSearchReplaceBlocks, renderSearchReplace } from '../parsers/search-replace.mjs';

chalk.level = 3;

export const wcgwFile = {
  pre(input, ctx) {
    const lines = [];
    const filePath = input.file_path ?? input.filePath ?? null;
    if (filePath) lines.push(chalk.bold.cyan(filePath));

    const blocks = parseSearchReplaceBlocks(input.text_or_search_replace_blocks ?? '');
    if (blocks.length) {
      const rendered = renderSearchReplace(blocks, null);
      if (rendered) lines.push(rendered);
      lines.push(chalk.gray(`  ${blocks.length} hunk${blocks.length > 1 ? 's' : ''}`));
    } else if (input.text_or_search_replace_blocks) {
      const text    = String(input.text_or_search_replace_blocks);
      const snippet = text.split('\n').slice(0, 6).join('\n');
      lines.push(renderBox(snippet + (text.split('\n').length > 6 ? '\n…' : '')));
    }

    const meta = [];
    if (input.percentage_to_change != null) meta.push(chalk.gray(`±${input.percentage_to_change}%`));
    if (input.thread_id != null)            meta.push(chalk.gray(`thread:${input.thread_id}`));
    if (meta.length) lines.push(meta.join('  '));

    return { lines };
  },

  post(input, result, durationMs, ctx) {
    const lines = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));
    const text = typeof result === 'string'
      ? result
      : (result?.text ?? result?.result ?? JSON.stringify(result, null, 2));
    if (text) lines.push(chalk.green('✓ ') + String(text).split('\n')[0]);
    return { lines };
  },
};
