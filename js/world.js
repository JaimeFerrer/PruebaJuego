'use strict';
// ============================================================
//  Mapa de la provincia de Huesca (norte arriba)
//  Las posiciones de pueblos, ríos y sierras siguen la geografía
//  real de forma aproximada (1 casilla ≈ 650 m, salvo las ciudades,
//  que están ampliadas).
// ============================================================
//  Casillas extra del mapa grande:
//  Y  campos de cereal   V  viñedos del Somontano   d  estepa de Monegros
//  A  pinar (sólido)

const WORLD_W = 200, WORLD_H = 170;
SOLID.add('A');

// Bloques detallados: el mapa antiguo de Huesca y el de Jaca se incrustan
const HUESCA_BLOCK = { src: { x: 12, y: 4, w: 50, h: 50 }, ox: 49, oy: 81 };   // casilla antigua (x,y) → (x+37, y+77)
const JACA_BLOCK = { src: { x: 1, y: 4, w: 37, h: 27 }, ox: 29, oy: 34 };      // casilla antigua (x,y) → (x+28, y+30)
const HB = (x, y) => [x + HUESCA_BLOCK.ox - HUESCA_BLOCK.src.x, y + HUESCA_BLOCK.oy - HUESCA_BLOCK.src.y];
const JB = (x, y) => [x + JACA_BLOCK.ox - JACA_BLOCK.src.x, y + JACA_BLOCK.oy - JACA_BLOCK.src.y];
const inRect = (x, y, r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
const blockRect = b => ({ x: b.ox, y: b.oy, w: b.src.w, h: b.src.h });

// ---------------- Geografía ----------------
// Ríos: [nombre, ancho, puntos]
const RIVERS = [
  ['Río Aragón', 3, [[60, 0], [60, 16], [52, 24], [40, 30], [33, 33]]],
  ['Río Aragón', 3, [[32, 61], [26, 63], [14, 59], [0, 57]]],
  ['Río Aragón Subordán', 2, [[12, 0], [12, 30], [26, 48], [26, 62]]],
  ['Río Gállego', 3, [[78, 0], [78, 14], [86, 26], [86, 62], [64, 70], [34, 72], [30, 78], [30, 100], [34, 169]]],
  ['Río Ara', 2, [[116, 20], [110, 30], [110, 44], [120, 60], [134, 64]]],
  ['Río Cinca', 3, [[156, 0], [156, 30], [146, 50], [136, 62], [138, 78], [134, 84], [136, 96], [138, 104], [138, 120], [142, 169]]],
  ['Río Ésera', 2, [[180, 0], [182, 30], [176, 52], [164, 70], [156, 90], [150, 96], [142, 98]]],
  ['Río Isuela', 2, [[80, 66], [81, 81]]],
  ['Río Isuela', 2, [[81, 131], [84, 169]]],
  ['Río Vero', 2, [[104, 88], [104, 114], [118, 126], [120, 136], [138, 140]]],
];
// Embalses: [nombre, cx, cy, rx, ry]
const LAKES = [
  ['Embalse de La Peña', 46, 69, 6, 3],
  ['Embalse de Búbal', 85, 30, 3, 4],
  ['Embalse de Mediano', 134, 85, 7, 5],
  ['Embalse de El Grado', 137, 99, 6, 4],
  ['Ibón de Ip', 54, 6, 3, 2],
];
// Sierras: [x0,y0,x1,y1, ancho, fuerza]
const RIDGES = [
  [70, 74, 126, 72, 5, 0.55],     // Sierra de Guara
  [10, 54, 40, 52, 3, 0.45],      // Sierra de San Juan de la Peña
  [30, 76, 48, 76, 3, 0.4],       // Sierra de Loarre
  [50, 66, 58, 64, 2, 0.45],      // Peña Oroel
  [146, 56, 160, 50, 4, 0.5],     // Cotiella
  [158, 74, 168, 70, 3, 0.45],    // Turbón
];

// Pueblos (plantilla de 15×11 centrada en cx,cy)
const TOWNS = [
  { id: 'ayerbe', name: 'Ayerbe', cx: 40, cy: 98, station: true,
    sign: 'AYERBE\nPueblo de la Hoya con dos palacios y una torre del reloj.',
    houses: ['Una vecina prepara longaniza de Graus. ¡Qué bien huele!', 'Aquí nació Santiago Ramón y Cajal... bueno, ¡vivió aquí de niño!'] },
  { id: 'riglos', name: 'Riglos', cx: 20, cy: 80, center: false,
    sign: 'RIGLOS\nAl pie de los Mallos. Paraíso de escaladores y buitres leonados.',
    houses: ['Un escalador se venda los dedos: "Hoy subo el Pisón".', 'Desde la ventana se ven los buitres planeando sobre los Mallos.'] },
  { id: 'hecho', name: 'Hecho', cx: 22, cy: 22,
    sign: 'HECHO\nValle de casas de piedra y chimeneas troncocónicas. Aquí se habla cheso.',
    houses: ['"¡Bienplegau!", te saluda una señora en cheso.', 'Hay una exposición de arte en plena montaña: el Museo de Escultura al Aire Libre.'] },
  { id: 'anso', name: 'Ansó', cx: 8, cy: 44, shop: false,
    sign: 'ANSÓ\nUno de los pueblos más bonitos de España. Famoso por su traje tradicional.',
    houses: ['Una abuela borda el traje ansotano para la fiesta del valle.', 'Un pastor te habla de la Mesa de los Tres Reyes, la cumbre más alta del valle.'] },
  { id: 'canfranc', name: 'Canfranc', cx: 50, cy: 13, shop: true,
    sign: 'CANFRANC\nA un paso de Francia por el túnel de Somport.',
    houses: ['"La estación tiene más de 200 metros de largo y una ventana por cada día del año", te cuentan.', 'Una montañera prepara la mochila para subir al Ibón de Ip.'] },
  { id: 'sabinanigo', name: 'Sabiñánigo', cx: 73, cy: 52, station: true,
    sign: 'SABIÑÁNIGO\nPuerta del Valle de Tena. Aquí está el Museo de Dibujo Julio Gavín.',
    houses: ['Un señor te enseña su colección de tebeos del Museo de Dibujo.', '"Por aquí pasa el río Gállego camino de Zaragoza", te explican.'] },
  { id: 'biescas', name: 'Biescas', cx: 74, cy: 34,
    sign: 'BIESCAS\nEn la entrada del Valle de Tena, junto al río Gállego.',
    houses: ['Un niño juega con un sarrio de peluche.', '"Sube a Panticosa a darte un baño en el balneario", te recomiendan.'] },
  { id: 'sallent', name: 'Sallent de Gállego', cx: 68, cy: 10, shop: true,
    sign: 'SALLENT DE GÁLLEGO\nJunto a las pistas de esquí de Formigal y la Peña Foratata.',
    houses: ['Una esquiadora encera sus esquís para Formigal.', 'El festival Pirineos Sur llena de música el embalse de Lanuza cada verano.'] },
  { id: 'panticosa', name: 'Panticosa', cx: 94, cy: 17, church: 'hall', churchName: 'Balneario',
    sign: 'PANTICOSA\nSu balneario, a 1.600 m, es famoso desde hace siglos.',
    churchText: ['Las aguas termales del Balneario de Panticosa te dejan como nuevo.'], heal: true,
    houses: ['"Arriba están los ibones de Bachimaña", te dice un guarda.', 'Un montañero sueña con subir al Garmo Negro.'] },
  { id: 'torla', name: 'Torla-Ordesa', cx: 100, cy: 37,
    sign: 'TORLA-ORDESA\nPuerta del Parque Nacional de Ordesa y Monte Perdido (1918).',
    houses: ['"El Parque Nacional se creó en 1918 para proteger al bucardo", te cuentan.', 'Un guía te enseña una foto de la Cola de Caballo.'] },
  { id: 'ainsa', name: 'Aínsa', cx: 128, cy: 70, church: 'castle', churchName: 'Castillo de Aínsa',
    sign: 'AÍNSA\nVilla medieval con una de las plazas mayores más bonitas de Aragón.',
    churchText: ['El castillo de Aínsa vigila la unión de los ríos Ara y Cinca.', 'Cada dos años se representa aquí La Morisma, una fiesta que recuerda una batalla legendaria.'],
    houses: ['Un artesano talla madera en un taller de la calle Mayor.', '"Desde aquí se ve la Peña Montañesa", te dicen señalando la ventana.'] },
  { id: 'bielsa', name: 'Bielsa', cx: 144, cy: 36,
    sign: 'BIELSA\nCerca del Valle de Pineta y el túnel a Francia.',
    houses: ['En carnaval aparecen las "trangas" con cuernos de macho cabrío. ¡Dan miedo!', 'El Valle de Pineta termina bajo el glaciar de Monte Perdido.'] },
  { id: 'benasque', name: 'Benasque', cx: 168, cy: 42, shop: true,
    sign: 'BENASQUE\nCapital de la montaña: a sus pies, el Aneto (3.404 m).',
    houses: ['"El Aneto es el pico más alto de los Pirineos", presume un guía.', 'Aquí se habla patués, el aragonés de Benasque.'] },
  { id: 'graus', name: 'Graus', cx: 152, cy: 104,
    sign: 'GRAUS\nCapital de la Ribagorza. ¡Famosa por su longaniza!',
    houses: ['Una carnicera te ofrece longaniza de Graus. ¡Qué pinta!', 'La basílica de la Virgen de la Peña mira al pueblo desde la roca.'] },
  { id: 'alquezar', name: 'Alquézar', cx: 114, cy: 104, church: 'castle', churchName: 'Colegiata de Alquézar',
    sign: 'ALQUÉZAR\nPueblo medieval colgado sobre el cañón del río Vero, en la Sierra de Guara.',
    churchText: ['La colegiata de Alquézar se levanta sobre un antiguo castillo musulmán.', 'Desde lo alto ves las pasarelas del río Vero.'],
    houses: ['Un barranquista se seca después de bajar el cañón del Vero.', 'En las cuevas del Vero hay pinturas rupestres de hace miles de años.'] },
  { id: 'barbastro', name: 'Barbastro', cx: 128, cy: 128, station: false,
    sign: 'BARBASTRO\nCapital del Somontano: vino, catedral renacentista y el río Vero.',
    churchText: ['La catedral de Barbastro tiene un retablo mayor de alabastro, empezado por Damián Forment.'],
    houses: ['Un enólogo te habla de las variedades del Somontano.', '"El Gimnasio está en la bodega, al este de la ciudad", te indican.'] },
  { id: 'monzon', name: 'Monzón', cx: 126, cy: 150,
    sign: 'MONZÓN\nA orillas del Cinca, bajo su castillo templario.',
    houses: ['"En el castillo se crió el rey Jaime I el Conquistador", te cuentan.', 'Cada septiembre se celebra la Feria del Libro Aragonés.'] },
  { id: 'sarinena', name: 'Sariñena', cx: 95, cy: 158, shop: false,
    sign: 'SARIÑENA\nEn el corazón de Los Monegros, junto a su laguna.',
    houses: ['"La laguna de Sariñena está llena de aves en invierno", te dice un ornitólogo.', 'El cierzo sopla tan fuerte que se lleva los sombreros.'] },
];

// Carreteras (camino de tierra de 2 casillas). Los extremos sobre un bloque deben ser casillas transitables.
const ROADS = [
  [HB(11, 30), [44, 104], [40, 98]],                                     // Huesca → Ayerbe
  [[40, 98], [38, 92], [38, 86]],                                        // Ayerbe → Loarre
  [[40, 98], [31, 90], [20, 80]],                                        // Ayerbe → Riglos
  [[20, 80], [20, 66]],                                                  // Riglos → Mallos
  [[20, 75], [21, 62]],                                                  // Riglos → San Juan de la Peña
  [[21, 62], [30, 63], [45, 61]],                                        // San Juan de la Peña → Jaca (sur)
  [HB(58, 3), [92, 66], [80, 58], [73, 52]],                             // Huesca → Monrepós → Sabiñánigo
  [[73, 52], JB(38, 14)],                                                // Sabiñánigo → Jaca (este)
  [JB(20, 3), [48, 26], [50, 24]],                                       // Jaca → Canfranc
  [JB(0, 18), [24, 36], [22, 22]],                                       // Jaca → Hecho
  [[22, 22], [14, 32], [8, 44]],                                         // Hecho → Ansó
  [[73, 52], [74, 34]],                                                  // Sabiñánigo → Biescas
  [[74, 34], [70, 20], [68, 10]],                                        // Biescas → Sallent
  [[74, 34], [84, 26], [94, 17]],                                        // Biescas → Panticosa
  [[74, 34], [100, 37]],                                                 // Biescas → Torla (Cotefablo)
  [[100, 37], [108, 28], [116, 24]],                                     // Torla → Ordesa
  [[100, 37], [102, 52], [116, 66], [128, 70]],                          // Torla → Aínsa
  [[128, 70], [134, 52], [144, 36]],                                     // Aínsa → Bielsa
  [[128, 70], [124, 84], [124, 110], [128, 128]],                        // Aínsa → Barbastro
  [[128, 128], [114, 104]],                                              // Barbastro → Alquézar
  [[128, 128], [110, 116], HB(62, 32)],                                  // Barbastro → Huesca (este)
  [[128, 128], [126, 150]],                                              // Barbastro → Monzón
  [[128, 128], [146, 112], [152, 104]],                                  // Barbastro → Graus
  [[152, 104], [160, 80], [166, 60], [168, 42]],                         // Graus → Benasque
  [[168, 42], [176, 32], [186, 24]],                                     // Benasque → Aneto
  [HB(26, 54), [70, 145], [95, 158]],                                    // Huesca → Sariñena
  [[95, 158], [126, 150]],                                               // Sariñena → Monzón
];

// Lugares especiales fuera de los pueblos
const LANDMARKS = [
  { id: 'loarre', kind: 'loarre', x: 34, y: 80, w: 9, h: 6, door: 4, name: 'Castillo de Loarre' },
  { id: 'sjpena', kind: 'monastery', x: 18, y: 57, w: 7, h: 4, door: 3, name: 'Monasterio de San Juan de la Peña' },
  { id: 'canfranc_est', kind: 'bigstation', x: 43, y: 20, w: 14, h: 4, door: 7, name: 'Estación Internacional de Canfranc', station: 'canfranc' },
  { id: 'mediano', kind: 'tower', x: 134, y: 84, w: 1, h: 2, door: -1, name: 'Torre de Mediano' },
  { id: 'monzon_castillo', kind: 'castle', x: 123, y: 140, w: 7, h: 5, door: 3, name: 'Castillo de Monzón' },
  { id: 'b_gym', kind: 'bodega', x: 137, y: 124, w: 6, h: 4, door: 3, name: 'Bodega Gimnasio' },
  { id: 'refugio', kind: 'house', x: 115, y: 26, w: 3, h: 3, door: 1, name: 'Refugio de Góriz', colors: ['#d8c8a8', '#5a6a7a'] },
  { id: 'refugio_aneto', kind: 'house', x: 185, y: 20, w: 3, h: 3, door: 1, name: 'Refugio de la Renclusa', colors: ['#d8c8a8', '#5a6a7a'] },
];

// Regiones para el nombre que aparece en pantalla y los encuentros salvajes
// lv: niveles mín-máx ; list: [especie, peso]
const REGIONS = [
  { name: 'Aneto', x: 176, y: 0, w: 24, h: 32, bg: 'snow', lv: [28, 32], list: [['aneton', 1], ['nevero', 3], ['marmotin', 3], ['arminin', 2]] },
  { name: 'Valle de Ordesa', x: 100, y: 0, w: 28, h: 32, bg: 'rock', lv: [22, 27], list: [['marmotin', 3], ['sarrion', 3], ['quebranto', 2], ['truchon', 2], ['nevero', 1]] },
  { name: 'Valle de Hecho y Ansó', x: 0, y: 0, w: 36, h: 52, bg: 'grass', lv: [16, 20], list: [['marmotin', 3], ['truchon', 2], ['sarrion', 2], ['arminin', 2], ['quebranto', 1]] },
  { name: 'Valle del Aragón', x: 36, y: 0, w: 28, h: 32, bg: 'snow', lv: [17, 21], list: [['nevero', 3], ['arminin', 3], ['marmotin', 2]] },
  { name: 'Valle de Tena', x: 64, y: 0, w: 36, h: 46, bg: 'rock', lv: [18, 23], list: [['marmotin', 3], ['truchon', 2], ['nevero', 2], ['sarrion', 2]] },
  { name: 'Sobrarbe', x: 128, y: 0, w: 48, h: 64, bg: 'rock', lv: [20, 25], list: [['sarrion', 3], ['marmotin', 2], ['quebranto', 2], ['truchon', 2], ['mallorroc', 1]] },
  { name: 'Ribagorza', x: 146, y: 32, w: 54, h: 90, bg: 'grass', lv: [22, 26], list: [['truchon', 3], ['sarrion', 2], ['danzante', 2], ['albahaquin', 2], ['quebranto', 1]] },
  { name: 'Jacetania', x: 14, y: 30, w: 56, h: 36, bg: 'snow', lv: [13, 17], list: [['arminin', 3], ['nevero', 3], ['sarrion', 2], ['quebranto', 1], ['aneton', 1]] },
  { name: 'Mallos de Riglos', x: 6, y: 62, w: 26, h: 16, bg: 'rock', lv: [8, 11], list: [['mallorroc', 3], ['quebranto', 3], ['sarrion', 2], ['almenazo', 1]] },
  { name: 'Sierra de Loarre', x: 26, y: 66, w: 24, h: 40, bg: 'rock', lv: [6, 9], list: [['almenazo', 3], ['trenzon', 2], ['cierzin', 2], ['albahaquin', 2]] },
  { name: 'Sierra de Guara', x: 64, y: 56, w: 64, h: 25, bg: 'rock', lv: [11, 14], list: [['quebranto', 3], ['sarrion', 3], ['mallorroc', 2], ['cierzin', 2]] },
  { name: 'Sobrarbe', x: 100, y: 32, w: 46, h: 60, bg: 'grass', lv: [18, 22], list: [['sarrion', 3], ['truchon', 2], ['marmotin', 2], ['danzante', 2]] },
  { name: 'Somontano', x: 99, y: 92, w: 47, h: 50, bg: 'grass', lv: [10, 14], list: [['somontin', 1], ['albahaquin', 3], ['danzante', 2], ['ranisuela', 2], ['truchon', 1]] },
  { name: 'Cinca Medio', x: 112, y: 142, w: 88, h: 28, bg: 'grass', lv: [12, 15], list: [['ranisuela', 2], ['truchon', 2], ['danzante', 2], ['cierzin', 2], ['almenazo', 1]] },
  { name: 'Los Monegros', x: 40, y: 131, w: 72, h: 39, bg: 'rock', lv: [9, 13], list: [['cierzin', 3], ['trenzon', 2], ['sarrion', 2], ['quebranto', 2]] },
  { name: 'Prepirineo', x: 0, y: 0, w: 200, h: 66, bg: 'grass', lv: [14, 18], list: [['sarrion', 3], ['quebranto', 2], ['marmotin', 2], ['truchon', 2], ['cierzin', 1]] },
  { name: 'Hoya de Huesca', x: 0, y: 66, w: 200, h: 104, bg: 'grass', lv: [4, 7], list: [['trenzon', 3], ['albahaquin', 3], ['ranisuela', 2], ['cierzin', 2], ['danzante', 1]] },
];

// Encuentros dentro de Huesca ciudad y alrededores (coordenadas antiguas)
const HUESCA_ZONES = [
  { name: 'parque', x: 12, y: 38, w: 10, h: 14, bg: 'grass', lv: [2, 3], list: [['trenzon', 3], ['albahaquin', 2], ['ranisuela', 2]] },
  { name: 'norte', x: 12, y: 4, w: 30, h: 18, bg: 'grass', lv: [2, 4], list: [['trenzon', 3], ['cierzin', 2], ['albahaquin', 2]] },
  { name: 'este', x: 41, y: 4, w: 23, h: 50, bg: 'grass', lv: [3, 5], list: [['albahaquin', 3], ['ranisuela', 2], ['trenzon', 2], ['cierzin', 1]] },
];

// ---------------- Datos trasladados al mapa grande ----------------
const shift = (list, f) => list.map(o => { const [x, y] = f(o.x, o.y); return Object.assign({}, o, { x, y }); });
const insideSrc = (o, b) => inRect(o.x, o.y, b.src);

const W_BUILDINGS = [], W_SIGNS = [], W_NPCS = [], W_ITEMS = [];
const STATIONS = {};       // id → { name, x, y }
const CENTERS = [];        // lugares de reaparición

function initWorldData() {
  W_BUILDINGS.length = W_SIGNS.length = W_NPCS.length = W_ITEMS.length = 0;
  // Huesca
  for (const b of shift(BUILDINGS.filter(b => insideSrc(b, HUESCA_BLOCK)), HB)) W_BUILDINGS.push(b);
  for (const s of shift(SIGNS.filter(s => insideSrc(s, HUESCA_BLOCK)), HB)) W_SIGNS.push(s);
  for (const n of shift(NPCS.filter(n => insideSrc(n, HUESCA_BLOCK)), HB)) W_NPCS.push(n);
  for (const i of shift(ITEMS_ON_MAP.filter(i => insideSrc(i, HUESCA_BLOCK)), HB)) W_ITEMS.push(i);
  // Jaca
  for (const b of shift(JACA_BUILDINGS, JB)) W_BUILDINGS.push(b);
  for (const s of shift(JACA_SIGNS, JB)) W_SIGNS.push(s);
  for (const n of shift(JACA_NPCS, JB)) W_NPCS.push(n);
  for (const i of shift(JACA_ITEMS, JB)) W_ITEMS.push(i);
  // Estaciones de los bloques
  W_BUILDINGS.find(b => b.id === 'estacion').station = 'huesca';
  W_BUILDINGS.find(b => b.id === 'j_estacion').station = 'jaca';
  // Pueblos
  for (const t of TOWNS) {
    const ox = t.cx - 7, oy = t.cy - 5, p = t.id + '_';
    W_BUILDINGS.push({ id: p + 'iglesia', kind: t.church || 'church', x: ox + 1, y: oy + 1, w: 5, h: 4, door: 2, town: t.name,
      name: t.churchName || 'Iglesia', text: t.churchText || [`La iglesia de ${t.name} es de piedra y tiene siglos de historia.`], heal: t.heal });
    if (t.center !== false) W_BUILDINGS.push({ id: p + 'centro', kind: 'center', x: ox + 9, y: oy + 1, w: 5, h: 4, door: 2, town: t.name, name: 'Centro Oscamon' });
    else W_BUILDINGS.push({ id: p + 'casa0', kind: 'house', x: ox + 10, y: oy + 2, w: 3, h: 3, door: 1, town: t.name, text: [t.houses[0]], colors: ['#e8dcc4', '#8a5a3a'] });
    W_BUILDINGS.push({ id: p + 'casa1', kind: 'house', x: ox + 1, y: oy + 6, w: 3, h: 3, door: 1, town: t.name, text: [t.houses[0]], colors: ['#f0e0c0', '#b8503a'] });
    if (t.shop !== false) W_BUILDINGS.push({ id: p + 'tienda', kind: 'shop', x: ox + 5, y: oy + 6, w: 4, h: 3, door: 1, town: t.name, name: 'Tienda' });
    else W_BUILDINGS.push({ id: p + 'casa3', kind: 'house', x: ox + 6, y: oy + 6, w: 3, h: 3, door: 1, town: t.name, text: [t.houses[1]], colors: ['#e0d4bc', '#6a4a3a'] });
    W_BUILDINGS.push({ id: p + 'casa2', kind: 'house', x: ox + 10, y: oy + 6, w: 3, h: 3, door: 1, town: t.name, text: [t.houses[1]], colors: ['#ece4d4', '#9a4a32'] });
    if (t.station) {
      W_BUILDINGS.push({ id: p + 'estacion', kind: 'station', x: t.cx - 3, y: oy + 11, w: 6, h: 2, door: 3, town: t.name, name: 'Estación de ' + t.name, station: t.id });
    }
    W_SIGNS.push({ x: ox + 7, y: oy + 2, text: t.sign });
  }
  for (const l of LANDMARKS) W_BUILDINGS.push(Object.assign({}, l));
  for (const b of W_BUILDINGS) {
    if (b.station) STATIONS[b.station] = { name: b.station === 'huesca' ? 'Huesca' : b.station === 'jaca' ? 'Jaca' : b.station === 'canfranc' ? 'Canfranc' : b.town, x: b.x + b.door, y: b.y + b.h, dir: 'down' };
    if (b.kind === 'center') CENTERS.push({ id: b.id, x: b.x + b.door, y: b.y + b.h, dir: 'down' });
  }
  W_SIGNS.push(
    { x: 37, y: 87, text: 'CASTILLO DE LOARRE\nEl castillo románico mejor conservado de Europa (siglos XI-XII).' },
    { x: 24, y: 62, text: 'MONASTERIO DE SAN JUAN DE LA PEÑA\nConstruido bajo una enorme roca. Panteón de los primeros reyes de Aragón.' },
    { x: 22, y: 76, text: 'MALLOS DE RIGLOS\nTorres de conglomerado rojo de casi 300 m.' },
    { x: 49, y: 25, text: 'ESTACIÓN INTERNACIONAL DE CANFRANC (1928)\nUna joya modernista entre montañas.' },
    { x: 125, y: 81, text: 'EMBALSE DE MEDIANO\nLa torre de la iglesia del pueblo inundado aún asoma sobre el agua.' },
    { x: 114, y: 26, text: 'PARQUE NACIONAL DE ORDESA Y MONTE PERDIDO\nAl fondo, la Cola de Caballo. Monte Perdido: 3.355 m.' },
    { x: 184, y: 25, text: 'ANETO (3.404 m)\nEl pico más alto de los Pirineos. Su glaciar es muy delicado.' },
    { x: 136, y: 128, text: 'BODEGA GIMNASIO DE BARBASTRO\nLíder: Vero, la Bodeguera. Tipo Planta.' },
    { x: 92, y: 68, text: 'PUERTO DE MONREPÓS\nLa carretera de Huesca a Sabiñánigo cruza la sierra.' },
    { x: 90, y: 150, text: 'LOS MONEGROS\nEstepa de yesos y sabinas. ¡Cuidado con el cierzo!' },
  );
  W_ITEMS.push(
    { id: 'w1', x: 18, y: 68, item: 'ball', qty: 3 }, { id: 'w2', x: 40, y: 88, item: 'potion', qty: 3 },
    { id: 'w3', x: 104, y: 70, item: 'super', qty: 2 }, { id: 'w4', x: 60, y: 150, item: 'ball', qty: 5 },
    { id: 'w5', x: 112, y: 116, item: 'super', qty: 2 }, { id: 'w6', x: 30, y: 30, item: 'ball', qty: 5 },
    { id: 'w7', x: 120, y: 24, item: 'super', qty: 3 }, { id: 'w8', x: 160, y: 60, item: 'ball', qty: 5 },
    { id: 'w9', x: 188, y: 24, item: 'super', qty: 3 }, { id: 'w10', x: 88, y: 22, item: 'potion', qty: 5 },
  );
  W_NPCS.push(
    { id: 'consejera', ...(() => { const [x, y] = HB(24, 48); return { x, y }; })(), dir: 'down', pal: ['#e0a040', '#40a060', '#3a3a5a'],
      text: ['¡Hola! Te doy unos consejos para entrenar:', '1. Lucha primero en la hierba del Parque Miguel Servet: allí los Oscamon son de nivel 2 o 3.',
        '2. Mira las flechas del menú de ataques: ▲ es muy eficaz y ▼ es poco eficaz. ¡Usa los ▲!',
        '3. Cura a tus Oscamon en el Centro o en tu casa antes de que se debiliten. Las Pociones también ayudan.',
        '4. Captura más Oscamon: todos los del equipo ganan experiencia, aunque no luchen.'] },
    { id: 'loarre_npc', x: 40, y: 87, dir: 'left', pal: ['#7a6a5a', '#8a3a2a', '#3a3a3a'],
      trainer: { name: 'Caballero Sancho', team: [['almenazo', 9], ['danzante', 10]], money: 100,
        intro: '¡Alto! Este castillo lo mandó construir el rey Sancho III el Mayor. ¡Defiéndete!', lose: '¡Las murallas han caído!',
        after: 'Aquí se rodaron escenas de la película "El reino de los cielos".' } },
    { id: 'riglos_esc', x: 22, y: 70, dir: 'down', pal: ['#e0c020', '#e04020', '#3a3a5a'],
      trainer: { name: 'Escaladora Ana', team: [['mallorroc', 10], ['quebranto', 11]], money: 110,
        intro: '¡Acabo de bajar del Mallo Pisón! ¿Combatimos?', lose: '¡Me he quedado sin cuerda!', after: 'Los buitres leonados anidan en las paredes de los Mallos.' } },
    { id: 'guara_npc', x: 94, y: 62, dir: 'down', pal: ['#3a3a3a', '#d06020', '#3a4a6a'],
      trainer: { name: 'Barranquista Jorge', team: [['ranisuela', 12], ['sarrion', 13], ['quebranto', 13]], money: 130,
        intro: '¡La Sierra de Guara es el paraíso de los barrancos! Y de los combates.', lose: '¡Me has arrastrado como una riada!', after: 'Si sigues al norte llegarás a Sabiñánigo.' } },
    { id: 'monegros_npc', x: 76, y: 150, dir: 'left', pal: ['#c0a060', '#e0e0d0', '#6a5a4a'],
      trainer: { name: 'Pastor Andrés', team: [['cierzin', 11], ['trenzon', 12], ['sarrion', 12]], money: 120,
        intro: 'Llevo las ovejas por Monegros desde que era un crío. ¿Te atreves?', lose: '¡Qué cierzo de entrenador!', after: 'Las sabinas de Monegros tienen cientos de años.' } },
    { id: 'tena_npc', x: 76, y: 42, dir: 'down', pal: ['#2a5a8a', '#f0f0f0', '#2a2a3a'],
      trainer: { name: 'Esquiadora Marta', team: [['nevero', 19], ['arminin', 20], ['marmotin', 20]], money: 200,
        intro: '¡Vengo de Formigal y vengo con ganas!', lose: '¡Me he salido de la pista!', after: 'Sube a Panticosa: su balneario te cura a todo el equipo.' } },
    { id: 'ordesa_npc', x: 106, y: 30, dir: 'left', pal: ['#5a3a1a', '#3a7a3a', '#4a3a2a'],
      trainer: { name: 'Guarda del Parque Elena', team: [['marmotin', 23], ['sarrion', 24], ['quebranto', 25]], money: 240,
        intro: 'Protejo el Parque Nacional. ¡Demuestra que lo mereces!', lose: 'Respetas la montaña. Bien.', after: 'Dicen que el espíritu del bucardo aún vive junto a la Cola de Caballo...' } },
    { id: 'benasque_npc', x: 172, y: 36, dir: 'down', pal: ['#8a2a2a', '#f0c030', '#3a3a3a'],
      trainer: { name: 'Montañero Pablo', team: [['nevero', 25], ['marmotin', 25], ['aneton', 27]], money: 260,
        intro: 'He subido al Aneto doce veces. ¡A ver cuánto aguantas tú!', lose: '¡Me has dejado sin aliento!', after: 'Arriba, en el glaciar del Aneto, viven los Anetón.' } },
    { id: 'ainsa_npc', x: 130, y: 76, dir: 'left', pal: ['#a02a2a', '#e8e0c8', '#4a3a2a'],
      trainer: { name: 'Juglar Mateo', team: [['danzante', 20], ['truchon', 21], ['mallorroc', 21]], money: 210,
        intro: '¡Canto historias de La Morisma! Y ahora cantaré tu derrota.', lose: 'Compondré una canción sobre ti.', after: 'Desde Aínsa puedes ir a Bielsa o bajar hacia Barbastro.' } },
    { id: 'somontano_npc', x: 120, y: 118, dir: 'right', pal: ['#6a2a5a', '#e8d8c8', '#4a3a2a'],
      trainer: { name: 'Vendimiadora Clara', team: [['albahaquin', 12], ['somontin', 13]], money: 130,
        intro: '¡Estamos de vendimia! Una pausa para un combate.', lose: '¡Uy, se me ha caído el cesto de uvas!', after: 'Vero, la Líder del Gimnasio, cuida las mejores cepas del Somontano.' } },
  );
}

// ---------------- Construcción del mapa ----------------
function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const sm = t => t * t * (3 - 2 * t);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  const u = sm(xf), v = sm(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, s) => vnoise(x, y, s) * 0.55 + vnoise(x * 2, y * 2, s + 7) * 0.3 + vnoise(x * 4, y * 4, s + 13) * 0.15;

function distToSeg(px, py, [x0, y0], [x1, y1]) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}
function distToPoly(px, py, pts) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distToSeg(px, py, pts[i], pts[i + 1]));
  return d;
}
function walkPoly(pts, fn) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    for (let k = 0; k <= n; k++) fn(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n));
  }
}

