import { describe, expect, test } from 'bun:test';
import { ansiToHtmlLines } from '../scripts/ansi-to-html.ts';

const ESC = '\x1b[';

describe('ansiToHtmlLines', () => {
  test('escapes HTML in the captured text', () => {
    expect(ansiToHtmlLines('<script>&"')).toEqual(['&lt;script&gt;&amp;"']);
  });

  test('maps named colors onto the page palette variables', () => {
    const [line] = ansiToHtmlLines(`${ESC}36mcyan${ESC}39m plain`);
    expect(line).toContain('color:var(--cyan)');
    expect(line).toContain('cyan');
    expect(line).toContain('plain');
  });

  test('carries style across an embedded newline instead of bleeding or dropping it', () => {
    const lines = ansiToHtmlLines(`${ESC}31mtop\nbottom${ESC}39m after`);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('color:var(--red)');
    expect(lines[1]).toContain('color:var(--red)');
    expect(lines[1]).toContain(' after');
  });

  test('reads 24-bit color', () => {
    const [line] = ansiToHtmlLines(`${ESC}38;2;10;20;30mx`);
    expect(line).toContain('color:rgb(10,20,30)');
  });

  // image-to-ascii falls back to xterm-256 once a render would exceed the
  // hook's byte budget. Before this was handled, the palette index leaked out
  // as a bare SGR code and painted whole images white.
  describe('xterm-256', () => {
    test('resolves cube indices', () => {
      // 196 -> cube (5,0,0) -> pure red
      expect(ansiToHtmlLines(`${ESC}38;5;196mx`)[0]).toContain('color:rgb(255,0,0)');
      // 46 -> cube (0,5,0)
      expect(ansiToHtmlLines(`${ESC}38;5;46mx`)[0]).toContain('color:rgb(0,255,0)');
    });

    test('resolves the grayscale ramp', () => {
      expect(ansiToHtmlLines(`${ESC}38;5;232mx`)[0]).toContain('color:rgb(8,8,8)');
      expect(ansiToHtmlLines(`${ESC}38;5;255mx`)[0]).toContain('color:rgb(238,238,238)');
    });

    test('resolves the low 16 onto the named palette', () => {
      expect(ansiToHtmlLines(`${ESC}38;5;6mx`)[0]).toContain('color:var(--cyan)');
      expect(ansiToHtmlLines(`${ESC}38;5;10mx`)[0]).toContain('color:var(--brightgreen)');
    });

    test('consumes all three parameters, so a following code still applies', () => {
      const [line] = ansiToHtmlLines(`${ESC}38;5;196;1mbold red`);
      expect(line).toContain('color:rgb(255,0,0)');
      expect(line).toContain('font-weight:700');
    });

    test('handles background indices', () => {
      expect(ansiToHtmlLines(`${ESC}48;5;196mx`)[0]).toContain('background:rgb(255,0,0)');
    });
  });

  test('drops non-SGR CSI sequences without eating text', () => {
    // the spinner redraw render-tool.ts emits: cursor up, clear line, cursor down
    const [line] = ansiToHtmlLines(`${ESC}1A${ESC}2K${ESC}1Bvisible`);
    expect(line).toBe('visible');
  });
});
