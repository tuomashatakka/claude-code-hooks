import { defineTool } from '../registry/tool-registry.ts';
import {
  extractResultText,
  softCollapse,
} from '../render/primitives.ts';
import {
  META_BADGE,
  OUTPUT_BADGE,
  pushDurationLine,
  renderCard,
} from '../tui/index.ts';
import {
  detectOutputLanguage,
  formatJSON,
  formatMetadataCustom,
  simpleHighlight,
} from '../render/highlight.ts';
import { operationBadges, playwrightOperation } from './browser-operations.ts';
import { renderScreenshot } from '../render/screenshot.ts';
import type { RawToolInput, RawToolResult } from '../types/tool-io.ts';

defineTool<RawToolInput, RawToolResult>({
  matches: rawName => /^mcp__playwright__browser_/i.test(rawName),


  post(_input, result, durationMs, ctx) {
    const operation = playwrightOperation(ctx.toolName);
    const lines: string[] = [];
    pushDurationLine(lines, durationMs);

    const text = extractResultText(result);

    // A screenshot's result *is* the picture; the prose naming the file it was
    // written to says strictly less than showing it. Drawn in place of the
    // output card rather than beside it — the path stays on the title badge.
    const shot = renderScreenshot(result, text);
    if (shot) {
      lines.push(shot);
      return {
        lines,
        isJson: false,
        extraBadges: operationBadges(operation ? [operation] : []),
      };
    }

    if (text?.trim()) {
      const language = detectOutputLanguage(text);
      const formatted = language === 'json' ? formatJSON(text) : text;
      lines.push(renderCard({
        badges: OUTPUT_BADGE,
        content: softCollapse(simpleHighlight(formatted, language)),
      }));
    } else if (result && typeof result === 'object') {
      lines.push(renderCard({ badges: META_BADGE, content: formatMetadataCustom(result) }));
    }

    return {
      lines,
      isJson: !text?.trim(),
      extraBadges: operationBadges(operation ? [operation] : []),
    };
  },
});
