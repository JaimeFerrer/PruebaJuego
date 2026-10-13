'use strict';
// ============================================================
//  Datos del juego: tipos, movimientos, especies y utilidades
// ============================================================

const TYPE_COLORS = {
  Normal: '#a8a878', Fuego: '#f08030', Agua: '#6890f0',
  Planta: '#78c850', Roca: '#b8a038', Aire: '#a890f0', Hielo: '#58b8d8',
};

// Tabla de eficacia: EFF[ataque][defensa]
const EFF = {
  Fuego:  { Planta: 2, Hielo: 2, Agua: 0.5, Roca: 0.5, Fuego: 0.5 },
  Agua:   { Fuego: 2, Roca: 2, Planta: 0.5, Agua: 0.5 },
  Planta: { Agua: 2, Roca: 2, Fuego: 0.5, Aire: 0.5, Planta: 0.5 },
  Roca:   { Fuego: 2, Aire: 2, Hielo: 2, Planta: 0.5, Roca: 0.5 },
  Hielo:  { Planta: 2, Aire: 2, Fuego: 0.5, Agua: 0.5, Hielo: 0.5 },
  Aire:   { Planta: 2, Roca: 0.5 },
  Normal: { Roca: 0.5 },
};

function effectiveness(moveType, defTypes) {
  return defTypes.reduce((m, t) => m * ((EFF[moveType] || {})[t] ?? 1), 1);
}

const MOVES = {
  placaje:     { name: 'Placaje', type: 'Normal', power: 40, acc: 95 },
  aranazo:     { name: 'Arañazo', type: 'Normal', power: 40, acc: 100 },
  envolver:    { name: 'Enrollar', type: 'Normal', power: 35, acc: 100 },
  cornada:     { name: 'Cornada', type: 'Normal', power: 60, acc: 95 },
  golpe_palo:  { name: 'Golpe de Palo', type: 'Normal', power: 60, acc: 95 },
  azucar:      { name: 'Lluvia de Azúcar', type: 'Normal', power: 55, acc: 95 },
  galope:      { name: 'Galope', type: 'Normal', power: 75, acc: 95 },
  grunido:     { name: 'Gruñido', type: 'Normal', power: 0, acc: 100, effect: { target: 'foe', stat: 'atk', stages: -1 } },
  malicioso:   { name: 'Malicioso', type: 'Normal', power: 0, acc: 100, effect: { target: 'foe', stat: 'def', stages: -1 } },
  jota:        { name: 'Jota Aragonesa', type: 'Normal', power: 0, acc: 100, effect: { target: 'self', stat: 'atk', stages: 1 } },
  endurecer:   { name: 'Endurecer', type: 'Normal', power: 0, acc: 100, effect: { target: 'self', stat: 'def', stages: 1 } },
  ascuas:      { name: 'Ascuas', type: 'Fuego', power: 40, acc: 100 },
  parrilla:    { name: 'Parrilla Ardiente', type: 'Fuego', power: 70, acc: 95 },
  hoguera:     { name: 'Hoguera San Lorenzo', type: 'Fuego', power: 95, acc: 85 },
  burbuja:     { name: 'Burbuja', type: 'Agua', power: 40, acc: 100 },
  pistola:     { name: 'Pistola Agua', type: 'Agua', power: 60, acc: 100 },
  crecida:     { name: 'Crecida del Isuela', type: 'Agua', power: 95, acc: 85 },
  hoja:        { name: 'Hoja Afilada', type: 'Planta', power: 45, acc: 100 },
  racimo:      { name: 'Racimo Bala', type: 'Planta', power: 65, acc: 95 },
  vendimia:    { name: 'Vendimia', type: 'Planta', power: 95, acc: 85 },
  albahaca:    { name: 'Aroma de Albahaca', type: 'Planta', power: 0, acc: 100, effect: { target: 'self', stat: 'def', stages: 1 } },
  lanzarrocas: { name: 'Lanzarrocas', type: 'Roca', power: 50, acc: 90 },
  desprend:    { name: 'Desprendimiento', type: 'Roca', power: 75, acc: 90 },
  campanada:   { name: 'Campanada', type: 'Roca', power: 85, acc: 95 },
  picotazo:    { name: 'Picotazo', type: 'Aire', power: 35, acc: 100 },
  tornado:     { name: 'Tornado', type: 'Aire', power: 40, acc: 100 },
  cierzo:      { name: 'Cierzo', type: 'Aire', power: 65, acc: 95 },
  salto:       { name: 'Salto de Roldán', type: 'Aire', power: 90, acc: 90 },
  escarcha:    { name: 'Escarcha', type: 'Hielo', power: 40, acc: 100 },
  carambano:   { name: 'Carámbano', type: 'Hielo', power: 65, acc: 95 },
  ventisca:    { name: 'Ventisca Pirenaica', type: 'Hielo', power: 90, acc: 85 },
};

