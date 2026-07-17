import chalk from 'chalk';
import { parseToolName } from './theme.ts';
import { stripAnsi } from './primitives.ts';

chalk.level = 3;

export type SupportedLanguage =
  | 'javascript' | 'typescript' | 'json' | 'bash' | 'markdown'
  | 'python' | 'yaml' | 'diff' | 'html' | 'xml' | 'css' | 'sql'
  | 'output' | 'text' | (string & {});

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
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: 'json', jsonc: 'json', json5: 'json',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  md: 'markdown', markdown: 'markdown', mdx: 'markdown',
  py: 'python', pyi: 'python',
  yaml: 'yaml', yml: 'yaml',
  diff: 'diff', patch: 'diff',
  html: 'html', htm: 'html', vue: 'html', svelte: 'html',
  xml: 'xml', svg: 'xml', plist: 'xml',
  css: 'css', scss: 'css', less: 'css',
  sql: 'sql',
  toml: 'yaml', ini: 'yaml', env: 'bash',
};

/** Maps a file path to a highlight language via its extension, or null. */
export function langFromPath(filePath: string | null | undefined): SupportedLanguage | null {
  if (!filePath) return null;
  const m = String(filePath).match(/\.([^./\s]+)$/);
  return m ? (EXT_TO_LANG[m[1]!.toLowerCase()] ?? null) : null;
}

/** Guesses a language from content alone — shebangs, structure, syntax markers. */
export function detectContentLanguage(content: string): SupportedLanguage | null {
  // `isJSON` is a type guard, so calling it on the bare param would narrow the
  // false branch to `never` — wrap the arg to keep `content: string` below.
  if (isJSON(String(content))) return 'json';
  if (
    /^diff --git /m.test(content) ||
    /^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/m.test(content) ||
    (/^--- \S/m.test(content) && /^\+\+\+ \S/m.test(content))
  ) return 'diff';

  const shebang = content.match(/^#!\s*\S*?\/(?:env\s+)?([\w.-]+)/);
  if (shebang) {
    const interp = shebang[1]!;
    if (/^(ba|z|da|k|)sh$/.test(interp)) return 'bash';
    if (/^python/.test(interp)) return 'python';
    if (/^(node|bun|deno)/.test(interp)) return 'javascript';
  }

  const t = content.trimStart();
  if (/^<!DOCTYPE html/i.test(t) || /^<(html|head|body)\b/i.test(t)) return 'html';
  if (/^<\?xml/.test(t)) return 'xml';
  if (/^\s*(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE (TABLE|INDEX|VIEW)|ALTER TABLE)\b/im.test(content)) return 'sql';
  if (/^\s*(def|class)\s+\w+.*:\s*$/m.test(content) || /^(from \w[\w.]* import|import \w+)\s*$/m.test(content)) return 'python';
  if (/^\s*(export\s+)?(interface|type|enum)\s+\w+/m.test(content) || /:\s*(string|number|boolean|void|unknown|never)\b/.test(content)) return 'typescript';
  if (/^(import|export)\s.*from\s+['"]/m.test(content) || /^\s*(const|let|var|function)\s+\w/m.test(content) || /=>\s*[{(]/.test(content)) return 'javascript';
  if (/^#{1,6}\s+\S/m.test(content) && (/^\s*[-*+]\s+\S/m.test(content) || /```/.test(content))) return 'markdown';

  // YAML last — `key: value` shapes appear in lots of plain output, so demand
  // several keys and none of the brace/semicolon syntax other languages carry.
  const yamlKeys = content.match(/^[\w."'-]+:(\s+\S|$)/gm);
  if (yamlKeys && yamlKeys.length >= 2 && !/[{};]/.test(content)) return 'yaml';

  return null;
}

/**
 * Picks a language for command *output* (stdout). Falls back to the generic
 * `output` highlighter instead of pretending stdout is bash source.
 */
export function detectOutputLanguage(text: string): SupportedLanguage {
  return detectContentLanguage(text) ?? 'output';
}

export function detectLanguage(content: string, toolName: string): SupportedLanguage {
  const { tool } = parseToolName(toolName);
  if (tool === 'Read' || tool === 'ReadFiles') {
    const extMatch = content.match(/\.([a-z0-9]+)$/m);
    const byExt = extMatch ? EXT_TO_LANG[extMatch[1]!.toLowerCase()] : null;
    if (byExt) return byExt;
  }
  if (tool === 'Bash' || tool === 'BashCommand') return 'bash';
  return detectContentLanguage(content) ?? 'text';
}

const HIGHLIGHTERS: Record<string, (code: string) => string> = {
  json: highlightJSON,
  javascript: highlightJS,
  typescript: highlightJS,
  bash: highlightBash,
  markdown: highlightMarkdown,
  python: highlightPython,
  yaml: highlightYaml,
  diff: highlightDiff,
  html: highlightXML,
  xml: highlightXML,
  css: highlightCSS,
  sql: highlightSQL,
  output: highlightOutput,
};

export function simpleHighlight(code: string, language: SupportedLanguage): string {
  const fn = language ? HIGHLIGHTERS[language] : undefined;
  return fn ? fn(code) : code;
}

function highlightJSON(code: string): string {
  let result = code;
  result = result.replace(/"([^"]+)":/g, (_, p1) => chalk.cyan(`"${p1}"`) + chalk.gray(':'));
  result = result.replace(/: "([^"]*)"/g, (_, p1) => chalk.gray(': ') + chalk.green(`"${p1}"`));
  result = result.replace(/: (-?\d+\.?\d*)/g, (_, p1) => chalk.gray(': ') + chalk.yellow(p1));
  result = result.replace(/: (true|false|null)/g, (_, p1) => chalk.gray(': ') + chalk.yellow(p1));
  return result;
}

function highlightJS(code: string): string {
  let result = code;
  result = result.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, m => chalk.gray(m));
  result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, m => chalk.green(m));
  result = result.replace(/\b\d+\.?\d*\b/g, m => chalk.yellow(m));
  result = result.replace(
    /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|super|static|interface|type|enum|extends|implements|typeof|instanceof|in|of|yield|switch|case|default|break|continue|do|void|delete)\b/g,
    m => chalk.cyan(m)
  );
  result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, m => chalk.magenta(m));
  return result;
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
  // Long and short flags: --verbose, -rf
  result = result.replace(/(^|\s)(--?[\w][\w-]*)/g, (_, p1, p2) => p1 + chalk.hex('#e0af68')(p2));
  // Keywords.
  result = result.replace(
    /\b(if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|return|export|local|readonly|declare|set|unset|source|exit|break|continue)\b/g,
    m => chalk.cyan(m)
  );
  // Common commands.
  result = result.replace(
    /\b(echo|printf|cd|pwd|ls|cat|grep|rg|sed|awk|jq|curl|wget|git|gh|npm|npx|bun|bunx|node|deno|python|python3|pip|pip3|uv|docker|kubectl|make|cargo|go|rustc|tsc|find|xargs|tar|zip|unzip|chmod|chown|mkdir|rm|mv|cp|ln|touch|env|which|head|tail|sort|uniq|wc|tee|read|diff|patch|ssh|scp|rsync|kill|ps|open|brew|apt|yarn|pnpm)\b/g,
    m => chalk.magenta(m)
  );
  // Pipes and redirects.
  result = result.replace(/(\||>>?|<|2>&1|&&|\|\|)/g, m => chalk.gray(m));
  // Numbers.
  result = result.replace(/\b\d+\b/g, m => chalk.yellow(m));
  return result;
}

