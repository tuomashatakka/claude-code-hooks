import chalk from 'chalk';
import { defineTool } from '../registry/tool-registry.ts';
import { renderHeading } from '../render/headings.ts';
import type { ExitPlanInput, RawToolResult } from '../types/tool-io.ts';

chalk.level = 3;

defineTool<ExitPlanInput, RawToolResult>({
  matches: 'ExitPlanMode',
  pre(input) {
    const lines: string[] = [];
    if (input.plan) {
      lines.push(input.plan);
    }
    return { lines };
  },

  post(input, result, durationMs) {
    const heading = renderHeading({
      word: 'YEET FAFO',
      color: 'cyan',
      event: 'stop',
    });
    return {
      lines: heading.split('\n'),
    };
  },
});
