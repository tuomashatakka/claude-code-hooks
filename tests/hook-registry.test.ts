import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import '../src/tools/index.ts';
import '../src/hooks/index.ts';
import { dispatchHook, listHooks } from '../src/registry/hook-registry.ts';
import { stripAnsi } from '../src/render/primitives.ts';
import { HOOK_EVENT_NAMES } from '../src/types/hook-events.ts';
import { serializeHookResponse } from '../src/runtime/output-transport.ts';

const ROOT = path.resolve(import.meta.dir, '..');
const BIND = path.join(ROOT, 'hooks', 'bin', 'bind.ts');

function sorted(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function runWireHook(event: 'PostToolUse', payload: unknown): {
  stdout: string;
  stderr: string;
  output: Record<string, unknown>;
} {
  const result = spawnSync('bun', ['run', BIND, event], {
    cwd: ROOT,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    output: JSON.parse(result.stdout) as Record<string, unknown>,
  };
}

describe('hook registration', () => {
  test('registers every known hook event', () => {
    expect(sorted(listHooks())).toEqual(sorted(HOOK_EVENT_NAMES));
  });

  test('keeps hooks.json bound events in sync with known events', () => {
    const hooksConfig = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')
    ) as { hooks: Record<string, unknown> };

    expect(sorted(Object.keys(hooksConfig.hooks))).toEqual(sorted(HOOK_EVENT_NAMES));
  });
});

describe('codex-compatible tool hook output', () => {
  const input = {
    session_id: 'test-session',
    tool_name: 'Bash',
    tool_input: { command: 'git status --short' },
  };

  test('renders PostToolUse without unsupported hook-specific fields', () => {
    const output = dispatchHook('PostToolUse', {
      ...input,
      tool_response: { stdout: 'clean' },
    });

    expect(output.systemMessage).toBeString();
    expect(output.hookSpecificOutput).toBeUndefined();
  });

  test('emits PostToolUse output once on stdout and never mirrors it to stderr', () => {
    const result = runWireHook('PostToolUse', {
      ...input,
      tool_response: { stdout: 'clean' },
    });

    expect(result.stderr).toBe('');
    expect(result.output.systemMessage).toBeString();
    expect(result.output.continue).toBeUndefined();
    expect(result.output.hookSpecificOutput).toBeUndefined();
  });

  test('limits oversized output without breaking the hook JSON envelope', () => {
    const toolResponse = Array.from(
      { length: 240 },
      (_, index) => `${String(index).padStart(3, '0')} ${'x'.repeat(56)}`,
    ).join('\n');
    const result = runWireHook('PostToolUse', {
      ...input,
      tool_response: { stdout: toolResponse },
    });
    const systemMessage = stripAnsi(result.output.systemMessage);

    expect(String(result.output.systemMessage).length).toBeLessThan(10_000);
    expect(systemMessage).toContain('000 ');
    expect(systemMessage).toContain('239 ');
    expect(systemMessage).toContain('lines omitted');
    expect(systemMessage).not.toContain('system-message.ansi');
    expect(systemMessage).not.toContain('Claude Code limits hook output transport');
  });

  // The limit Claude Code applies is `value.length <= 1e4` on the parsed string,
  // so an ESC costs one and the JSON envelope around it costs nothing. Measuring
  // the encoded form instead cut messages at roughly a fifth of the real limit,
  // which is what made every picture small and put "lines omitted" on almost
  // every card. A colourful message is the case that tells the two apart.
  test('measures the message in characters, not bytes of its encoding', () => {
    // One colour change per cell, as a rendered picture has: 12 characters a
    // cell, but 19 bytes once JSON has spent six on the ESC and UTF-8 three on
    // the block.
    const row = Array.from({ length: 40 }, (_, i) => `\x1b[38;5;${100 + (i % 100)}m█`).join('');
    const message = Array.from({ length: 20 }, () => row).join('\n');
    expect(message.length).toBeLessThan(10_000);
    expect(Buffer.byteLength(JSON.stringify(message), 'utf8')).toBeGreaterThan(10_000);

    const result = serializeHookResponse({ systemMessage: message });
    const output = JSON.parse(result.json) as { systemMessage: string };

    expect(output.systemMessage.length).toBeLessThan(10_000);
    expect(stripAnsi(output.systemMessage)).not.toContain('omitted');
  });

  test('a long additionalContext does not shrink the message beside it', () => {
    const message = 'm'.repeat(9_000);
    const withContext = serializeHookResponse({
      systemMessage: message,
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'c'.repeat(9_000) },
    });
    const alone = serializeHookResponse({ systemMessage: message });

    expect(withContext.systemMessage).toBe(alone.systemMessage);
    expect(stripAnsi(withContext.systemMessage ?? '')).not.toContain('omitted');
  });

  test('limits one oversized line without emitting invalid JSON', () => {
    const result = serializeHookResponse({ systemMessage: 'x'.repeat(20_000) });
    const output = JSON.parse(result.json) as { systemMessage: string };

    expect(output.systemMessage.length).toBeLessThan(10_000);
    expect(stripAnsi(output.systemMessage)).toContain('characters omitted');
  });

  test('restores nested wcgw stdout while leaving the trailer as metadata', () => {
    const output = dispatchHook('PostToolUse', {
      tool_name: 'mcp__wcgw__BashCommand',
      tool_input: { command: 'git diff --cached --shortstat' },
      tool_response: {
        content: [{
          type: 'text',
          text: '37 files changed, 1434 insertions(+), 245 deletions(-)\n\n---\nstatus = process exited\ncwd = /tmp/project',
        }],
        isError: false,
      },
    });
    const plain = stripAnsi(output.systemMessage);

    expect(plain).toContain('37 files changed, 1434 insertions(+), 245 deletions(-)');
    expect(plain).toContain('Output');
    expect(plain).toContain('cwd:/tmp/project');
  });

  test('renders task create, update and list through the shared checkbox heading', () => {
    const created = stripAnsi(dispatchHook('PostToolUse', {
      tool_name: 'TaskCreate',
      tool_input: {
        subject: 'restore wcgw output',
        description: 'unwrap nested MCP content blocks',
      },
      tool_response: { task: { id: 7, subject: 'restore wcgw output' } },
    }).systemMessage);
    const completed = stripAnsi(dispatchHook('PostToolUse', {
      tool_name: 'TaskUpdate',
      tool_input: { id: 7, status: 'completed' },
      tool_response: {
        statusChange: { from: 'in_progress', to: 'completed' },
        task: { id: 7, subject: 'restore wcgw output', description: 'unwrap nested MCP content blocks' },
      },
    }).systemMessage);
    const listed = stripAnsi(dispatchHook('PostToolUse', {
      tool_name: 'TaskList',
      tool_input: {},
      tool_response: {
        tasks: [
          { id: 7, subject: 'restore wcgw output', description: 'unwrap nested MCP content blocks', status: 'completed' },
          { id: 8, subject: 'verify silent output', description: 'do not render an empty output card', status: 'pending' },
        ],
      },
    }).systemMessage);

    expect(created).toContain('ADDED TASK');
    expect(created).toContain('█   █');
    expect(created).toContain('unwrap nested MCP content blocks');
    expect(completed).toContain('TASK COMPLETED');
    expect(completed).toContain('█▄█▄█');
    expect(listed).toContain('TASK COMPLETED');
    expect(listed).toContain('TASK QUEUED');
    expect(listed).toContain('do not render an empty output card');
  });

  test('echoes playwright and agent-browser operations as badges', () => {
    const playwright = stripAnsi(dispatchHook('PostToolUse', {
      tool_name: 'mcp__playwright__browser_navigate',
      tool_input: { url: 'https://example.com' },
      tool_response: { content: [{ type: 'text', text: 'page loaded' }] },
    }).systemMessage);
    const agentBrowser = stripAnsi(dispatchHook('PostToolUse', {
      tool_name: 'Bash',
      tool_input: {
        command: 'agent-browser --session demo press Enter && agent-browser --session demo snapshot',
      },
      tool_response: { stdout: 'done' },
    }).systemMessage);

    expect(playwright).toContain('ƒ navigate');
    expect(agentBrowser).toContain('ƒ press');
    expect(agentBrowser).toContain('ƒ snapshot');
  });

  test('unwraps playwright MCP content with the browser-specific formatter', () => {
    const playwright = stripAnsi(dispatchHook('PostToolUse', {
      tool_name: 'mcp__playwright__browser_navigate',
      tool_input: { url: 'https://example.com' },
      tool_response: {
        content: [{ type: 'text', text: 'page loaded' }],
        isError: false,
      },
    }).systemMessage);

    expect(playwright).toContain('ƒ navigate');
    expect(playwright).toContain('page loaded');
    expect(playwright).not.toContain('"content"');
    expect(playwright).not.toContain('"isError"');
  });
});
