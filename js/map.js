'use strict';
// ============================================================
//  Mapa de Huesca y alrededores (estilizado, norte arriba)
// ============================================================
//  .  hierba          ,  hierba alta (Oscamon salvajes)
//  =  adoquín         C  calle (el Coso)       S  plaza
//  D  camino de tierra ~  agua (río Isuela)    H  puente
//  T  árbol           M  roca de montaña       n  nieve
//  R  roca roja (Mallos)  F  flores            r  vía del tren
//  B  edificio (se dibuja aparte)

const MAP_W = 64, MAP_H = 56;
const SOLID = new Set(['~', 'T', 'M', 'R', 'B', 'n', 'r']);

function buildMap() {
  const m = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('.'));
  const inb = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  const set = (x, y, c) => { if (inb(x, y)) m[y][x] = c; };
  const get = (x, y) => (inb(x, y) ? m[y][x] : null);
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
  let seed = 1234;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const scatter = (x, y, w, h, c, p, only) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++)
      if (rnd() < p && (!only || only.includes(get(i, j)))) set(i, j, c);
  };

  // --- Bordes de bosque ---
  rect(0, 0, 2, MAP_H, 'T'); rect(MAP_W - 2, 0, 2, MAP_H, 'T'); rect(0, MAP_H - 2, MAP_W, 2, 'T');
  scatter(2, 22, 9, 30, 'T', 0.18, ['.']);
  scatter(2, 22, 9, 30, 'F', 0.06, ['.']);

  // --- Pirineo al norte ---
  rect(0, 0, MAP_W, 4, 'M'); rect(0, 0, MAP_W, 2, 'n');
  for (let x = 0; x < MAP_W; x++) { const h = Math.floor(rnd() * 3); rect(x, 4, 1, h, 'M'); if (rnd() < 0.3) set(x, 2, 'n'); }

  // --- Mallos de Riglos (noroeste) ---
  rect(2, 4, 12, 17, '.');
  rect(3, 6, 3, 6, 'R'); rect(6, 4, 2, 9, 'R'); rect(8, 6, 3, 5, 'R'); rect(11, 5, 2, 5, 'R');
  set(4, 5, 'R'); set(9, 5, 'R');
  rect(2, 13, 12, 8, ',');
  scatter(2, 13, 12, 8, 'T', 0.08, [',']);

  // --- Ruta norte hacia el Salto de Roldán ---
  rect(14, 10, 25, 12, ',');
  scatter(14, 10, 25, 12, 'T', 0.07, [',']);
  scatter(14, 10, 25, 12, '.', 0.10, [',']);
  rect(19, 3, 6, 6, 'M'); rect(29, 3, 6, 6, 'M'); set(19, 9, 'M'); set(34, 9, 'M');
  rect(18, 2, 3, 1, 'n'); rect(30, 2, 3, 1, 'n');
  rect(25, 4, 4, 6, 'D');
  rect(26, 10, 2, 13, 'D');           // camino norte
  rect(28, 18, 13, 1, 'D');           // camino al puente norte
  rect(8, 13, 1, 18, 'D');            // camino de los Mallos
  rect(8, 30, 5, 1, 'D');

  // --- Montearagón (noreste) ---
  rect(47, 4, 15, 8, 'D');
  scatter(47, 4, 15, 8, 'M', 0.08, ['D']);
  rect(49, 5, 9, 6, 'D');
  rect(46, 12, 16, 32, ',');
  scatter(46, 12, 16, 32, 'T', 0.10, [',']);
  scatter(46, 12, 16, 32, '.', 0.12, [',']);
  rect(53, 11, 1, 22, 'D');
  rect(44, 32, 10, 1, 'D');
  rect(44, 18, 10, 1, 'D');

  // --- Ciudad de Huesca ---
  rect(12, 22, 29, 30, '=');
  // El Coso: anillo que rodea el casco antiguo
  rect(13, 23, 26, 1, 'C'); rect(13, 37, 26, 1, 'C');
  rect(13, 23, 1, 15, 'C'); rect(38, 23, 1, 15, 'C');
  // Plaza de la Catedral
  rect(22, 30, 9, 2, 'S');
  // Plaza de Navarra
  rect(22, 39, 9, 5, 'S');
  // Parque Miguel Servet
  rect(12, 39, 9, 12, '.');
  rect(12, 39, 9, 1, 'T'); rect(12, 50, 9, 1, 'T'); rect(12, 39, 1, 12, 'T');
  set(12, 44, '.'); set(12, 45, '.');      // entrada oeste
  rect(20, 41, 1, 3, 'T'); rect(20, 47, 1, 3, 'T');
  rect(14, 41, 3, 3, '~');
  rect(17, 45, 3, 3, ',');
  set(15, 47, 'F'); set(14, 46, 'F'); set(18, 42, 'F'); set(13, 48, 'F'); set(19, 49, 'F');
  set(14, 49, 'T'); set(18, 40, 'T');
  // Árboles decorativos por la ciudad
  for (const [x, y] of [[30, 51], [21, 51], [39, 44], [39, 39], [12, 23], [40, 22], [39, 26], [21, 26]]) set(x, y, 'T');

  // --- Río Isuela (este) ---
  const riverX = y => 43 + Math.round(1.5 * Math.sin(y / 6));
  for (let y = 2; y < MAP_H - 2; y++) { const cx = riverX(y); rect(cx - 1, y, 3, 1, '~'); }
  for (const by of [18, 32]) { const cx = riverX(by); rect(cx - 1, by, 3, 1, 'H'); }

  // --- Vía del tren (sur) ---
  rect(2, 53, MAP_W - 4, 1, 'r');
  rect(2, 52, MAP_W - 4, 1, '.');
  scatter(2, 52, MAP_W - 4, 1, 'F', 0.15, ['.']);

  // --- Edificios ---
  for (const b of BUILDINGS) rect(b.x, b.y, b.w, b.h, 'B');
  // Despeja el suelo bajo carteles, NPC y objetos
  for (const o of [...SIGNS, ...NPCS, ...ITEMS_ON_MAP, LEGEND])
    if (SOLID.has(get(o.x, o.y))) set(o.x, o.y, '.');
  return m;
}

