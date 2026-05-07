#!/usr/bin/env bun
import '../../src/tools/index.ts';
import '../../src/hooks/index.ts';

import { runHook } from '../../src/runtime/run-hook.ts';
import { dispatchHook } from '../../src/registry/hook-registry.ts';
import { isHookEventName } from '../../src/types/hook-events.ts';
import { debugLog } from '../../src/runtime/debug.ts';

const argEvent = process.argv[2];

if (!isHookEventName(argEvent)) {
  debugLog('bind', 'unknown-event', String(argEvent));
  process.stdout.write(JSON.stringify({ continue: true }, null, 2));
  process.exit(0);
}

await runHook(argEvent, raw => dispatchHook(argEvent, raw));
