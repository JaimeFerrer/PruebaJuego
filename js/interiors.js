'use strict';
// ============================================================
//  Interiores de los edificios
// ============================================================
//  Suelos (transitables):  f madera   k baldosa   s piedra   c alfombra   i hielo   m felpudo (salida)
//  Muebles (sólidos):      w pared    W pared con cuadro      q mostrador   b librería   v estantería de tienda
//                          t mesa     p planta    e cama      x banco de iglesia        a altar
//                          o barril   g máquina   z cocina    l columna

for (const c of 'wWqbvtpexaogzl') SOLID.add(c);

const ROLE_PAL = {
  nurse: ['#f0a0b0', '#f8f8f8', '#f0a0b0'],
  clerk: ['#3a3a5a', '#3a70c0', '#2a2a3a'],
  prof: ['#c8c8c8', '#f4f4f4', '#5a5a6a'],
  priest: ['#3a3a3a', '#2a2a30', '#2a2a30'],
  guard: ['#4a5a3a', '#6a7a4a', '#3a3a2a'],
  guide: ['#8a4a2a', '#c0a040', '#3a3a4a'],
  mom: ['#8a4a2a', '#e0a0c0', '#4a4a6a'],
  stationmaster: ['#2a3a6a', '#2a3a6a', '#2a2a3a'],
};
const RESIDENT_PALS = [
  ['#3a2a1a', '#d06040', '#3a4a6a'], ['#c0a060', '#60a060', '#4a3a2a'], ['#6a3a2a', '#5070c0', '#2a2a3a'],
  ['#d8d8d8', '#8a5aa0', '#3a3a4a'], ['#2a2a2a', '#e0c040', '#4a4a5a'], ['#a05a2a', '#40a0a0', '#3a3a3a'],
];

function strHash(str) { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }

// Aprendiz de cada gimnasio (clave: id del gimnasio)
const GYM_TRAINERS = {
  huesca: { name: 'Monje Aprendiz Íñigo', team: [['danzante', 9], ['mallorroc', 10]], pal: ['#5a4a3a', '#7a5a3a', '#4a3a2a'] },
  barbastro: { name: 'Bodeguero Luis', team: [['albahaquin', 13], ['ranisuela', 13]], pal: ['#4a2a2a', '#8a2a4a', '#3a2a2a'] },
  monzon: { name: 'Escudero Pedro', team: [['fogaril', 16], ['almenazo', 16]], pal: ['#6a6a6a', '#f4f4f4', '#3a3a3a'] },
  jaca: { name: 'Patinador Diego', team: [['arminin', 17], ['nevero', 18]], pal: ['#202020', '#c03030', '#2a2a3a'] },
  sabinanigo: { name: 'Piragüista Ane', team: [['ranisuela', 20], ['truchon', 21]], pal: ['#e0c040', '#e04040', '#2a2a3a'] },
  ainsa: { name: 'Juglara Blanca', team: [['trenzon', 23], ['danzante', 24]], pal: ['#a02a2a', '#e8e0c8', '#4a3a2a'] },
  benasque: { name: 'Alpinista Jordi', team: [['cierzin', 26], ['quebranto', 27]], pal: ['#3a5a8a', '#e0e0e0', '#2a2a3a'] },
  ordesa: { name: 'Guarda Mayor Carmen', team: [['marmotin', 30], ['sarrion', 30], ['buitron', 31]], pal: ['#5a3a1a', '#3a7a3a', '#4a3a2a'] },
};
for (const k in GYM_TRAINERS) Object.assign(GYM_TRAINERS[k], {
  id: 'gymtr_' + k, money: GYM_TRAINERS[k].team[0][1] * 10,
  intro: 'Antes de llegar al Líder tendrás que pasar por encima de mí.', lose: '¡Vaya! Eres de verdad.',
  after: 'El Líder te espera al fondo. ¡Fíjate bien en los tipos!',
});

const ROOM_KIND = {
  house: 'house', hogar: 'house', center: 'center', shop: 'shop', lab: 'lab',
  church: 'church', cathedral: 'church', monastery: 'church', sanpedro: 'church', jacacat: 'church', colegiata: 'church',
  hall: 'hall', casino: 'hall', station: 'station', bigstation: 'station',
  castle: 'castle', loarre: 'castle', citadel: 'castle',
  gym: 'gym', bodega: 'gym', icerink: 'gym', pool: 'gym', chalet: 'gym',
};