// Edificios: door = columna (relativa) de la puerta en la fila inferior
const BUILDINGS = [
  { id: 'gym',       kind: 'gym',       x: 15, y: 25, w: 6, h: 4, door: 3, name: 'Palacio de los Reyes de Aragón', gym: 'huesca' },
  { id: 'catedral',  kind: 'cathedral', x: 23, y: 24, w: 7, h: 6, door: 3, name: 'Catedral de Santa María' },
  { id: 'ayto',      kind: 'hall',      x: 31, y: 25, w: 5, h: 4, door: 2, name: 'Ayuntamiento' },
  { id: 'sanpedro',  kind: 'sanpedro',    x: 15, y: 31, w: 5, h: 4, door: 2, name: 'San Pedro el Viejo' },
  { id: 'tienda',    kind: 'shop',      x: 22, y: 33, w: 4, h: 3, door: 1, name: 'Ultramarinos del Coso' },
  { id: 'casa1',     kind: 'house',     x: 28, y: 33, w: 3, h: 3, door: 1, colors: ['#f0d8b0', '#b8503a'] },
  { id: 'casa2',     kind: 'house',     x: 32, y: 32, w: 4, h: 3, door: 1, colors: ['#e8e0d0', '#8a4a3a'] },
  { id: 'casino',    kind: 'casino',    x: 33, y: 39, w: 5, h: 3, door: 2, name: 'Círculo Oscense' },
  { id: 'fuente',    kind: 'fountain',  x: 25, y: 40, w: 3, h: 2, door: -1, name: 'Fuente de las Musas' },
  { id: 'centro',    kind: 'center',    x: 25, y: 46, w: 5, h: 4, door: 2, name: 'Centro Oscamon' },
  { id: 'hogar',     kind: 'house',     x: 21, y: 45, w: 3, h: 3, door: 1, name: 'Tu casa', colors: ['#f4e4c4', '#c05a3a'] },
  { id: 'lab',       kind: 'lab',       x: 31, y: 45, w: 6, h: 4, door: 2, name: 'Laboratorio del Profesor Cajal' },
  { id: 'estacion',  kind: 'station',   x: 33, y: 50, w: 6, h: 2, door: 3, name: 'Estación Intermodal' },
  { id: 'castillo',  kind: 'castle',    x: 50, y: 5, w: 7, h: 5, door: 3, name: 'Castillo de Montearagón' },
];

