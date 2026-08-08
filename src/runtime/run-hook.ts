import type { HookEventName } from '../types/hook-events.ts';
import type { HookOutput } from '../types/hook-outputs.ts';
import { readInput, writeOutput } from './io.ts';
import { debugLog } from './debug.ts';

export type HookHandler<E extends HookEventName> = (raw: unknown) => HookOutput<E> | Promise<HookOutput<E>>;

export async function runHook<E extends HookEventName>(name: E, handler: HookHandler<E>): Promise<never> {
  // Codex displays a tool hook's stdout systemMessage itself. Mirroring the same
  // bytes to stderr makes PreToolUse/PostToolUse appear twice. Other lifecycle
  // events retain the stderr mirror used by Claude Code's hook presentation.
  const mirrorSystemMessageToStderr = name !== 'PreToolUse' && name !== 'PostToolUse';
  try {
    const data = await readInput();
    const out = (await handler(data ?? {})) ?? ({} as HookOutput<E>);
    writeOutput({ ...out }, { mirrorSystemMessageToStderr });
  } catch (err) {
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
    debugLog(name, 'CRASH', detail);
    writeOutput({}, { mirrorSystemMessageToStderr });
  }
  // Unreachable — writeOutput exits.
  process.exit(0);
}
