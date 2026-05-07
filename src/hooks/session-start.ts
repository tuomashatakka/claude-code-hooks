import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { renderHeading } from '../render/headings.ts';
import { debugLog } from '../runtime/debug.ts';
import { asObject, pickString } from './_normalize.ts';

chalk.level = 3;

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? '';
const SYSTEM_PROMPT_PATH = path.join(HOME, 'system-prompt.md');
const ASCII_DIR = path.join(HOME, 'Documents', 'Prompts', 'anime-ascii');

function loadSystemPrompt(): string | null {
  try {
    if (fs.existsSync(SYSTEM_PROMPT_PATH)) return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
  } catch (e) { debugLog('SessionStart', 'load-system-prompt', (e as Error).message); }
  return null;
}

function loadRandomAsciiArt(): string | null {
  try {
    if (!fs.existsSync(ASCII_DIR)) return null;
    const files = fs.readdirSync(ASCII_DIR).filter(f => f.endsWith('.txt'));
    if (!files.length) return null;
    const pick = files[Math.floor(Math.random() * files.length)]!;
    return fs.readFileSync(path.join(ASCII_DIR, pick), 'utf8');
  } catch (e) { debugLog('SessionStart', 'load-ascii', (e as Error).message); }
  return null;
}

defineHook({
  event: 'SessionStart',
  parse(raw) {
    const o = asObject(raw);
    const source = (pickString(o, 'source') ?? 'startup') as
      'startup' | 'resume' | 'clear' | 'compact' | (string & {});
    return {
      source,
      model: pickString(o, 'model'),
      agentType: pickString(o, 'agent_type', 'agentType'),
    };
  },
  handle(input) {
    const systemPrompt = loadSystemPrompt();
    const asciiArt = loadRandomAsciiArt();

    const main = new Badge({ label: `Session:${input.source}`, color: 'green', icon: '⏻' });
    const badge = input.model
      ? renderBadges(main, new Badge({ label: input.model, color: 'gray' }))
      : renderBadges(main);

    const lines: string[] = [chalk.green('Session started')];
    if (input.agentType) lines.push(chalk.gray('Agent: ') + input.agentType);
    if (systemPrompt)    lines.push(chalk.cyan('✓ ') + 'System prompt loaded from: ' + SYSTEM_PROMPT_PATH);

    const isWake = input.source === 'compact';
    const headingWord = isWake ? 'WAKE UP' : 'START';
    const asciiBlock = asciiArt ? '\n' + asciiArt + '\n' : '';
    const heading = renderHeading({
      word: headingWord,
      color: 'cyan',
      event: isWake ? 'wakeup' : 'start',
    });

    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        ...(systemPrompt ? { appendToSystemPrompt: systemPrompt } : {}),
      },
      systemMessage: asciiBlock + heading + renderSection({ badge, lines }),
    };
  },
});
