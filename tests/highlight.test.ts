import { describe, expect, test } from 'bun:test'
import chalk from 'chalk'
import { highlight, replaceOutsideAnsi } from '../src/ansi/highlight.ts'
import { stripAnsi } from '../src/ansi/text.ts'


chalk.level = 3

/** A sequence is intact only if every ESC is followed by `[…<letter>`. */
function hasBrokenEscape (s: string): boolean {
  // A parameter byte position holding another ESC means an earlier pass got
  // chopped up by a later one.
  return (/\x1b\[[0-9;]*\x1b/).test(s)
}

describe('replaceOutsideAnsi', () => {
  test('leaves escape parameters alone', () => {
    const input = `\x1b[38;2;224;175;104m-n\x1b[39m 42`
    const out   = replaceOutsideAnsi(input, /\b\d+\b/g, m => `<${m}>`)
    expect(out).toBe(`\x1b[38;2;224;175;104m-n\x1b[39m <42>`)
  })

  test('still replaces in text on both sides of a sequence', () => {
    const out = replaceOutsideAnsi(`1 \x1b[31mx\x1b[39m 2`, /\d/g, m => `[${m}]`)
    expect(out).toBe(`[1] \x1b[31mx\x1b[39m [2]`)
  })

  test('takes the fast path when there is nothing to protect', () => {
    expect(replaceOutsideAnsi('a1b2', /\d/g, m => `<${m}>`)).toBe('a<1>b<2>')
  })
})

describe('highlightBash', () => {
  test('uses compact terminal colors without shattering flag escapes', () => {
    const out = highlight('rg -n 42 src/index.ts', 'bash')
    expect(hasBrokenEscape(out)).toBe(false)
    expect(out).toContain('\x1b[33m-n')
    expect(out).not.toContain('\x1b[38;2;')
    expect(stripAnsi(out)).toBe('rg -n 42 src/index.ts')
  })

  test('does not recolor command-like words or numbers inside strings', () => {
    const out = highlight("echo 'git return 42 --force'", 'bash')
    expect(out).toContain("\x1b[32m'git return 42 --force'\x1b[39m")
    expect(stripAnsi(out)).toBe("echo 'git return 42 --force'")
  })

  test('keeps the visible text intact for a realistic command', () => {
    const cmd = "rg -n --color=always 'renderBadges' src/hooks/index.ts | head -20"
    const out = highlight(cmd, 'bash')
    expect(hasBrokenEscape(out)).toBe(false)
    expect(stripAnsi(out)).toBe(cmd)
  })
})

describe('highlightJavaScript', () => {
  test('protects strings and comments from later token classes', () => {
    const out = highlight("const value = fn('return 42'); // const fn", 'typescript')
    expect(out).toContain("\x1b[32m'return 42'\x1b[39m")
    expect(out).toContain('\x1b[90m// const fn\x1b[39m')
    expect(stripAnsi(out)).toBe("const value = fn('return 42'); // const fn")
  })
})

describe('the scanner keeps nested syntax inside its owner', () => {
  test('quotes inside a comment do not open a string', () => {
    const js = highlight("// it's a \"comment\"\nconst a = 1", 'javascript')
    const py = highlight("# don't\nx = 1", 'python')
    const sh = highlight("echo hi # it's here\nls", 'bash')
    expect(js).toContain('\x1b[90m// it\'s a "comment"\x1b[39m')
    expect(py).toContain("\x1b[90m# don't\x1b[39m")
    expect(sh).toContain("\x1b[90m# it's here\x1b[39m")
    for (const out of [ js, py, sh ])
      expect(hasBrokenEscape(out)).toBe(false)
  })

  test('a regex literal is one token, and a division is not one', () => {
    const out = highlight('const re = /["\']+/g; const q = a / b / c', 'javascript')
    expect(out).toContain('\x1b[31m/["\']+/g\x1b[39m')
    expect(out).not.toContain('\x1b[31m/ b /')
    expect(stripAnsi(out)).toBe('const re = /["\']+/g; const q = a / b / c')
  })

  test('template literals keep their interpolations as code', () => {
    const out = highlight('const s = `a ${fn(1)} b`', 'javascript')
    expect(out).toContain('\x1b[32m`a \x1b[39m')
    expect(out).toContain('\x1b[35mfn\x1b[39m(\x1b[33m1\x1b[39m)')
    expect(stripAnsi(out)).toBe('const s = `a ${fn(1)} b`')
  })

  test('multi-line strings and heredocs are not tokenized as shell', () => {
    const multi   = highlight('echo "one\ntwo --flag 42"\nls', 'bash')
    const heredoc = highlight("cat <<'EOF' > out\nls -la 42\nEOF\nls -la", 'bash')
    expect(multi).toContain('\x1b[32m"one\x1b[39m\n\x1b[32mtwo --flag 42"\x1b[39m')
    // Body words are not commands or flags; the closing delimiter is dimmed.
    expect(heredoc).not.toContain('\x1b[35mls\x1b[39m \x1b[33m-la\x1b[39m \x1b[33m42')
    expect(heredoc).toContain('\x1b[90mEOF\x1b[39m')
    expect(heredoc).toContain('\x1b[35mls\x1b[39m \x1b[33m-la\x1b[39m')
    expect(stripAnsi(heredoc)).toBe("cat <<'EOF' > out\nls -la 42\nEOF\nls -la")
  })

  test('python triple-quoted strings span lines and swallow hashes', () => {
    const out = highlight('s = """a\n# not a comment\nb"""\nx = 2', 'python')
    expect(out).toContain('\x1b[32m"""a\x1b[39m\n\x1b[32m# not a comment\x1b[39m\n\x1b[32mb"""\x1b[39m')
    expect(out).toContain('\x1b[33m2\x1b[39m')
  })

  test('markdown fences highlight their body in the named language', () => {
    const out = highlight('```ts\nconst x = 1\n```\ntext', 'markdown')
    expect(out).toContain('\x1b[36mconst\x1b[39m')
    expect(out).toContain('\x1b[90m```\x1b[39m')
    expect(stripAnsi(out)).toBe('```ts\nconst x = 1\n```\ntext')
  })
})

describe('every highlighter', () => {
  const sample: Record<string, string> = {
    bash:       'ls -la /tmp && grep -n 2 file.txt',
    javascript: 'const x = 42; // note\nfoo(1.5)',
    typescript: 'const n: number = 7;',
    json:       '{"a": 1, "b": "two", "c": true}',
    python:     'def f(x=3):\n    return x * 2',
    yaml:       'key: 12\nother: value',
    css:        '.a { width: 10px; margin: 0 }',
    sql:        'SELECT 1 FROM t WHERE id = 42',
    markdown:   '# Title\n\n1. one\n2. two',
    diff:       '@@ -1,2 +1,2 @@\n-a\n+b',
    output:     'done in 42ms',
  }

  for (const [ lang, code ] of Object.entries(sample))
    test(`${lang}: emits well-formed escapes and preserves the text`, () => {
      const out = highlight(code, lang)
      expect(hasBrokenEscape(out)).toBe(false)
      expect(stripAnsi(out)).toBe(code)
    })
})
