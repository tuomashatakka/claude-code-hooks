import { defineHook } from '../registry/hook-registry.ts';
import { asObject } from './_normalize.ts';

defineHook({
  event: 'PostToolBatch',
  parse(raw) {
    return asObject(raw);
  },
  handle() {
    return {};
  },
});
