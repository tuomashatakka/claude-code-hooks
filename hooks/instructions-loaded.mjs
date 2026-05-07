#!/usr/bin/env node
/**
 * InstructionsLoaded hook — fires once per loaded instruction file.
 * Spec fields: file_path, memory_type ("User"|"Project"|"Local"|"Managed"),
 *              load_reason ("session_start"|"nested_traversal"|"path_glob_match"|...).
 */

import chalk from 'chalk';
import { runHook, renderBadges, renderSection, Badge } from './utils.mjs';

chalk.level = 3;

runHook('InstructionsLoaded', (data) => {
  const filePath = data.file_path || data.filePath || '';
  const memoryType = data.memory_type || data.memoryType || 'Unknown';
  const loadReason = data.load_reason || data.loadReason || '';

  const main = new Badge({ label: `Instructions:${memoryType}`, color: 'cyan', icon: '✓' });
  const badge = loadReason
    ? renderBadges(main, new Badge({ label: loadReason, color: 'gray' }))
    : renderBadges(main);

  const lines = [];
  if (filePath) lines.push(chalk.gray('File: ') + filePath);

  return {
    systemMessage: renderSection({ badge, lines }),
  };
});
