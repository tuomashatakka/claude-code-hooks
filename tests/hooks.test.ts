import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { HOOKS, renderHook } from '../src/hooks.ts'
import { stripAnsi } from '../src/ansi/text.ts'
import { HOOK_EVENTS } from '../src/types.ts'
import { serializeHook } from '../src/runtime/transport.ts'
import { monochromeFixture } from './helpers/image-fixtures.ts'


const ROOT = path.resolve(import.meta.dir, '..')
const BIND = path.join(ROOT, 'src', 'main.ts')

function sorted (values: readonly string[]): string[] {
  return [ ...values ].sort((a, b) => a.localeCompare(b))
}

type RunWireHookReturnType = {
  stdout: string;
  stderr: string;
  output: Record<string, unknown>;
}

function runWireHook (event: 'PreToolUse' | 'PostToolUse', payload: unknown, env?: NodeJS.ProcessEnv): RunWireHookReturnType {
  const result = spawnSync('bun', [ 'run', BIND, event ], {
    cwd:      ROOT,
    env:      { ...process.env, ...env },
    input:    JSON.stringify(payload),
    encoding: 'utf8',
  })
  expect(result.status).toBe(0)
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    output: JSON.parse(result.stdout) as Record<string, unknown>,
  }
}

describe('hook registration', () => {
  test('registers every known hook event', () => {
    expect(sorted(Object.keys(HOOKS))).toEqual(sorted(HOOK_EVENTS))
  })

  test('keeps hooks.json bound events in sync with known events', () => {
    const hooksConfig = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')
    ) as { description: string; hooks: Record<string, unknown> }

    expect(Object.keys(hooksConfig).sort()).toEqual([ 'description', 'hooks' ])
    expect(sorted(Object.keys(hooksConfig.hooks))).toEqual(sorted(HOOK_EVENTS))
  })
})

