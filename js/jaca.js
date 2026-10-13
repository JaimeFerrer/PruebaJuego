'use strict';
// ============================================================
//  Mapa de Jaca (se llega en tren desde Huesca)
// ============================================================

const JACA_W = 40, JACA_H = 34;

function buildJaca() {
  const W = JACA_W, H = JACA_H;
  const m = Array.from({ length: H }, () => Array(W).fill('.'));
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, c) => { if (inb(x, y)) m[y][x] = c; };
  const get = (x, y) => (inb(x, y) ? m[y][x] : null);
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
  let seed = 4321;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const scatter = (x, y, w, h, c, p, only) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++)
      if (rnd() < p && (!only || only.includes(get(i, j)))) set(i, j, c);
  };

  // Bosque en los bordes
  rect(0, 0, 1, H, 'T'); rect(W - 2, 0, 2, H, 'T');
  // Pirineo nevado al norte
  rect(0, 0, W, 4, 'M'); rect(0, 0, W, 3, 'n');
  for (let x = 0; x < W; x++) { if (rnd() < 0.5) set(x, 3, 'n'); if (rnd() < 0.4) set(x, 4, 'M'); }
  // Peña Oroel al sur
  rect(0, H - 3, W, 3, 'M');
  for (let x = 0; x < W; x++) if (rnd() < 0.5) set(x, H - 4, 'M');
  rect(13, H - 3, 9, 1, 'n'); rect(15, H - 4, 5, 1, 'n');
  // Río Aragón (oeste) y Puente de San Miguel
  rect(3, 4, 3, H - 7, '~');
  rect(3, 18, 3, 1, 'H');
  rect(1, 5, 2, 24, '.');
  scatter(1, 5, 2, 24, 'T', 0.3, ['.']);
  rect(1, 5, 1, 24, '.');
  rect(6, 18, 2, 1, 'D');
  // Ciudad
  rect(8, 6, 23, 19, '=');
  rect(8, 14, 23, 1, 'C');                  // Calle Mayor
  rect(13, 12, 10, 2, 'S');                 // Plaza de la Catedral
  // Ciudadela y sus prados
  rect(31, 5, 7, 12, '.');
  rect(31, 14, 7, 1, 'D');
  scatter(31, 5, 7, 2, 'T', 0.4, ['.']);
  // Camino de la Peña Oroel
  rect(7, 25, 31, 6, ',');
  scatter(7, 25, 31, 6, 'T', 0.08, [',']);
  scatter(7, 25, 31, 6, '.', 0.08, [',']);
  rect(17, 25, 1, 6, 'D');
  rect(1, 29, 6, 2, ',');
  for (const [x, y] of [[8, 6], [30, 24], [8, 24], [30, 6], [21, 21]]) set(x, y, 'T');

  for (const b of JACA_BUILDINGS) rect(b.x, b.y, b.w, b.h, 'B');
  for (const o of [...JACA_SIGNS, ...JACA_NPCS, ...JACA_ITEMS])
    if (SOLID.has(get(o.x, o.y))) set(o.x, o.y, '.');
  return m;
}

const JACA_BUILDINGS = [
  { id: 'j_ayto',       kind: 'hall',        x: 9,  y: 8,  w: 5, h: 4, door: 2, name: 'Ayuntamiento de Jaca' },
  { id: 'j_catedral',   kind: 'church',      x: 15, y: 7,  w: 6, h: 5, door: 3, name: 'Catedral de San Pedro' },
  { id: 'j_reloj',      kind: 'clocktower',  x: 24, y: 8,  w: 3, h: 4, door: -1, name: 'Torre del Reloj' },
  { id: 'j_centro',     kind: 'center',      x: 9,  y: 16, w: 5, h: 4, door: 2, name: 'Centro Oscamon' },
  { id: 'j_tienda',     kind: 'shop',        x: 16, y: 16, w: 4, h: 3, door: 1, name: 'Tienda' },
  { id: 'j_gym',        kind: 'icerink',     x: 22, y: 16, w: 7, h: 4, door: 3, name: 'Pabellón de Hielo' },
  { id: 'j_estacion',   kind: 'station',     x: 14, y: 22, w: 6, h: 2, door: 3, name: 'Estación de Jaca' },
  { id: 'j_ciudadela',  kind: 'citadel',     x: 32, y: 7,  w: 6, h: 5, door: 3, name: 'Ciudadela de Jaca' },
];

