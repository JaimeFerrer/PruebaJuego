'use strict';
// ============================================================
//  Gráficos: pixel art generado por código
// ============================================================

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
// f < 1 oscurece, f > 1 aclara
function shade(h, f) {
  const [r, g, b] = hexToRgb(h);
  if (f < 1) return rgbToHex(r * f, g * f, b * f);
  const k = f - 1;
  return rgbToHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k);
}

function srand(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Lienzo de píxeles con primitivas nítidas
class PB {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  px(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.d[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c); }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
  }
  // Elipse con sombreado y brillo
  ball(cx, cy, rx, ry, c) {
    const dk = shade(c, 0.75), lt = shade(c, 1.4);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        let col = c;
        if (dx * 0.55 + dy * 0.85 > 0.5) col = dk;
        else if ((dx + 0.4) ** 2 + (dy + 0.45) ** 2 < 0.06) col = lt;
        this.px(x, y, col);
      }
  }
  tri(x1, y1, x2, y2, x3, y3, c) {
    const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
    const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
    const s = (ax, ay, bx, by, px, py) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d1 = s(px, py, x1, y1, x2, y2), d2 = s(px, py, x2, y2, x3, y3), d3 = s(px, py, x3, y3, x1, y1);
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(neg && pos)) this.px(x, y, c);
    }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  canvas(outline) {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      let c = this.d[y * this.w + x];
      if (!c && outline && (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))) c = outline;
      if (!c) continue;
      const [r, g, b] = hexToRgb(c), i = (y * this.w + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

// ---------------- Casillas ----------------
const TILE = 16;
const TILES = {};

function grassBase(p, seed) {
  p.rect(0, 0, 16, 16, '#7ccb5c');
  const r = srand(seed);
  for (let i = 0; i < 9; i++) { const x = r() * 16 | 0, y = r() * 15 | 0 + 1; p.px(x, y, '#64b448'); p.px(x, y - 1, '#64b448'); }
  for (let i = 0; i < 4; i++) p.px(r() * 16 | 0, r() * 16 | 0, '#9ce07a');
}

function makeTiles() {
  const mk = (fn, frames = 1) => {
    const out = [];
    for (let f = 0; f < frames; f++) { const p = new PB(16, 16); fn(p, f); out.push(p.canvas()); }
    return out;
  };
  TILES['.'] = mk(p => grassBase(p, 11));
  TILES[','] = mk(p => {
    p.rect(0, 0, 16, 16, '#5fae44');
    for (const by of [8, 16]) for (let k = 0; k < 4; k++) {
      const x0 = k * 4 + (by === 8 ? 2 : 0);
      p.tri(x0 - 1, by, x0 + 2, by - 8, x0 + 5, by, '#2f7d2c');
      p.tri(x0 + 0.5, by, x0 + 2, by - 6, x0 + 3.5, by, '#4fa23c');
    }
  });
  TILES['='] = mk(p => {
    p.rect(0, 0, 16, 16, '#dccca6');
    for (let row = 0; row < 4; row++) {
      p.rect(0, row * 4 + 3, 16, 1, '#c2b08a');
      const off = row % 2 ? 4 : 0;
      for (let x = off; x < 16; x += 8) p.rect(x, row * 4, 1, 3, '#c2b08a');
      p.px((off + 2) % 16, row * 4 + 1, '#e8dcbc');
    }
  });
  TILES['C'] = mk(p => {
    p.rect(0, 0, 16, 16, '#8e8e98');
    const r = srand(7);
    for (let i = 0; i < 18; i++) p.px(r() * 16 | 0, r() * 16 | 0, r() < 0.5 ? '#80808a' : '#9c9ca6');
  });
  TILES['S'] = mk(p => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++)
      p.rect(x * 8, y * 8, 8, 8, (x + y) % 2 ? '#d8caa8' : '#ebe1c8');
  });
  TILES['D'] = mk(p => {
    p.rect(0, 0, 16, 16, '#d0a868');
    const r = srand(5);
    for (let i = 0; i < 12; i++) p.px(r() * 16 | 0, r() * 16 | 0, r() < 0.6 ? '#b98f54' : '#e0bd82');
  });
  TILES['~'] = mk((p, f) => {
    p.rect(0, 0, 16, 16, '#3f88dc');
    for (const [y, o] of [[3, 0], [8, 6], [13, 3]]) {
      const x = (o + f * 3) % 16;
      p.rect(x, y, 5, 1, '#8cc4f4'); p.rect((x + 9) % 16, y + 1, 3, 1, '#6aaaf0');
    }
  }, 2);
  TILES['T'] = mk(p => {
    grassBase(p, 3);
    p.rect(6, 11, 4, 5, '#7a5030'); p.rect(6, 11, 1, 5, '#5a3a20');
    p.ell(8, 7, 7.5, 7, '#1b5a25');
    p.ball(8, 7, 6.5, 6, '#2f8f3c');
    p.px(5, 5, '#5cbf5c'); p.px(6, 4, '#5cbf5c'); p.px(10, 8, '#25782f'); p.px(4, 9, '#25782f');
  });
  TILES['M'] = mk(p => {
    p.rect(0, 0, 16, 16, '#8a8276');
    p.tri(0, 16, 6, 3, 12, 16, '#a39b8c'); p.tri(7, 16, 13, 6, 18, 16, '#968e80');
    p.line(6, 3, 4, 9, '#6a6256'); p.line(13, 6, 15, 11, '#6a6256'); p.line(2, 12, 7, 14, '#6a6256');
    p.px(5, 4, '#bcb4a4'); p.px(12, 7, '#bcb4a4');
  });
  TILES['n'] = mk(p => {
    p.rect(0, 0, 16, 16, '#eef4fc');
    const r = srand(9);
    for (let i = 0; i < 10; i++) p.px(r() * 16 | 0, r() * 16 | 0, '#c8d8ec');
    p.tri(2, 16, 6, 10, 10, 16, '#a39b8c');
  });
  TILES['R'] = mk(p => {
    p.rect(0, 0, 16, 16, '#c4643c');
    for (const x of [2, 7, 12]) { p.rect(x, 0, 1, 16, '#9e4a2a'); p.rect(x + 1, 0, 1, 16, '#d88050'); }
    p.rect(4, 5, 2, 1, '#9e4a2a'); p.rect(9, 11, 2, 1, '#9e4a2a');
  });
  TILES.Rtop = mk(p => {
    grassBase(p, 31);
    p.ell(8, 9, 8, 9, '#c4643c');
    p.rect(0, 9, 16, 7, '#c4643c');
    for (const x of [2, 7, 12]) for (let y = 0; y < 16; y++) if (p.get(x, y) === '#c4643c') { p.px(x, y, '#9e4a2a'); p.px(x + 1, y, '#d88050'); }
    p.ell(6, 3, 2.5, 1, '#4caf50');
  });
  TILES['F'] = mk(p => {
    grassBase(p, 21);
    for (const [x, y, c] of [[3, 3, '#e84848'], [10, 5, '#f4f4f4'], [5, 11, '#f0c030'], [12, 12, '#e84848']]) {
      p.px(x - 1, y, c); p.px(x + 1, y, c); p.px(x, y - 1, c); p.px(x, y + 1, c); p.px(x, y, '#f8e060');
    }
  });
  TILES['H'] = mk(p => {
    p.rect(0, 0, 16, 16, '#a8743f');
    for (let x = 0; x < 16; x += 4) p.rect(x, 0, 1, 16, '#7c5430');
    p.rect(0, 0, 16, 2, '#5a3a20'); p.rect(0, 14, 16, 2, '#5a3a20');
  });
  TILES['r'] = mk(p => {
    p.rect(0, 0, 16, 16, '#9a8c7c');
    const r = srand(17);
    for (let i = 0; i < 14; i++) p.px(r() * 16 | 0, r() * 16 | 0, '#847666');
    for (const x of [1, 5, 9, 13]) p.rect(x, 2, 2, 12, '#6a4a2a');
    p.rect(0, 4, 16, 1, '#dcdce4'); p.rect(0, 5, 16, 1, '#5a5a64');
    p.rect(0, 10, 16, 1, '#dcdce4'); p.rect(0, 11, 16, 1, '#5a5a64');
  });
  TILES['Y'] = mk(p => {
    p.rect(0, 0, 16, 16, '#e2c25a');
    for (let y = 1; y < 16; y += 3) for (let x = (y % 2) * 2; x < 16; x += 4) { p.px(x, y, '#c8a040'); p.px(x + 1, y - 1, '#f0d878'); }
  });
  TILES['V'] = mk(p => {
    p.rect(0, 0, 16, 16, '#b89a6a');
    for (const y of [3, 11]) {
      p.rect(0, y + 3, 16, 1, '#7a5a3a');
      for (let x = 1; x < 16; x += 5) { p.ball(x + 1, y + 1, 2.5, 2.2, '#4f9a3a'); p.px(x + 1, y + 3, '#6a2a7a'); p.px(x + 2, y + 3, '#6a2a7a'); }
    }
  });
  TILES['d'] = mk(p => {
    p.rect(0, 0, 16, 16, '#dcc79a');
    const r = srand(41);
    for (let i = 0; i < 14; i++) p.px(r() * 16 | 0, r() * 16 | 0, r() < 0.5 ? '#c8b080' : '#ecdcb4');
    p.rect(3, 10, 3, 1, '#9aa060'); p.px(4, 9, '#9aa060'); p.rect(11, 4, 2, 1, '#9aa060');
  });
  TILES['A'] = mk(p => {
    grassBase(p, 5);
    p.rect(7, 12, 2, 4, '#5a3a20');
    p.tri(1, 13, 8, 0, 15, 13, '#1a4a30');
    p.tri(3, 10, 8, 1, 13, 10, '#2a6a40');
    p.tri(5, 6, 8, 1, 11, 6, '#3a8a50');
  });
  TILES['B'] = TILES['='];
  // ---- Interiores ----
  const wood = p => { p.rect(0, 0, 16, 16, '#c89a62'); for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, '#a87a48'); for (const [x, y] of [[5, 0], [12, 4], [2, 8], [9, 12]]) p.rect(x, y, 1, 3, '#a87a48'); };
  TILES.f = mk(wood);
  TILES.k = mk(p => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) p.rect(x * 8, y * 8, 8, 8, (x + y) % 2 ? '#d4dce8' : '#eef0f6'); });
  TILES.s = mk(p => { p.rect(0, 0, 16, 16, '#b8b0a0'); for (const y of [0, 8]) p.rect(0, y, 16, 1, '#968e7e'); p.rect(5, 0, 1, 8, '#968e7e'); p.rect(11, 8, 1, 8, '#968e7e'); p.px(2, 3, '#ccc4b4'); p.px(13, 11, '#ccc4b4'); });
  TILES.c = mk(p => { p.rect(0, 0, 16, 16, '#b83a3a'); p.rect(1, 0, 1, 16, '#e0b040'); p.rect(14, 0, 1, 16, '#e0b040'); for (let y = 2; y < 16; y += 4) p.px(8, y, '#d86060'); });
  TILES.i = mk(p => { p.rect(0, 0, 16, 16, '#dcf2fc'); p.line(1, 12, 9, 4, '#ffffff'); p.line(8, 15, 15, 8, '#ffffff'); p.px(4, 3, '#b8e0f4'); p.px(12, 2, '#b8e0f4'); });
  TILES.m = mk(p => { wood(p); p.rect(1, 2, 14, 12, '#2a6a3a'); p.rect(2, 3, 12, 10, '#3a8a4a'); for (let x = 3; x < 13; x += 2) p.rect(x, 5, 1, 6, '#2a6a3a'); });
  const wall = p => { p.rect(0, 0, 16, 16, '#eadfc8'); for (let x = 0; x < 16; x += 4) p.rect(x, 0, 1, 12, '#ddd0b4'); p.rect(0, 12, 16, 4, '#8a6a4a'); p.rect(0, 12, 16, 1, '#6a4a2a'); };
  TILES.w = mk(wall);
  TILES.W = mk(p => { wall(p); p.rect(3, 2, 10, 8, '#6a4a2a'); p.rect(4, 3, 8, 6, '#8cc4f0'); p.tri(4, 9, 8, 4, 12, 9, '#7a8a9a'); p.tri(7, 6, 8, 4, 9, 6, '#ffffff'); p.rect(4, 8, 8, 1, '#5aa04a'); });
  TILES.q = mk(p => { wood(p); p.rect(0, 2, 16, 12, '#6a4028'); p.rect(0, 2, 16, 4, '#9a6a42'); p.rect(0, 5, 16, 1, '#4a2a18'); });
  TILES.b = mk(p => { p.rect(0, 0, 16, 16, '#6a4028'); for (const y of [2, 8]) { p.rect(1, y, 14, 5, '#3a2414'); const cols = ['#c04040', '#4060c0', '#40a060', '#e0c040', '#a050a0']; for (let x = 1; x < 15; x += 2) p.rect(x, y + (x % 3 === 0 ? 1 : 0), 2, 5 - (x % 3 === 0 ? 1 : 0), cols[(x + y) % 5]); } p.rect(0, 14, 16, 2, '#4a2a18'); });
  TILES.v = mk(p => { p.rect(0, 0, 16, 16, '#d8d8e0'); for (const y of [3, 10]) { p.rect(0, y + 4, 16, 1, '#8a8a9a'); for (let x = 1; x < 16; x += 4) { p.ell(x + 1.5, y + 2, 1.6, 1.6, x % 8 === 1 ? '#2a8a4a' : '#d04050'); p.px(x + 1, y + 1, '#ffffff'); } } });
  TILES.t = mk(p => { wood(p); p.rect(1, 3, 14, 9, '#7a4a2a'); p.rect(1, 3, 14, 7, '#a06a3a'); p.rect(2, 12, 2, 3, '#5a3a1a'); p.rect(12, 12, 2, 3, '#5a3a1a'); });
  TILES.p = mk(p => { wood(p); p.rect(5, 10, 6, 5, '#b0603a'); p.rect(4, 10, 8, 1, '#8a4a2a'); p.ball(8, 6, 5, 4.5, '#3a9a3a'); p.ball(5, 8, 2.5, 2, '#4aaa4a'); p.ball(11, 8, 2.5, 2, '#4aaa4a'); });
  TILES.e = mk(p => { wood(p); p.rect(1, 1, 14, 15, '#6a4028'); p.rect(2, 2, 12, 13, '#f4f4f4'); p.rect(3, 3, 10, 3, '#ffffff'); p.rect(2, 7, 12, 8, '#c84a4a'); p.rect(2, 7, 12, 1, '#a83a3a'); });
  TILES.x = mk(p => { p.rect(0, 0, 16, 16, '#b8b0a0'); p.rect(0, 4, 16, 3, '#5a3a22'); p.rect(0, 7, 16, 5, '#7a5030'); p.rect(1, 12, 2, 3, '#4a2a18'); p.rect(13, 12, 2, 3, '#4a2a18'); });
  TILES.a = mk(p => { p.rect(0, 0, 16, 16, '#b8b0a0'); p.rect(0, 4, 16, 11, '#f4f0e4'); p.rect(0, 4, 16, 2, '#e0c040'); p.rect(3, 0, 2, 4, '#f4f0d0'); p.rect(11, 0, 2, 4, '#f4f0d0'); p.px(3, 0, '#f0a020'); p.px(12, 0, '#f0a020'); p.rect(7, 7, 2, 6, '#e0c040'); p.rect(5, 9, 6, 2, '#e0c040'); });
  TILES.o = mk(p => { wood(p); p.ell(8, 9, 6.5, 6.5, '#8a5a2a'); for (const x of [4, 8, 12]) p.rect(x, 3, 1, 12, '#6a4020'); p.rect(2, 6, 13, 1, '#4a4a4a'); p.rect(2, 12, 13, 1, '#4a4a4a'); });
  TILES.g = mk(p => { p.rect(0, 0, 16, 16, '#d4dce8'); p.rect(1, 1, 14, 14, '#9aa4b4'); p.rect(2, 2, 12, 5, '#2a3a4a'); p.rect(3, 3, 10, 3, '#40d080'); for (let x = 3; x < 14; x += 4) { p.ell(x + 1, 11, 1.6, 1.6, '#e04848'); p.px(x + 1, 12, '#ffffff'); } });
  TILES.z = mk(p => { wood(p); p.rect(1, 2, 14, 13, '#3a3a40'); p.rect(2, 3, 12, 4, '#5a5a62'); p.rect(4, 9, 8, 5, '#202024'); p.rect(5, 11, 6, 3, '#f08030'); p.px(7, 10, '#f0d040'); });
  TILES.l = mk(p => { p.rect(0, 0, 16, 16, '#b8b0a0'); p.rect(3, 0, 10, 16, '#d8d0c0'); p.rect(3, 0, 2, 16, '#ece4d4'); p.rect(11, 0, 2, 16, '#a8a090'); p.rect(2, 0, 12, 2, '#c8c0b0'); p.rect(2, 14, 12, 2, '#c8c0b0'); });
}