const SIGNS = [
  { x: 25, y: 21, text: 'NORTE: Salto de Roldán y el Pirineo.\nSUR: Huesca. ¡Bienvenido a la ciudad!' },
  { x: 22, y: 31, text: 'CATEDRAL DE SANTA MARÍA\nGótico aragonés (siglos XIII-XVI). Su portada es una joya.' },
  { x: 14, y: 29, text: 'PALACIO DE LOS REYES DE ARAGÓN\n— GIMNASIO OSCAMON DE HUESCA —\nLíder: Ramiro II el Monje.' },
  { x: 20, y: 35, text: 'SAN PEDRO EL VIEJO\nUno de los mejores conjuntos románicos de España (s. XII).' },
  { x: 21, y: 40, text: 'PLAZA DE NAVARRA\nCorazón de Huesca. Fuente de las Musas.' },
  { x: 13, y: 43, text: 'PARQUE MIGUEL SERVET\nCuidado: en la hierba alta viven Oscamon.' },
  { x: 24, y: 49, text: 'CENTRO OSCAMON\n¡Curamos gratis a tus Oscamon!' },
  { x: 30, y: 48, text: 'LABORATORIO DEL PROFESOR CAJAL\nInvestigación Oscamon del Alto Aragón.' },
  { x: 40, y: 31, text: 'RÍO ISUELA\nCruza el puente hacia Montearagón.' },
  { x: 9, y: 21, text: 'MALLOS DE RIGLOS →\nGigantes de roca roja. Hogar de buitres y Mallorroc.' },
  { x: 54, y: 12, text: 'CASTILLO DE MONTEARAGÓN\nFortaleza del siglo XI construida por Sancho Ramírez.' },
  { x: 25, y: 10, text: 'SALTO DE ROLDÁN\nCuenta la leyenda que el caballo de Roldán saltó de peña en peña...' },
  { x: 32, y: 52, text: 'ESTACIÓN INTERMODAL\nLínea Huesca-Canfranc: Ayerbe, Sabiñánigo, Jaca y Canfranc.' },
  { x: 32, y: 38, text: 'CÍRCULO OSCENSE\nEdificio modernista de 1904.' },
  { x: 15, y: 22, text: 'EL COSO\nLa calle que rodea el casco antiguo, donde estaba la muralla.' },
];