function buildWorld() {
  const W = WORLD_W, H = WORLD_H;
  const m = Array.from({ length: H }, () => Array(W).fill('.'));
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, c) => { if (inb(x, y)) m[y][x] = c; };
  const get = (x, y) => (inb(x, y) ? m[y][x] : null);
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
  const blocks = [blockRect(HUESCA_BLOCK), blockRect(JACA_BLOCK)];
  const inBlock = (x, y) => blocks.some(r => inRect(x, y, r));
  const flats = [...TOWNS.map(t => [t.cx, t.cy, 10]), [38, 82, 7], [21, 59, 6], [50, 18, 9], [112, 26, 8], [184, 24, 6],
    [73, 46, 26], [47, 47, 26], [74, 105, 32]];

  // 1) Relieve
  // Distancia aproximada a los ríos (transformada de distancia en dos pasadas)
  const rdist = new Float32Array(W * H).fill(1e9);
  for (const [, , pts] of RIVERS) walkPoly(pts, (x, y) => { if (inb(x, y)) rdist[y * W + x] = 0; });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x > 0) rdist[i] = Math.min(rdist[i], rdist[i - 1] + 1);
    if (y > 0) rdist[i] = Math.min(rdist[i], rdist[i - W] + 1, x > 0 ? rdist[i - W - 1] + 1.41 : 1e9, x < W - 1 ? rdist[i - W + 1] + 1.41 : 1e9);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (x < W - 1) rdist[i] = Math.min(rdist[i], rdist[i + 1] + 1);
    if (y < H - 1) rdist[i] = Math.min(rdist[i], rdist[i + W] + 1, x < W - 1 ? rdist[i + W + 1] + 1.41 : 1e9, x > 0 ? rdist[i + W - 1] + 1.41 : 1e9);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let e = Math.max(0, Math.min(1, (58 - y) / 46)) * 0.95;             // Pirineo: más alto cuanto más al norte
    e += (fbm(x / 13, y / 13, 1) - 0.5) * 0.55;
    for (const [x0, y0, x1, y1, w, f] of RIDGES) {
      if (x < Math.min(x0, x1) - w * 2 || x > Math.max(x0, x1) + w * 2 || y < Math.min(y0, y1) - w * 2 || y > Math.max(y0, y1) + w * 2) continue;
      const d = distToSeg(x, y, [x0, y0], [x1, y1]);
      if (d < w * 2) e += f * Math.max(0, 1 - d / (w * 2)) * (0.7 + fbm(x / 5, y / 5, 3) * 0.6);
    }
    e -= 0.5 * Math.max(0, 1 - rdist[y * W + x] / 6);                     // los ríos excavan valles
    for (const [cx, cy, r] of flats) { const d = Math.hypot(x - cx, y - cy); if (d < r) e -= 0.6 * (1 - d / r); }
    const n2 = fbm(x / 6, y / 6, 21);
    let c;
    if (e > 0.98) c = 'n';
    else if (e > 0.74) c = 'M';
    else if (e > 0.6) c = y < 75 ? 'A' : 'T';
    else if (e > 0.5) c = n2 > 0.55 ? ',' : (hash2(x, y, 5) < 0.35 ? (y < 75 ? 'A' : 'T') : '.');
    else if (y > 136 && x < 116 && x > 36) c = n2 > 0.66 ? ',' : hash2(x, y, 9) < 0.04 ? 'T' : 'd';      // Monegros
    else if (x > 104 && x < 146 && y > 108 && y < 142) c = n2 > 0.68 ? ',' : (y % 3 === 0 ? '.' : 'V');   // Somontano
    else if (y > 92) c = n2 > 0.64 ? ',' : hash2(x, y, 4) < 0.03 ? 'T' : (fbm(x / 9, y / 9, 31) > 0.5 ? 'Y' : '.');
    else c = n2 > 0.6 ? ',' : hash2(x, y, 6) < 0.12 ? (y < 75 ? 'A' : 'T') : hash2(x, y, 8) < 0.04 ? 'F' : '.';
    m[y][x] = c;
  }
  // Glaciares
  for (const [cx, cy, rx, ry] of [[190, 12, 9, 7], [118, 10, 8, 5]]) for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, 'n');
  // Mallos de Riglos
  for (const [x, y, w, h] of [[10, 64, 3, 7], [13, 63, 2, 9], [16, 65, 3, 6], [24, 64, 2, 8], [26, 66, 3, 5], [9, 70, 2, 3]]) rect(x, y, w, h, 'R');
  rect(14, 72, 12, 2, ','); rect(19, 63, 3, 10, ',');

  // 2) Ríos y embalses
  for (const [, w, pts] of RIVERS) walkPoly(pts, (x, y) => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) set(x + i - (w >> 1), y + j - (w >> 1), '~'); });
  for (const [, cx, cy, rx, ry] of LAKES) for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, '~');
  // Cola de Caballo
  rect(118, 14, 1, 9, '~'); rect(117, 22, 3, 2, '~');

  // 3) Carreteras
  for (const pts of ROADS) walkPoly(pts, (x, y) => {
    for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const X = x + i, Y = y + j;
      if (inBlock(X, Y)) continue;
      set(X, Y, get(X, Y) === '~' ? 'H' : 'D');
    }
  });

  // 4) Bloques detallados
  const stamp = (src, b, patch) => {
    patch(src);
    for (let j = 0; j < b.src.h; j++) for (let i = 0; i < b.src.w; i++) set(b.ox + i, b.oy + j, src[b.src.y + j][b.src.x + i]);
  };
  stamp(buildMap(), HUESCA_BLOCK, g => {
    for (let x = 44; x <= 61; x++) g[32][x] = g[32][x] === '~' || g[32][x] === 'H' ? 'H' : 'D';      // salida este
    for (let x = 53; x <= 58; x++) g[18][x] = 'D';
    for (let y = 4; y <= 18; y++) g[y][58] = 'D';                                                      // salida norte
    g[53][26] = 'D'; g[53][27] = 'D';                                                                  // paso a nivel
    for (let y = 4; y < 10; y++) for (let x = 12; x < 19; x++) if (g[y][x] === 'M') g[y][x] = 'A';
  });
  stamp(buildJaca(), JACA_BLOCK, g => {
    for (let y = 4; y <= 6; y++) { g[y][20] = 'D'; g[y][19] = 'D'; }                                   // salida norte
    for (let x = 1; x <= 8; x++) if (g[18][x] !== 'H') g[18][x] = g[18][x] === '~' ? 'H' : 'D';        // salida oeste
  });

  // 5) Pueblos y lugares
  for (const t of TOWNS) {
    const ox = t.cx - 7, oy = t.cy - 5;
    rect(ox - 1, oy - 1, 17, 13, '.');
    rect(ox, oy, 15, 11, '=');
    rect(ox + 1, oy + 5, 13, 1, 'S');
    if (t.station) rect(t.cx - 4, oy + 11, 8, 3, '=');
  }
  rect(31, 77, 15, 11, 'M'); rect(32, 79, 13, 7, '.'); rect(36, 86, 5, 2, 'D');            // cerro de Loarre
  rect(15, 53, 13, 4, 'M'); rect(16, 57, 11, 5, '.');                                         // roca de San Juan de la Peña
  rect(41, 19, 18, 7, '=');                                                                   // explanada de Canfranc
  rect(120, 139, 13, 7, '.'); rect(121, 145, 11, 1, '=');                                    // cerro de Monzón
  rect(134, 122, 10, 8, '=');                                                                 // bodega de Barbastro
  rect(110, 20, 14, 8, '.'); rect(113, 24, 8, 4, ',');                                        // pradera de Ordesa
  rect(117, 22, 3, 2, '~');
  rect(180, 18, 12, 9, '.'); rect(182, 26, 8, 2, ',');                                        // la Renclusa
  for (const b of W_BUILDINGS) {
    if (inBlock(b.x, b.y)) continue;
    if (b.kind === 'tower') { rect(b.x, b.y, b.w, b.h, 'B'); continue; }
    rect(b.x, b.y, b.w, b.h, 'B');
    if (b.door >= 0 && SOLID.has(get(b.x + b.door, b.y + b.h))) set(b.x + b.door, b.y + b.h, '=');
  }
  for (const o of [...W_SIGNS, ...W_NPCS, ...W_ITEMS, ...WORLD_LEGENDS])
    if (SOLID.has(get(o.x, o.y))) set(o.x, o.y, '.');
  // Bordes del mundo
  for (let x = 0; x < W; x++) { set(x, 0, 'n'); set(x, H - 1, 'T'); }
  for (let y = 0; y < H; y++) { set(0, y, y < 60 ? 'M' : 'T'); set(W - 1, y, y < 60 ? 'M' : 'T'); }
  return m;
}