// Parte inferior de la hierba alta (se pinta encima del personaje)
let TALL_OVERLAY = null;
function makeOverlay() {
  const p = new PB(16, 16);
  for (let k = 0; k < 4; k++) {
    const x0 = k * 4;
    p.tri(x0 - 1, 16, x0 + 2, 9, x0 + 5, 16, '#2f7d2c');
    p.tri(x0 + 0.5, 16, x0 + 2, 11, x0 + 3.5, 16, '#4fa23c');
  }
  TALL_OVERLAY = p.canvas();
}

// ---------------- Personajes ----------------
const charCache = new Map();
// pal: [gorro/pelo, camiseta, pantalón]
function charSprite(pal, dir, frame) {
  const key = pal.join() + dir + frame;
  if (charCache.has(key)) return charCache.get(key);
  const [hat, shirt, pants] = pal;
  const skin = '#f4c8a0', p = new PB(16, 16);
  const side = dir === 'left' || dir === 'right';
  // piernas
  if (!side) {
    const l = frame === 1 ? 1 : 0, r = frame === 2 ? 1 : 0;
    p.rect(5, 12, 2, 3 - l, pants); p.rect(9, 12, 2, 3 - r, pants);
    p.rect(5, 14 - l, 2, 1, '#3a2a20'); p.rect(9, 14 - r, 2, 1, '#3a2a20');
  } else {
    const o = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    p.rect(6 + o, 12, 2, 3, pants); p.rect(8 - o, 12, 2, 3, shade(pants, 0.8));
    p.rect(6 + o, 14, 2, 1, '#3a2a20'); p.rect(8 - o, 14, 2, 1, '#3a2a20');
  }
  // cuerpo
  p.rect(4, 8, 8, 4, shirt); p.rect(4, 11, 8, 1, shade(shirt, 0.8));
  if (!side) { p.rect(3, 8, 1, 3, shirt); p.rect(12, 8, 1, 3, shirt); p.px(3, 11, skin); p.px(12, 11, skin); }
  else { const o = frame === 1 ? 1 : frame === 2 ? -1 : 0; p.rect(7 + o, 9, 2, 2, shade(shirt, 0.85)); p.rect(7 + o, 11, 2, 1, skin); }
  // cabeza
  p.rect(4, 2, 8, 6, skin);
  p.rect(4, 1, 8, 3, hat); p.rect(5, 0, 6, 1, hat);
  if (dir === 'up') { p.rect(4, 2, 8, 6, hat); p.rect(4, 7, 8, 1, shade(hat, 0.8)); }
  else if (dir === 'down') {
    p.rect(3, 3, 10, 1, shade(hat, 0.8));
    p.rect(6, 5, 1, 2, '#202020'); p.rect(9, 5, 1, 2, '#202020');
    p.px(4, 4, hat); p.px(11, 4, hat);
  } else {
    p.rect(4, 3, 9, 1, shade(hat, 0.8));
    p.rect(4, 4, 3, 3, hat);
    p.rect(10, 5, 1, 2, '#202020');
  }
  let cv = p.canvas('#1c1c24');
  if (dir === 'left') {
    const f = document.createElement('canvas'); f.width = 16; f.height = 16;
    const c = f.getContext('2d'); c.translate(16, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0); cv = f;
  }
  charCache.set(key, cv);
  return cv;
}

