#!/usr/bin/env node
/**
 * SessionStart hook — load system prompt, show ascii art, expose source/model.
 * Spec: receives `source` (startup|resume|clear|compact), `model`, optional `agent_type`.
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { runHook, renderBadges, renderSection, Badge, debugLog } from './utils.mjs';

chalk.level = 3;

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const SYSTEM_PROMPT_PATH = path.join(HOME, 'system-prompt.md');
const ASCII_DIR = path.join(HOME, 'Documents', 'Prompts', 'anime-ascii');

function loadSystemPrompt() {
  try {
    if (fs.existsSync(SYSTEM_PROMPT_PATH)) {
      return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
    }
  } catch (e) {
    debugLog('SessionStart', 'load-system-prompt', e.message);
  }
  return null;
}

function loadRandomAsciiArt() {
  try {
    if (!fs.existsSync(ASCII_DIR)) return null;
    const files = fs.readdirSync(ASCII_DIR).filter(f => f.endsWith('.txt'));
    if (files.length === 0) return null;
    const randomFile = files[Math.floor(Math.random() * files.length)];
    return fs.readFileSync(path.join(ASCII_DIR, randomFile), 'utf8');
  } catch (e) {
    debugLog('SessionStart', 'load-ascii', e.message);
  }
  return null;
}

runHook('SessionStart', (data) => {
  const source = data.source || 'startup';
  const model = data.model || '';
  const agentType = data.agent_type || data.agentType;

  const systemPrompt = loadSystemPrompt();
  const asciiArt = loadRandomAsciiArt();

  const main = new Badge({ label: `Session:${source}`, color: 'green', icon: '⏻' });
  const badge = model
    ? renderBadges(main, new Badge({ label: model, color: 'gray' }))
    : renderBadges(main);

  const lines = [chalk.green('Session started')];
  if (agentType) {
    lines.push(chalk.gray('Agent: ') + agentType);
  }
  if (systemPrompt) {
    lines.push(chalk.cyan('✓ ') + 'System prompt loaded from: ' + SYSTEM_PROMPT_PATH);
  }

  const head = asciiArt ? '\n' + asciiArt + '\n' : '';
  const systemMessage = head + renderSection({ badge, lines });

  const out = {
    hookSpecificOutput: { hookEventName: 'SessionStart' },
    systemMessage,
  };
  if (systemPrompt) {
    out.hookSpecificOutput.appendToSystemPrompt = systemPrompt;
  }
  return out;
});