const WORLD_LEGENDS = [
  { ...(() => { const [x, y] = HB(LEGEND.x, LEGEND.y); return { x, y }; })(), sp: 'bayardo', lvl: 20, flag: 'legend',
    intro: ['¡Un relincho resuena entre las peñas del Salto de Roldán!', '¡Es BAYARDO, el legendario caballo de Roldán!'] },
  { x: 116, y: 22, sp: 'bucardo', lvl: 35, flag: 'legend2',
    intro: ['Junto a la Cola de Caballo, una silueta con enormes cuernos curvos te observa...', '¡Es el BUCARDO, el espíritu de la cabra montés del Pirineo!'] },
];

// ---------------- Nombres de zona y encuentros ----------------
function worldZoneName(x, y) {
  if (inRect(x, y, blockRect(HUESCA_BLOCK))) {
    const ox = x - HB(0, 0)[0], oy = y - HB(0, 0)[1];
    if (oy < 10 && ox >= 18 && ox <= 36) return 'Salto de Roldán';
    if (oy < 22 && ox < 41) return 'Ruta del Salto de Roldán';
    if (ox >= 41) return oy < 13 ? 'Castillo de Montearagón' : 'Riberas del Isuela';
    if (ox <= 20 && oy >= 39 && oy <= 50) return 'Parque Miguel Servet';
    if (ox >= 13 && ox <= 38 && oy >= 23 && oy <= 37) return 'Huesca · Casco Antiguo';
    return 'Huesca';
  }
  if (inRect(x, y, blockRect(JACA_BLOCK))) return jacaZoneName(x - JB(0, 0)[0], y - JB(0, 0)[1]);
  for (const t of TOWNS) if (Math.abs(x - t.cx) <= 9 && Math.abs(y - t.cy) <= 7) return t.name;
  for (const l of LANDMARKS) if (l.name && l.kind !== 'house' && Math.abs(x - (l.x + l.w / 2)) <= l.w / 2 + 4 && Math.abs(y - (l.y + l.h / 2)) <= l.h / 2 + 4) return l.name;
  const r = REGIONS.find(r => inRect(x, y, r));
  return r ? r.name : 'Alto Aragón';
}

