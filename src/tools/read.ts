import chalk from 'chalk';
import fs from 'node:fs';
import { defineTool } from '../registry/tool-registry.ts';
import { softCollapse, extractResultText, getMaxContentWidth } from '../render/primitives.ts';
import { isJSON, formatJSON, simpleHighlight, langFromPath, detectContentLanguage } from '../render/highlight.ts';
import { imageToAscii } from '../render/image-to-ascii.ts';
import type { ReadInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<ReadInput, RawToolResult>({
  matches: 'Read',
  pre(input) {
    const path = input.file_path;
    return { lines: path ? [chalk.gray('  ▤ ') + String(path).trim()] : [] };
  },

  post(input, result, durationMs) {
    const lines: string[] = [];
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    const filePath = input.file_path;
    const ext = filePath ? filePath.slice(filePath.lastIndexOf('.')) : '';
    const isImg = /\.(png|jpg|jpeg|webp)$/i.test(ext);

    let content: string | null = null;
    let asciiArt: string | null = null;

    if (filePath) {
      try {
        if (isImg) {
          const buffer = fs.readFileSync(filePath);
          asciiArt = imageToAscii(buffer, ext, getMaxContentWidth());
        } else {
          content = fs.readFileSync(filePath, 'utf8');
        }
      } catch {}
    }

    if (!asciiArt && !content) {
      content = extractResultText(result);
    }

    if (asciiArt) {
      lines.push(softCollapse(asciiArt, { label: 'lines' }));
    } else if (content) {
      const lang = langFromPath(filePath) ?? detectContentLanguage(content);
      let rendered = content;
      if (isJSON(content)) {
        rendered = simpleHighlight(formatJSON(content), 'json');
      } else if (lang) {
        rendered = simpleHighlight(content, lang);
      }
      lines.push(softCollapse(rendered, { label: 'lines' }));
    }

    return { lines };
  },
});