function highlightPython(code: string): string {
  let result = code;
  result = result.replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, m => chalk.green(m));
  result = result.replace(/(^|\n)(\s*#.*)/g, (_, p1, p2) => p1 + chalk.gray(p2));
  result = result.replace(/(["'])(?:(?!\1)[^\\\n]|\\.)*\1/g, m => chalk.green(m));
  result = result.replace(/(^|\n)(\s*@[\w.]+)/g, (_, p1, p2) => p1 + chalk.magenta(p2));
  result = result.replace(/\b\d+\.?\d*\b/g, m => chalk.yellow(m));
  result = result.replace(/\b(None|True|False)\b/g, m => chalk.yellow(m));
  result = result.replace(
    /\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|lambda|yield|async|await|pass|break|continue|raise|global|nonlocal|assert|del|in|not|and|or|is|match|case)\b/g,
    m => chalk.cyan(m)
  );
  result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, m => chalk.magenta(m));
  return result;
}

function highlightYaml(code: string): string {
  return code.split('\n').map(line => {
    if (/^\s*#/.test(line)) return chalk.gray(line);
    let out = line;
    out = out.replace(/^(\s*-?\s*)([\w."'-]+)(:)(\s|$)/, (_m, sp: string, key: string, colon: string, tail: string) =>
      sp + chalk.cyan(key) + chalk.gray(colon) + tail
    );
    out = out.replace(/^(\s*)(-)(\s)/, (_m, sp: string, marker: string, tail: string) => sp + chalk.yellow(marker) + tail);
    out = out.replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, m => chalk.green(m));
    out = out.replace(/\b(true|false|null|~)\b/g, m => chalk.yellow(m));
    out = out.replace(/(:\s+)(-?\d+\.?\d*)\s*$/, (_m, p1: string, p2: string) => p1 + chalk.yellow(p2));
    return out;
  }).join('\n');
}

function highlightDiff(code: string): string {
  return code.split('\n').map(line => {
    if (/^(diff --git|index |new file|deleted file|similarity|rename )/.test(line)) return chalk.gray.bold(line);
    if (/^(--- |\+\+\+ )/.test(line)) return chalk.bold(line);
    if (/^@@ /.test(line)) return chalk.cyan(line);
    if (line.startsWith('+')) return chalk.green(line);
    if (line.startsWith('-')) return chalk.red(line);
    return line;
  }).join('\n');
}

function highlightXML(code: string): string {
  let result = code;
  result = result.replace(/<!--[\s\S]*?-->/g, m => chalk.gray(m));
  result = result.replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, m => chalk.green(m));
  result = result.replace(/(<\/?)([\w:-]+)/g, (_m, punct: string, tag: string) => chalk.gray(punct) + chalk.cyan(tag));
  result = result.replace(/([\w:-]+)(=)/g, (_m, attr: string, eq: string) => chalk.yellow(attr) + chalk.gray(eq));
  result = result.replace(/(\/?>)/g, m => chalk.gray(m));
  return result;
}

function highlightCSS(code: string): string {
  let result = code;
  result = result.replace(/\/\*[\s\S]*?\*\//g, m => chalk.gray(m));
  result = result.replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, m => chalk.green(m));
  result = result.replace(/^([^{}\n]+)(?=\s*\{)/gm, m => chalk.magenta(m));
  result = result.replace(/([\w-]+)(\s*:)/g, (_m, prop: string, colon: string) => chalk.cyan(prop) + chalk.gray(colon));
  result = result.replace(/#[0-9a-fA-F]{3,8}\b/g, m => chalk.yellow(m));
  result = result.replace(/\b(\d+\.?\d*)(px|em|rem|vh|vw|%|s|ms|deg|fr)?\b/g, (_m, n: string, unit: string | undefined) =>
    chalk.yellow(n) + (unit ? chalk.gray(unit) : '')
  );
  return result;
}

function highlightSQL(code: string): string {
  let result = code;
  result = result.replace(/(^|\n)(\s*--.*)/g, (_, p1, p2) => p1 + chalk.gray(p2));
  result = result.replace(/'(?:[^'\\]|\\.)*'/g, m => chalk.green(m));
  result = result.replace(/\b\d+\.?\d*\b/g, m => chalk.yellow(m));
  result = result.replace(
    /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|VIEW|ALTER|DROP|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|AND|OR|NOT|NULL|IN|IS|LIKE|ORDER|GROUP|BY|HAVING|LIMIT|OFFSET|DISTINCT|COUNT|SUM|AVG|MIN|MAX|UNION|ALL|EXISTS|BETWEEN|CASE|WHEN|THEN|ELSE|END|PRIMARY|FOREIGN|KEY|REFERENCES|DEFAULT|UNIQUE|CONSTRAINT|IF)\b/gi,
    m => chalk.cyan(m)
  );
  return result;
}

// Generic stdout: not a language, so color by *meaning* — severity words tint
// the whole line, then paths / URLs / metric-suffixed numbers get accents.
const OUTPUT_URL_RE = /\bhttps?:\/\/[^\s)'"]+/g;
const OUTPUT_PATH_RE = /(^|[\s('"=])((?:~|\.{1,2})?\/[\w.@+-]+(?:\/[\w.@+-]+)+(?::\d+(?::\d+)?)?)/g;
const OUTPUT_METRIC_RE = /\b\d+(?:[.,]\d+)?\s?(?:ms|s|m|h|[KMGT]i?B|kb|mb|gb|%)\b/g;

function highlightOutput(code: string): string {
  return code.split('\n').map(line => {
    if (/\b(error|fatal|failed|failure|exception|traceback|panic|denied|refused)\b/i.test(line)) return chalk.red(line);
    if (/\b(warn|warning|deprecated)\b/i.test(line)) return chalk.yellow(line);
    if (/\b(success|succeeded|passed|completed?)\b/i.test(line) || /[✓✔]/.test(line)) return chalk.green(line);
    // Metrics first, while the line is still ANSI-free: `\d+m` would otherwise
    // match inside escape codes (e.g. the `36m` of \x1b[36m) inserted below.
    let out = line;
    out = out.replace(OUTPUT_METRIC_RE, m => chalk.yellow(m));
    out = out.replace(OUTPUT_URL_RE, m => chalk.cyan.underline(m));
    out = out.replace(OUTPUT_PATH_RE, (_m, pre: string, p: string) => pre + chalk.cyan(p));
    return out;
  }).join('\n');
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