function worldZoneAt(x, y) {
  if (inRect(x, y, blockRect(HUESCA_BLOCK))) {
    const ox = x - HB(0, 0)[0], oy = y - HB(0, 0)[1];
    return HUESCA_ZONES.find(z => inRect(ox, oy, z)) || HUESCA_ZONES[1];
  }
  if (inRect(x, y, blockRect(JACA_BLOCK))) return REGIONS.find(r => r.name === 'Jacetania');
  return REGIONS.find(r => inRect(x, y, r)) || REGIONS[REGIONS.length - 1];
}

// Etiquetas del mapa de la provincia
const MAP_LABELS = [
  ...TOWNS.map(t => [t.name.replace(' de Gállego', '').replace('-Ordesa', ''), t.cx, t.cy]),
  ['HUESCA', HB(26, 37)[0], HB(26, 37)[1]], ['Jaca', JB(19, 15)[0], JB(19, 15)[1]],
  ['Loarre', 38, 82], ['Aneto', 188, 14], ['M. Perdido', 118, 10], ['S. J. Peña', 21, 58],
];

initWorldData();

const MAPS = {
  world: {
    id: 'world', name: 'Alto Aragón', w: WORLD_W, h: WORLD_H, build: buildWorld,
    buildings: W_BUILDINGS, signs: W_SIGNS, npcs: W_NPCS, items: W_ITEMS, legends: WORLD_LEGENDS,
    zoneName: worldZoneName, zoneAt: worldZoneAt,
  },
};
const HOME_CENTER = (() => { const [x, y] = HB(CENTER_SPOT.x, CENTER_SPOT.y); return { x, y, dir: 'down' }; })();
const WORLD_START = (() => { const [x, y] = HB(START.x, START.y); return { x, y, dir: 'down' }; })();

// Convierte una posición de una partida antigua (mapas separados) al mapa grande
function migratePos(map, pos) {
  if (map === 'jaca') { const [x, y] = JB(pos.x, pos.y); return { x, y, dir: pos.dir }; }
  if (map === 'huesca' || !map) {
    if (!inRect(pos.x, pos.y, HUESCA_BLOCK.src)) return { ...WORLD_START };
    const [x, y] = HB(pos.x, pos.y); return { x, y, dir: pos.dir };
  }
  return pos;
}

if (typeof module !== 'undefined') module.exports = { MAPS, STATIONS, CENTERS, WORLD_START, HOME_CENTER, REGIONS, TOWNS };