// Especies. Todas inventadas e inspiradas en Huesca y el Alto Aragón.
const SPECIES = {
  parrillin: {
    name: 'Parrillín', types: ['Fuego'], base: { hp: 40, atk: 56, def: 43, spd: 62 }, exp: 64, catch: 0.45,
    moves: [[1, 'aranazo'], [1, 'grunido'], [5, 'ascuas'], [11, 'parrilla'], [20, 'hoguera']],
    evo: [14, 'laurenton'],
    desc: 'Nació de una brasa de las fiestas de San Lorenzo. Lleva en la barriga la marca de una parrilla.',
  },
  laurenton: {
    name: 'Laurentón', types: ['Fuego'], base: { hp: 64, atk: 82, def: 64, spd: 80 }, exp: 142, catch: 0.2,
    moves: [[1, 'aranazo'], [1, 'grunido'], [5, 'ascuas'], [11, 'parrilla'], [20, 'hoguera']],
    desc: 'Cada 10 de agosto su llama se vuelve verde como la albahaca y baila toda la noche.',
  },
  isuelin: {
    name: 'Isuelín', types: ['Agua'], base: { hp: 44, atk: 48, def: 64, spd: 44 }, exp: 64, catch: 0.45,
    moves: [[1, 'placaje'], [1, 'grunido'], [5, 'burbuja'], [11, 'pistola'], [20, 'crecida']],
    evo: [14, 'isuelon'],
    desc: 'Pececillo juguetón del río Isuela. Remonta la corriente hasta el pantano de Arguis.',
  },
  isuelon: {
    name: 'Isuelón', types: ['Agua'], base: { hp: 70, atk: 72, def: 86, spd: 62 }, exp: 142, catch: 0.2,
    moves: [[1, 'placaje'], [1, 'grunido'], [5, 'burbuja'], [11, 'pistola'], [20, 'crecida']],
    desc: 'Cuando se enfada provoca crecidas. Los oscenses lo respetan desde tiempos de Osca.',
  },
  somontin: {
    name: 'Somontín', types: ['Planta'], base: { hp: 46, atk: 50, def: 54, spd: 46 }, exp: 64, catch: 0.45,
    moves: [[1, 'placaje'], [1, 'malicioso'], [5, 'hoja'], [8, 'albahaca'], [11, 'racimo'], [20, 'vendimia']],
    evo: [14, 'somontazo'],
    desc: 'Racimo de uva del Somontano que cobró vida. Huele a mosto en septiembre.',
  },
  somontazo: {
    name: 'Somontazo', types: ['Planta'], base: { hp: 72, atk: 78, def: 80, spd: 62 }, exp: 142, catch: 0.2,
    moves: [[1, 'placaje'], [1, 'malicioso'], [5, 'hoja'], [8, 'albahaca'], [11, 'racimo'], [20, 'vendimia']],
    desc: 'Sus sarmientos se enroscan en cualquier cosa. Dicen que su vendimia es imparable.',
  },
  quebranto: {
    name: 'Quebranto', types: ['Aire'], base: { hp: 46, atk: 54, def: 40, spd: 66 }, exp: 58, catch: 0.5,
    moves: [[1, 'picotazo'], [1, 'malicioso'], [6, 'tornado'], [12, 'cierzo']],
    desc: 'Planea sobre el Pirineo buscando huesos que dejar caer contra las rocas.',
  },
  cierzin: {
    name: 'Cierzín', types: ['Aire'], base: { hp: 36, atk: 46, def: 36, spd: 82 }, exp: 52, catch: 0.55,
    moves: [[1, 'tornado'], [1, 'grunido'], [9, 'cierzo']],
    desc: 'Un remolino travieso del cierzo. Si te despeina, es que anda cerca.',
  },
  mallorroc: {
    name: 'Mallorroc', types: ['Roca'], base: { hp: 52, atk: 62, def: 82, spd: 25 }, exp: 70, catch: 0.4,
    moves: [[1, 'placaje'], [1, 'endurecer'], [6, 'lanzarrocas'], [14, 'desprend']],
    desc: 'Se desprendió de los Mallos de Riglos. Los buitres lo usan de posadero.',
  },
  albahaquin: {
    name: 'Albahaquín', types: ['Planta'], base: { hp: 46, atk: 42, def: 56, spd: 40 }, exp: 52, catch: 0.55,
    moves: [[1, 'placaje'], [1, 'albahaca'], [5, 'hoja'], [13, 'racimo']],
    desc: 'Vive en una maceta y huele a San Lorenzo. Regalarlo trae buena suerte.',
  },
  trenzon: {
    name: 'Trenzón', types: ['Normal'], base: { hp: 52, atk: 46, def: 40, spd: 52 }, exp: 50, catch: 0.6,
    moves: [[1, 'envolver'], [1, 'grunido'], [6, 'azucar']],
    desc: 'Una trenza de hojaldre con nueces y pasas que aprendió a reptar. Muy dulce.',
  },
  ranisuela: {
    name: 'Ranisuela', types: ['Agua'], base: { hp: 46, atk: 46, def: 42, spd: 56 }, exp: 52, catch: 0.55,
    moves: [[1, 'burbuja'], [1, 'grunido'], [9, 'pistola']],
    desc: 'Rana de las acequias de la Hoya. Croa a coro en las noches de verano.',
  },
  sarrion: {
    name: 'Sarrión', types: ['Normal', 'Roca'], base: { hp: 50, atk: 62, def: 46, spd: 70 }, exp: 66, catch: 0.45,
    moves: [[1, 'placaje'], [1, 'malicioso'], [7, 'cornada'], [12, 'lanzarrocas']],
    desc: 'Ágil sarrio de las peñas. Salta de roca en roca sin despeinarse.',
  },
  danzante: {
    name: 'Danzante', types: ['Normal'], base: { hp: 52, atk: 58, def: 46, spd: 56 }, exp: 62, catch: 0.45,
    moves: [[1, 'aranazo'], [1, 'jota'], [6, 'golpe_palo']],
    desc: 'Baila con sus palos al son de la gaita. Nunca pierde el ritmo.',
  },
  campanon: {
    name: 'Campanón', types: ['Roca'], base: { hp: 72, atk: 70, def: 92, spd: 30 }, exp: 120, catch: 0.15,
    moves: [[1, 'placaje'], [1, 'endurecer'], [5, 'lanzarrocas'], [15, 'campanada']],
    desc: 'Inspirado en la leyenda de la Campana de Huesca. Su tañido se oye en todo el reino.',
  },
  arminin: {
    name: 'Armiñín', types: ['Hielo'], base: { hp: 44, atk: 60, def: 42, spd: 82 }, exp: 64, catch: 0.45,
    moves: [[1, 'aranazo'], [1, 'grunido'], [8, 'escarcha'], [15, 'carambano']],
    desc: 'El armiño del Pirineo. En invierno su pelaje se vuelve blanco como la nieve de Candanchú.',
  },
  nevero: {
    name: 'Nevero', types: ['Hielo'], base: { hp: 58, atk: 46, def: 62, spd: 38 }, exp: 64, catch: 0.5,
    moves: [[1, 'placaje'], [1, 'endurecer'], [7, 'escarcha'], [14, 'carambano'], [22, 'ventisca']],
    desc: 'Una mancha de nieve que aguantó todo el verano a la sombra de un barranco. Siempre está fresquito.',
  },
  aneton: {
    name: 'Anetón', types: ['Hielo', 'Roca'], base: { hp: 80, atk: 84, def: 92, spd: 40 }, exp: 160, catch: 0.1,
    moves: [[1, 'placaje'], [1, 'endurecer'], [1, 'lanzarrocas'], [16, 'carambano'], [24, 'ventisca']],
    desc: 'Nació del glaciar del Aneto, el pico más alto del Pirineo (3.404 m). Muy pocos lo han visto.',
  },
  bayardo: {
    name: 'Bayardo', types: ['Aire', 'Normal'], base: { hp: 85, atk: 92, def: 72, spd: 100 }, exp: 200, catch: 0.12,
    moves: [[1, 'galope'], [1, 'cierzo'], [1, 'jota'], [1, 'salto']],
    desc: 'El legendario caballo de Roldán. Saltó de peña en peña y dejó su huella para siempre.',
  },
};