function getInterior(b) {
  const id = b.id + '_in';
  if (!MAPS[id]) MAPS[id] = makeInterior(b, id);
  return MAPS[id];
}

function makeInterior(b, id) {
  const kind = b.id === 'hogar' ? 'hogar' : b.gym ? 'gym' : (ROOM_KIND[b.kind] || 'house');
  const r = srand(strHash(b.id) + 3);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const big = b.kind === 'cathedral' || b.kind === 'loarre' || b.kind === 'bigstation';
  const size = { house: [11, 9], hogar: [11, 9], center: [13, 10], shop: [11, 9], lab: [13, 11], church: big ? [15, 13] : [13, 12],
    hall: [13, 10], station: big ? [17, 9] : [13, 9], castle: big ? [15, 12] : [13, 11], gym: [13, 14] }[kind];
  const [W, H] = size;
  const floor = { house: 'f', hogar: 'f', center: 'k', shop: 'k', lab: 'k', church: 's', hall: 'f', station: 'k', castle: 's',
    gym: { icerink: 'i', bodega: 'f', chalet: 'f', pool: 'k' }[b.kind] || 's' }[kind];
  const g = Array.from({ length: H }, () => Array(W).fill(floor));
  const set = (x, y, c) => { if (x > 0 && y > 1 && x < W - 1 && y < H - 1) g[y][x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
  for (let x = 0; x < W; x++) { g[0][x] = 'w'; g[1][x] = 'w'; g[H - 1][x] = 'w'; }
  for (let y = 0; y < H; y++) { g[y][0] = 'w'; g[y][W - 1] = 'w'; }
  const mx = W >> 1;
  g[H - 1][mx] = 'm';
  const npcs = [];
  const host = (x, y, role, extra) => npcs.push(Object.assign({ id: b.id + '_host', x, y, dir: 'down', pal: ROLE_PAL[role] || pick(RESIDENT_PALS), host: true, b }, extra));
  const pictures = n => { for (let i = 0; i < n; i++) { const x = 1 + Math.floor(r() * (W - 2)); if (Math.abs(x - mx) > 1) g[1][x] = 'W'; } };
  const mirror = r() < 0.5;
  const mset = (x, y, c) => set(mirror ? W - 1 - x : x, y, c);

  switch (kind) {
    case 'house': case 'hogar': {
      mset(1, 2, 'e'); mset(1, 3, 'e');
      mset(W - 2, 2, 'b'); mset(W - 3, 2, 'b');
      mset(4, 2, 'z');
      rect(mx - 1, 4, 3, 1, 't');
      rect(mx - 2, 6, 5, 1, 'c');
      mset(1, H - 2, 'p'); mset(W - 2, H - 2, 'p');
      pictures(2);
      if (kind === 'hogar') host(mx - 2, 4, 'mom');
      else host(mirror ? mx + 2 : mx - 2, 5, 'resident', { pal: pick(RESIDENT_PALS) });
      break;
    }
    case 'center': {
      rect(3, 4, W - 6, 1, 'q');
      set(mx + 2, 2, 'g'); set(mx - 2, 2, 'g');
      set(1, 2, 'p'); set(W - 2, 2, 'p');
      rect(1, H - 3, 2, 1, 't'); rect(W - 3, H - 3, 2, 1, 't');
      pictures(2);
      host(mx, 3, 'nurse');
      break;
    }
    case 'shop': {
      rect(1, 4, 3, 1, 'q'); set(3, 3, 'q'); set(3, 2, 'q');
      rect(5, 3, W - 6, 1, 'v'); rect(5, 5, W - 6, 1, 'v');
      set(W - 2, H - 2, 'p');
      host(2, 3, 'clerk');
      break;
    }
    case 'lab': {
      rect(1, 2, 4, 1, 'b'); rect(W - 5, 2, 4, 1, 'b');
      set(mx - 1, 2, 'g'); set(mx + 1, 2, 'g');
      rect(2, 5, 2, 1, 't'); rect(W - 4, 5, 2, 1, 't');
      rect(2, 8, 2, 1, 't'); rect(W - 4, 8, 2, 1, 't');
      set(1, H - 2, 'p'); set(W - 2, H - 2, 'p');
      host(mx, 4, 'prof');
      break;
    }
    case 'church': {
      rect(mx - 1, 2, 3, 1, 'a');
      for (let y = 2; y < H - 1; y++) if (g[y][mx] === floor) g[y][mx] = 'c';
      for (let y = 5; y < H - 2; y += 2) { rect(2, y, mx - 3, 1, 'x'); rect(mx + 2, y, mx - 3, 1, 'x'); }
      set(1, 2, 'p'); set(W - 2, 2, 'p');
      if (big) for (const y of [4, 8]) { set(1, y, 'l'); set(W - 2, y, 'l'); }
      pictures(3);
      host(mx, 3, 'priest');
      break;
    }
    case 'hall': {
      for (let y = 3; y < H - 1; y++) g[y][mx] = 'c';
      rect(2, 4, 2, 2, 't'); rect(W - 4, 4, 2, 2, 't');
      if (b.kind === 'casino') { rect(2, 7, 2, 1, 't'); rect(W - 4, 7, 2, 1, 't'); }
      else { rect(1, 2, 2, 1, 'b'); rect(W - 3, 2, 2, 1, 'b'); }
      set(1, H - 2, 'p'); set(W - 2, H - 2, 'p');
      pictures(4);
      host(mx, 3, 'guide');
      break;
    }
    case 'station': {
      rect(mx - 2, 4, 5, 1, 'q');
      rect(1, H - 3, 3, 1, 't'); rect(W - 4, H - 3, 3, 1, 't');
      set(1, 2, 'p'); set(W - 2, 2, 'p');
      pictures(2);
      host(mx, 3, 'stationmaster');
      break;
    }
    case 'castle': {
      for (let y = 2; y < H - 1; y++) g[y][mx] = 'c';
      for (let y = 3; y < H - 2; y += 3) { set(2, y, 'l'); set(W - 3, y, 'l'); }
      if (b.kind === 'loarre') { rect(1, 2, 2, 1, 'o'); rect(W - 3, 2, 2, 1, 'o'); }
      pictures(3);
      host(mx, 3, 'guard');
      break;
    }
    case 'gym': {
      for (let y = 2; y < H - 1; y++) g[y][mx] = 'c';
      const deco = { bodega: 'o', icerink: 'q', pool: 'p', chalet: 'p' }[b.kind] || 'l';
      for (let y = 3; y < H - 2; y += 3) { set(2, y, deco); set(W - 3, y, deco); }
      const gd = GYMS[b.gym];
      host(mx, 3, 'leader', { pal: gd ? gd.pal : GYM_PAL });
      const tr = GYM_TRAINERS[b.gym];
      if (tr) npcs.push({ id: tr.id, x: mx - 3, y: 8, dir: 'right', pal: tr.pal, trainer: tr });
      break;
    }
  }
  const name = b.name || 'Casa';
  const bg = kind === 'gym' && GYMS[b.gym] ? GYMS[b.gym].bg : 'palace';
  return {
    id, name, w: W, h: H, interior: true, build: () => g, tiles: g,
    buildings: [], signs: [], npcs, items: [], legends: [],
    spawn: { x: mx, y: H - 2, dir: 'up' }, back: { x: b.x + b.door, y: b.y + b.h, dir: 'down' }, building: b,
    zoneName: () => name, zoneAt: () => ({ bg, lv: [1, 1], list: [['trenzon', 1]] }),
  };
}

const FURNITURE_TEXT = {
  b: 'Una estantería llena de libros sobre la historia de Aragón.',
  v: 'Estanterías con Oscaballs, pociones... ¡y trenzas de Huesca!',
  g: 'Una máquina para cuidar a los Oscamon. ¡Bip, bip!',
  e: 'Una cama mullida. Dan ganas de echarse la siesta.',
  z: 'Una cocina de leña. Huele a migas recién hechas.',
  x: 'Un banco de madera. Se está muy tranquilo aquí.',
  a: 'El altar, adornado con flores frescas.',
  o: 'Un barril de roble. Huele a vino del Somontano.',
  t: 'Una mesa de madera maciza.',
  p: 'Una planta muy bien cuidada.',
  W: 'Un cuadro de las montañas del Pirineo.',
  l: 'Una columna de piedra de siglos de antigüedad.',
  q: 'Un mostrador.',
};
