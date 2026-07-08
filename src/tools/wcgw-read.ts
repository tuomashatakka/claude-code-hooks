import chalk from 'chalk';
import fs from 'node:fs';
import { defineTool } from '../registry/tool-registry.ts';
import { softCollapse, getMaxContentWidth } from '../render/primitives.ts';
import { imageToAscii } from '../render/image-to-ascii.ts';
import type { WcgwReadFilesInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<WcgwReadFilesInput, RawToolResult>({
  matches: 'mcp__wcgw__ReadFiles',
  pre(input) {
    const paths = input.file_paths ?? [];
    const list  = Array.isArray(paths) ? paths : [paths];
    return { lines: list.map(p => chalk.gray('  ▤ ') + p) };
  },

  post(_input, result, durationMs) {
    const lines: string[] = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    if (!result || typeof result !== 'object') {
      if (result) lines.push(String(result));
      return { lines };
    }

    const res = result as Record<string, unknown>;
    const fileContents =
      res['file-contents-numbered'] ??
      res['file_contets_numbered'] ??
      res['file-contents'] ??
      res['output'];

    if (fileContents && typeof fileContents === 'object') {
      for (const [filePath, content] of Object.entries(fileContents as Record<string, unknown>)) {
        if (typeof content !== 'string') continue;
        lines.push(chalk.cyan('  ├ ') + chalk.bold(filePath));

        const ext = filePath.slice(filePath.lastIndexOf('.'));
        const isImg = /\.(png|jpg|jpeg)$/i.test(ext);
        let rendered: string | null = null;
        if (isImg) {
          try {
            const buffer = fs.readFileSync(filePath);
            rendered = imageToAscii(buffer, ext, getMaxContentWidth());
          } catch {}
        }

        if (!rendered) {
          rendered = content;
        }

        lines.push(softCollapse(
          rendered.split('\n').map(l => chalk.gray('  │ ') + l).join('\n'),
          { maxLines: 15, label: 'lines' }
        ));
      }
    } else if (typeof fileContents === 'string' && fileContents.length) {
      lines.push(softCollapse(fileContents, { maxLines: 20, label: 'lines' }));
    }

    const filePaths = res['file_paths'];
    if (Array.isArray(filePaths)) {
      for (const p of filePaths) lines.push(chalk.gray('  ├ ') + String(p));
    }

    return { lines };
  },
});
