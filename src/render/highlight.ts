import chalk from 'chalk';
import { parseToolName } from './theme.ts';
import { stripAnsi } from './primitives.ts';

chalk.level = 3;

export type SupportedLanguage = 'javascript' | 'typescript' | 'json' | 'bash' | 'text' | (string & {});

export function isJSON(str: unknown): str is string {
  if (typeof str !== 'string') return false;
  const t = str.trim();
  if (!t || (t[0] !== '{' && t[0] !== '[')) return false;
  try { JSON.parse(t); return true; } catch { return false; }
}

export function isCode(str: unknown): str is string {
  if (typeof str !== 'string') return false;
  const codePatterns: RegExp[] = [
    /^(function|const|let|var|class|import|export|if|for|while|return)\s/m,
    /^(def|class|import|from|if|for|while|return)\s/m,
    /=>/,
    /\{\s*[\w\s:,\n]+\}/,
    /^\s*```/m,
  ];
  return codePatterns.some(p => p.test(str));
}

export function formatJSON(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch { return content; }
}

export function detectLanguage(content: string, toolName: string): SupportedLanguage {
  const { tool } = parseToolName(toolName);
  if (tool === 'Read' || tool === 'ReadFiles') {
    const extMatch = content.match(/\.([a-z]+)$/m);
    if (extMatch?.[1]) return extMatch[1];
    if (
      content.includes('function') ||
      content.includes('const ') ||
      content.includes('let ') ||
      content.includes('=>')
    ) return 'javascript';
    if (content.includes('def ') && content.includes(':')) return 'python';
  }
  if (tool === 'Bash' || tool === 'BashCommand') return 'bash';
  return 'text';
}

export function simpleHighlight(code: string, language: SupportedLanguage): string {
  if (
    !language ||
    (language !== 'javascript' && language !== 'typescript' && language !== 'json' && language !== 'bash')
  ) {
    return code;
  }
  let result = code;

  if (language === 'json') {
    result = result.replace(/"([^"]+)":/g, (_, p1) => chalk.cyan(`"${p1}"`) + chalk.gray(':'));
    result = result.replace(/: "([^"]*)"/g, (_, p1) => chalk.gray(': ') + chalk.green(`"${p1}"`));
    result = result.replace(/: (\d+)/g, (_, p1) => chalk.gray(': ') + chalk.yellow(p1));
    result = result.replace(/: (true|false|null)/g, (_, p1) => chalk.gray(': ') + chalk.yellow(p1));
    return result;
  }

  if (language === 'javascript' || language === 'typescript') {
    result = result.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, m => chalk.gray(m));
    result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, m => chalk.green(m));
    result = result.replace(/\b\d+\.?\d*\b/g, m => chalk.yellow(m));
    result = result.replace(
      /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|super|static)\b/g,
      m => chalk.cyan(m)
    );
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, m => chalk.magenta(m));
    return result;
  }

  if (language === 'bash') {
    result = result.replace(/(^|\n)(#.*)$/gm, (_, p1, p2) => p1 + chalk.gray(p2));
    return result;
  }

  return code;
}

const META_KEY   = chalk.hex('#7aa2f7');
const META_STR   = chalk.hex('#9ece6a');
const META_NUM   = chalk.yellow;
const META_PUNCT = chalk.gray;

// Metadata cells must stay single-line so they don't break the renderBox grid.
// Collapse any internal whitespace run (incl. newlines) to a single space, and
// truncate overlong values with an ellipsis. Long single-line strings still
// render fine because the surrounding renderBox right-pads each row.
const META_STR_MAX = 200;

function flattenString(s: string): string {
  const collapsed = s.replace(/\s+/g, ' ').trim();
  return collapsed.length > META_STR_MAX
    ? collapsed.slice(0, META_STR_MAX - 1) + '…'
    : collapsed;
}

function formatMetaValue(val: unknown, depth: number): string {
  if (val === null) return META_NUM('null');
  if (val === undefined) return META_NUM('undefined');
  if (typeof val === 'boolean') return META_NUM(String(val));
  if (typeof val === 'number') return META_NUM(String(val));
  if (typeof val === 'string') return META_STR(flattenString(val));

  const pad  = '  '.repeat(depth + 1);
  const cpad = '  '.repeat(depth);

  if (Array.isArray(val)) {
    if (val.length === 0) return META_PUNCT('[ ]');
    const items = val.map(v => formatMetaValue(v, depth + 1));
    const inline = META_PUNCT('[ ') + items.join(META_PUNCT(', ')) + META_PUNCT(' ]');
    if (stripAnsi(inline).length <= 50) return inline;
    return META_PUNCT('[\n') + items.map(i => pad + i).join(META_PUNCT(',\n')) + '\n' + cpad + META_PUNCT(']');
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return META_PUNCT('{ }');
    const pairs = entries.map(([k, v]) => META_KEY(k) + META_PUNCT(': ') + formatMetaValue(v, depth + 1));
    const inline = META_PUNCT('{ ') + pairs.join(META_PUNCT(', ')) + META_PUNCT(' }');
    if (stripAnsi(inline).length <= 50) return inline;
    return META_PUNCT('{\n') + pairs.map(p => pad + p).join(META_PUNCT(',\n')) + '\n' + cpad + META_PUNCT('}');
  }

  return String(val);
}

export function formatMetadataCustom(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return String(obj);
  return Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => META_KEY(k) + META_PUNCT(': ') + formatMetaValue(v, 0))
    .join('\n');
}