describe('codex-compatible tool hook output', () => {
  const input = {
    session_id: 'test-session',
    tool_name:  'Bash',
    tool_input: { command: 'git status --short' },
  }

  test('renders PostToolUse without unsupported hook-specific fields', () => {
    const output = renderHook('PostToolUse', {
      ...input,
      tool_response: { stdout: 'clean' },
    })

    expect(output.systemMessage).toBeString()
    expect(output.hookSpecificOutput).toBeUndefined()
  })

  test('emits a valid empty PreToolUse response without changing host policy', () => {
    const result = runWireHook('PreToolUse', input)

    expect(result.stdout).toBe('{}')
    expect(result.stderr).toBe('')
    expect(result.output).toEqual({})
  })

  test('keeps Claude Code colors when CODEX_HOME is also present', () => {
    const result = runWireHook('PostToolUse', {
      ...input,
      tool_response: { stdout: 'colored' },
    }, { CODEX_HOME: '/tmp/codex', CLAUDE_PLUGIN_ROOT: ROOT })

    expect(result.output.systemMessage).toContain('\x1b[48;5;236m')
    expect(result.output.systemMessage).toContain('\x1b[1A')
  })

  test('emits PostToolUse output once on stdout and never mirrors it to stderr', () => {
    const result = runWireHook('PostToolUse', {
      ...input,
      tool_response: { stdout: 'clean' },
    })

    expect(result.stderr).toBe('')
    expect(result.output.systemMessage).toBeString()
    expect(result.output.continue).toBeUndefined()
    expect(result.output.hookSpecificOutput).toBeUndefined()
  })

  test('drops trailing rows, never colour, when output overruns the host limit', () => {
    const toolResponse = Array.from(
      { length: 240 },
      (_, index) => `${String(index).padStart(3, '0')} ${'x'.repeat(56)}`,
    ).join('\n')
    const result = runWireHook('PostToolUse', {
      ...input,
      tool_response: { stdout: toolResponse },
    })
    const raw           = String(result.output.systemMessage)
    const systemMessage = stripAnsi(raw)
    const savedPath     = systemMessage.match(/saved to (\/[^\n]+\.log)/)?.[1]

    expect(raw.length).toBeLessThanOrEqual(10_000)
    // The card keeps its background fill and the badge its colour.
    expect(raw).toContain('\x1b[48;5;236m')
    expect(raw).toMatch(/\x1b\[4\dm.*Running/)
    expect(systemMessage).toContain('000 ')
    expect(systemMessage).not.toContain('239 ')
    expect(systemMessage).toMatch(/\d+ more lines omitted/)
    expect(savedPath).toBeString()

    const complete = fs.readFileSync(savedPath!, 'utf8')
    expect(complete).toContain('000 ')
    expect(complete).toContain('239 ')
    expect(complete.length).toBeGreaterThan(toolResponse.length)
  })

  test('shrinks an elastic message by its limit, keeping every escape', () => {
    const rows   = Array.from({ length: 400 }, (_, index) => `\x1b[48;5;236mrow ${String(index).padStart(3, '0')} complete\x1b[49m`)
    const result = serializeHook({ systemMessage: limit => rows.slice(0, limit.lines).join('\n') })
    const output = JSON.parse(result.json) as { systemMessage: string }
    const plain  = stripAnsi(output.systemMessage)

    expect(output.systemMessage.length).toBeLessThanOrEqual(10_000)
    expect(output.systemMessage).toContain('\x1b[48;5;236m')
    expect(plain).toContain('row 000 complete')
    expect(plain).not.toContain('row 399 complete')
    expect(plain).toContain('saved to')
  })

  test('serializes Codex hook messages without terminal control sequences', () => {
    const result = serializeHook({ systemMessage: '\x1b[1A\x1b[2K\x1b[48;5;236mcard\x1b[0m' }, { ansi: false })
    const output = JSON.parse(result.json) as { systemMessage: string }

    expect(output.systemMessage).toBe('card')
    expect(output.systemMessage).not.toMatch(/\x1b\[/)
  })

  // The limit Claude Code applies is `value.length <= 1e4` on the parsed string,
  // so an ESC costs one and the JSON envelope around it costs nothing. Measuring
  // the encoded form instead cut messages at roughly a fifth of the real limit,
  // which is what made every picture small and put "lines omitted" on almost
  // every card. A colourful message is the case that tells the two apart.
  test('measures the message in characters, not bytes of its encoding', () => {
    // One colour change per cell, as a rendered picture has: 12 characters a
    // cell, but 19 bytes once JSON has spent six on the ESC and UTF-8 three on
    // the block.
    const row     = Array.from({ length: 40 }, (_, i) => `\x1b[38;5;${100 + i % 100}m█`).join('')
    const message = Array.from({ length: 20 }, () => row).join('\n')
    expect(message.length).toBeLessThan(10_000)
    expect(Buffer.byteLength(JSON.stringify(message), 'utf8')).toBeGreaterThan(10_000)

    const result = serializeHook({ systemMessage: message })
    const output = JSON.parse(result.json) as { systemMessage: string }

    expect(output.systemMessage.length).toBeLessThan(10_000)
    expect(stripAnsi(output.systemMessage)).not.toContain('omitted')
  })

  test('cuts a finished string by characters with its escapes intact', () => {
    const message = Array.from(
      { length: 400 },
      (_, index) => `\x1b[48;5;236mrow ${String(index).padStart(3, '0')} complete\x1b[49m`,
    ).join('\n')
    expect(message.length).toBeGreaterThan(10_000)

    const result = serializeHook({ systemMessage: message })
    const output = JSON.parse(result.json) as { systemMessage: string }
    const plain  = stripAnsi(output.systemMessage)

    expect(output.systemMessage.length).toBeLessThanOrEqual(10_000)
    expect(plain).toContain('row 000 complete')
    expect(plain).not.toContain('row 399 complete')
    expect(plain).toContain('saved to')
    expect(output.systemMessage).toContain('\x1b[48;5;236m')
    // No escape is ever cut in half.
    expect(output.systemMessage).not.toMatch(/\x1b\[[0-9;]*$/)
    expect(output.systemMessage).not.toMatch(/\x1b\[[0-9;]*\x1b/)
  })

  test('a long additionalContext does not shrink the message beside it', () => {
    const message     = 'm'.repeat(9_000)
    const withContext = serializeHook({
      systemMessage:      message,
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'c'.repeat(9_000) },
    })
    const alone = serializeHook({ systemMessage: message })

    expect(withContext.systemMessage).toBe(alone.systemMessage)
    expect(stripAnsi(withContext.systemMessage ?? '')).not.toContain('omitted')
  })

  test('persists one oversized line without making the hook envelope invalid', () => {
    const complete = 'x'.repeat(20_000)
    const result   = serializeHook({ systemMessage: complete })
    const output   = JSON.parse(result.json) as { systemMessage: string }
    const saved    = output.systemMessage.match(/saved to (\/[^\n]+\.log)/)?.[1]

    expect(output.systemMessage.length).toBeLessThanOrEqual(10_000)
    expect(output.systemMessage).toContain('saved to')
    expect(saved).toBeString()
    expect(fs.readFileSync(saved!, 'utf8')).toBe(complete)
  })

  test('tables WebSearch links and leftover result fields', () => {
    const search = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'WebSearch',
      tool_input:    { query: 'bun test runner' },
      tool_response: {
        query:   'bun test runner',
        results: [
          { tool_use_id: 'x', content: [{ title: 'Bun Test', url: 'https://bun.sh/docs/cli/test' }, { title: 'Runner', url: 'https://example.com/r' }]},
          'Bun ships a Jest-compatible runner.',
        ],
        durationSeconds: 2.4,
      },
    }).systemMessage)
    const generic = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'mcp__custom__lookup',
      tool_input:    {},
      tool_response: { output: 'found it', hits: 3, source: 'index' },
    }).systemMessage)

    expect(search).toContain('2 results')
    expect(search).toContain('┌')
    expect(search).toContain('│ Bun Test')
    expect(search).toContain('https://bun.sh/docs/cli/test')
    expect(search).toContain('Bun ships a Jest-compatible runner.')
    expect(search).not.toContain('tool_use_id')
    expect(generic).toContain('found it')
    expect(generic).toContain('metadata')
    expect(generic).toMatch(/│ hits\s+│ 3\s+│/)
    expect(generic).toMatch(/│ source\s+│ index\s+│/)
  })

  test('restores nested wcgw stdout while leaving the trailer as metadata', () => {
    const output = renderHook('PostToolUse', {
      tool_name:     'mcp__wcgw__BashCommand',
      tool_input:    { command: 'git diff --cached --shortstat' },
      tool_response: {
        content: [{
          type: 'text',
          text: '37 files changed, 1434 insertions(+), 245 deletions(-)\n\n---\nstatus = process exited\ncwd = /tmp/project',
        }],
        isError: false,
      },
    })
    const plain = stripAnsi(output.systemMessage)

    expect(plain).toContain('37 files changed, 1434 insertions(+), 245 deletions(-)')
    expect(plain).toContain('Output')
    expect(plain).toContain('✓ exit process exited')
    expect(plain).toContain('⌂ /tmp/project')
    expect(plain).not.toMatch(/[▏▕▔░]/)
  })

  test('combines command and stdout regions, then starts rulers in vertically stacked cards', () => {
    const output        = renderHook('PostToolUse', {
      tool_name:     'Bash',
      tool_input:    { command: "rg -n 'value' src/index.ts" },
      tool_response: '1: value\n=== report ===\n2: value',
    })
    const rendered      = String(output.systemMessage)
    const rawLines      = rendered.split('\n')
    const lines         = rawLines.map(stripAnsi)
    const plain         = stripAnsi(rendered)
    const rulerAt       = lines.findIndex(line => line.includes(' report '))
    const commandAt     = lines.findIndex(line => line.includes("$ rg -n 'value'"))
    const firstOutputAt = lines.findIndex((line, index) => index > commandAt && line.includes('Output'))
    const titleLines    = lines.filter(line => (/Running|Output/).test(line))

    expect(plain.match(/Running/g) ?? []).toHaveLength(1)
    expect(plain.match(/Output/g) ?? []).toHaveLength(2)
    expect(titleLines.every(line => !(line.includes('Running') && line.includes('Output')))).toBeTrue()
    expect(lines[rulerAt - 1]!.trim()).toBe('')
    expect(lines[rulerAt - 2]).toContain('Output')
    expect(lines[commandAt + 1]!.trim()).toBe('')
    expect(rawLines[commandAt + 1]).toContain('\x1b[48;5;235m')
    expect(firstOutputAt).toBe(commandAt + 2)
    expect(rendered).toContain('\x1b[48;5;235m')
    expect(rendered).toContain('\x1b[48;5;236m')
  })

  test('keeps successful apply_patch results quiet after Codex renders the native diff', () => {
    const output = renderHook('PostToolUse', {
      tool_name:     'apply_patch',
      tool_input:    '*** Begin Patch\n*** Update File: src/index.ts\n*** End Patch',
      tool_response: {
        exit_code: 0,
        output:    'Exit code: 0\nWall time: 0.1 seconds\nOutput:\nSuccess. Updated the following files:\nM src/index.ts',
      },
      duration_ms: 100,
    })
    const plain = stripAnsi(output.systemMessage)

    expect(plain).toContain('apply_patch')
    expect(plain).toContain('Δ 100ms')
    expect(plain).not.toContain('Output')
    expect(plain).not.toContain('Success. Updated')
  })

  test('renders task create, update and list through the shared checkbox heading', () => {
    const created = stripAnsi(renderHook('PostToolUse', {
      tool_name:  'TaskCreate',
      tool_input: {
        subject:     'restore wcgw output',
        description: 'unwrap nested MCP content blocks',
      },
      tool_response: { task: { id: 7, subject: 'restore wcgw output' }},
    }).systemMessage)
    const completed = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'TaskUpdate',
      tool_input:    { id: 7, status: 'completed' },
      tool_response: {
        statusChange: { from: 'in_progress', to: 'completed' },
        task:         { id: 7, subject: 'restore wcgw output', description: 'unwrap nested MCP content blocks' },
      },
    }).systemMessage)
    const listed = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'TaskList',
      tool_input:    {},
      tool_response: {
        tasks: [
          { id: 7, subject: 'restore wcgw output', description: 'unwrap nested MCP content blocks', status: 'completed' },
          { id: 8, subject: 'verify silent output', description: 'do not render an empty output card', status: 'pending' },
        ],
      },
    }).systemMessage)

    expect(created).toContain('ADDED TASK')
    expect(created).toContain('█   █')
    expect(created).toContain('unwrap nested MCP content blocks')
    expect(completed).toContain('TASK COMPLETED')
    expect(completed).toContain('█▄█▄█')
    expect(listed).toContain('TASK COMPLETED')
    expect(listed).toContain('TASK QUEUED')
    expect(listed).toContain('do not render an empty output card')
  })

  test('renders plan, search, stop and question results without metadata dumps', () => {
    const plan = stripAnsi(renderHook('PostToolUse', {
      tool_name:  'update_plan',
      tool_input: {
        explanation: 'Rendering work is now tracked by state.',
        plan:        [
          { step: 'Map tool shapes', status: 'completed' },
          { step: 'Add semantic handlers', status: 'in_progress' },
          { step: 'Run visual QA', status: 'pending' },
        ],
      },
      tool_response: { ok: true },
    }).systemMessage)
    const search = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'ToolSearch',
      tool_input:    { query: 'select:WebFetch,ExitPlanMode', max_results: 3 },
      tool_response: {
        matches:              [ 'WebFetch', 'ExitPlanMode' ],
        total_deferred_tools: 129,
      },
    }).systemMessage)
    const stopped = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'TaskStop',
      tool_input:    { task_id: 'job-7' },
      tool_response: JSON.stringify({
        message:   'Successfully stopped task: job-7 (very long command that should stay hidden)',
        task_id:   'job-7',
        task_type: 'local_bash',
        command:   'very long command that should stay hidden',
      }),
    }).systemMessage)
    const answered = stripAnsi(renderHook('PostToolUse', {
      tool_name:  'AskUserQuestion',
      tool_input: {
        questions: [{
          question: 'How far should the store rewrite go?',
          header:   'Store scope',
          options:  [{ label: 'Full: config into the app store', description: 'Move all configuration.' }],
        }],
      },
      tool_response: {
        answers:     { 'How far should the store rewrite go?': 'Full: config into the app store (Recommended)' },
        annotations: { ignored: { preview: 'large preview that should stay hidden' }},
      },
    }).systemMessage)

    expect(plan).toContain('✓ Map tool shapes')
    expect(plan).toContain('▶ Add semantic handlers')
    expect(plan).toContain('○ Run visual QA')
    expect(plan).toContain('1/3 complete')
    expect(search).toContain('✓ WebFetch')
    expect(search).toContain('2 loaded')
    expect(search).toContain('129 deferred')
    expect(stopped).toContain('TASK STOPPED')
    expect(stopped).toContain('job-7')
    expect(stopped).toContain('local_bash')
    expect(stopped).not.toContain('very long command')
    expect(answered).toContain('How far should the store rewrite go?')
    expect(answered).toContain('Full: config into the app store (Recommended)')
    expect(answered).not.toContain('large preview')
    for (const output of [ plan, search, stopped, answered ]) {
      expect(output).not.toContain('metadata')
      expect(output).not.toMatch(/[▏▕▔░]/)
    }
  })

  test('keeps task fallbacks, agent launches and user prompts semantic and compact', () => {
    const taskUpdate = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'TaskUpdate',
      tool_input:    { task_id: '9', status: 'in_progress' },
      tool_response: { taskId: '9', status: 'in_progress', updatedFields: [ 'status' ]},
    }).systemMessage)
    const taskList = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'TaskList',
      tool_input:    {},
      tool_response: { tasks: []},
    }).systemMessage)
    const agent = stripAnsi(renderHook('PostToolUse', {
      tool_name:  'Agent',
      tool_input: {
        description: 'Audit hook badge coverage',
        prompt:      'A very long private worker prompt that should not be replayed.',
      },
      tool_response: {
        isAsync:       true,
        status:        'async_launched',
        agentId:       'agent-7',
        resolvedModel: 'claude-sonnet',
        outputFile:    '/tmp/agent-7/out',
      },
    }).systemMessage)
    const prompt = stripAnsi(renderHook('UserPromptSubmit', {
      prompt: 'make every lifecycle event readable',
    }).systemMessage)

    expect(taskUpdate).toContain('TASK STARTED')
    expect(taskUpdate).toContain('#9')
    expect(taskUpdate).not.toContain('updatedFields')
    expect(taskList).toContain('No tasks')
    expect(agent).toContain('Audit hook badge coverage')
    expect(agent).toContain('async launched')
    expect(agent).toContain('claude-sonnet')
    expect(agent).toContain('agent-7')
    expect(agent).not.toContain('private worker prompt')
    expect(agent).not.toContain('isAsync')
    expect(prompt).toContain('UserPromptSubmit')
    expect(prompt).toContain('make every lifecycle event readable')
    for (const output of [ taskUpdate, taskList, agent, prompt ])
      expect(output).not.toContain('metadata')
  })

  test('renders a readable image path from UserPromptSubmit as a compact preview', () => {
    const dir    = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-image-'))
    const image  = path.join(dir, 'reference image.png')
    const prompt = `<image name=[Image #1] path="${image}">`
    fs.writeFileSync(image, monochromeFixture(true))

    try {
      const message = String(renderHook('UserPromptSubmit', { prompt, cwd: dir }).systemMessage)
      const plain   = stripAnsi(message)
      const wire    = serializeHook({ systemMessage: message })

      expect(plain).toContain('UserPromptSubmit')
      expect(plain.replace(/\s+/g, ' ')).toContain('reference image.png')
      expect(plain).toContain('prompt image')
      expect(message).toMatch(/[▀▄█\u{1FB00}-\u{1FB3B}\u{1CE51}-\u{1CE8F}]/u)
      expect(message).toContain('\x1b[38;')
      expect(wire.systemMessage!.length).toBeLessThanOrEqual(10_000)
    }
    finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('summarises collaboration lifecycle tools without replaying their payloads', () => {
    const spawned = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'collaborationspawn_agent',
      tool_input:    { task_name: 'lint_core_fix', agent_type: 'worker', message: 'private worker brief' },
      tool_response: { task_name: '/root/lint_core_fix' },
    }).systemMessage)
    const waited = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'collaborationwait_agent',
      tool_input:    { timeout_ms: 30_000 },
      tool_response: { message: 'Wait timed out.', timed_out: true },
    }).systemMessage)
    const followedUp = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'collaborationfollowup_task',
      tool_input:    { target: '/root/lint_core_fix', message: 'private follow-up brief' },
      tool_response: {},
    }).systemMessage)

    expect(spawned).toContain('started /root/lint_core_fix')
    expect(spawned).toContain('worker')
    expect(spawned).not.toContain('private worker brief')
    expect(waited).toContain('Wait timed out.')
    expect(waited).toContain('timed out')
    expect(followedUp).toContain('follow-up sent to /root/lint_core_fix')
    expect(followedUp).not.toContain('private follow-up brief')
    for (const output of [ spawned, waited, followedUp ])
      expect(output).not.toContain('metadata')
  })

  test('echoes playwright and agent-browser operations as badges', () => {
    const playwright = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'mcp__playwright__browser_navigate',
      tool_input:    { url: 'https://example.com' },
      tool_response: { content: [{ type: 'text', text: 'page loaded' }]},
    }).systemMessage)
    const agentBrowser = stripAnsi(renderHook('PostToolUse', {
      tool_name:  'Bash',
      tool_input: {
        command: 'agent-browser --session demo press Enter && agent-browser --session demo snapshot',
      },
      tool_response: { stdout: 'done' },
    }).systemMessage)

    expect(playwright).toContain('ƒ navigate')
    expect(agentBrowser).toContain('ƒ press')
    expect(agentBrowser).toContain('ƒ snapshot')
  })

  test('unwraps playwright MCP content with the browser-specific formatter', () => {
    const playwright = stripAnsi(renderHook('PostToolUse', {
      tool_name:     'mcp__playwright__browser_navigate',
      tool_input:    { url: 'https://example.com' },
      tool_response: {
        content: [{ type: 'text', text: 'page loaded' }],
        isError: false,
      },
    }).systemMessage)

    expect(playwright).toContain('ƒ navigate')
    expect(playwright).toContain('page loaded')
    expect(playwright).not.toContain('"content"')
    expect(playwright).not.toContain('"isError"')
  })
})