// Oscaball
function makeBallSprite(size = 8) {
  const p = new PB(size, size), c = size / 2;
  p.ell(c, c, c - 0.5, c - 0.5, '#f4f4f4');
  for (let y = 0; y < c; y++) for (let x = 0; x < size; x++) if (p.get(x, y)) p.px(x, y, '#2a8a4a');
  p.rect(0, Math.floor(c) - 0, size, 1, '#202020');
  p.rect(Math.floor(c) - 1, Math.floor(c) - 1, 2, 2, '#f4f4f4');
  return p.canvas('#202020');
}

// ---------------- Oscamon ----------------
const MON_DRAW = {
  parrillin(p) {
    p.tri(10, 13, 16, 1, 22, 13, '#e83820'); p.tri(12, 13, 16, 5, 20, 13, '#ffcc20');
    p.ball(16, 20, 9, 8, '#f08a30');
    p.ell(16, 23, 5, 4.5, '#ffd88a');
    for (const x of [13, 16, 19]) p.rect(x, 20, 1, 6, '#9a4a1a');
    p.rect(12, 21, 9, 1, '#9a4a1a');
    p.rect(12, 16, 2, 3, '#202020'); p.rect(18, 16, 2, 3, '#202020'); p.px(12, 16, '#fff'); p.px(18, 16, '#fff');
    p.ell(10, 28, 3, 2, '#c86a20'); p.ell(22, 28, 3, 2, '#c86a20');
  },
  laurenton(p) {
    p.tri(5, 14, 16, 0, 27, 14, '#d02010'); p.tri(9, 14, 16, 3, 23, 14, '#ff9a20'); p.tri(12, 14, 16, 7, 20, 14, '#5fd060');
    p.ball(5, 19, 3, 5, '#c04020'); p.ball(27, 19, 3, 5, '#c04020');
    p.ball(16, 19, 11, 10, '#d84a24');
    p.ell(16, 23, 6.5, 5.5, '#ffc870');
    for (const x of [12, 15, 18, 21]) p.rect(x, 19, 1, 9, '#8a3010');
    p.rect(11, 22, 11, 1, '#8a3010');
    p.rect(10, 14, 3, 3, '#202020'); p.rect(19, 14, 3, 3, '#202020'); p.px(10, 14, '#fff'); p.px(19, 14, '#fff');
    p.line(9, 12, 13, 13, '#5a1a0a'); p.line(23, 12, 19, 13, '#5a1a0a');
    p.ell(10, 29, 4, 2, '#a83a18'); p.ell(22, 29, 4, 2, '#a83a18');
  },
  isuelin(p) {
    p.tri(23, 20, 31, 12, 31, 28, '#3468c0');
    p.tri(11, 14, 17, 7, 20, 15, '#3468c0');
    p.ball(15, 20, 11, 7, '#4a94e4');
    p.ell(14, 24, 8, 2.5, '#d4ecff');
    p.rect(8, 17, 3, 3, '#ffffff'); p.rect(8, 18, 2, 2, '#101828');
    p.rect(5, 22, 3, 1, '#20406a');
    p.tri(14, 26, 17, 31, 19, 25, '#3468c0');
  },
  isuelon(p) {
    p.tri(24, 18, 31, 7, 31, 29, '#21468e');
    for (const x of [8, 13, 18]) p.tri(x, 12, x + 3, 3, x + 6, 12, '#4ad0e0');
    p.ball(15, 19, 13, 9, '#2a5cb8');
    p.ell(14, 24, 10, 3.5, '#c4e4ff');
    p.rect(6, 15, 4, 4, '#ffffff'); p.rect(6, 16, 3, 3, '#a01818'); p.px(6, 16, '#fff');
    p.line(5, 14, 10, 14, '#101828');
    p.rect(3, 22, 5, 1, '#101828'); p.px(4, 23, '#fff'); p.px(6, 23, '#fff');
    p.tri(12, 27, 16, 31, 20, 26, '#21468e');
  },
  somontin(p) {
    p.rect(16, 4, 1, 6, '#6b4a20');
    p.ball(20, 5, 5, 3, '#4caf50'); p.line(17, 5, 23, 5, '#2e7d32');
    const g = '#7a3aa0';
    for (const [x, y] of [[11, 12], [16, 11], [21, 12], [9, 17], [14, 17], [19, 17], [23, 17], [12, 22], [17, 22], [21, 22], [15, 27]])
      p.ball(x, y, 3.6, 3.6, g);
    p.ball(16, 18, 6.5, 6, '#8e4ab8');
    p.rect(13, 16, 2, 3, '#ffffff'); p.rect(18, 16, 2, 3, '#ffffff'); p.rect(14, 17, 1, 2, '#101010'); p.rect(19, 17, 1, 2, '#101010');
    p.rect(15, 21, 3, 1, '#40104a');
  },
  somontazo(p) {
    p.line(4, 10, 8, 18, '#6b4a20'); p.line(28, 10, 24, 18, '#6b4a20');
    p.ball(4, 8, 4, 3, '#4caf50'); p.ball(28, 8, 4, 3, '#4caf50');
    p.ball(16, 4, 7, 3.5, '#3e9a42'); p.line(10, 4, 22, 4, '#2e7d32');
    for (const [x, y] of [[9, 11], [16, 9], [23, 11], [7, 17], [13, 15], [19, 15], [25, 17], [9, 23], [15, 21], [21, 21], [23, 26], [10, 28], [16, 27]])
      p.ball(x, y, 4.2, 4.2, '#5e2884');
    p.ball(16, 18, 8, 7, '#7a3aa0');
    p.rect(12, 15, 3, 3, '#ffffff'); p.rect(18, 15, 3, 3, '#ffffff'); p.rect(13, 16, 2, 2, '#101010'); p.rect(19, 16, 2, 2, '#101010');
    p.line(11, 13, 14, 14, '#2a0a3a'); p.line(21, 13, 18, 14, '#2a0a3a');
    p.rect(14, 21, 5, 1, '#2a0a3a');
  },
  quebranto(p) {
    p.ball(7, 17, 7, 5, '#4e3828'); p.ball(25, 17, 7, 5, '#4e3828');
    for (const x of [1, 4, 7]) p.rect(x, 20, 2, 4, '#3a2618');
    for (const x of [23, 26, 29]) p.rect(x, 20, 2, 4, '#3a2618');
    p.ball(16, 20, 6, 8, '#6b4a33');
    p.ell(16, 23, 3.5, 4, '#e0a060');
    p.ball(16, 9, 5, 5, '#ecc890');
    p.rect(13, 8, 2, 2, '#e03020'); p.rect(18, 8, 2, 2, '#e03020'); p.px(13, 8, '#101010'); p.px(19, 8, '#101010');
    p.tri(14.5, 11, 17.5, 11, 16, 15, '#3a3a3a');
    p.rect(15, 15, 2, 2, '#202020');
    p.rect(13, 27, 2, 3, '#7a7a7a'); p.rect(18, 27, 2, 3, '#7a7a7a');
  },
  cierzin(p) {
    p.tri(24, 22, 31, 25, 25, 26, '#c0e4f4'); p.tri(2, 13, 8, 15, 7, 17, '#c0e4f4');
    p.ball(16, 18, 11, 8, '#d8f4ff');
    p.ball(10, 14, 6, 5, '#e4f8ff'); p.ball(21, 12, 6, 5, '#e4f8ff');
    p.line(9, 20, 14, 23, '#88b8d0'); p.line(14, 23, 21, 21, '#88b8d0'); p.line(21, 21, 22, 17, '#88b8d0');
    p.line(10, 12, 13, 11, '#88b8d0');
    p.rect(12, 15, 2, 3, '#28506a'); p.rect(18, 15, 2, 3, '#28506a');
    p.rect(15, 19, 2, 1, '#28506a');
  },
  mallorroc(p) {
    p.ball(9, 20, 5, 10, '#b85a34'); p.ball(24, 21, 4.5, 9, '#b85a34');
    p.ball(16, 16, 6, 13, '#cc6a40');
    for (const [x, y] of [[8, 17], [24, 19], [14, 10], [18, 22]]) p.rect(x, y, 1, 5, '#8e3e20');
    p.ell(16, 4, 4, 1.5, '#4caf50'); p.ell(9, 10.5, 2.5, 1.2, '#4caf50');
    p.rect(13, 13, 2, 3, '#ffe060'); p.rect(18, 13, 2, 3, '#ffe060'); p.px(14, 14, '#202020'); p.px(18, 14, '#202020');
    p.rect(14, 19, 5, 1, '#5a2410');
  },
  albahaquin(p) {
    p.rect(9, 22, 14, 2, '#a04a20');
    p.tri(10, 24, 22, 24, 20.5, 31, '#c8642c'); p.tri(10, 24, 11.5, 31, 20.5, 31, '#c8642c');
    p.rect(12, 26, 8, 1, '#e08a50');
    p.ball(16, 14, 10, 8, '#3f9f3f');
    for (const [x, y] of [[9, 9], [16, 7], [23, 10], [8, 16], [24, 17], [12, 20], [20, 20]]) p.ball(x, y, 3.5, 2.5, '#5cc05c');
    p.rect(12, 13, 2, 3, '#102010'); p.rect(18, 13, 2, 3, '#102010'); p.px(12, 13, '#fff'); p.px(18, 13, '#fff');
    p.line(14, 18, 15, 19, '#102010'); p.line(16, 19, 17, 18, '#102010');
    p.px(11, 17, '#ff9aa0'); p.px(20, 17, '#ff9aa0');
  },
  trenzon(p) {
    const pts = [[26, 27], [21, 28], [16, 27], [11, 25], [8, 21], [10, 17], [15, 15], [20, 13], [22, 9]];
    pts.forEach(([x, y], i) => p.ball(x, y, 4, 3.2, i % 2 ? '#c88a38' : '#e0aa58'));
    for (const [x, y] of [[21, 27], [11, 24], [15, 14], [26, 26], [9, 20]]) p.px(x, y, '#ffffff');
    p.ball(22, 7, 5, 4, '#e8b868');
    p.rect(20, 5, 2, 2, '#202020'); p.rect(24, 5, 2, 2, '#202020');
    p.line(27, 9, 29, 10, '#e03040'); p.px(29, 11, '#e03040');
    p.px(17, 26, '#6a3a1a'); p.px(12, 22, '#6a3a1a'); p.px(18, 15, '#6a3a1a');
  },
  ranisuela(p) {
    p.ball(7, 26, 5, 3, '#3c9440'); p.ball(25, 26, 5, 3, '#3c9440');
    p.ball(16, 21, 11, 7, '#4cb050');
    p.ell(16, 24, 7, 3.5, '#d8f0a0');
    p.ball(10, 13, 4, 4, '#4cb050'); p.ball(22, 13, 4, 4, '#4cb050');
    p.ell(10, 13, 2.5, 2.5, '#ffffff'); p.ell(22, 13, 2.5, 2.5, '#ffffff');
    p.rect(10, 12, 2, 3, '#101010'); p.rect(21, 12, 2, 3, '#101010');
    p.line(10, 20, 22, 20, '#1e5a22');
    p.px(12, 17, '#2a7a2e'); p.px(19, 17, '#2a7a2e');
  },
  sarrion(p) {
    for (const x of [12, 15, 21, 24]) { p.rect(x, 22, 2, 7, '#7a5530'); p.rect(x, 28, 2, 1, '#202020'); }
    p.ball(19, 19, 9, 5.5, '#b08050');
    p.ell(19, 21, 6, 2, '#d8b888');
    p.ball(10, 14, 4, 4, '#a07040');
    p.ball(8, 10, 4, 5, '#ecdcb4');
    p.rect(6, 7, 1, 7, '#202020'); p.rect(10, 7, 1, 7, '#202020');
    p.rect(6, 2, 1, 5, '#2a2a2a'); p.rect(9, 2, 1, 5, '#2a2a2a'); p.px(5, 2, '#2a2a2a'); p.px(8, 2, '#2a2a2a');
    p.px(7, 10, '#101010'); p.px(9, 10, '#101010');
    p.rect(7, 14, 2, 1, '#3a2a1a');
    p.tri(27, 16, 30, 14, 28, 19, '#7a5530');
  },
  danzante(p) {
    p.line(3, 8, 9, 25, '#8a5a2a'); p.line(29, 8, 23, 25, '#8a5a2a');
    p.ball(16, 21, 8, 9, '#f4f4f4');
    p.rect(8, 18, 16, 3, '#d02030'); p.tri(19, 21, 24, 21, 23, 27, '#d02030');
    p.ball(16, 9, 5.5, 5.5, '#f2c8a0');
    p.rect(10, 3, 12, 3, '#d02030');
    for (const x of [11, 15, 19]) p.px(x, 4, '#202020');
    p.rect(13, 8, 2, 2, '#202020'); p.rect(18, 8, 2, 2, '#202020');
    p.rect(15, 12, 3, 1, '#a04040');
    p.ell(7, 18, 2, 2, '#f2c8a0'); p.ell(25, 18, 2, 2, '#f2c8a0');
    p.rect(11, 29, 3, 2, '#202020'); p.rect(19, 29, 3, 2, '#202020');
  },
  campanon(p) {
    p.rect(14, 1, 4, 4, '#8a6a20'); p.rect(15, 2, 2, 2, null);
    p.ball(16, 11, 8, 7, '#c8902a');
    for (let y = 11; y <= 24; y++) { const hw = 8 + (y - 11) * 0.45; p.rect(Math.round(16 - hw), y, Math.round(hw * 2), 1, y > 20 ? '#a8701a' : '#c8902a'); }
    p.rect(9, 12, 2, 10, '#e8b850');
    p.ell(16, 25, 12, 2.5, '#8a5a10');
    p.ball(16, 28, 3, 3, '#5a5a5a');
    p.rect(11, 13, 3, 3, '#ffe040'); p.rect(18, 13, 3, 3, '#ffe040'); p.px(12, 14, '#802000'); p.px(19, 14, '#802000');
    p.line(10, 11, 14, 12, '#5a3a08'); p.line(22, 11, 18, 12, '#5a3a08');
    p.rect(13, 18, 6, 1, '#5a3a08');
  },
  arminin(p) {
    p.tri(25, 20, 31, 15, 30, 22, '#f4f8fc'); p.ball(30, 16, 2, 2, '#202028');
    for (const x of [12, 15, 21, 24]) p.rect(x, 23, 2, 5, '#e4ecf4');
    p.ball(18, 20, 10, 5, '#f4f8fc');
    p.ell(18, 23, 7, 1.5, '#d8e4f0');
    p.ball(9, 14, 5.5, 5, '#f8fbff');
    p.ell(5, 9, 2, 2.5, '#f8fbff'); p.ell(12, 9, 2, 2.5, '#f8fbff'); p.px(5, 9, '#f0b0c0'); p.px(12, 9, '#f0b0c0');
    p.rect(6, 13, 2, 2, '#101018'); p.rect(11, 13, 2, 2, '#101018'); p.px(6, 13, '#fff');
    p.rect(8, 16, 2, 1, '#e07080');
    p.line(3, 16, 6, 16, '#a8b8c8'); p.line(12, 16, 15, 16, '#a8b8c8');
  },
  nevero(p) {
    p.line(4, 12, 10, 18, '#7a5030'); p.line(28, 12, 22, 18, '#7a5030'); p.px(4, 11, '#7a5030'); p.px(28, 11, '#7a5030');
    p.ball(16, 23, 12, 7.5, '#eaf4ff');
    p.ball(16, 12, 7, 6, '#f4f9ff');
    for (const [x, y] of [[9, 25], [22, 21], [14, 27], [20, 26]]) p.px(x, y, '#c4d8ee');
    p.rect(13, 10, 2, 2, '#202830'); p.rect(18, 10, 2, 2, '#202830');
    p.tri(15, 13, 18, 13, 16.5, 17, '#f08a30');
    for (const y of [20, 24]) p.rect(15, y, 2, 2, '#4a6a8a');
    p.ell(16, 6, 5, 1.5, '#5a9ad8'); p.rect(13, 3, 6, 3, '#5a9ad8'); p.rect(13, 4, 6, 1, '#f4f4f4');
  },
  aneton(p) {
    p.ball(5, 19, 4, 6, '#7c7c8a'); p.ball(27, 19, 4, 6, '#7c7c8a');
    p.ball(16, 19, 11, 10, '#8c8c9a');
    p.ell(16, 10, 10, 3.5, '#f4f9ff');
    for (const [x, y, h] of [[8, 9, 7], [13, 8, 9], [19, 8, 9], [24, 9, 7]]) p.tri(x - 2, y, x, y - h, x + 2, y, '#a8e8ff');
    p.tri(2, 15, 4, 8, 6, 15, '#a8e8ff'); p.tri(26, 15, 28, 8, 30, 15, '#a8e8ff');
    p.line(10, 22, 14, 26, '#6a6a78'); p.line(20, 21, 23, 25, '#6a6a78');
    p.rect(11, 15, 3, 3, '#5ae0ff'); p.rect(18, 15, 3, 3, '#5ae0ff'); p.px(12, 16, '#ffffff'); p.px(19, 16, '#ffffff');
    p.rect(13, 21, 6, 1, '#3a3a48');
    p.rect(9, 28, 4, 2, '#6a6a78'); p.rect(19, 28, 4, 2, '#6a6a78');
  },
  marmotin(p) {
    p.ball(16, 21, 10, 8, '#a07850');
    p.ell(16, 24, 6, 4, '#d8b890');
    p.ball(16, 11, 7, 6, '#a88058');
    p.ell(10, 6, 2, 2, '#7a5a3a'); p.ell(22, 6, 2, 2, '#7a5a3a');
    p.ell(16, 13, 4, 2.5, '#d8c0a0');
    p.rect(12, 9, 2, 2, '#202020'); p.rect(18, 9, 2, 2, '#202020'); p.px(12, 9, '#fff');
    p.rect(15, 12, 2, 1, '#3a2a1a'); p.rect(15, 14, 1, 2, '#fff'); p.rect(16, 14, 1, 2, '#fff');
    p.ell(8, 20, 2, 3, '#8a6040'); p.ell(24, 20, 2, 3, '#8a6040');
    p.ell(11, 29, 3, 1.5, '#6a4a2a'); p.ell(21, 29, 3, 1.5, '#6a4a2a');
  },
  truchon(p) {
    p.tri(23, 18, 31, 10, 31, 26, '#6a7a5a');
    p.tri(12, 12, 18, 6, 20, 13, '#6a7a5a');
    p.ball(14, 18, 12, 6, '#8a9a6a');
    p.ell(13, 21, 9, 2.5, '#e8e0c0');
    p.rect(4, 17, 20, 1, '#d890a0');
    for (const [x, y] of [[9, 14], [13, 13], [17, 14], [20, 16], [11, 16], [16, 16]]) p.px(x, y, '#2a2a1a');
    for (const [x, y] of [[12, 19], [18, 18]]) p.px(x, y, '#d04040');
    p.rect(5, 15, 3, 3, '#ffffff'); p.rect(5, 16, 2, 2, '#101010');
    p.tri(13, 23, 16, 29, 18, 22, '#6a7a5a');
    p.line(2, 20, 5, 20, '#3a3a2a');
  },
  almenazo(p) {
    p.rect(6, 12, 20, 16, '#b8a888');
    for (const x of [6, 14, 22]) p.rect(x, 5, 4, 7, '#b8a888');
    for (let y = 14; y < 28; y += 4) p.rect(6, y, 20, 1, '#8a7a60');
    for (let y = 12; y < 28; y += 8) { p.rect(12, y, 1, 4, '#8a7a60'); p.rect(20, y + 4, 1, 4, '#8a7a60'); }
    p.rect(9, 15, 3, 4, '#1a1a1a'); p.rect(20, 15, 3, 4, '#1a1a1a'); p.px(10, 16, '#f0d040'); p.px(21, 16, '#f0d040');
    p.rect(13, 22, 6, 6, '#3a2a1a');
    p.ell(8, 4, 2, 1, '#4caf50');
    p.rect(4, 26, 4, 3, '#8a7a60'); p.rect(24, 26, 4, 3, '#8a7a60');
  },
  bucardo(p) {
    p.line(6, 4, 2, 12, '#5a4a3a'); p.line(7, 4, 3, 13, '#5a4a3a'); p.line(10, 3, 14, 10, '#5a4a3a'); p.line(11, 3, 15, 11, '#5a4a3a');
    p.line(2, 12, 4, 15, '#5a4a3a'); p.line(14, 10, 12, 13, '#5a4a3a');
    for (const x of [12, 15, 22, 25]) { p.rect(x, 22, 2, 7, '#6a5038'); p.rect(x, 28, 2, 1, '#202020'); }
    p.ball(19, 19, 10, 6, '#8a6a48');
    p.ell(19, 22, 7, 2, '#c8b090');
    p.ball(10, 14, 4.5, 5, '#7a5a3a');
    p.ell(9, 18, 2, 3, '#4a3a2a');
    p.rect(8, 12, 2, 2, '#a8e8ff'); p.rect(12, 12, 2, 2, '#a8e8ff');
    for (const [x, y] of [[20, 13], [26, 15], [16, 15]]) p.px(x, y, '#e8f4ff');
    p.tri(28, 16, 31, 14, 29, 20, '#6a5038');
  },
  fogaril(p) {
    p.rect(6, 22, 20, 8, '#5a5a62'); p.rect(6, 22, 20, 2, '#7a7a82');
    p.tri(8, 22, 16, 4, 24, 22, '#e83820'); p.tri(11, 22, 16, 9, 21, 22, '#ffb020'); p.tri(13, 22, 16, 14, 19, 22, '#fff060');
    p.rect(12, 16, 2, 3, '#202020'); p.rect(18, 16, 2, 3, '#202020'); p.px(12, 16, '#fff'); p.px(18, 16, '#fff');
    p.rect(14, 20, 4, 1, '#802000');
    for (const x of [8, 13, 18, 23]) p.rect(x, 26, 3, 2, '#7a4a2a');
  },
  antorchon(p) {
    p.rect(12, 14, 8, 16, '#8a7a60'); p.rect(12, 14, 2, 16, '#a89878');
    for (let y = 17; y < 30; y += 4) p.rect(12, y, 8, 1, '#6a5a40');
    p.rect(9, 12, 14, 3, '#5a4a30');
    p.tri(9, 12, 16, -2, 23, 12, '#e83820'); p.tri(11, 12, 16, 2, 21, 12, '#ffb020'); p.tri(13, 12, 16, 6, 19, 12, '#fff060');
    p.rect(13, 19, 2, 2, '#ffe060'); p.rect(17, 19, 2, 2, '#ffe060');
    p.rect(5, 18, 7, 2, '#8a7a60'); p.rect(20, 18, 7, 2, '#8a7a60');
    p.rect(14, 23, 4, 1, '#3a2a1a');
  },
  buitron(p) {
    p.ball(6, 15, 7, 5, '#7a5a3a'); p.ball(26, 15, 7, 5, '#7a5a3a');
    for (const x of [0, 3, 6]) p.rect(x, 18, 2, 5, '#4a3020');
    for (const x of [24, 27, 30]) p.rect(x, 18, 2, 5, '#4a3020');
    p.ball(16, 20, 7, 8, '#a07850');
    p.ell(16, 13, 5, 2.5, '#f0e8d8');
    p.ball(16, 8, 4, 4, '#e8dcc8');
    p.rect(13, 7, 2, 2, '#202020'); p.rect(18, 7, 2, 2, '#202020'); p.px(13, 7, '#e0a020');
    p.tri(14.5, 10, 17.5, 10, 16, 14, '#e8c060');
    p.rect(13, 27, 2, 3, '#8a8a8a'); p.rect(18, 27, 2, 3, '#8a8a8a');
  },
  bayardo(p) {
    p.ball(20, 12, 7, 4, '#cfe4ff'); p.tri(15, 11, 28, 4, 25, 13, '#e8f2ff');
    for (const x of [13, 16, 23, 26]) { p.rect(x, 22, 2, 7, '#e4e4ec'); p.rect(x, 28, 2, 2, '#5a5a6a'); }
    p.tri(26, 16, 31, 26, 28, 16, '#3a5ad0');
    p.ball(19, 19, 9, 5.5, '#f4f4f8');
    p.tri(6, 13, 12, 8, 14, 18, '#f4f4f8');
    p.ball(7, 9, 3.5, 5, '#f4f4f8');
    p.tri(8, 3, 14, 4, 12, 16, '#3a5ad0');
    p.rect(6, 2, 1, 3, '#d8d8e0');
    p.rect(6, 8, 2, 2, '#202040'); p.px(4, 12, '#5a5a6a');
  },
};

