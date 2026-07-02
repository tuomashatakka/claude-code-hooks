(() => {
  const body = document.getElementById('term-body');
  const scenes = window.__DEMO__;
  if (!body || !Array.isArray(scenes) || !scenes.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, reduceMotion ? 0 : ms));

  function addLine(html) {
    const el = document.createElement('div');
    el.className = 'cap-line';
    el.innerHTML = html;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  async function typeCommand(text) {
    const el = document.createElement('div');
    el.className = 'line';
    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = '$ ';
    const typed = document.createElement('span');
    el.append(prompt, typed);
    body.appendChild(el);
    if (reduceMotion) {
      typed.textContent = text;
      return;
    }
    for (const ch of text) {
      typed.textContent += ch;
      await sleep(28);
    }
  }

  async function runLoop() {
    for (;;) {
      body.innerHTML = '';
      await typeCommand('claude');
      await sleep(500);

      for (const scene of scenes) {
        for (const line of scene.lines) {
          addLine(line);
          await sleep(160);
        }
        await sleep(450);
      }

      const idle = document.createElement('div');
      idle.className = 'line';
      idle.innerHTML = '<span class="prompt">$ </span><span class="cursor-blink">▌</span>';
      body.appendChild(idle);
      body.scrollTop = body.scrollHeight;

      await sleep(4000);
    }
  }

  runLoop();
})();
