import { defineHook } from '../registry/hook-registry.ts';
import { renderToolSection } from '../render/render-tool.ts';
import { asObject, injectToolDiscriminator, pickString, pickAny } from './_normalize.ts';
import type { ToolName } from '../types/claude-code.ts';

defineHook({
  event: 'PreToolUse',
  parse(raw) {
    const o = asObject(raw);
    const toolName: ToolName = pickString(o, 'tool_name', 'toolName') ?? 'Unknown';
    const rawInput = pickAny(o, 'tool_input', 'toolInput') ?? {};
    return {
      toolName,
      toolInput: injectToolDiscriminator(toolName, rawInput),
      sessionId: pickString(o, 'session_id', 'sessionId'),
    };
  },
  handle(input) {
    const systemMessage = renderToolSection({
      phase: 'pre',
      toolName: input.toolName,
      input: input.toolInput,
    });
    return {
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' },
      systemMessage,
    };
  },
});
