import chalk from 'chalk';
import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { asObject, injectToolDiscriminator, pickString, pickNumber, pickBool, pickAny } from './_normalize.ts';
import type { ToolName } from '../types/claude-code.ts';

chalk.level = 3;

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
    const main = new Badge({ toolName: input.toolName, color: 'red', icon: '⨂' });
    const badge = input.isInterrupt
      ? renderBadges(main, new Badge({ label: 'INTERRUPT', color: 'yellow' }))
      : renderBadges(main);

    const lines: string[] = [chalk.red('⨂ ') + chalk.bold.red('Tool failed:')];
    const err = input.error;
    if (typeof err === 'string') lines.push(err);
    else if (typeof err === 'object' && err && typeof err.message === 'string') lines.push(err.message);
    else lines.push(JSON.stringify(err, null, 2));
    if (input.durationMs != null) lines.push(chalk.gray(`Δ ${input.durationMs}ms`));

    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUseFailure',
        additionalContext: typeof err === 'string' ? err : JSON.stringify(err),
      },
      systemMessage: renderSection({ badge, lines, dividerColor: 'red' }),
    };
  },
});
