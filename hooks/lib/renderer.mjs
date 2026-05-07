import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { renderSection, debugLog } from './primitives.mjs';
import { Badge, renderBadges } from './badge.mjs';
import { getStrategy } from './tools/index.mjs';

chalk.level = 3;

const HOME              = process.env.HOME || process.env.USERPROFILE || '';
const SYSTEM_PROMPT_PATH = path.join(HOME, 'system-prompt.md');
const ASCII_DIR         = path.join(HOME, 'Documents', 'Prompts', 'anime-ascii');

function loadSystemPrompt() {
  try {
    if (fs.existsSync(SYSTEM_PROMPT_PATH)) return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
  } catch (e) { debugLog('SessionStart', 'load-system-prompt', e.message); }
  return null;
}

function loadRandomAsciiArt() {
  try {
    if (!fs.existsSync(ASCII_DIR)) return null;
    const files = fs.readdirSync(ASCII_DIR).filter(f => f.endsWith('.txt'));
    if (!files.length) return null;
    return fs.readFileSync(path.join(ASCII_DIR, files[Math.floor(Math.random() * files.length)]), 'utf8');
  } catch (e) { debugLog('SessionStart', 'load-ascii', e.message); }
  return null;
}

// ── Renderer class ────────────────────────────────────────────────────────────

export class Renderer {
  // toolStrategies: optional { [rawToolName]: strategy } overrides on top of registry
  #strategies;
  #renderAnsiShadowText;
  #randomFiller;
  #handlers;

  constructor({ strategies = {}, renderAnsiShadowText, randomFiller } = {}) {
    this.#strategies = strategies;
    this.#renderAnsiShadowText = renderAnsiShadowText;
    this.#randomFiller = randomFiller;
    this.#handlers = this.#buildHandlers();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  render(event, data) {
    const result = (this.#handlers[event] ?? (() => ({})))(data);
    if (result.systemMessage) {
      result.systemMessage = '\x1b[1A\x1b[2K\x1b[1B' + result.systemMessage;
    }
    return result;
  }

  // Exposed for testing / extension
  renderPreTool(rawToolName, input) {
    const ctx = { toolName: rawToolName, renderer: this };
    return this.#getStrategy(rawToolName).pre(input, ctx);
  }

  renderPostTool(rawToolName, input, result, durationMs) {
    const ctx = { toolName: rawToolName, renderer: this };
    return this.#getStrategy(rawToolName).post(input, result, durationMs, ctx);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  #getStrategy(rawToolName) {
    return this.#strategies[rawToolName] ?? getStrategy(rawToolName);
  }

  #heading(word, color) {
    const h = this.#renderAnsiShadowText(word, color);
    const f = chalk.magenta(this.#randomFiller());
    return h + '\n' + f + '\n';
  }

  // ── Event handler map (built once, captures this) ──────────────────────────

  #buildHandlers() {
    return {
      PreToolUse:          (d) => this.#handlePreToolUse(d),
      PostToolUse:         (d) => this.#handlePostToolUse(d),
      PostToolUseFailure:  (d) => this.#handlePostToolUseFailure(d),
      PostToolBatch:       ()  => ({}),
      SessionStart:        (d) => this.#handleSessionStart(d),
      SessionEnd:          (d) => this.#handleSessionEnd(d),
      PostCompact:         (d) => this.#handlePostCompact(d),
      InstructionsLoaded:  (d) => this.#handleInstructionsLoaded(d),
      UserPromptSubmit:    (d) => this.#handleUserPromptSubmit(d),
      UserPromptExpansion: (d) => this.#handleUserPromptExpansion(d),
      SubagentStop:        (d) => this.#handleSubagentStop(d),
      Stop:                (d) => this.#handleStop(d),
    };
  }

  // ── Per-event handlers ──────────────────────────────────────────────────────

  #handlePreToolUse(data) {
    const rawTool = data.tool_name || data.toolName || 'Unknown';
    const input   = data.tool_input || data.toolInput || {};

