import type { HookEventName, HookInput } from '../types/hook-events.ts';
import type { HookOutput } from '../types/hook-outputs.ts';
import { debugLog } from '../runtime/debug.ts';

export interface HookContext {
  event: HookEventName;
}

export interface HookDefinition<E extends HookEventName> {
  event: E;
  parse: (raw: unknown) => HookInput<E>;
  handle: (input: HookInput<E>, ctx: HookContext) => HookOutput<E>;
}

const REGISTRY = new Map<HookEventName, HookDefinition<HookEventName>>();

export function defineHook<E extends HookEventName>(def: HookDefinition<E>): void {
  REGISTRY.set(def.event, def as unknown as HookDefinition<HookEventName>);
}

export function dispatchHook(event: HookEventName, raw: unknown): HookOutput<HookEventName> {
  const def = REGISTRY.get(event);
  if (!def) {
    debugLog('dispatchHook', 'no-handler', event);
    return {};
  }
  const ctx: HookContext = { event };
  try {
    const input = def.parse(raw);
    return def.handle(input, ctx);
  } catch (e) {
    const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
    debugLog('dispatchHook', 'handler-error', event, detail);
    return {};
  }
}

export function listHooks(): HookEventName[] {
  return Array.from(REGISTRY.keys());
}