// NPC: dir = dirección a la que miran. pal = colores [pelo/gorro, camiseta, pantalón]
const NPCS = [
  { id: 'abuela', x: 28, y: 31, dir: 'down', pal: ['#d8d8d8', '#6a4a8a', '#3a3a4a'],
    text: ['Dicen que el rey Ramiro II mandó cortar las cabezas de los nobles rebeldes y las colgó como una campana...',
      '¡La leyenda de la Campana de Huesca! Desde entonces, en el Palacio vive un Oscamon con forma de campana.'] },
  { id: 'chaval', x: 26, y: 36, dir: 'left', pal: ['#3a2a1a', '#e05030', '#2a4a8a'],
    text: ['¿Has probado la trenza de Huesca? Hojaldre, nueces y pasas.', 'Pues en la hierba alta hay un Oscamon que se le parece: ¡Trenzón!'] },
  { id: 'senora', x: 35, y: 44, dir: 'down', pal: ['#8a3a2a', '#40a080', '#4a3a2a'],
    text: ['En agosto la ciudad se viste de blanco y verde por San Lorenzo.', 'Pañuelo verde y albahaca... ¡y Oscamon de fuego por todas partes!'] },
  { id: 'danzante', x: 29, y: 42, dir: 'left', pal: ['#d02030', '#f4f4f4', '#f4f4f4'],
    trainer: { name: 'Danzante Pedro', team: [['trenzon', 4], ['danzante', 5]], money: 60,
      intro: '¡Eh! ¡Los danzantes de Huesca no perdemos el ritmo! ¡Vamos a bailar!',
      lose: '¡Me has hecho perder el paso!', after: 'Entrénate bien antes de ir al Gimnasio del Palacio.' } },
  { id: 'montanera', x: 28, y: 14, dir: 'left', pal: ['#c08030', '#3070c0', '#5a4a3a'],
    trainer: { name: 'Montañera Elena', team: [['sarrion', 8], ['quebranto', 9]], money: 90,
      intro: 'Vengo de subir al Aneto. ¡Esto es un paseo! ¿Combatimos?',
      lose: '¡Uf! Más duro que la subida a Monte Perdido.', after: 'Arriba, entre las peñas del Salto de Roldán, dicen que se oye un relincho...' } },
  { id: 'pescador', x: 47, y: 19, dir: 'left', pal: ['#4a6a3a', '#7a8a4a', '#3a3a3a'],
    trainer: { name: 'Pescador Luis', team: [['ranisuela', 8], ['isuelin', 9]], money: 90,
      intro: '¡Me espantas los peces! Ahora tendrás que combatir.',
      lose: 'Se me ha escapado otra vez...', after: 'El Isuela parece tranquilo, pero cuidado con sus crecidas.' } },
  { id: 'pastor', x: 6, y: 25, dir: 'down', pal: ['#2a2a2a', '#8a6a4a', '#4a3a2a'],
    text: ['Los Mallos de Riglos miden casi 300 metros. ¡Los escaladores vienen de todo el mundo!', 'Si buscas Oscamon de roca, ve a la hierba alta de allí arriba.'] },
  { id: 'guarda', x: 55, y: 30, dir: 'left', pal: ['#3a5a2a', '#5a7a3a', '#3a3a2a'],
    trainer: { name: 'Guarda Forestal Marta', team: [['albahaquin', 11], ['cierzin', 11], ['mallorroc', 12]], money: 120,
      intro: 'Vigilo los alrededores de Montearagón. ¡Demuestra que sabes cuidar a tus Oscamon!',
      lose: 'Tienes buena mano. Ramiro II no te lo pondrá fácil.', after: 'El castillo tiene más de 900 años. ¡Respétalo!' } },
];

// Objetos en el suelo (se recogen al pisarlos)
const ITEMS_ON_MAP = [
  { id: 'it1', x: 10, y: 17, item: 'ball', qty: 3 },
  { id: 'it2', x: 59, y: 22, item: 'potion', qty: 2 },
  { id: 'it3', x: 19, y: 48, item: 'ball', qty: 2 },
  { id: 'it4', x: 28, y: 6, item: 'super', qty: 1 },
  { id: 'it5', x: 36, y: 15, item: 'potion', qty: 1 },
  { id: 'it6', x: 48, y: 40, item: 'ball', qty: 3 },
  { id: 'it7', x: 4, y: 35, item: 'super', qty: 1 },
];

// Oscamon legendario
const LEGEND = { x: 26, y: 5, sp: 'bayardo', lvl: 20 };

// Zonas de encuentros en hierba alta
const ZONES = [
  { name: 'mallos', x: 0, y: 4, w: 15, h: 18, bg: 'rock',
    list: [['mallorroc', 6, 9, 3], ['quebranto', 6, 9, 3], ['sarrion', 6, 9, 2], ['cierzin', 6, 8, 1]] },
  { name: 'norte', x: 14, y: 4, w: 26, h: 18, bg: 'grass',
    list: [['trenzon', 3, 5, 3], ['quebranto', 3, 6, 2], ['cierzin', 3, 6, 2], ['sarrion', 4, 7, 1]] },
  { name: 'parque', x: 12, y: 38, w: 10, h: 14, bg: 'grass',
    list: [['ranisuela', 2, 4, 3], ['albahaquin', 2, 4, 3], ['trenzon', 2, 4, 2]] },
  { name: 'este', x: 44, y: 4, w: 20, h: 50, bg: 'grass',
    list: [['albahaquin', 5, 8, 3], ['ranisuela', 5, 8, 2], ['danzante', 6, 9, 2], ['cierzin', 6, 9, 2], ['mallorroc', 7, 9, 1]] },
];

const START = { x: 22, y: 48, dir: 'down' };
const CENTER_SPOT = { x: 27, y: 50, dir: 'down' };

if (typeof module !== 'undefined') module.exports = { buildMap, BUILDINGS, SIGNS, NPCS, ITEMS_ON_MAP, LEGEND, ZONES, START, CENTER_SPOT, SOLID, MAP_W, MAP_H };
