import { defineHook } from '../registry/hook-registry.ts';
import { renderToolSection } from '../render/render-tool.ts';
import { asObject, injectToolDiscriminator, pickString, pickNumber, pickAny } from './_normalize.ts';
import type { ToolName } from '../types/claude-code.ts';
import type { RawToolResult } from '../types/tool-io.ts';

defineHook({
  event: 'PostToolUse',
  parse(raw) {
    const o = asObject(raw);
    const toolName: ToolName = pickString(o, 'tool_name', 'toolName') ?? 'Unknown';
    const rawInput = pickAny(o, 'tool_input', 'toolInput') ?? {};
    const toolResponse = (pickAny(o, 'tool_response', 'tool_result', 'toolResult') ?? null) as RawToolResult;
    return {
      toolName,
      toolInput: injectToolDiscriminator(toolName, rawInput),
      toolResponse,
      durationMs: pickNumber(o, 'duration_ms', 'durationMs'),
      sessionId: pickString(o, 'session_id', 'sessionId'),
    };
  },
  handle(input) {
    const systemMessage = renderToolSection({
      phase: 'post',
      toolName: input.toolName,
      input: input.toolInput,
      result: input.toolResponse,
      durationMs: input.durationMs,
    });
    return {
      hookSpecificOutput: { hookEventName: 'PostToolUse', toolName: input.toolName },
      systemMessage,
    };
  },
});
