import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { defineHook } from '../registry/hook-registry.ts';
import {
  Badge,
  pushDurationLine,
  renderHeading,
  renderSection,
} from '../tui/index.ts';
import { debugLog } from '../runtime/debug.ts';
import {
  asObject,
  pickString,
  pickNumber,
  pickBool,
  pickAny,
  injectToolDiscriminator
} from './_normalize.ts';
import { renderToolSection } from '../render/render-tool.ts';
import type { ToolName } from '../types/claude-code.ts';
import type { RawToolResult } from '../types/tool-io.ts';

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

// 1. SessionStart
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

    const badges = [
      new Badge({ label: `Session:${input.source}`, color: 'green', icon: '⏻' }),
      input.model ? new Badge({ label: input.model, color: 'gray' }) : null,
    ];

    const lines: string[] = [chalk.green('Session started')];
    if (input.agentType) lines.push(chalk.gray('Agent: ') + input.agentType);
    if (systemPrompt)    lines.push(chalk.cyan('✓ ') + 'System prompt loaded from: ' + SYSTEM_PROMPT_PATH);

    const isWake = input.source === 'compact';
    const headingWord = isWake ? 'WAKE UP' : 'BEGIN AGAIN';
    const asciiBlock = asciiArt ? '\n' + asciiArt + '\n' : '';
    const heading = renderHeading({
      word: headingWord,
      color: 'cyan',
      event: isWake ? 'wakeup' : 'start',
    });

    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        ...(systemPrompt ? { additionalContext: systemPrompt } : {}),
      },
      systemMessage: asciiBlock + heading + renderSection({ badges, lines }),
    };
  },
});

// 2. SessionEnd
defineHook({
  event: 'SessionEnd',
  parse() { return {}; },
  handle() {
    const heading = renderHeading({ word: 'BYE', color: 'red', event: 'bye' });
    const badge = new Badge({ label: 'SessionEnd', color: 'red', icon: '⏼' });
    return { systemMessage: heading + renderSection({ badges: badge }) };
  },
});

// 3. Stop
defineHook({
  event: 'Stop',
  parse() { return {}; },
  handle() {
    const heading = renderHeading({ word: 'STOP', color: 'red', event: 'stop' });
    const badge = new Badge({ label: 'Stop', color: 'red', icon: '■' });
    return { systemMessage: heading + renderSection({ badges: badge }) };
  },
});

// 4. SubagentStart
defineHook({
  event: 'SubagentStart',
  parse(raw) {
    const o = asObject(raw);
    return {
      agentId: pickString(o, 'agent_id', 'agentId'),
      agentType: pickString(o, 'agent_type', 'agentType'),

    };
  },
  handle(input) {
    const heading = renderHeading({ word: 'BEGIN', color: 'green', event: 'agent' });
    const main = new Badge({ label: 'SubagentStart', color: 'green', icon: '⬡' });
    const extras: Badge[] = [];
    if (input.agentType) extras.push(new Badge({ label: input.agentType, color: 'gray' }));
    return { systemMessage: heading + renderSection({ badges: [main, ...extras] }) };
  },
});

// 5. SubagentStop
defineHook({
  event: 'SubagentStop',
  parse(raw) {
    const o = asObject(raw);
    return { agentType: pickString(o, 'agent_type', 'agentType') };
  },
  handle(input) {
    const badges = [
      new Badge({ label: 'SubagentStop', color: 'green', icon: '⌟' }),
      new Badge({
        label: input.agentType ?? 'Main Process',
        color: 'gray',
      }),
    ];
    return {
      systemMessage:
        renderHeading({ word: 'GOIN ASLEEP', color: 'green', event: 'agent' })
        + renderSection({ badges }),
    };
  },
});

// 6. PreCompact
defineHook({
  event: 'PreCompact',
  parse(raw) {
    const o = asObject(raw);
    return {
      trigger: pickString(o, 'trigger') as 'manual' | 'auto' | undefined,
      customInstructions: pickString(o, 'custom_instructions', 'customInstructions'),
    };
  },
  handle(input) {
    const heading = renderHeading({ word: 'COMPACT', color: 'yellow', event: 'compact' });
    const badges = [
      new Badge({ label: 'PreCompact', color: 'yellow', icon: '⟳' }),
      input.trigger ? new Badge({ label: input.trigger, color: 'gray' }) : null,
    ];
    const lines = input.customInstructions
      ? [chalk.gray(input.customInstructions.slice(0, 200))]
      : [];
    return { systemMessage: heading + renderSection({ badges, lines }) };
  },
});

// 7. PostCompact
defineHook({
  event: 'PostCompact',
  parse(raw) {
    const o = asObject(raw);
    return { summary: pickString(o, 'summary', 'compact_summary') };
  },
  handle(input) {
    const heading = renderHeading({ word: 'COMPACT', color: 'yellow', event: 'compact' });
    const badge = new Badge({ label: 'PostCompact', color: 'yellow', icon: '⟳' });
    const lines = input.summary ? [chalk.gray(input.summary.slice(0, 200))] : [];
    return { systemMessage: heading + renderSection({ badges: badge, lines }) };
  },
});

