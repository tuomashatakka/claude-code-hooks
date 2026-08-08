import { Badge } from '../render/badge.ts';

const VALUE_OPTIONS = new Set([
  '--session', '--session-name', '--profile', '--state', '--headers',
  '--executable-path', '--extension', '--init-script', '--enable', '--args',
  '--user-agent', '--proxy', '--proxy-bypass', '--hide-scrollbars', '--provider',
  '--device', '--screenshot-dir', '--screenshot-quality', '--screenshot-format',
  '--cdp', '--color-scheme', '--download-path', '--max-output', '--allowed-domains',
  '--action-policy', '--confirm-actions', '--engine', '--model', '--config',
  '-p',
]);

function shellWords(command: string): string[] {
  const words: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]!;
    if (quote) {
      if (quote === '"' && ch === '\\' && i + 1 < command.length) current += command[++i]!;
      else if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) words.push(current);
      current = '';
      continue;
    }
    if (ch === '\\' && i + 1 < command.length) current += command[++i]!;
    else current += ch;
  }
  if (current) words.push(current);
  return words;
}

function executableName(token: string): string {
  return token.split('/').pop() ?? token;
}

function operationFromAgentBrowserSegment(segment: string): string | null {
  const words = shellWords(segment);
  const executableIndex = words.findIndex(word => executableName(word) === 'agent-browser');
  if (executableIndex < 0) return null;
  for (let i = executableIndex + 1; i < words.length; i++) {
    const word = words[i]!;
    if (word === '--') return words[i + 1] ?? null;
    if (!word.startsWith('-')) return word;
    const option = word.includes('=') ? word.slice(0, word.indexOf('=')) : word;
    if (!word.includes('=') && VALUE_OPTIONS.has(option)) i++;
  }
  return null;
}

export function agentBrowserOperations(segments: readonly string[]): string[] {
  const operations: string[] = [];
  for (const segment of segments) {
    const operation = operationFromAgentBrowserSegment(segment);
    if (operation && !operations.includes(operation)) operations.push(operation);
  }
  return operations;
}

export function playwrightOperation(toolName: string): string | null {
  const match = toolName.match(/playwright.*__browser_(.+)$/i);
  return match?.[1]?.replace(/_/g, ' ') ?? null;
}

export function operationBadges(operations: readonly string[]): Badge[] {
  return operations.map(operation => new Badge({
    label: operation,
    color: 'brightBlue',
    icon: 'ƒ',
  }));
}
