#!/usr/bin/env node
/**
 * PostToolUse hook — beautify tool_response output. Surfaces the "sensible"
 * primary key (stdout / output / content / text / file contents) as main body
 * and adds a secondary badge indicating output kind.
 */

import chalk from 'chalk';
import {
  runHook,
  renderBadges,
  renderSection,
  Badge,
  deconstructToolResult,
  simpleHighlight,
  isJSON,
  formatJSON,
  isCode,
  detectLanguage,
} from './utils.mjs';

chalk.level = 3;

runHook('PostToolUse', (data) => {
  const rawTool = data.tool_name || data.toolName || 'Unknown';
  const toolResponse = data.tool_response ?? data.tool_result ?? data.toolResult;
  const durationMs = data.duration_ms;

  const { primary, metadata } = deconstructToolResult(rawTool, toolResponse);

  const sectionLines = [];
  if (durationMs != null) {
    sectionLines.push(chalk.gray(`Δ ${durationMs}ms`));
  }

  if (primary) {
    let formattedPrimary = primary;
    if (typeof primary === 'string') {
      if (isJSON(primary)) {
        formattedPrimary = simpleHighlight(formatJSON(primary), 'json');
      } else if (isCode(primary)) {
        formattedPrimary = simpleHighlight(primary, detectLanguage(primary, rawTool));
      }
    } else if (typeof primary === 'object' && primary !== null) {
      formattedPrimary = simpleHighlight(JSON.stringify(primary, null, 2), 'json');
    }
    sectionLines.push(formattedPrimary);

    if (metadata && Object.keys(metadata).length > 0) {
      sectionLines.push(chalk.gray('─'.repeat(40)));
      sectionLines.push(chalk.gray('metadata:'));
      sectionLines.push(simpleHighlight(JSON.stringify(metadata, null, 2), 'json'));
    }
  } else if (toolResponse && typeof toolResponse === 'object') {
    sectionLines.push(simpleHighlight(JSON.stringify(toolResponse, null, 2), 'json'));
  }

  const main = new Badge({ toolName: rawTool });
  const kind = primary
    ? new Badge({ label: 'OUTPUT', color: 'brightGreen' })
    : new Badge({ label: 'JSON', color: 'green' });
  const badge = renderBadges(main, kind);

  return {
    hookSpecificOutput: { hookEventName: 'PostToolUse', toolName: rawTool },
    systemMessage: renderSection({ badge, lines: sectionLines }),
  };
});