// 8. InstructionsLoaded
defineHook({
  event: 'InstructionsLoaded',
  parse(raw) {
    const o = asObject(raw);
    return {
      filePath: pickString(o, 'file_path', 'filePath') ?? '',
      memoryType: pickString(o, 'memory_type', 'memoryType') ?? 'Unknown',
      loadReason: pickString(o, 'load_reason', 'loadReason') ?? '',
    };
  },
  handle(input) {
    const badges = [
      new Badge({ label: `Instructions:${input.memoryType}`, color: 'cyan', icon: '✓' }),
      input.loadReason ? new Badge({ label: input.loadReason, color: 'gray' }) : null,
    ];

    const lines: string[] = [];
    if (input.filePath) lines.push(chalk.gray('File: ') + input.filePath);
    return { systemMessage: renderSection({ badges, lines }) };
  },
});

// 9. UserPromptSubmit
defineHook({
  event: 'UserPromptSubmit',
  parse(raw) {
    const o = asObject(raw);
    return { prompt: pickString(o, 'prompt', 'user_prompt', 'userPrompt') ?? '' };
  },
  handle(input) {
    const badge = new Badge({ label: 'UserPromptSubmit', color: 'yellow', icon: '✎' });
    const lines: string[] = [];
    if (input.prompt) {
      const shown = input.prompt.length > 200 ? input.prompt.slice(0, 200) + '...' : input.prompt;
      lines.push(chalk.gray(shown));
    }
    return { systemMessage: renderSection({ badges: badge, lines }) };
  },
});

// 10. UserPromptExpansion
defineHook({
  event: 'UserPromptExpansion',
  parse(raw) {
    const o = asObject(raw);
    const expanded = pickString(o, 'expanded_prompt', 'expandedPrompt', 'expanded', 'prompt') ?? '';
    if (!expanded) debugLog('UserPromptExpansion', 'unknown-shape', Object.keys(o));
    return {
      expandedPrompt: expanded,
      originalPrompt: pickString(o, 'original_prompt', 'originalPrompt'),
    };
  },
  handle(input) {
    const badge = new Badge({ label: 'UserPromptExpansion', color: 'magenta', icon: '✱' });
    const lines: string[] = [];
    if (input.expandedPrompt) {
      const shown = input.expandedPrompt.length > 300
        ? input.expandedPrompt.slice(0, 300) + '...'
        : input.expandedPrompt;
      lines.push(chalk.gray(shown));
    }
    return { systemMessage: renderSection({ badges: badge, lines }) };
  },
});

// 11. PostToolBatch
defineHook({
  event: 'PostToolBatch',
  parse(raw) {
    return asObject(raw);
  },
  handle() {
    return {};
  },
});

// 12. PostToolUseFailure
defineHook({
  event: 'PostToolUseFailure',
  parse(raw) {
    const o = asObject(raw);
    const toolName: ToolName = pickString(o, 'tool_name', 'toolName') ?? 'Unknown';
    const rawInput = pickAny(o, 'tool_input', 'toolInput') ?? {};
    const errorRaw = pickAny(o, 'error', 'tool_result') ?? 'Unknown error';
    const error = (typeof errorRaw === 'string' || (errorRaw && typeof errorRaw === 'object'))
      ? errorRaw as string | { message?: string; [k: string]: unknown }
      : 'Unknown error';
    return {
      toolName,
      toolInput: injectToolDiscriminator(toolName, rawInput) as Record<string, unknown>,
      error,
      isInterrupt: pickBool(o, 'is_interrupt', 'isInterrupt'),
      durationMs: pickNumber(o, 'duration_ms', 'durationMs'),
    };
  },
  handle(input) {
    const badges = [
      new Badge({ toolName: input.toolName, color: 'red', icon: '⨂' }),
      input.isInterrupt ? new Badge({ label: 'INTERRUPT', color: 'yellow' }) : null,
    ];

    const lines: string[] = [chalk.red('⨂ ') + chalk.bold.red('Tool failed:')];
    const err = input.error;
    if (typeof err === 'string') lines.push(err);
    else if (typeof err === 'object' && err && typeof err.message === 'string') lines.push(err.message);
    else lines.push(JSON.stringify(err, null, 2));
    pushDurationLine(lines, input.durationMs);

    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUseFailure',
        additionalContext: typeof err === 'string' ? err : JSON.stringify(err),
      },
      systemMessage: renderSection({ badges, lines }),
    };
  },
});

// 13. PostToolUse
defineHook({
  event: 'PostToolUse',
  parse(raw) {
    const o = asObject(raw);
    const toolName: ToolName = pickString(o, 'tool_name', 'toolName') ?? 'Unknown';
    const rawInput = pickAny(o, 'tool_input', 'toolInput') ?? {};
    const toolResponse = (pickAny(o, 'tool_response', 'tool_result', 'toolResult') ?? null) as RawToolResult;
    return {
      toolResponse,
      toolName,
      toolInput:  injectToolDiscriminator(toolName, rawInput),
      sessionId:  pickString(o, 'session_id', 'sessionId'),
      durationMs: pickNumber(o, 'duration_ms', 'durationMs'),
    };
  },
  handle(input) {
    const systemMessage = renderToolSection({
      toolName:   input.toolName,
      input:      input.toolInput,
      result:     input.toolResponse,
      durationMs: input.durationMs,
    });
    return { systemMessage };
  },
});
