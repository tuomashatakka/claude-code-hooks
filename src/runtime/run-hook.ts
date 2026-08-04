import type { HookEventName } from '../types/hook-events.ts';
import type { HookOutput } from '../types/hook-outputs.ts';
import { readInput, writeOutput } from './io.ts';
import { debugLog } from './debug.ts';

export type HookHandler<E extends HookEventName> = (raw: unknown) => HookOutput<E> | Promise<HookOutput<E>>;

export async function runHook<E extends HookEventName>(name: E, handler: HookHandler<E>): Promise<never> {
  try {
    const data = await readInput();
    const out = (await handler(data ?? {})) ?? ({} as HookOutput<E>);
    writeOutput({ ...out });
  } catch (err) {
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
    debugLog(name, 'CRASH', detail);
    writeOutput({});
  }
  // Unreachable — writeOutput exits.
  process.exit(0);
}