    const { lines = [], extraBadges = [] } = this.renderPreTool(rawTool, input);
    const badge = renderBadges(new Badge({ toolName: rawTool }), ...extraBadges);
    return {
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' },
      systemMessage: renderSection({ badge, lines }),
    };
  }

  #handlePostToolUse(data) {
    const rawTool      = data.tool_name || data.toolName || 'Unknown';
    const input        = data.tool_input || data.toolInput || {};
    const toolResponse = data.tool_response ?? data.tool_result ?? data.toolResult;
    const durationMs   = data.duration_ms;

    const { lines = [], extraBadges = [], isJson = false } =
      this.renderPostTool(rawTool, input, toolResponse, durationMs);

    const main  = new Badge({ toolName: rawTool });
    const kind  = isJson
      ? new Badge({ label: 'JSON',   color: 'green' })
      : new Badge({ label: 'OUTPUT', color: 'brightGreen' });
    const badge = renderBadges(main, kind, ...extraBadges);
    return {
      hookSpecificOutput: { hookEventName: 'PostToolUse', toolName: rawTool },
      systemMessage: renderSection({ badge, lines }),
    };
  }

  #handlePostToolUseFailure(data) {
    const rawTool    = data.tool_name || data.toolName || 'Unknown';
    const error      = data.error ?? data.tool_result ?? 'Unknown error';
    const isInterrupt = !!data.is_interrupt;
    const durationMs  = data.duration_ms;

    const main  = new Badge({ toolName: rawTool, color: 'red', icon: '⨂' });
    const badge = isInterrupt
      ? renderBadges(main, new Badge({ label: 'INTERRUPT', color: 'yellow' }))
      : renderBadges(main);

    const lines = [chalk.red('⨂ ') + chalk.bold.red('Tool failed:')];
    if (typeof error === 'string') lines.push(error);
    else if (error?.message)       lines.push(error.message);
    else                           lines.push(JSON.stringify(error, null, 2));
    if (durationMs != null) lines.push(chalk.gray(`Δ ${durationMs}ms`));

    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUseFailure',
        additionalContext: typeof error === 'string' ? error : JSON.stringify(error),
      },
      systemMessage: renderSection({ badge, lines, dividerColor: 'red' }),
    };
  }

  #handleSessionStart(data) {
    const source    = data.source || 'startup';
    const model     = data.model || '';
    const agentType = data.agent_type || data.agentType;

    const systemPrompt = loadSystemPrompt();
    const asciiArt     = loadRandomAsciiArt();

    const main  = new Badge({ label: `Session:${source}`, color: 'green', icon: '⏻' });
    const badge = model
      ? renderBadges(main, new Badge({ label: model, color: 'gray' }))
      : renderBadges(main);

    const lines = [chalk.green('Session started')];
    if (agentType)    lines.push(chalk.gray('Agent: ') + agentType);
    if (systemPrompt) lines.push(chalk.cyan('✓ ') + 'System prompt loaded from: ' + SYSTEM_PROMPT_PATH);

    const headingWord = source === 'compact' ? 'WAKE UP' : 'START';
    const asciiBlock  = asciiArt ? '\n' + asciiArt + '\n' : '';

    const out = {
      hookSpecificOutput: { hookEventName: 'SessionStart' },
      systemMessage: asciiBlock + this.#heading(headingWord, 'cyan') + renderSection({ badge, lines }),
    };
    if (systemPrompt) out.hookSpecificOutput.appendToSystemPrompt = systemPrompt;
    return out;
  }

  #handleSessionEnd(_data) {
    const badge = renderBadges(new Badge({ label: 'SessionEnd', color: 'red', icon: '⏼' }));
    return { systemMessage: this.#heading('BYE', 'red') + renderSection({ badge, lines: [] }) };
  }

  #handlePostCompact(data) {
    const summary = data.summary || data.compact_summary || '';
    const badge   = renderBadges(new Badge({ label: 'PostCompact', color: 'yellow', icon: '⟳' }));
    const lines   = summary ? [chalk.gray(summary.slice(0, 200))] : [];
    return { systemMessage: this.#heading('COMPACT', 'yellow') + renderSection({ badge, lines }) };
  }

  #handleInstructionsLoaded(data) {
    const filePath   = data.file_path || data.filePath || '';
    const memoryType = data.memory_type || data.memoryType || 'Unknown';
    const loadReason = data.load_reason || data.loadReason || '';

    const main  = new Badge({ label: `Instructions:${memoryType}`, color: 'cyan', icon: '✓' });
    const badge = loadReason
      ? renderBadges(main, new Badge({ label: loadReason, color: 'gray' }))
      : renderBadges(main);

    const lines = [];
    if (filePath) lines.push(chalk.gray('File: ') + filePath);
    return { systemMessage: renderSection({ badge, lines }) };
  }

  #handleUserPromptSubmit(data) {
    const prompt = data.prompt || data.user_prompt || data.userPrompt || '';
    const badge  = renderBadges(new Badge({ label: 'UserPromptSubmit', color: 'yellow', icon: '✎' }));
    const lines  = [];
    if (prompt) {
      lines.push(chalk.gray(prompt.length > 200 ? prompt.slice(0, 200) + '...' : prompt));
    }
    return { systemMessage: renderSection({ badge, lines }) };
  }

  #handleUserPromptExpansion(data) {
    const expanded = data.expanded_prompt || data.expandedPrompt || data.expanded || data.prompt || '';
    if (!expanded) debugLog('UserPromptExpansion', 'unknown-shape', Object.keys(data || {}));

    const badge = renderBadges(new Badge({ label: 'UserPromptExpansion', color: 'magenta', icon: '✱' }));
    const lines = [];
    if (expanded) {
      lines.push(chalk.gray(expanded.length > 300 ? expanded.slice(0, 300) + '...' : expanded));
    }
    return { systemMessage: renderSection({ badge, lines }) };
  }

  #handleSubagentStop(data) {
    const agentType = data.agent_type || data.agentType || '';
    const main  = new Badge({ label: 'SubagentStop', color: 'green', icon: '⬡' });
    const badge = agentType
      ? renderBadges(main, new Badge({ label: agentType, color: 'gray' }))
      : renderBadges(main);
    return { systemMessage: this.#heading('AGENT', 'green') + renderSection({ badge, lines: [] }) };
  }

  #handleStop(_data) {
    const badge = renderBadges(new Badge({ label: 'Stop', color: 'red', icon: '■' }));
    return { systemMessage: this.#heading('STOP', 'red') + renderSection({ badge, lines: [] }) };
  }
}
