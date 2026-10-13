'use strict';
// ============================================================
//  Entrada, sonido, diálogos y menús
// ============================================================

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = cond => new Promise(r => { const f = () => (cond() ? r() : requestAnimationFrame(f)); f(); });
function tween(ms, fn) {
  return new Promise(r => {
    const t0 = performance.now();
    const f = now => { const k = Math.min(1, (now - t0) / ms); fn(k); k < 1 ? requestAnimationFrame(f) : r(); };
    requestAnimationFrame(f);
  });
}

// ---------------- Sonido (sintetizado) ----------------
const Sound = {
  ctx: null, muted: false,
  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* sin audio */ } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(f, d, type = 'square', vol = 0.04, slide = 0, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d + 0.02);
  },
  seq(notes, type = 'square', vol = 0.04) { let t = 0; for (const [f, d] of notes) { if (f) this.tone(f, d, type, vol, 0, t); t += d; } },
  blip() { this.tone(880, 0.04); },
  bump() { this.tone(110, 0.08, 'square', 0.05); },
  hit() { this.tone(220, 0.18, 'sawtooth', 0.07, -170); },
  faint() { this.tone(600, 0.5, 'square', 0.05, -500); },
  heal() { this.seq([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.3]], 'triangle', 0.06); },
  levelup() { this.seq([[659, 0.1], [784, 0.1], [988, 0.1], [1318, 0.25]], 'square', 0.04); },
  item() { this.seq([[784, 0.1], [988, 0.1], [1175, 0.2]], 'triangle', 0.06); },
  catch() { this.seq([[523, 0.1], [659, 0.1], [784, 0.1], [659, 0.1], [784, 0.1], [1046, 0.35]], 'square', 0.04); },
  shake() { this.tone(300, 0.06, 'square', 0.04); },
  encounter() { this.seq([[440, 0.06], [494, 0.06], [523, 0.06], [587, 0.06], [659, 0.06], [698, 0.06], [784, 0.12]], 'square', 0.04); },
  stat(up) { this.tone(up ? 400 : 700, 0.25, 'triangle', 0.06, up ? 500 : -400); },
  win() { this.seq([[784, 0.12], [784, 0.12], [784, 0.12], [1046, 0.4]], 'square', 0.04); },
};

// ---------------- Entrada ----------------
const held = { up: false, down: false, left: false, right: false, b: false };
let uiHandler = null;          // si hay un diálogo/menú activo recibe las pulsaciones
let worldPress = null;         // manejador del mundo
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right', KeyZ: 'a', Space: 'a', Enter: 'a', KeyJ: 'a',
  KeyX: 'b', Escape: 'b', Backspace: 'b', KeyK: 'b', KeyM: 'start', KeyC: 'start', Tab: 'start',
};

function press(btn) {
  Sound.unlock();
  if (uiHandler) uiHandler(btn);
  else if (worldPress) worldPress(btn);
}

function initInput() {
  window.addEventListener('keydown', e => {
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (b in held) held[b] = true;
    if (e.repeat && (b === 'a' || b === 'b' || b === 'start')) return;
    press(b);
  });
  window.addEventListener('keyup', e => { const b = KEYMAP[e.code]; if (b && b in held) held[b] = false; });
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; });

  for (const el of document.querySelectorAll('[data-btn]')) {
    const b = el.dataset.btn;
    let rep = null;
    const down = e => {
      e.preventDefault(); el.classList.add('pressed');
      if (b in held) held[b] = true;
      press(b);
      if (['up', 'down', 'left', 'right'].includes(b)) rep = setInterval(() => { if (uiHandler) press(b); }, 220);
    };
    const up = e => { e.preventDefault(); el.classList.remove('pressed'); if (b in held) held[b] = false; clearInterval(rep); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  $('dialog').addEventListener('pointerdown', e => { e.preventDefault(); press('a'); });
}

// ---------------- Diálogos ----------------
function say(text, { wait = true } = {}) {
  return new Promise(res => {
    const box = $('dialog'), t = $('dtext'), nx = $('dnext');
    box.classList.remove('hidden');
    nx.style.visibility = 'hidden';
    let i = 0, done = false;
    t.textContent = '';
    const finish = () => {
      clearInterval(iv); t.textContent = text; done = true;
      if (!wait) { if (uiHandler === handler) uiHandler = null; res(); }
      else nx.style.visibility = 'visible';
    };
    const iv = setInterval(() => { i += 2; t.textContent = text.slice(0, i); if (i >= text.length) finish(); }, 16);
    const handler = btn => {
      if (btn !== 'a' && btn !== 'b') return;
      if (!done) { finish(); return; }
      if (wait) { uiHandler = null; Sound.blip(); res(); }
    };
    uiHandler = handler;
  });
}
function hideDialog() { $('dialog').classList.add('hidden'); }

// options: string | { label, sub, icon, disabled, color }
function choose(options, { cancel = true, start = 0, layout = 'list', title = '' } = {}) {
  return new Promise(res => {
    const menu = $('menu'), ul = $('mlist'), tt = $('mtitle');
    const opts = options.map(o => (typeof o === 'string' ? { label: o } : o));
    menu.className = 'menu ' + layout;
    tt.textContent = title; tt.style.display = title ? '' : 'none';
    ul.innerHTML = '';
    let sel = Math.max(0, Math.min(start, opts.length - 1));
    opts.forEach((o, i) => {
      const li = document.createElement('li');
      if (o.icon) { const img = document.createElement('img'); img.src = o.icon; li.appendChild(img); }
      const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = o.label; li.appendChild(lab);
      if (o.sub) {
        const s = document.createElement('span'); s.className = 'sub'; s.textContent = o.sub;
        if (o.color) { s.style.background = o.color; s.classList.add('badge'); }
        li.appendChild(s);
      }
      if (o.disabled) li.classList.add('disabled');
      li.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sound.unlock(); sel = i; render(); pick(); });
      ul.appendChild(li);
    });
    const n = opts.length, cols = layout === 'grid' ? 2 : 1;
    const render = () => {
      [...ul.children].forEach((li, i) => li.classList.toggle('sel', i === sel));
      const el = ul.children[sel]; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    };
    $('dialog').classList.toggle('narrow', layout === 'grid');
    const close = v => { menu.classList.add('hidden'); $('dialog').classList.remove('narrow'); if (uiHandler === handler) uiHandler = null; res(v); };
    const pick = () => { if (opts[sel].disabled) { Sound.bump(); return; } Sound.blip(); close(sel); };
    const handler = btn => {
      if (btn === 'up') sel = (sel - cols + n) % n;
      else if (btn === 'down') sel = (sel + cols) % n;
      else if (btn === 'left' && cols > 1) sel = (sel - 1 + n) % n;
      else if (btn === 'right' && cols > 1) sel = (sel + 1) % n;
      else if (btn === 'a') return pick();
      else if (btn === 'b' && cancel) { Sound.blip(); return close(-1); }
      render();
    };
    uiHandler = handler;
    render();
    menu.classList.remove('hidden');
  });
}

// Espera a que se pulse A (o Menú)
function waitA() {
  return new Promise(res => { uiHandler = b => { if (b === 'a' || b === 'start') { uiHandler = null; res(); } }; });
}
