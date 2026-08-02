/* Replays the session captured in demo-data.js.
 *
 * `prompt` beats are typed into the composer, then echoed into the scrollback
 * the way submitting actually moves them. `hook` beats carry pre-rendered HTML
 * lines produced by scripts/capture-demo.ts from the real hook pipeline - this
 * file only decides *when* they appear, never what they say. */
(() => {
  'use strict';

  const stream = document.getElementById('stream');
  const scrollback = document.getElementById('scrollback');
  const composerText = document.getElementById('composer-text');
  const caret = document.getElementById('caret');
  const playPause = document.getElementById('playpause');
  const restartBtn = document.getElementById('restart');

  wireCopyButtons(document);

  const session = window.__SESSION__;
  const steps = session && Array.isArray(session.steps) ? session.steps : null;
  if (!stream || !steps || !steps.length) {
    // Capture missing or empty: the static banner is already on screen and
    // carries the install commands, so leaving it alone is the right failure.
    if (playPause) playPause.hidden = true;
    if (restartBtn) restartBtn.hidden = true;
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TYPE_MS = 26;          // per character in the composer
  const SUBMIT_MS = 420;       // pause on a finished prompt before it submits
  const LINE_MS = 55;          // stagger between captured lines
  const BURST_OVER = 14;       // longer blocks (art, block headings) land at once
  const BEAT_MS = 380;         // breath between beats
  const LOOP_MS = 6000;        // hold on the finished session before restarting

  let paused = false;
  let run = 0;                 // bumped to cancel an in-flight playthrough

  /* ---------- timing ---------- */

  const CANCELLED = Symbol('cancelled');

  function sleep(ms, token) {
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + ms;
      (function tick() {
        if (token !== run) return reject(CANCELLED);
        if (!paused && performance.now() >= deadline) return resolve();
        setTimeout(tick, 40);
      })();
    });
  }

  /* ---------- rendering ---------- */

  function append(node) {
    stream.appendChild(node);
    scrollback.scrollTop = scrollback.scrollHeight;
    return node;
  }

  function el(cls, html) {
    const node = document.createElement('div');
    node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function echoPrompt(step) {
    const node = el('echo beat');
    const chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = '❯ ';
    node.append(chev, document.createTextNode(step.text));
    if (step.copyable) node.appendChild(copyButton(step.text));
    append(node);
  }

  function copyButton(text) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy';
    btn.textContent = 'copy';
    btn.addEventListener('click', () => copyText(text, btn));
    return btn;
  }

  function copyText(text, btn) {
    const done = () => {
      const original = btn.textContent;
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
    // http:// origins and older browsers have no async clipboard
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch (e) {
      /* clipboard unavailable — the text is selectable on the page anyway */
    }
    document.body.removeChild(ta);
  }

  // Buttons that live in the static banner copy from an element's text.
  function wireCopyButtons(root) {
    root.querySelectorAll('.copy[data-copy]').forEach(btn => {
      const target = document.querySelector(btn.getAttribute('data-copy'));
      if (target) btn.addEventListener('click', () => copyText(target.textContent.trim(), btn));
    });
  }

  /* ---------- beats ---------- */

  async function playPrompt(step, token) {
    if (reduceMotion) {
      echoPrompt(step);
      return;
    }
    composerText.textContent = '';
    for (const ch of step.text) {
      composerText.textContent += ch;
      await sleep(TYPE_MS, token);
    }
    await sleep(SUBMIT_MS, token);
    composerText.textContent = '';
    echoPrompt(step);
  }

  async function playHook(step, token) {
    if (step.caption) append(el('caption beat', '└ ' + escapeHtml(step.caption)));

    if (reduceMotion || step.lines.length > BURST_OVER) {
      const frag = document.createDocumentFragment();
      step.lines.forEach(line => frag.appendChild(el('cap-line', line || '&nbsp;')));
      stream.appendChild(frag);
      scrollback.scrollTop = scrollback.scrollHeight;
      return;
    }
    for (const line of step.lines) {
      append(el('cap-line beat', line || '&nbsp;'));
      await sleep(LINE_MS, token);
    }
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- loop ---------- */

  async function play() {
    const token = ++run;
    stream.innerHTML = '';
    composerText.textContent = '';

    try {
      for (const step of steps) {
        if (step.kind === 'prompt') await playPrompt(step, token);
        else await playHook(step, token);
        await sleep(BEAT_MS, token);
      }
      if (reduceMotion) return;          // render once, don't loop
      await sleep(LOOP_MS, token);
      if (token === run) play();
    } catch (e) {
      if (e !== CANCELLED) throw e;      // a restart cancelled this run
    }
  }

  function setPaused(next) {
    paused = next;
    playPause.textContent = paused ? '▶' : '❚❚';
    playPause.setAttribute('aria-label', paused ? 'Resume the demo' : 'Pause the demo');
    if (caret) caret.style.animationPlayState = paused ? 'paused' : '';
  }

  playPause.addEventListener('click', () => setPaused(!paused));
  restartBtn.addEventListener('click', () => {
    setPaused(false);
    play();
  });

  // Don't burn frames (or the session) in a background tab.
  let pausedByVisibility = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !paused) {
      pausedByVisibility = true;
      setPaused(true);
    } else if (!document.hidden && pausedByVisibility) {
      pausedByVisibility = false;
      setPaused(false);
    }
  });

  if (reduceMotion) {
    playPause.hidden = true;
    restartBtn.hidden = true;
  }

  play();
})();
