import chalk from 'chalk';

chalk.level = 3;

export function stripAnsi(str: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(str).replace(/\x1b\[[0-9;]*m/g, '');
}

export function truncateAnsi(text: string, maxVisibleLen: number, ellipsis = '…'): string {
  // eslint-disable-next-line no-control-regex
  const csi = /\x1b\[[0-9;]*m/y;
  let out = '';
  let visible = 0;
  let i = 0;
  while (i < text.length && visible < maxVisibleLen) {
    csi.lastIndex = i;
    const m = csi.exec(text);
    if (m) {
      out += m[0];
      i += m[0].length;
      continue;
    }
    out += text[i];
    visible += 1;
    i += 1;
  }
  return out + '\x1b[0m' + ellipsis;
}