const JACA_SIGNS = [
  { x: 13, y: 12, text: 'CATEDRAL DE SAN PEDRO DE JACA\nUna de las primeras catedrales románicas de la península (s. XI).' },
  { x: 27, y: 12, text: 'TORRE DEL RELOJ\nTorre gótica del siglo XV en pleno casco antiguo.' },
  { x: 31, y: 13, text: 'CIUDADELA DE JACA\nFortaleza pentagonal de finales del siglo XVI. ¡En su foso viven ciervos!' },
  { x: 21, y: 20, text: 'PABELLÓN DE HIELO\n— GIMNASIO OSCAMON DE JACA —\nLíder: Nieves.' },
  { x: 6, y: 17, text: 'RÍO ARAGÓN · PUENTE DE SAN MIGUEL\nPuente medieval del Camino de Santiago.' },
  { x: 16, y: 25, text: 'PEÑA OROEL (1.769 m)\nLa montaña símbolo de Jaca. Hierba alta: ¡Oscamon de hielo!' },
  { x: 13, y: 24, text: 'ESTACIÓN DE JACA\nTrenes a Huesca y a Canfranc.' },
];

const JACA_NPCS = [
  { id: 'jaquesa', x: 20, y: 13, dir: 'down', pal: ['#5a3a2a', '#c03050', '#2a2a3a'],
    text: ['¡Bienvenido a Jaca, la primera capital del Reino de Aragón!',
      'El Primer Viernes de Mayo recordamos una batalla legendaria en la que también lucharon las mujeres de la ciudad.'] },
  { id: 'soldado', x: 34, y: 14, dir: 'down', pal: ['#4a5a3a', '#6a7a4a', '#3a3a2a'],
    text: ['Vigilo la Ciudadela. Tiene forma de estrella de cinco puntas para defenderse mejor de los cañones.',
      'Shhh... ¿ves los ciervos en el foso? No los asustes.'] },
  { id: 'esquiador', x: 24, y: 27, dir: 'left', pal: ['#e04040', '#f0f0f0', '#2a3a6a'],
    trainer: { name: 'Esquiador Iván', team: [['arminin', 15], ['nevero', 16]], money: 150,
      intro: '¡Acabo de bajar de Candanchú! ¿Te atreves con mis Oscamon de nieve?',
      lose: '¡Me he caído en la primera curva!', after: 'Nieves, la Líder, entrena en el Pabellón de Hielo. Su Anetón es durísimo.' } },
  { id: 'patinadora', x: 29, y: 21, dir: 'left', pal: ['#f0c0d0', '#8a50c0', '#3a2a5a'],
    trainer: { name: 'Patinadora Lucía', team: [['cierzin', 16], ['arminin', 17]], money: 150,
      intro: '¡Entreno para el campeonato! Primero, un combate de calentamiento.',
      lose: '¡Qué resbalón!', after: 'Contra el hielo, prueba con fuego o con roca.' } },
];

const JACA_ITEMS = [
  { id: 'jt1', x: 1, y: 10, item: 'super', qty: 2 },
  { id: 'jt2', x: 35, y: 29, item: 'ball', qty: 5 },
  { id: 'jt3', x: 36, y: 6, item: 'potion', qty: 3 },
];

const JACA_ZONES = [
  { name: 'oroel', x: 0, y: 25, w: 40, h: 9, bg: 'snow',
    list: [['arminin', 13, 16, 3], ['nevero', 13, 16, 3], ['sarrion', 14, 16, 2], ['quebranto', 14, 16, 1], ['aneton', 16, 17, 1]] },
];

function jacaZoneName(x, y) {
  if (y >= 25) return 'Peña Oroel';
  if (x <= 7) return 'Río Aragón';
  if (x >= 31) return 'Ciudadela de Jaca';
  return 'Jaca';
}

if (typeof module !== 'undefined') module.exports = { buildJaca };
