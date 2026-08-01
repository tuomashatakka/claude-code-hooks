import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { extractResultText, firstLine, pushDurationLine, renderBox } from '../render/primitives.ts';
import { renderFileResult } from '../render/file-preview.ts';
import { parseSearchReplaceBlocks, renderSearchReplace } from '../parsers/search-replace.ts';
import type { WcgwFileWriteOrEditInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

const FAILURE_RE = /\b(error|failed|failure|denied|not permitted|cannot|no such file)\b/i;

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

  // wcgw answers with an MCP text block ("Success"), never the file itself, so
  // re-read the target from disk and render it the way Write's post hook does.
  post(input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const text   = extractResultText(result);
    const status = text ? firstLine(text, 200) : null;
    const failed = status ? FAILURE_RE.test(status) : false;
    if (status) lines.push((failed ? chalk.red('⨂ ') : chalk.green('✓ ')) + status);

    const action = parseSearchReplaceBlocks(input.text_or_search_replace_blocks).length ? 'edit' : 'write';
    const box    = input.file_path ? renderFileResult(input.file_path, { action }) : null;

    if (box) lines.push(box);
    else if (!status && text) lines.push(renderBox(text));

    return { lines };
  },
});