const monCache = new Map();
function monSprite(sp, back = false) {
  const key = sp + (back ? 'b' : 'f');
  if (monCache.has(key)) return monCache.get(key);
  const p = new PB(32, 32);
  MON_DRAW[sp](p);
  let cv = p.canvas('#181820');
  if (back) {
    const f = document.createElement('canvas'); f.width = 32; f.height = 32;
    const c = f.getContext('2d'); c.translate(32, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0); cv = f;
  }
  monCache.set(key, cv);
  return cv;
}

function monIconURL(sp) {
  const key = sp + 'url';
  if (monCache.has(key)) return monCache.get(key);
  const url = monSprite(sp).toDataURL();
  monCache.set(key, url);
  return url;
}

// ---------------- Edificios ----------------
function drawBuilding(ctx, b, sx, sy) {
  const W = b.w * 16, H = b.h * 16;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(sx + x, sy + y, w, h); };
  const T = (txt, x, y, c, size = 5) => {
    ctx.font = `${size}px "Press Start 2P", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = c; ctx.fillText(txt, sx + x, sy + y); ctx.textAlign = 'left';
  };
  const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, sx + x, sy + y)); ctx.closePath(); ctx.fill(); };
  const circ = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + x, sy + y, r, 0, Math.PI * 2); ctx.fill(); };
  const doorX = b.door * 16;
  const win = (x, y, w = 8, h = 7, glass = '#7fb0e6') => { R(x - 1, y - 1, w + 2, h + 2, '#f4f0e8'); R(x, y, w, h, glass); R(x + w / 2 - 0.5, y, 1, h, '#f4f0e8'); R(x, y + h / 2 - 0.5, w, 1, '#f4f0e8'); };
  const door = (c = '#7a4a2a') => { R(doorX + 3, H - 13, 10, 13, '#3a2a1a'); R(doorX + 4, H - 12, 8, 12, c); R(doorX + 10, H - 6, 1, 1, '#f0d060'); };
  const house = (wall, roof) => {
    const rh = Math.round(H * 0.45);
    R(0, 0, W, rh, roof);
    for (let y = 3; y < rh; y += 4) R(0, y, W, 1, shade(roof, 0.82));
    R(0, rh - 2, W, 2, shade(roof, 0.6));
    R(1, rh, W - 2, H - rh, wall); R(1, H - 2, W - 2, 2, shade(wall, 0.8));
    for (let i = 0; i < b.w; i++) if (i !== b.door) win(i * 16 + 4, rh + 4);
    return rh;
  };
  const outline = () => { ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, W - 1, H - 1); };

  switch (b.kind) {
    case 'house': {
      const [wall, roof] = b.colors || ['#f0e0c0', '#c05a3a'];
      house(wall, roof);
      if (b.style === 'pirineo') {          // chimenea troncocónica
        const cx = W - 11;
        poly([[cx, 12], [cx + 7, 12], [cx + 6, 2], [cx + 1, 2]], '#c4baa6');
        R(cx, 0, 7, 3, '#4a5060'); R(cx + 2, 3, 3, 1, '#8a8276');
      } else if (b.style === 'monegros') {
        R(W - 9, 2, 4, 6, shade(roof, 0.8));
      }
      door(); outline(); break;
    }
    case 'bakery': {
      // Panadería de Ayerbe: toldo de rayas y pan en el escaparate
      house('#f4e4c0', '#b8503a');
      R(0, 20, W, 7, '#f4f4f4'); for (let x = 0; x < W; x += 6) R(x, 20, 3, 7, '#c83838');
      for (let x = 0; x < W; x += 6) { ctx.fillStyle = x % 12 ? '#c83838' : '#f4f4f4'; ctx.beginPath(); ctx.arc(sx + x + 3, sy + 27, 3, 0, Math.PI); ctx.fill(); }
      R(3, 31, 12, 8, '#7fb0e6'); ctx.fillStyle = '#d8a050'; ctx.beginPath(); ctx.ellipse(sx + 9, sy + 37, 5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      R(2, 1, W - 4, 8, '#6a3a1a'); T('PAN', W / 2, 2.5, '#f4e4a0');
      door('#7a4a2a'); outline(); break;
    }
    case 'center': {
      house('#f8f8f8', '#e04848');
      circ(W / 2, 11, 7, '#f4f4f4'); ctx.fillStyle = '#e04848'; ctx.beginPath(); ctx.arc(sx + W / 2, sy + 11, 7, Math.PI, 0); ctx.fill();
      R(W / 2 - 7, 10.5, 14, 1, '#202020'); circ(W / 2, 11, 2, '#f4f4f4');
      R(4, 27, W - 8, 9, '#e04848'); T('CENTRO', W / 2, 29, '#ffffff');
      R(doorX + 2, H - 14, 12, 14, '#2a5a7a'); R(doorX + 3, H - 13, 10, 13, '#8fd0f0'); R(doorX + 7.5, H - 13, 1, 13, '#2a5a7a');
      outline(); break;
    }
    case 'shop': {
      house('#f4f0e0', '#4878d0');
      R(3, 21, W - 6, 9, '#4878d0'); T('TIENDA', W / 2, 23, '#ffffff');
      R(doorX + 2, H - 14, 12, 14, '#2a3a6a'); R(doorX + 3, H - 13, 10, 13, '#8fd0f0');
      outline(); break;
    }
    case 'lab': {
      house('#e8eaf0', '#6a7a8c');
      R(W / 2 - 14, 22, 28, 9, '#2a4a6a'); T('LAB', W / 2, 24, '#ffffff');
      door('#5a6a7a'); outline(); break;
    }
    case 'casino': {
      if (b.id === 'casino') {
        // Círculo Oscense: palacete modernista con dos torreones rematados por cúpulas
        R(0, 10, W, H - 10, '#c87a5a');
        for (let y = 16; y < H; y += 8) R(0, y, W, 2, '#efe2c8');
        for (const tx of [0, W - 16]) {
          R(tx, 0, 16, H, '#d08a68'); R(tx, 14, 16, 2, '#efe2c8');
          ctx.fillStyle = '#4a8a7a'; ctx.beginPath(); ctx.arc(sx + tx + 8, sy + 6, 8, Math.PI, 0); ctx.fill();
          R(tx + 7, -4, 2, 4, '#3a6a5a'); R(tx + 5, 20, 6, 10, '#7fb0e6');
        }
        for (let i = 0; i < 3; i++) { const x = 22 + i * 13; if (Math.abs(x + 4 - (doorX + 8)) < 6) continue; R(x, 20, 8, 14, '#7fb0e6'); ctx.fillStyle = '#7fb0e6'; ctx.beginPath(); ctx.arc(sx + x + 4, sy + 20, 4, Math.PI, 0); ctx.fill(); }
        R(18, 34, W - 36, 2, '#3a3a3a');
        door('#5a3a2a'); outline(); break;
      }
      R(0, 6, W, H - 6, '#f0e8d4'); R(0, 6, W, 3, '#c8b890');
      ctx.fillStyle = '#4a9a7a'; ctx.beginPath(); ctx.arc(sx + W / 2, sy + 12, 10, Math.PI, 0); ctx.fill();
      R(W / 2 - 1, 0, 2, 3, '#3a7a5a');
      for (let i = 0; i < b.w; i++) if (i !== b.door) { R(i * 16 + 4, 16, 8, 14, '#7fb0e6'); ctx.fillStyle = '#f0e8d4'; ctx.beginPath(); ctx.arc(sx + i * 16 + 8, sy + 16, 4, Math.PI, 0); ctx.fill(); R(i * 16 + 3, 30, 10, 2, '#4a9a7a'); }
      door('#5a3a2a'); outline(); break;
    }
    case 'cathedral': {
      // Catedral de Huesca: torre a la izquierda, galería de arquillos bajo el alero
      // y portada gótica con arquivoltas protegida por un tejaroz de madera
      const st = '#d6c092', dk = '#b49c6c';
      R(22, 18, W - 22, H - 18, st);
      for (let y = 40; y < H; y += 7) R(22, y, W - 22, 1, shade(st, 0.93));
      R(20, 14, W - 20, 5, '#6a4628'); R(20, 18, W - 20, 1, '#4a2e18');
      for (let x = 26; x < W - 4; x += 7) { R(x, 22, 4, 9, '#3a3028'); ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(sx + x + 2, sy + 22, 2, Math.PI, 0); ctx.fill(); }
      R(22, 33, W - 22, 2, dk);
      // torre
      R(0, 6, 24, H - 6, shade(st, 1.04)); R(0, 6, 2, H - 6, dk); R(22, 6, 2, H - 6, dk);
      poly([[2, 6], [5, -2], [19, -2], [22, 6]], shade(st, 0.95)); R(4, -2, 16, 1, dk);
      for (const y of [10, 26]) { R(8, y, 8, 11, '#3a3028'); ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(sx + 12, sy + y, 4, Math.PI, 0); ctx.fill(); }
      R(0, 44, 24, 2, dk);
      // portada
      const px = doorX + 8;
      R(px - 26, 38, 52, 4, '#6a4628'); poly([[px - 28, 40], [px, 30], [px + 28, 40]], '#7a5232');
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k % 2 ? shade(st, 0.78) : shade(st, 0.94);
        ctx.beginPath(); const w = 34 - k * 5;
        ctx.moveTo(sx + px - w / 2, sy + H); ctx.lineTo(sx + px - w / 2, sy + 62 + k * 2);
        ctx.quadraticCurveTo(sx + px - w / 2, sy + 48 + k * 3, sx + px, sy + 44 + k * 3);
        ctx.quadraticCurveTo(sx + px + w / 2, sy + 48 + k * 3, sx + px + w / 2, sy + 62 + k * 2);
        ctx.lineTo(sx + px + w / 2, sy + H); ctx.fill();
      }
      for (let k = 0; k < 4; k++) { R(px - 16 + k * 2, 64, 1, 30, '#e8dcbc'); R(px + 15 - k * 2, 64, 1, 30, '#e8dcbc'); }
      R(px - 6, H - 18, 12, 18, '#5a3a22'); R(px - 0.5, H - 18, 1, 18, '#3a2414');
      for (const x of [34, W - 16]) { R(x, 50, 6, 14, '#3a5aa0'); ctx.fillStyle = '#3a5aa0'; ctx.beginPath(); ctx.arc(sx + x + 3, sy + 50, 3, Math.PI, 0); ctx.fill(); }
      ctx.strokeStyle = '#2a2a30'; ctx.strokeRect(sx + 22.5, sy + 14.5, W - 23, H - 15); ctx.strokeRect(sx + 0.5, sy + 6.5, 23, H - 7);
      break;
    }
    case 'sanpedro': {
      // San Pedro el Viejo: románico, torre hexagonal y crismón sobre la puerta
      const st = '#d2aa6c';
      R(20, 18, W - 20, H - 18, st);
      poly([[18, 20], [W / 2 + 10, 8], [W, 20]], '#b45a3a');
      for (let y = 26; y < H; y += 6) R(20, y, W - 20, 1, shade(st, 0.92));
      R(3, 6, 17, H - 6, shade(st, 0.96));
      for (const x of [3, 8, 14]) R(x, 6, 1, H - 6, shade(st, 0.78));
      poly([[1, 7], [11.5, -4], [22, 7]], '#9a4a2e'); R(1, 6, 21, 2, shade(st, 0.7));
      for (const x of [5, 15]) { R(x, 12, 3, 8, '#3a3028'); ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(sx + x + 1.5, sy + 12, 1.5, Math.PI, 0); ctx.fill(); }
      const px = doorX + 8;
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? shade(st, 0.76) : shade(st, 0.9); ctx.beginPath(); ctx.arc(sx + px, sy + H - 14, 13 - k * 2.5, Math.PI, 0); ctx.fill(); }
      circ(px, H - 19, 4, '#e8d8b0'); ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(sx + px - 3, sy + H - 22); ctx.lineTo(sx + px + 3, sy + H - 16); ctx.moveTo(sx + px + 3, sy + H - 22); ctx.lineTo(sx + px - 3, sy + H - 16); ctx.moveTo(sx + px, sy + H - 23); ctx.lineTo(sx + px, sy + H - 15); ctx.stroke(); ctx.lineWidth = 1;
      R(px - 5, H - 13, 10, 13, '#5a3a22');
      circ(W - 14, 30, 3, '#3a3028');
      ctx.strokeStyle = '#2a2a30'; ctx.strokeRect(sx + 20.5, sy + 18.5, W - 21, H - 19); ctx.strokeRect(sx + 3.5, sy + 6.5, 16, H - 7);
      break;
    }
    case 'jacacat': {
      // Catedral de Jaca: románica, pórtico de entrada, torre cuadrada y ajedrezado jaqués
      const st = '#cdb488';
      R(0, 20, W - 22, H - 20, st);
      poly([[0, 22], [(W - 22) / 2, 10], [W - 22, 22]], '#a85a3a');
      for (let x = 0; x < W - 22; x += 4) { R(x, 22, 2, 2, '#3a3028'); R(x + 2, 24, 2, 2, '#3a3028'); }
      R(W - 22, 0, 22, H, shade(st, 1.04)); R(W - 22, 0, 2, H, shade(st, 0.8));
      poly([[W - 24, 4], [W - 11, -6], [W, 4]], '#9a4a2e');
      R(W - 16, 10, 10, 12, '#3a3028'); ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(sx + W - 11, sy + 10, 5, Math.PI, 0); ctx.fill();
      for (let x = W - 22; x < W; x += 4) { R(x, 30, 2, 2, '#3a3028'); R(x + 2, 32, 2, 2, '#3a3028'); }
      R(doorX - 18, H - 30, 50, 30, shade(st, 0.92)); poly([[doorX - 20, H - 30], [doorX + 7, H - 38], [doorX + 34, H - 30]], '#a85a3a');
      for (let i = 0; i < 3; i++) { const x = doorX - 14 + i * 16; R(x, H - 24, 10, 24, '#3a3028'); ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(sx + x + 5, sy + H - 24, 5, Math.PI, 0); ctx.fill(); }
      R(doorX + 4, H - 14, 8, 14, '#6a4028');
      circ(20, 40, 3, '#3a3028');
      ctx.strokeStyle = '#2a2a30'; ctx.strokeRect(sx + 0.5, sy + 20.5, W - 23, H - 21); ctx.strokeRect(sx + W - 21.5, sy + 0.5, 21, H - 1);
      break;
    }
    case 'colegiata': {
      // Colegiata-castillo de Alquézar sobre la roca
      R(0, 30, W, H - 30, '#c8904a'); for (let x = 2; x < W; x += 9) R(x, 32, 2, H - 32, '#a87038');
      R(4, 14, W - 8, 22, '#d8c49a'); for (let x = 4; x < W - 6; x += 7) R(x, 10, 4, 5, '#d8c49a');
      R(W - 26, 0, 16, 34, '#e0cca0'); poly([[W - 28, 2], [W - 18, -8], [W - 8, 2]], '#9a4a2e');
      R(W - 22, 6, 8, 9, '#3a3028');
      for (let i = 0; i < 3; i++) { const x = 10 + i * 12; R(x, 22, 8, 12, '#5a4a3a'); ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(sx + x + 4, sy + 22, 4, Math.PI, 0); ctx.fill(); }
      R(doorX + 3, H - 14, 10, 14, '#3a2a1a'); ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(sx + doorX + 8, sy + H - 14, 5, Math.PI, 0); ctx.fill();
      break;
    }
    case 'church': {
      const st = '#d4ac6c';
      R(0, 18, W, H - 18, st);
      poly([[0, 20], [W / 2 + 6, 8], [W, 20]], '#b8583a');
      R(2, 0, 18, 24, shade(st, 0.95)); poly([[0, 2], [11, -6], [22, 2]], '#b8583a');
      R(7, 6, 8, 10, '#3a3028'); ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(sx + 11, sy + 6, 4, Math.PI, 0); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? shade(st, 0.78) : shade(st, 0.9); ctx.beginPath(); ctx.arc(sx + doorX + 8, sy + H - 10, 11 - k * 2.5, Math.PI, 0); ctx.fill(); }
      R(doorX + 3, H - 10, 10, 10, '#5a3a22');
      circ(W - 16, 32, 4, '#3a3028'); circ(W - 16, 32, 2.5, '#f0c040');
      outline(); break;
    }
    case 'hall': {
      const st = '#e6d6b4';
      R(0, 6, W, H - 6, st); R(0, 4, W, 4, shade(st, 0.75));
      R(0, 0, 12, H, shade(st, 0.95)); R(W - 12, 0, 12, H, shade(st, 0.95));
      R(0, 0, 12, 3, '#b8583a'); R(W - 12, 0, 12, 3, '#b8583a');
      for (let i = 0; i < 4; i++) win(16 + i * 13, 14, 7, 9);
      R(14, 25, W - 28, 2, '#5a5a62');
      for (let i = 0; i < 5; i++) { const x = 6 + i * 14; R(x, 40, 10, 24, shade(st, 0.7)); ctx.fillStyle = shade(st, 0.7); ctx.beginPath(); ctx.arc(sx + x + 5, sy + 40, 5, Math.PI, 0); ctx.fill(); }
      R(W / 2 - 0.5, -8, 1, 10, '#404040'); R(W / 2, -8, 8, 3, '#f0d020'); R(W / 2, -7, 8, 1, '#d02020'); R(W / 2, -5.5, 8, 1, '#d02020');
      door('#6a3a1a'); outline(); break;
    }
    case 'gym': {
      // Museo de Huesca: edificio octogonal con portada barroca (antigua Universidad Sertoriana)
      const st = '#cfbc96', dk = '#a8946c';
      R(0, 14, W, H - 14, st);
      poly([[0, 16], [14, 4], [W - 14, 4], [W, 16]], '#a85a3a'); R(14, 4, W - 28, 2, '#8a4a2e');
      for (let x = 10; x < W; x += 20) R(x, 16, 1, H - 16, dk);
      for (const x of [4, 24, 62, 82]) { R(x, 22, 9, 12, '#4a5a7a'); R(x - 1, 21, 11, 2, dk); }
      const px = doorX + 8;
      R(px - 20, 18, 40, H - 18, shade(st, 1.05));
      for (const x of [px - 18, px - 13, px + 10, px + 15]) { R(x, 26, 3, H - 26, '#ece0c4'); R(x - 1, 24, 5, 2, dk); R(x - 1, H - 2, 5, 2, dk); }
      poly([[px - 20, 26], [px - 6, 18], [px - 6, 22], [px - 16, 26]], dk); poly([[px + 20, 26], [px + 6, 18], [px + 6, 22], [px + 16, 26]], dk);
      R(px - 4, 16, 8, 8, '#f4d020'); for (let k = 0; k < 4; k++) R(px - 3.5 + k * 2, 16, 1, 8, '#d01818');
      R(px - 7, H - 26, 14, 26, '#3a2a1a'); ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(sx + px, sy + H - 26, 7, Math.PI, 0); ctx.fill();
      R(px - 5, H - 24, 10, 24, '#8a3a2a'); R(px - 0.5, H - 24, 1, 24, '#5a2010');
      R(W / 2 - 22, 6, 44, 7, '#2a2a40'); T('GIMNASIO', W / 2, 7, '#f4d020');
      outline(); break;
    }
    case 'station': {
      R(0, 0, W, 6, '#4a5866'); R(0, 6, W, H - 6, '#8fb4cc');
      for (let x = 0; x < W; x += 12) R(x, 6, 1, H - 6, '#4a5866');
      R(W / 2 - 26, 8, 52, 8, '#2a3440'); T('ESTACION', W / 2, 9.5, '#ffffff');
      R(doorX + 2, H - 14, 12, 14, '#2a3440'); R(doorX + 3, H - 13, 10, 13, '#c4e4f4');
      outline(); break;
    }
    case 'castle': {
      const st = '#9c9284';
      R(0, 18, W, H - 18, st);
      for (let x = 0; x < W; x += 8) R(x, 13, 5, 5, st);
      R(0, 0, 22, H, shade(st, 1.1)); R(W - 22, 0, 22, H, shade(st, 1.1));
      for (const tx of [0, W - 22]) for (let x = tx; x < tx + 22; x += 6) R(x, -4, 4, 4, shade(st, 1.1));
      for (let y = 22; y < H; y += 7) R(0, y, W, 1, shade(st, 0.8));
      for (const tx of [8, W - 14]) R(tx, 12, 4, 8, '#2a2620');
      R(doorX + 2, H - 20, 12, 20, '#2a2620'); ctx.fillStyle = '#2a2620'; ctx.beginPath(); ctx.arc(sx + doorX + 8, sy + H - 20, 6, Math.PI, 0); ctx.fill();
      R(30, 26, 6, 3, shade(st, 0.7)); R(70, 40, 5, 3, shade(st, 0.7));
      if (b.id === 'monzon_castillo') { R(W / 2 - 0.5, -10, 1, 14, '#404040'); R(W / 2, -10, 10, 8, '#f4f4f4'); R(W / 2 + 4, -10, 2, 8, '#c01818'); R(W / 2, -7, 10, 2, '#c01818'); }
      break;
    }
    case 'loarre': {
      // Castillo de Loarre: muralla con cubos, iglesia con ábside y torre del homenaje
      const st = '#c8a878', dk = '#9a7a50';
      R(40, 20, 50, 40, shade(st, 0.97));
      ctx.fillStyle = shade(st, 1.05); ctx.beginPath(); ctx.arc(sx + 65, sy + 30, 24, Math.PI, 0); ctx.fill();
      for (const x of [50, 62, 74]) { R(x, 22, 4, 10, '#3a3028'); ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(sx + x + 2, sy + 22, 2, Math.PI, 0); ctx.fill(); }
      R(98, 0, 28, 62, shade(st, 1.08)); R(98, 0, 2, 62, dk); for (let x = 98; x < 126; x += 6) R(x, -4, 4, 4, shade(st, 1.08));
      R(108, 14, 6, 10, '#2a2620'); R(108, 34, 6, 8, '#2a2620');
      R(12, 12, 22, 50, shade(st, 1.02)); for (let x = 12; x < 34; x += 6) R(x, 8, 4, 4, shade(st, 1.02)); R(20, 22, 5, 8, '#2a2620');
      R(0, 56, W, H - 56, st); for (let x = 0; x < W; x += 8) R(x, 51, 5, 5, st);
      for (let y = 62; y < H; y += 7) R(0, y, W, 1, shade(st, 0.86));
      for (const cx of [10, 52, 96, 134]) {          // cubos (torres semicirculares de la muralla)
        R(cx - 8, 46, 16, H - 46, shade(st, 1.07)); R(cx + 4, 46, 4, H - 46, shade(st, 0.9)); R(cx - 8, 46, 2, H - 46, shade(st, 1.15));
        for (let x = cx - 8; x < cx + 8; x += 6) R(x, 42, 4, 4, shade(st, 1.07));
        R(cx - 1, 58, 2, 6, '#2a2620');
      }
      R(doorX + 3, H - 20, 10, 20, '#2a2620'); ctx.fillStyle = '#2a2620'; ctx.beginPath(); ctx.arc(sx + doorX + 8, sy + H - 20, 5, Math.PI, 0); ctx.fill();
      break;
    }
    case 'monastery': {
      // San Juan de la Peña: el monasterio se cobija bajo una enorme roca
      R(0, 0, W, 30, '#8a7a68');
      ctx.fillStyle = '#9c8c78'; ctx.beginPath(); ctx.moveTo(sx, sy + 30); ctx.quadraticCurveTo(sx + W / 2, sy + 44, sx + W, sy + 30); ctx.lineTo(sx + W, sy); ctx.lineTo(sx, sy); ctx.fill();
      for (const [x, y] of [[10, 8], [40, 14], [80, 6], [96, 20], [24, 22]]) R(x, y, 10, 2, '#6a5a4a');
      R(4, 34, W - 8, H - 34, '#c8b088');
      for (let i = 0; i < 6; i++) { const x = 8 + i * 17; if (Math.abs(x + 5 - (doorX + 8)) < 8) continue; R(x, 44, 10, H - 46, '#4a3a2a'); ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.arc(sx + x + 5, sy + 44, 5, Math.PI, 0); ctx.fill(); R(x + 4, 44, 2, H - 46, '#d8c8a0'); }
      R(doorX + 3, H - 16, 10, 16, '#5a3a22'); ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(sx + doorX + 8, sy + H - 16, 5, Math.PI, 0); ctx.fill();
      break;
    }
    case 'bigstation': {
      // Estación Internacional de Canfranc: fachada larguísima, tejado de pizarra con buhardillas y pabellón central
      R(0, 18, W, H - 18, '#ece2c8');
      R(0, 6, W, 14, '#3e4656'); for (let x = 4; x < W; x += 9) { R(x, 9, 5, 7, '#ece2c8'); R(x + 1, 10, 3, 5, '#5a7a9a'); }
      for (let x = 3; x < W - 3; x += 6) { R(x, 24, 3, 9, '#5a7a9a'); R(x, 38, 3, 10, '#5a7a9a'); }
      for (const [x, w] of [[0, 20], [W - 20, 20], [W / 2 - 22, 44]]) { R(x, 4, w, H - 4, '#e4d8bc'); R(x, 0, w, 8, '#3e4656'); }
      ctx.fillStyle = '#3e4656'; ctx.beginPath(); ctx.arc(sx + W / 2, sy + 4, 10, Math.PI, 0); ctx.fill();
      circ(W / 2, 16, 5, '#f4f0e0'); R(W / 2 - 0.5, 12, 1, 4, '#202020'); R(W / 2, 15.5, 3, 1, '#202020');
      R(W / 2 - 30, 50, 60, 8, '#2a3440'); T('CANFRANC', W / 2, 51.5, '#f0d080');
      R(doorX + 2, H - 7, 12, 7, '#3a2a1a'); R(doorX + 3, H - 6, 10, 6, '#8fb0c8');
      outline(); break;
    }
    case 'pool': {
      // Gimnasio del Gállego (tipo Agua)
      R(0, 10, W, H - 10, '#f4f8fc'); R(0, 6, W, 6, '#2a6ab0');
      for (let x = 0; x < W; x += 8) { ctx.fillStyle = '#4a9ae0'; ctx.beginPath(); ctx.arc(sx + x + 4, sy + 30, 4, Math.PI, 0); ctx.fill(); }
      R(0, 30, W, 4, '#4a9ae0');
      R(W / 2 - 22, 14, 44, 9, '#1a3a70'); T('GIMNASIO', W / 2, 16, '#a8e0ff');
      R(doorX + 2, H - 14, 12, 14, '#1a3a70'); R(doorX + 3, H - 13, 10, 13, '#c4ecff');
      outline(); break;
    }
    case 'chalet': {
      // Gimnasios de montaña (Benasque y Ordesa): chalé de madera y pizarra
      const em = b.gym === 'ordesa' ? '#e8e0c0' : '#a8c8f0';
      R(2, 22, W - 4, H - 22, '#a8743f'); for (let y = 26; y < H; y += 5) R(2, y, W - 4, 1, '#7c5430');
      poly([[-2, 24], [W / 2, -2], [W + 2, 24]], '#3e4452'); poly([[6, 24], [W / 2, 4], [W - 6, 24]], '#4a5060');
      R(4, 34, W - 8, 2, '#5a3a20'); for (let x = 6; x < W - 6; x += 5) R(x, 30, 1, 4, '#5a3a20');
      circ(W / 2, 14, 5, em); poly([[W / 2 - 4, 16], [W / 2, 10], [W / 2 + 4, 16]], '#5a6a7a');
      R(W / 2 - 22, 38, 44, 8, '#2a2a3a'); T('GIMNASIO', W / 2, 39.5, em);
      door('#5a3a20'); outline(); break;
    }
    case 'tower': {
      const st = '#c8b488';
      R(2, 0, W - 4, H, st); R(2, 0, W - 4, 3, '#a8583a');
      R(6, 6, 4, 6, '#3a3028');
      R(0, H - 4, W, 4, '#3f88dc');
      break;
    }
    case 'bodega': {
      house('#efe2c8', '#7a2a4a');
      R(W / 2 - 22, 21, 44, 9, '#4a1a30'); T('GIMNASIO', W / 2, 23, '#f0c8e0');
      for (const x of [6, W - 16]) { circ(x + 5, 44, 5, '#8a5a2a'); R(x, 43.5, 10, 1, '#5a3a1a'); }
      door('#5a2a3a'); outline(); break;
    }
    case 'clocktower': {
      const st = '#cdb68a';
      R(2, 4, W - 4, H - 4, st);
      for (let x = 0; x < W; x += 8) R(x, 0, 5, 5, shade(st, 0.9));
      R(0, 4, W, 2, shade(st, 0.75));
      for (let y = 10; y < H; y += 7) R(2, y, W - 4, 1, shade(st, 0.88));
      circ(W / 2, 16, 8, '#3a3a40'); circ(W / 2, 16, 7, '#f4f0e0');
      R(W / 2 - 0.5, 10.5, 1, 6, '#202020'); R(W / 2, 15.5, 5, 1, '#202020');
      R(W / 2 - 3, 30, 6, 12, '#3a3028'); ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.arc(sx + W / 2, sy + 30, 3, Math.PI, 0); ctx.fill();
      R(W / 2 - 5, H - 14, 10, 14, '#5a3a22');
      ctx.strokeStyle = '#2a2a30'; ctx.strokeRect(sx + 2.5, sy + 4.5, W - 5, H - 5);
      break;
    }
    case 'icerink': {
      R(0, 14, W, H - 14, '#e4f0f8');
      ctx.fillStyle = '#3a6ab0'; ctx.beginPath(); ctx.ellipse(sx + W / 2, sy + 16, W / 2, 14, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#5a8ad0'; ctx.beginPath(); ctx.ellipse(sx + W / 2, sy + 16, W / 2 - 6, 9, 0, Math.PI, 0); ctx.fill();
      R(0, 14, W, 3, '#2a4a80');
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx + W / 2, sy + 9); ctx.lineTo(sx + W / 2 + Math.cos(a) * 5, sy + 9 + Math.sin(a) * 5); ctx.stroke(); }
      R(W / 2 - 22, 21, 44, 9, '#1a3060'); T('GIMNASIO', W / 2, 23, '#a8e8ff');
      for (let i = 0; i < b.w; i++) if (i !== b.door) R(i * 16 + 3, 36, 10, 16, '#9fd4f0');
      R(doorX + 2, H - 15, 12, 15, '#1a3060'); R(doorX + 3, H - 14, 10, 14, '#c4ecff'); R(doorX + 7.5, H - 14, 1, 14, '#1a3060');
      ctx.lineWidth = 1; outline(); break;
    }
    case 'citadel': {
      const st = '#b8a47c', dk = '#8a7a58';
      const cxp = W / 2, cyp = H / 2 + 2, r1 = 40, r2 = 26;
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; pts.push([cxp + Math.cos(a) * r * 1.15, cyp + Math.sin(a) * r * 0.9]); }
      poly(pts, dk);
      poly(pts.map(([x, y]) => [cxp + (x - cxp) * 0.88, cyp + (y - cyp) * 0.88]), st);
      R(cxp - 18, cyp - 14, 36, 22, '#d8c8a0'); R(cxp - 18, cyp - 16, 36, 3, '#a84a30');
      R(cxp - 1, cyp - 30, 2, 14, '#404040'); R(cxp + 1, cyp - 30, 10, 4, '#f4d020'); R(cxp + 1, cyp - 29, 10, 1, '#d01818'); R(cxp + 1, cyp - 27.5, 10, 1, '#d01818');
      R(doorX + 3, H - 18, 10, 18, '#2a2620'); ctx.fillStyle = '#2a2620'; ctx.beginPath(); ctx.arc(sx + doorX + 8, sy + H - 18, 5, Math.PI, 0); ctx.fill();
      break;
    }
    case 'fountain': {
      ctx.fillStyle = '#b8b0a0'; ctx.beginPath(); ctx.ellipse(sx + W / 2, sy + H / 2 + 2, W / 2 - 1, H / 2 - 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a94e4'; ctx.beginPath(); ctx.ellipse(sx + W / 2, sy + H / 2 + 2, W / 2 - 5, H / 2 - 7, 0, 0, Math.PI * 2); ctx.fill();
      R(W / 2 - 3, 4, 6, H / 2, '#d8d0c0'); circ(W / 2, 5, 4, '#e8e0d0');
      const t = (performance.now() / 150) | 0;
      for (let i = 0; i < 4; i++) R(W / 2 - 8 + i * 5, 12 + ((t + i) % 3), 1, 2, '#c4e4ff');
      break;
    }
  }
}

if (typeof module !== 'undefined') module.exports = { PB };
