import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { extractResultText } from '../render/primitives.ts';
import {
  OUTPUT_BADGE,
  pushDurationLine,
  renderCard,
  renderFileCard,
} from '../tui/index.ts';
import {
  collapsePreview,
  previewBudgetChars,
  renderFilePreview,
  renderFileResult,
  stripLineRange,
} from '../render/file-preview.ts';
import type { WcgwReadFilesInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

function toPathList(input: WcgwReadFilesInput): string[] {
  const raw = input.file_paths ?? input.file_path ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(p => String(p)).filter(Boolean);
}

// Fallback for the (older / object-shaped) response that carries the contents
// inline instead of the MCP text-block array.
function renderInlineContents(result: RawToolResult): string[] {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return [];

  const res = result as Record<string, unknown>;
  const fileContents =
    res['file-contents-numbered'] ??
    res['file_contets_numbered'] ??
    res['file-contents'] ??
    res['output'];

  const lines: string[] = [];
  if (fileContents && typeof fileContents === 'object') {
    for (const [filePath, content] of Object.entries(fileContents as Record<string, unknown>)) {
      if (typeof content !== 'string') continue;
      const preview = renderFilePreview(filePath, { fallbackText: content, readText: false });
      const rendered = preview?.content ?? content;
      lines.push(renderFileCard({
        path: filePath,
        content: collapsePreview(rendered),
      }));
    }
  } else if (typeof fileContents === 'string' && fileContents.length) {
    lines.push(collapsePreview(fileContents));
  }
  return lines;
}

defineTool<WcgwReadFilesInput, RawToolResult>({
  matches: ['mcp__wcgw__ReadFiles', 'mcp__wcgw__ReadImage'],
  // Same deal as FileWriteOrEdit: the MCP payload is opaque, so each requested
  // path is rendered straight off disk in the Write post-hook's box layout —
  // which also gets images rendered as ascii for free.
  post(input, result, durationMs) {
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const paths = toPathList(input);
    // Several files share one response, so they share one budget — otherwise
    // each card sizes itself to the whole of it and the transport trims the
    // message they add up to.
    const budgetChars = Math.floor(previewBudgetChars() / Math.max(1, paths.length));
    let missed = 0;
    for (const rawPath of paths) {
      const box = renderFileResult(rawPath, { action: 'read', budgetChars });
      if (box) lines.push(box);
      else {
        missed += 1;
        lines.push(chalk.red('⨂ ') + chalk.bold('Path: ') + stripLineRange(rawPath).path);
      }
    }

    // Only fall back to the response payload when disk gave us nothing.
    if (!paths.length || missed === paths.length) {
      const inline = renderInlineContents(result);
      if (inline.length) lines.push(...inline);
      else {
        const text = extractResultText(result);
        if (text) {
          lines.push(renderCard({ badges: OUTPUT_BADGE, content: collapsePreview(text) }));
        }
      }
    }

    return { lines };
  },
});
