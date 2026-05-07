import chalk from 'chalk';
import { softCollapse } from '../render/primitives.ts';

chalk.level = 3;

export interface SearchReplaceBlock {
  search: string;
  replace: string;
}

export function parseSearchReplaceBlocks(content: unknown): SearchReplaceBlock[] {
  if (typeof content !== 'string') return [];
  const blocks: SearchReplaceBlock[] = [];
  const re = /<<<<<<< SEARCH\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> REPLACE/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    blocks.push({ search: m[1] ?? '', replace: m[2] ?? '' });
  }
  return blocks;
}

export function renderSearchReplace(blocks: SearchReplaceBlock[], filePath: string | null): string | null {
  if (!blocks.length) return null;
  const lines: string[] = [];
  if (filePath) lines.push(chalk.bold.cyan('  ' + filePath));

  blocks.forEach((block, i) => {
    if (blocks.length > 1) lines.push(chalk.gray(`  hunk ${i + 1}/${blocks.length}`));

    const searchLines  = block.search.replace(/\n$/, '').split('\n');
    const replaceLines = block.replace.replace(/\n$/, '').split('\n');

    const diffLines = [
      ...searchLines.map(l => chalk.red('  - ') + chalk.red(l)),
      ...replaceLines.map(l => chalk.green('  + ') + chalk.green(l)),
    ];

    lines.push(softCollapse(diffLines.join('\n'), { maxLines: 24, label: 'diff lines' }));
  });

  return lines.join('\n');
}
