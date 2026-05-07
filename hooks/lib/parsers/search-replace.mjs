import chalk from 'chalk';
import { softCollapse } from '../primitives.mjs';

chalk.level = 3;

// Parses one or more <<<<<<< SEARCH / ======= / >>>>>>> REPLACE blocks.
// Returns [{ search: string, replace: string }]
export function parseSearchReplaceBlocks(content) {
  if (typeof content !== 'string') return [];

  const blocks = [];
  const re = /<<<<<<< SEARCH\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> REPLACE/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    blocks.push({ search: m[1], replace: m[2] });
  }
  return blocks;
}

// Renders parsed blocks as a colored inline diff, soft-collapsed per hunk.
export function renderSearchReplace(blocks, filePath) {
  if (!blocks.length) return null;

  const lines = [];
  if (filePath) {
    lines.push(chalk.bold.cyan('  ' + filePath));
  }

  blocks.forEach((block, i) => {
    if (blocks.length > 1) {
      lines.push(chalk.gray(`  hunk ${i + 1}/${blocks.length}`));
    }

    const searchLines  = block.search.replace(/\n$/, '').split('\n');
    const replaceLines = block.replace.replace(/\n$/, '').split('\n');

    const diffLines = [
      ...searchLines.map(l  => chalk.red('  - ') + chalk.red(l)),
      ...replaceLines.map(l => chalk.green('  + ') + chalk.green(l)),
    ];

    const collapsed = softCollapse(diffLines.join('\n'), { maxLines: 24, label: 'diff lines' });
    lines.push(collapsed);
  });

  return lines.join('\n');
}
