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

const EXT_TO_LANG: Record<string, SupportedLanguage> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: 'json',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  md: 'markdown', markdown: 'markdown',
};

export function detectLanguage(content: string, toolName: string): SupportedLanguage {
  const { tool } = parseToolName(toolName);
  if (tool === 'Read' || tool === 'ReadFiles') {
    const extMatch = content.match(/\.([a-z]+)$/m);
    const ext = extMatch?.[1];
    if (ext && EXT_TO_LANG[ext]) return EXT_TO_LANG[ext]!;
    if (ext) return ext;
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
    (language !== 'javascript' &&
      language !== 'typescript' &&
      language !== 'json' &&
      language !== 'bash' &&
      language !== 'markdown')
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

  if (language === 'bash') return highlightBash(result);
  if (language === 'markdown') return highlightMarkdown(result);

  return code;
}

function highlightBash(code: string): string {
  let result = code;
  // Comments first (whole-line `#` only, to avoid clashing with `$#`).
  result = result.replace(/(^|\n)(\s*#.*)/g, (_, p1, p2) => p1 + chalk.gray(p2));
  // Strings — both single and double quoted.
  result = result.replace(/"([^"\\]|\\.)*"/g, m => chalk.green(m));
  result = result.replace(/'([^'\\]|\\.)*'/g, m => chalk.green(m));
  // Variables: $VAR, ${VAR}, $1, $@, $#, $?
  result = result.replace(/\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*|\$[0-9@#?*!\$]/g, m => chalk.yellow(m));
  // Keywords.
  result = result.replace(
    /\b(if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|return|export|local|readonly|declare|set|unset|source|exit|break|continue)\b/g,
    m => chalk.cyan(m)
  );
  // Common commands.
  result = result.replace(
    /\b(echo|printf|cd|pwd|ls|cat|grep|sed|awk|jq|curl|wget|git|npm|bun|node|python|pip|docker|kubectl|make|find|xargs|tar|chmod|chown|mkdir|rm|mv|cp|ln|touch|env|which|head|tail|sort|uniq|wc|tee|read)\b/g,
    m => chalk.magenta(m)
  );
  // Numbers.
  result = result.replace(/\b\d+\b/g, m => chalk.yellow(m));
  return result;
}

function highlightMarkdown(code: string): string {
  let result = code;
  // Fenced code blocks: highlight the inner content per language.
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang: string | undefined, body: string) => {
    const inner = lang ? simpleHighlight(body, lang as SupportedLanguage) : body;
    const fence = chalk.gray('```' + (lang ?? ''));
    return fence + '\n' + inner + chalk.gray('```');
  });
  // ATX headings.
  result = result.replace(/^(#{1,6})\s+(.*)$/gm, (_m, h: string, t: string) =>
    chalk.bold.cyan(h + ' ' + t)
  );
  // Blockquotes.
  result = result.replace(/^(>\s.*)$/gm, m => chalk.gray.italic(m));
  // List markers.
  result = result.replace(/^(\s*)([-*+])(\s)/gm, (_m, sp: string, marker: string, tail: string) =>
    sp + chalk.yellow(marker) + tail
  );
  result = result.replace(/^(\s*)(\d+\.)(\s)/gm, (_m, sp: string, marker: string, tail: string) =>
    sp + chalk.yellow(marker) + tail
  );
  // Bold and italic. Bold first so ** isn't eaten by *.
  result = result.replace(/\*\*([^*]+)\*\*/g, (_m, t: string) => chalk.bold(t));
  result = result.replace(/__([^_]+)__/g, (_m, t: string) => chalk.bold(t));
  result = result.replace(/(?<![*_])\*([^*\n]+)\*(?!\*)/g, (_m, t: string) => chalk.italic(t));
  result = result.replace(/(?<![*_])_([^_\n]+)_(?!_)/g, (_m, t: string) => chalk.italic(t));
  // Inline code.
  result = result.replace(/`([^`\n]+)`/g, (_m, t: string) => chalk.bgHex('#1e1e1e').white(t));
  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) =>
    chalk.cyan(text) + chalk.gray(' (') + chalk.gray.underline(url) + chalk.gray(')')
  );
  return result;
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
