/* Replays the examples captured in demo-data.js, one tool call at a time.
 *
 * Each example is framed the way Claude Code frames it in a real terminal:
 *
 *   > give the Stop hook a matching badge
 *   ⏺ Bash(rg -n 'renderBadges' src/hooks/index.ts)
 *    ❯ Bash  OUTPUT
 *   Δ 12ms
 *
 * Hook output sits flush at column 0: every event opens with a clear-line
 * prefix (runtime/io.ts) that overwrites the "<Event> says:" label Claude Code
 * prints above it, so there is no caption row and no gutter to indent under.
 *
 * The hook output itself is pre-rendered HTML from scripts/capture-demo.ts,
 * which runs the real hook pipeline. This file decides framing and timing,
 * never content.
 */
(() => {
  'use strict';

  const stream = document.getElementById('stream');
  const scrollback = document.getElementById('scrollback');
  const hint = document.getElementById('hint');
  const counter = document.getElementById('counter');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  wireCopyButtons(document);

  const session = window.__SESSION__;
  const examples = session && Array.isArray(session.examples) ? session.examples : null;
  if (!stream || !examples || !examples.length) {
    // No capture: the static banner already carries the install commands, so
    // leaving it untouched is the right failure.
    if (hint) hint.hidden = true;
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LINE_MS = 26;      // stagger between captured lines
  const BURST_OVER = 16;   // art and block headings land in one frame

  const boot = document.querySelector('.boot');
  const installBar = document.getElementById('installbar');

  let index = 0;
  let run = 0;             // bumped to cancel an in-flight reveal
  let revealing = false;

  // The banner is part of the session-start frame. Past that it would eat the
  // room an example needs, so it collapses into the compact install bar.
  function setChrome(i) {
    const atStart = i === 0;
    if (boot) boot.hidden = !atStart;
    if (installBar) installBar.hidden = atStart;
  }

  /* ---------- dom helpers ---------- */

  function el(cls, html) {
    const node = document.createElement('div');
    node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- rendering one example ---------- */

  async function show(i) {
    const token = ++run;
    const ex = examples[i];
    stream.innerHTML = '';
    revealing = true;
    setHint('');
    setChrome(i);

    if (ex.note) stream.appendChild(el('note', escapeHtml(ex.note)));
    if (ex.prompt) stream.appendChild(el('turn', '&gt; ' + escapeHtml(ex.prompt)));
    if (ex.header) {
      stream.appendChild(
        el('callhdr', '<span class="dot">⏺</span> ' + escapeHtml(ex.header))
      );
    }

    const block = el('hookblock');
    stream.appendChild(block);

    // Every hook opens with a clear-line prefix that erases Claude Code's
    // "<Event>:<Tool> says:" row and returns to column 0, so output starts
    // flush left — no caption, no gutter. Leading blanks are the remains of
    // that overwritten row and would render as a stray gap.
    let first = 0;
    while (first < ex.lines.length && !ex.lines[first]) first++;

    const rest = ex.lines.slice(first);
    const burst = reduceMotion || rest.length > BURST_OVER;

    if (burst) {
      const frag = document.createDocumentFragment();
      rest.forEach(l => frag.appendChild(el('cap-line', l || '&nbsp;')));
      block.appendChild(frag);
    } else {
      for (const l of rest) {
        if (token !== run) return;
        block.appendChild(el('cap-line', l || '&nbsp;'));
        scrollback.scrollTop = scrollback.scrollHeight;
        await sleep(LINE_MS);
      }
    }

    if (token !== run) return;
    scrollback.scrollTop = 0;
    revealing = false;
    counter.textContent = (i + 1) + ' / ' + examples.length;
    setHint('press any key or click to continue');
  }

  function setHint(text) {
    hint.textContent = text;
    hint.classList.toggle('on', Boolean(text));
  }

  function go(delta) {
    // Mid-reveal, the first press finishes the current example rather than
    // skipping past output the viewer has not seen yet.
    if (revealing && delta > 0) {
      run++;
      renderInstant(index);
      return;
    }
    index = (index + delta + examples.length) % examples.length;
    show(index);
  }

  function renderInstant(i) {
    const ex = examples[i];
    const block = stream.querySelector('.hookblock');
    if (!block) return;
    let first = 0;
    while (first < ex.lines.length && !ex.lines[first]) first++;
    const shown = block.querySelectorAll('.cap-line').length;
    const frag = document.createDocumentFragment();
    ex.lines.slice(first + shown).forEach(l => frag.appendChild(el('cap-line', l || '&nbsp;')));
    block.appendChild(frag);
    revealing = false;
    scrollback.scrollTop = 0;
    counter.textContent = (i + 1) + ' / ' + examples.length;
    setHint('press any key or click to continue');
  }

  /* ---------- input ---------- */

  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;       // leave shortcuts alone
    if (e.key === 'Tab') return;                          // keep focus navigable
    e.preventDefault();
    go(e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Backspace' ? -1 : 1);
  });

  document.addEventListener('click', e => {
    // Buttons and links own their clicks.
    if (e.target.closest('button, a')) return;
    go(1);
  });

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  document.getElementById('restart').addEventListener('click', () => { index = 0; show(0); });

  /* ---------- clipboard ---------- */

  function copyText(text, btn) {
    const done = () => {
      const original = btn.dataset.label || btn.textContent;
      btn.dataset.label = original;
      btn.textContent = 'copied';
      btn.classList.add('done');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('done');
      }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => {});
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (err) { /* no clipboard */ }
    document.body.removeChild(ta);
  }

  function wireCopyButtons(root) {
    root.querySelectorAll('.copy[data-copy]').forEach(btn => {
      const target = document.querySelector(btn.getAttribute('data-copy'));
      if (target) btn.addEventListener('click', () => copyText(target.textContent.trim(), btn));
    });
  }

  show(0);
})();