const DEX_ORDER = ['parrillin', 'laurenton', 'isuelin', 'isuelon', 'somontin', 'somontazo',
  'quebranto', 'cierzin', 'mallorroc', 'albahaquin', 'trenzon', 'ranisuela', 'sarrion',
  'danzante', 'campanon', 'arminin', 'nevero', 'aneton', 'bayardo'];

const ITEMS = {
  ball:   { name: 'Oscaball', price: 20, desc: 'Sirve para capturar Oscamon salvajes.' },
  potion: { name: 'Poción', price: 30, heal: 20, desc: 'Restaura 20 PS.' },
  super:  { name: 'Superpoción', price: 70, heal: 60, desc: 'Restaura 60 PS.' },
};

// ---------- Utilidades de Oscamon ----------
let _uid = 1;
function calcStat(mon, key) {
  const b = SPECIES[mon.sp].base[key];
  if (key === 'hp') return Math.floor(b * 2 * mon.lvl / 100) + mon.lvl + 10;
  return Math.floor(b * 2 * mon.lvl / 100) + 5;
}
const maxHp = m => calcStat(m, 'hp');
const expForLevel = l => l * l * l;

function movesAtLevel(sp, lvl) {
  const list = SPECIES[sp].moves.filter(([l]) => l <= lvl).map(([, m]) => m);
  return [...new Set(list)].slice(-4);
}

function makeMon(sp, lvl) {
  const m = { uid: Date.now() % 100000 * 100 + (_uid++), sp, lvl, exp: expForLevel(lvl), moves: movesAtLevel(sp, lvl) };
  m.hp = maxHp(m);
  return m;
}

const monName = m => SPECIES[m.sp].name;

if (typeof module !== 'undefined') module.exports = { SPECIES, MOVES, ITEMS, makeMon, maxHp, effectiveness, DEX_ORDER };
