import chalk from 'chalk';
import { defineHook } from '../registry/hook-registry.ts';
import { Badge, renderBadges } from '../render/badge.ts';
import { renderSection } from '../render/primitives.ts';
import { asObject, pickString } from './_normalize.ts';

chalk.level = 3;

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
    const main = new Badge({ label: `Instructions:${input.memoryType}`, color: 'cyan', icon: '✓' });
    const badge = input.loadReason
      ? renderBadges(main, new Badge({ label: input.loadReason, color: 'gray' }))
      : renderBadges(main);

    const lines: string[] = [];
    if (input.filePath) lines.push(chalk.gray('File: ') + input.filePath);
    return { systemMessage: renderSection({ badge, lines }) };
  },
});
