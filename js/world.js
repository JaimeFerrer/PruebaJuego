'use strict';
// ============================================================
//  Mapa de la provincia de Huesca (norte arriba)
//  Las posiciones de pueblos, ríos y sierras siguen la geografía
//  real de forma aproximada. Se definen en una cuadrícula "geográfica"
//  de 200×170 y al cargar se multiplican por ESCALA, mientras que los
//  pueblos y edificios conservan su tamaño: así hay rutas largas entre
//  pueblos, como en los juegos originales.
// ============================================================
//  Casillas extra del mapa grande:
//  Y  campos de cereal   V  viñedos del Somontano   d  estepa de Monegros
//  A  pinar (sólido)

const ESCALA = 3;
const WORLD_W = 200 * ESCALA, WORLD_H = 170 * ESCALA;
const sc = v => Math.round(v * ESCALA);
SOLID.add('A');

// Bloques detallados: el mapa antiguo de Huesca y el de Jaca se incrustan
// El centro de cada ciudad (en coordenadas del bloque) se coloca sobre su posición geográfica
const HUESCA_BLOCK = { src: { x: 12, y: 4, w: 50, h: 50 }, ox: sc(63) - 14, oy: sc(114) - 33 };
const JACA_BLOCK = { src: { x: 1, y: 4, w: 37, h: 27 }, ox: sc(47) - 18, oy: sc(45) - 11 };
// HB/JB: casilla del mapa antiguo → casilla del mapa grande (ya en coordenadas finales)
const absPt = (x, y) => { const p = [x, y]; p.abs = true; return p; };
const HB = (x, y) => absPt(x + HUESCA_BLOCK.ox - HUESCA_BLOCK.src.x, y + HUESCA_BLOCK.oy - HUESCA_BLOCK.src.y);
const JB = (x, y) => absPt(x + JACA_BLOCK.ox - JACA_BLOCK.src.x, y + JACA_BLOCK.oy - JACA_BLOCK.src.y);
const inRect = (x, y, r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
const blockRect = b => ({ x: b.ox, y: b.oy, w: b.src.w, h: b.src.h });

// ---------------- Geografía ----------------
// Ríos: [nombre, ancho, puntos]
const RIVERS = [
  ['Río Aragón', 3, [[60, 0], [60, 26], [52, 28], [40, 30], [33, 33]]],
  ['Río Aragón', 3, [[32, 61], [26, 63], [14, 59], [0, 57]]],
  ['Río Aragón Subordán', 2, [[12, 0], [12, 30], [26, 38], [26, 62]]],
  ['Río Gállego', 3, [[83, 0], [83, 14], [89, 26], [89, 62], [64, 70], [34, 72], [31, 78], [28, 90], [26, 100], [30, 130], [34, 169]]],
  ['Río Ara', 2, [[116, 20], [112, 30], [112, 44], [120, 60], [134, 64]]],
  ['Río Cinca', 3, [[156, 0], [156, 30], [146, 50], [136, 62], [138, 78], [134, 84], [136, 96], [138, 104], [138, 120], [142, 169]]],
  ['Río Ésera', 2, [[180, 0], [182, 30], [176, 52], [164, 70], [156, 90], [150, 96], [142, 98]]],
  ['Río Isuela', 2, [[80, 66], [81, 81]]],
  ['Río Isuela', 2, [[81, 131], [84, 169]]],
  ['Río Vero', 2, [[104, 88], [104, 114], [112, 130], [116, 140], [138, 142]]],
];
// Embalses: [nombre, cx, cy, rx, ry]
const LAKES = [
  ['Embalse de La Peña', 46, 69, 6, 3],
  ['Embalse de Búbal', 86, 21, 3, 3],
  ['Embalse de Mediano', 134, 85, 7, 5],
  ['Embalse de El Grado', 137, 99, 6, 4],
  ['Ibón de Ip', 36, 8, 3, 2],
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

// Pueblos (plantilla de 19×12 centrada en cx,cy)
const TOWN_W = 19, TOWN_H = 12;
const STYLE_COLORS = {
  pirineo:   { walls: ['#cfc6b4', '#bdb3a0', '#d8d0c0', '#c4baa6'], roofs: ['#4a5060', '#5a6070', '#3e4452'] },
  hoya:      { walls: ['#f0e0c0', '#ece4d4', '#f4e8d0', '#e8d8b8'], roofs: ['#b8503a', '#a8583a', '#c06040'] },
  somontano: { walls: ['#f6eedc', '#efe2c8', '#faf4e6', '#ece0c4'], roofs: ['#b04a32', '#9a4a32', '#c45a3a'] },
  monegros:  { walls: ['#dcc49a', '#d4b88a', '#e0cca4', '#d0b080'], roofs: ['#a86a40', '#9a5a38', '#b07448'] },
};
const GENERIC_HOUSE = [
  '¡Buenas! ¿Quieres un trozo de longaniza? Está recién hecha.',
  'Mi abuelo dice que antes se iba andando a todas partes. ¡Y con cierzo!',
  'Estoy preparando un ternasco al horno para la cena.',
  '¿Has visto los Oscamon que salen en la hierba alta? ¡Mi hijo quiere capturar uno!',
  'En la tele dan el tiempo: mañana, cierzo y cielo despejado.',
  'Aquí tienes tu casa. Bueno, no del todo... ¡pero ponte cómodo!',
  'Colecciono fotos antiguas del pueblo. ¡Mira cuánto ha cambiado!',
  'Mi perro se llama Moncayo, como la montaña.',
];
const TOWNS = [
  { id: 'ayerbe', style: 'hoya', special: { kind: 'hall', name: 'Palacio de los Marqueses de Ayerbe', text: ['Un palacio renacentista del siglo XV que preside la plaza.', 'Aquí se recuerda que Santiago Ramón y Cajal pasó parte de su infancia en Ayerbe.'] }, name: 'Ayerbe', cx: 38, cy: 99, station: true,
    sign: 'AYERBE\nPueblo de la Hoya con dos palacios y una torre del reloj.',
    houses: ['Una vecina prepara longaniza de Graus. ¡Qué bien huele!', 'Aquí nació Santiago Ramón y Cajal... bueno, ¡vivió aquí de niño!'] },
  { id: 'riglos', style: 'hoya', special: { kind: 'house', name: 'Refugio de Riglos', heal: true, text: ['El refugio de escaladores de Riglos te ofrece algo caliente y un rato de descanso.'] }, name: 'Riglos', cx: 18, cy: 79, center: false,
    sign: 'RIGLOS\nAl pie de los Mallos. Paraíso de escaladores y buitres leonados.',
    houses: ['Un escalador se venda los dedos: "Hoy subo el Pisón".', 'Desde la ventana se ven los buitres planeando sobre los Mallos.'] },
  { id: 'hecho', style: 'pirineo', special: { kind: 'hall', name: 'Museo Etnológico', text: ['Aperos de labranza, trajes chesos y fotos antiguas del Valle de Hecho.'] }, name: 'Hecho', cx: 23, cy: 22,
    sign: 'HECHO\nValle de casas de piedra y chimeneas troncocónicas. Aquí se habla cheso.',
    houses: ['"¡Bienplegau!", te saluda una señora en cheso.', 'Hay una exposición de arte en plena montaña: el Museo de Escultura al Aire Libre.'] },
  { id: 'anso', style: 'pirineo', special: { kind: 'hall', name: 'Museo del Traje Ansotano', text: ['Trajes de fiesta ansotanos, bordados a mano durante meses.'] }, name: 'Ansó', cx: 11, cy: 44, shop: false,
    sign: 'ANSÓ\nUno de los pueblos más bonitos de España. Famoso por su traje tradicional.',
    houses: ['Una abuela borda el traje ansotano para la fiesta del valle.', 'Un pastor te habla de la Mesa de los Tres Reyes, la cumbre más alta del valle.'] },
  { id: 'canfranc', style: 'pirineo', special: { kind: 'castle', name: 'Torre de Fusileros', text: ['Una torre defensiva del siglo XIX que vigilaba el camino de Somport.'] }, name: 'Canfranc', cx: 49, cy: 11, shop: true,
    sign: 'CANFRANC\nA un paso de Francia por el túnel de Somport.',
    houses: ['"La estación tiene más de 200 metros de largo y una ventana por cada día del año", te cuentan.', 'Una montañera prepara la mochila para subir al Ibón de Ip.'] },
  { id: 'sabinanigo', style: 'pirineo', special: { kind: 'pool', name: 'Gimnasio del Gállego', gym: 'sabinanigo' }, name: 'Sabiñánigo', cx: 76, cy: 53, station: true,
    sign: 'SABIÑÁNIGO\nPuerta del Valle de Tena. Aquí está el Museo de Dibujo Julio Gavín.',
    houses: ['Un señor te enseña su colección de tebeos del Museo de Dibujo.', '"Por aquí pasa el río Gállego camino de Zaragoza", te explican.'] },
  { id: 'biescas', style: 'pirineo', special: { kind: 'church', name: 'Ermita de Santa Elena', text: ['Una ermita junto a un dolmen y una fortaleza, vigilando la entrada del Valle de Tena.'] }, name: 'Biescas', cx: 77, cy: 33,
    sign: 'BIESCAS\nEn la entrada del Valle de Tena, junto al río Gállego.',
    houses: ['Un niño juega con un sarrio de peluche.', '"Sube a Panticosa a darte un baño en el balneario", te recomiendan.'] },
  { id: 'sallent', style: 'pirineo', special: { kind: 'hall', name: 'Oficina de Pistas de Formigal', text: ['Formigal es una de las estaciones de esquí más grandes de España.'] }, name: 'Sallent de Gállego', cx: 71, cy: 9, shop: true,
    sign: 'SALLENT DE GÁLLEGO\nJunto a las pistas de esquí de Formigal y la Peña Foratata.',
    houses: ['Una esquiadora encera sus esquís para Formigal.', 'El festival Pirineos Sur llena de música el embalse de Lanuza cada verano.'] },
  { id: 'panticosa', style: 'pirineo', special: { kind: 'casino', name: 'Casino del Balneario', text: ['Un antiguo casino de principios del siglo XX, junto al lago del balneario.'] }, name: 'Panticosa', cx: 97, cy: 16, church: 'hall', churchName: 'Balneario',
    sign: 'PANTICOSA\nSu balneario, a 1.600 m, es famoso desde hace siglos.',
    churchText: ['Las aguas termales del Balneario de Panticosa te dejan como nuevo.'], heal: true,
    houses: ['"Arriba están los ibones de Bachimaña", te dice un guarda.', 'Un montañero sueña con subir al Garmo Negro.'] },
  { id: 'torla', style: 'pirineo', special: { kind: 'chalet', name: 'Gimnasio de Ordesa', gym: 'ordesa' }, name: 'Torla-Ordesa', cx: 100, cy: 37,
    sign: 'TORLA-ORDESA\nPuerta del Parque Nacional de Ordesa y Monte Perdido (1918).',
    houses: ['"El Parque Nacional se creó en 1918 para proteger al bucardo", te cuentan.', 'Un guía te enseña una foto de la Cola de Caballo.'] },
  { id: 'ainsa', style: 'pirineo', special: { kind: 'church', name: 'Iglesia de Santa María', text: ['Iglesia románica del siglo XII, junto a la Plaza Mayor porticada.'] }, name: 'Aínsa', cx: 125, cy: 72, church: 'castle', churchName: 'Castillo de Aínsa', churchGym: 'ainsa',
    sign: 'AÍNSA\nVilla medieval con una de las plazas mayores más bonitas de Aragón.',
    churchText: ['El castillo de Aínsa vigila la unión de los ríos Ara y Cinca.', 'Cada dos años se representa aquí La Morisma, una fiesta que recuerda una batalla legendaria.'],
    houses: ['Un artesano talla madera en un taller de la calle Mayor.', '"Desde aquí se ve la Peña Montañesa", te dicen señalando la ventana.'] },
  { id: 'bielsa', style: 'pirineo', special: { kind: 'hall', name: 'Museo de Bielsa', text: ['Máscaras de las trangas del carnaval y la historia del Valle de Pineta.'] }, name: 'Bielsa', cx: 140, cy: 36,
    sign: 'BIELSA\nCerca del Valle de Pineta y el túnel a Francia.',
    houses: ['En carnaval aparecen las "trangas" con cuernos de macho cabrío. ¡Dan miedo!', 'El Valle de Pineta termina bajo el glaciar de Monte Perdido.'] },
  { id: 'benasque', style: 'pirineo', special: { kind: 'chalet', name: 'Gimnasio del Aneto', gym: 'benasque' }, name: 'Benasque', cx: 166, cy: 40, shop: true,
    sign: 'BENASQUE\nCapital de la montaña: a sus pies, el Aneto (3.404 m).',
    houses: ['"El Aneto es el pico más alto de los Pirineos", presume un guía.', 'Aquí se habla patués, el aragonés de Benasque.'] },
  { id: 'graus', style: 'somontano', special: { kind: 'church', name: 'Basílica de la Virgen de la Peña', text: ['Una basílica renacentista construida sobre la roca, mirando al pueblo.'] }, name: 'Graus', cx: 152, cy: 104,
    sign: 'GRAUS\nCapital de la Ribagorza. ¡Famosa por su longaniza!',
    houses: ['Una carnicera te ofrece longaniza de Graus. ¡Qué pinta!', 'La basílica de la Virgen de la Peña mira al pueblo desde la roca.'] },
  { id: 'alquezar', style: 'somontano', special: { kind: 'hall', name: 'Centro del Río Vero', text: ['Información sobre el cañón del Vero y sus pinturas rupestres.'] }, name: 'Alquézar', cx: 115, cy: 104, church: 'colegiata', churchName: 'Colegiata de Alquézar',
    sign: 'ALQUÉZAR\nPueblo medieval colgado sobre el cañón del río Vero, en la Sierra de Guara.',
    churchText: ['La colegiata de Alquézar se levanta sobre un antiguo castillo musulmán.', 'Desde lo alto ves las pasarelas del río Vero.'],
    houses: ['Un barranquista se seca después de bajar el cañón del Vero.', 'En las cuevas del Vero hay pinturas rupestres de hace miles de años.'] },
  { id: 'barbastro', style: 'somontano', special: { kind: 'hall', name: 'Museo del Vino', text: ['La Denominación de Origen Somontano reúne más de 30 bodegas.'] }, name: 'Barbastro', cx: 128, cy: 128, station: false,
    sign: 'BARBASTRO\nCapital del Somontano: vino, catedral renacentista y el río Vero.',
    churchText: ['La catedral de Barbastro tiene un retablo mayor de alabastro, empezado por Damián Forment.'],
    houses: ['Un enólogo te habla de las variedades del Somontano.', '"El Gimnasio está en la bodega, al este de la ciudad", te indican.'] },
  { id: 'monzon', style: 'somontano', special: { kind: 'hall', name: 'Ayuntamiento de Monzón', text: ['Monzón acogió varias veces las Cortes de la Corona de Aragón.'] }, name: 'Monzón', cx: 127, cy: 153,
    sign: 'MONZÓN\nA orillas del Cinca, bajo su castillo templario.',
    houses: ['"En el castillo se crió el rey Jaime I el Conquistador", te cuentan.', 'Cada septiembre se celebra la Feria del Libro Aragonés.'] },
  { id: 'sarinena', style: 'monegros', special: { kind: 'hall', name: 'Centro de la Laguna', text: ['La laguna de Sariñena es la mayor de Los Monegros y un refugio para las aves.'] }, name: 'Sariñena', cx: 95, cy: 158, shop: false,
    sign: 'SARIÑENA\nEn el corazón de Los Monegros, junto a su laguna.',
    houses: ['"La laguna de Sariñena está llena de aves en invierno", te dice un ornitólogo.', 'El cierzo sopla tan fuerte que se lleva los sombreros.'] },
];

// Carreteras (camino de tierra de 2 casillas). Los extremos sobre un bloque deben ser casillas transitables.
const ROADS = [
  [HB(11, 30), [44, 104], [38, 99]],                                     // Huesca → Ayerbe
  [[38, 99], [38, 92], [38, 86]],                                        // Ayerbe → Loarre
  [[38, 99], [30, 90], [18, 79]],                                        // Ayerbe → Riglos
  [[19, 73], [19, 66]],                                                  // Riglos → Mallos
  [[15, 73], [21, 62]],                                                  // Riglos → San Juan de la Peña
  [[21, 62], [30, 63], [45, 61]],                                        // San Juan de la Peña → Jaca (sur)
  [HB(58, 3), [92, 66], [80, 58], [76, 53]],                             // Huesca → Monrepós → Sabiñánigo
  [[76, 53], JB(38, 14)],                                                // Sabiñánigo → Jaca (este)
  [JB(20, 3), [48, 26], [50, 24]],                                       // Jaca → Canfranc
  [JB(0, 18), [24, 36], [23, 22]],                                       // Jaca → Hecho
  [[23, 22], [16, 32], [11, 44]],                                         // Hecho → Ansó
  [[76, 53], [77, 33]],                                                  // Sabiñánigo → Biescas
  [[77, 33], [72, 20], [71, 9]],                                        // Biescas → Sallent
  [[77, 33], [86, 24], [97, 16]],                                        // Biescas → Panticosa
  [[77, 33], [100, 37]],                                                 // Biescas → Torla (Cotefablo)
  [[100, 37], [108, 28], [116, 24]],                                     // Torla → Ordesa
  [[100, 37], [102, 52], [116, 66], [125, 72]],                          // Torla → Aínsa
  [[125, 72], [134, 52], [140, 36]],                                     // Aínsa → Bielsa
  [[125, 72], [124, 84], [124, 110], [128, 128]],                        // Aínsa → Barbastro
  [[128, 128], [115, 104]],                                              // Barbastro → Alquézar
  [[128, 128], [110, 116], HB(62, 32)],                                  // Barbastro → Huesca (este)
  [[128, 128], [127, 153]],                                              // Barbastro → Monzón
  [[128, 128], [146, 112], [152, 104]],                                  // Barbastro → Graus
  [[152, 104], [160, 80], [166, 60], [166, 40]],                         // Graus → Benasque
  [[166, 40], [176, 32], [186, 24]],                                     // Benasque → Aneto
  [HB(26, 54), [70, 145], [95, 158]],                                    // Huesca → Sariñena
  [[95, 158], [127, 153]],                                               // Sariñena → Monzón
  [[128, 128], [143, 129]],                                              // Barbastro → Bodega Gimnasio
];
// Nombre de cada ruta (mismo orden que ROADS); el número de ruta es su posición + 1
const ROAD_NAMES = [
  'Huesca - Ayerbe', 'Ayerbe - Castillo de Loarre', 'Ayerbe - Riglos', 'Riglos - Mallos de Riglos', 'Riglos - San Juan de la Peña',
  'San Juan de la Peña - Jaca', 'Huesca - Monrepós - Sabiñánigo', 'Sabiñánigo - Jaca', 'Jaca - Canfranc', 'Jaca - Hecho',
  'Hecho - Ansó', 'Sabiñánigo - Biescas', 'Biescas - Sallent de Gállego', 'Biescas - Panticosa', 'Biescas - Torla (Cotefablo)',
  'Torla - Valle de Ordesa', 'Torla - Aínsa', 'Aínsa - Bielsa', 'Aínsa - Barbastro', 'Barbastro - Alquézar', 'Barbastro - Huesca',
  'Barbastro - Monzón', 'Barbastro - Graus', 'Graus - Benasque', 'Benasque - Aneto', 'Huesca - Sariñena', 'Sariñena - Monzón',
  'Barbastro - Bodega',
];

// Lugares especiales fuera de los pueblos
const LANDMARKS = [
  { id: 'loarre', kind: 'loarre', x: 34, y: 80, w: 9, h: 6, door: 4, name: 'Castillo de Loarre' , sign: 'CASTILLO DE LOARRE\nEl castillo románico mejor conservado de Europa (siglos XI-XII).' },
  { id: 'sjpena', kind: 'monastery', x: 18, y: 57, w: 7, h: 4, door: 3, name: 'Monasterio de San Juan de la Peña' , sign: 'MONASTERIO DE SAN JUAN DE LA PEÑA\nConstruido bajo una enorme roca. Panteón de los primeros reyes de Aragón.' },
  { id: 'canfranc_est', kind: 'bigstation', x: 43, y: 20, w: 14, h: 4, door: 7, name: 'Estación Internacional de Canfranc', station: 'canfranc' , sign: 'ESTACIÓN INTERNACIONAL DE CANFRANC (1928)\nUna joya modernista entre montañas.' },
  { id: 'mediano', kind: 'tower', x: 134, y: 84, w: 1, h: 2, door: -1, name: 'Torre de Mediano' },
  { id: 'monzon_castillo', kind: 'castle', x: 123, y: 140, w: 7, h: 5, door: 3, name: 'Castillo de Monzón', gym: 'monzon' , sign: 'CASTILLO DE MONZÓN\nFortaleza templaria. GIMNASIO: Líder Berenguer, tipo Fuego.' },
  { id: 'b_gym', kind: 'bodega', x: 140, y: 124, w: 6, h: 4, door: 3, name: 'Bodega Gimnasio', gym: 'barbastro' , sign: 'BODEGA GIMNASIO DE BARBASTRO\nLíder: Vero, la Bodeguera. Tipo Planta.' },
  { id: 'refugio', kind: 'house', x: 115, y: 26, w: 3, h: 3, door: 1, name: 'Refugio de Góriz', colors: ['#d8c8a8', '#5a6a7a'] },
  { id: 'refugio_aneto', kind: 'house', x: 185, y: 20, w: 3, h: 3, door: 1, name: 'Refugio de la Renclusa', colors: ['#d8c8a8', '#5a6a7a'] },
];

// Regiones para el nombre que aparece en pantalla y los encuentros salvajes
// lv: niveles mín-máx ; list: [especie, peso]
const REGIONS = [
  { name: 'Aneto', x: 176, y: 0, w: 24, h: 32, bg: 'snow', lv: [30, 35], list: [['aneton', 1], ['nevero', 3], ['marmotin', 3], ['arminin', 2]] },
  { name: 'Valle de Ordesa', x: 100, y: 0, w: 28, h: 32, bg: 'rock', lv: [26, 31], list: [['marmotin', 3], ['sarrion', 3], ['buitron', 2], ['truchon', 2], ['nevero', 1]] },
  { name: 'Valle de Hecho y Ansó', x: 0, y: 0, w: 36, h: 52, bg: 'grass', lv: [16, 20], list: [['marmotin', 3], ['truchon', 2], ['sarrion', 2], ['arminin', 2], ['quebranto', 1]] },
  { name: 'Valle del Aragón', x: 36, y: 0, w: 28, h: 32, bg: 'snow', lv: [17, 21], list: [['nevero', 3], ['arminin', 3], ['marmotin', 2]] },
  { name: 'Valle de Tena', x: 64, y: 0, w: 36, h: 46, bg: 'rock', lv: [18, 23], list: [['marmotin', 3], ['truchon', 2], ['nevero', 2], ['sarrion', 2]] },
  { name: 'Sobrarbe', x: 128, y: 0, w: 48, h: 64, bg: 'rock', lv: [20, 25], list: [['sarrion', 3], ['marmotin', 2], ['quebranto', 2], ['truchon', 2], ['mallorroc', 1]] },
  { name: 'Ribagorza', x: 146, y: 32, w: 54, h: 90, bg: 'grass', lv: [22, 26], list: [['truchon', 3], ['sarrion', 2], ['danzante', 2], ['albahaquin', 2], ['quebranto', 1]] },
  { name: 'Jacetania', x: 14, y: 30, w: 56, h: 36, bg: 'snow', lv: [13, 17], list: [['arminin', 3], ['nevero', 3], ['sarrion', 2], ['quebranto', 1], ['aneton', 1]] },
  { name: 'Mallos de Riglos', x: 6, y: 62, w: 26, h: 16, bg: 'rock', lv: [8, 11], list: [['mallorroc', 3], ['quebranto', 3], ['buitron', 2], ['sarrion', 2], ['almenazo', 1]] },
  { name: 'Sierra de Loarre', x: 26, y: 66, w: 24, h: 40, bg: 'rock', lv: [6, 9], list: [['almenazo', 3], ['trenzon', 2], ['cierzin', 2], ['albahaquin', 2]] },
  { name: 'Sierra de Guara', x: 64, y: 56, w: 64, h: 25, bg: 'rock', lv: [11, 14], list: [['quebranto', 3], ['sarrion', 3], ['mallorroc', 2], ['cierzin', 2], ['buitron', 1]] },
  { name: 'Sobrarbe', x: 100, y: 32, w: 46, h: 60, bg: 'grass', lv: [18, 22], list: [['sarrion', 3], ['truchon', 2], ['marmotin', 2], ['danzante', 2]] },
  { name: 'Somontano', x: 99, y: 92, w: 47, h: 50, bg: 'grass', lv: [10, 14], list: [['somontin', 1], ['albahaquin', 3], ['danzante', 2], ['ranisuela', 2], ['fogaril', 2], ['truchon', 1]] },
  { name: 'Cinca Medio', x: 112, y: 142, w: 88, h: 28, bg: 'grass', lv: [12, 15], list: [['ranisuela', 2], ['truchon', 2], ['fogaril', 3], ['cierzin', 2], ['antorchon', 1], ['almenazo', 1]] },
  { name: 'Los Monegros', x: 40, y: 131, w: 72, h: 39, bg: 'rock', lv: [9, 13], list: [['cierzin', 3], ['fogaril', 3], ['trenzon', 2], ['sarrion', 2], ['quebranto', 1]] },
  { name: 'Prepirineo', x: 0, y: 0, w: 200, h: 66, bg: 'grass', lv: [14, 18], list: [['sarrion', 3], ['quebranto', 2], ['marmotin', 2], ['truchon', 2], ['cierzin', 1]] },
  { name: 'Hoya de Huesca', x: 0, y: 66, w: 200, h: 104, bg: 'grass', lv: [4, 7], list: [['trenzon', 3], ['albahaquin', 3], ['ranisuela', 2], ['cierzin', 2], ['danzante', 1]] },
];

// ---------------- De coordenadas geográficas al mapa grande ----------------
(function escalarGeografia() {
  const toW = p => (p.abs ? p : [sc(p[0]), sc(p[1])]);
  for (const r of RIVERS) { r[1] += 1; r[2] = r[2].map(toW); }
  for (const l of LAKES) { for (let i = 1; i <= 4; i++) l[i] = sc(l[i]); }
  for (const r of RIDGES) { for (let i = 0; i < 4; i++) r[i] = sc(r[i]); r[4] *= ESCALA; }
  for (const t of TOWNS) { t.gcx = t.cx; t.gcy = t.cy; t.cx = sc(t.cx); t.cy = sc(t.cy); }
  for (const l of LANDMARKS) { l.x = sc(l.x + l.w / 2) - (l.w >> 1); l.y = sc(l.y + l.h / 2) - (l.h >> 1); }
  for (const r of REGIONS) { r.x *= ESCALA; r.y *= ESCALA; r.w *= ESCALA; r.h *= ESCALA; }
  // Los extremos de las carreteras se enganchan al centro del pueblo o a la puerta del lugar más cercano
  const anchors = [...TOWNS.map(t => [t.cx, t.cy]), ...LANDMARKS.filter(l => l.door >= 0).map(l => [l.x + l.door, l.y + l.h + 1])];
  for (let i = 0; i < ROADS.length; i++) {
    ROADS[i] = ROADS[i].map(toW).map(p => {
      if (p.abs) return p;
      let best = null, bd = 9;
      for (const a of anchors) { const d = Math.hypot(a[0] - p[0], a[1] - p[1]); if (d < bd) { bd = d; best = a; } }
      return best ? [best[0], best[1]] : p;
    });
  }
})();
const geo = o => Object.assign({}, o, { x: sc(o.x), y: sc(o.y) });

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
  const water = waterMask();
  const dry = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (water.has(i + ',' + j)) return false; return true; };
  for (const t of TOWNS) {
    const ox = t.cx - (TOWN_W >> 1), oy = t.cy - (TOWN_H >> 1), p = t.id + '_';
    const pal = STYLE_COLORS[t.style || 'hoya'];
    let n = 0;
    const add = b => { if (dry(b.x, b.y, b.w, b.h)) W_BUILDINGS.push(Object.assign({ town: t.name, style: t.style }, b)); };
    const house = (id, x, y, w, h) => {
      const k = n++;
      add({ id: p + id, kind: 'house', x, y, w, h, door: w >> 1, name: 'Casa', text: [(t.houses.concat(GENERIC_HOUSE))[(k * 3 + t.cx) % (t.houses.length + GENERIC_HOUSE.length)]],
        colors: [pal.walls[k % pal.walls.length], pal.roofs[(k + t.cy) % pal.roofs.length]] });
    };
    // Fila de arriba: iglesia, Centro y edificio emblemático
    add({ id: p + 'iglesia', kind: t.church || 'church', x: ox + 1, y: oy + 1, w: 5, h: 4, door: 2,
      name: t.churchName || 'Iglesia de ' + t.name, text: t.churchText || [`La iglesia de ${t.name} es de piedra y tiene siglos de historia.`], heal: t.heal, gym: t.churchGym });
    if (t.center !== false) add({ id: p + 'centro', kind: 'center', x: ox + 7, y: oy + 1, w: 5, h: 4, door: 2, name: 'Centro Oscamon' });
    else house('casa0', ox + 8, oy + 2, 3, 3);
    if (t.special) add(Object.assign({ id: p + 'especial', x: ox + 13, y: oy + 1, w: 5, h: 4, door: 2 }, t.special,
      t.special.kind === 'house' ? { colors: [pal.walls[0], pal.roofs[0]] } : {}));
    else house('casa1', ox + 14, oy + 2, 3, 3);
    // Fila de abajo: casas y tienda
    house('casa2', ox + 1, oy + 8, 3, 3);
    if (t.shop !== false) add({ id: p + 'tienda', kind: 'shop', x: ox + 5, y: oy + 8, w: 4, h: 3, door: 1, name: 'Tienda' });
    else house('casa3', ox + 5, oy + 8, 4, 3);
    house('casa4', ox + 10, oy + 8, 3, 3);
    house('casa5', ox + 14, oy + 8, 4, 3);
    if (t.station) add({ id: p + 'estacion', kind: 'station', x: t.cx - 3, y: oy + TOWN_H, w: 6, h: 2, door: 3, name: 'Estación de ' + t.name, station: t.id });
    W_SIGNS.push({ x: ox + 6, y: oy + 6, text: t.sign });
    W_NPCS.push({ id: p + 'vecino', x: ox + 13, y: oy + 6, dir: 'down', pal: [pal.roofs[1], pal.walls[2] === '#d8d0c0' ? '#4a7a5a' : '#c05050', '#3a3a4a'],
      text: [t.houses[1], `¡Bienvenido a ${t.name}!`] });
  }
  for (const l of LANDMARKS) W_BUILDINGS.push(Object.assign({}, l));
  for (const b of W_BUILDINGS) {
    if (b.station) STATIONS[b.station] = { name: b.station === 'huesca' ? 'Huesca' : b.station === 'jaca' ? 'Jaca' : b.station === 'canfranc' ? 'Canfranc' : b.town, x: b.x + b.door, y: b.y + b.h, dir: 'down' };
    if (b.kind === 'center') CENTERS.push({ id: b.id, x: b.x + b.door, y: b.y + b.h, dir: 'down' });
  }
  for (const l of LANDMARKS) if (l.sign) W_SIGNS.push({ x: l.x + l.door - 2, y: l.y + l.h + 1, text: l.sign });
  W_SIGNS.push(
    geo({ x: 24, y: 71, text: 'MALLOS DE RIGLOS\nTorres de conglomerado rojo de casi 300 m.' }),
    geo({ x: 125, y: 81, text: 'EMBALSE DE MEDIANO\nLa torre de la iglesia del pueblo inundado aún asoma sobre el agua.' }),
    geo({ x: 114, y: 26, text: 'PARQUE NACIONAL DE ORDESA Y MONTE PERDIDO\nAl fondo, la Cola de Caballo. Monte Perdido: 3.355 m.' }),
    geo({ x: 184, y: 25, text: 'ANETO (3.404 m)\nEl pico más alto de los Pirineos. Su glaciar es muy delicado.' }),
    geo({ x: 92, y: 68, text: 'PUERTO DE MONREPÓS\nLa carretera de Huesca a Sabiñánigo cruza la sierra.' }),
    geo({ x: 90, y: 150, text: 'LOS MONEGROS\nEstepa de yesos y sabinas. ¡Cuidado con el cierzo!' }),
  );
  W_ITEMS.push(
    geo({ id: 'w1', x: 18, y: 68, item: 'ball', qty: 3 }), geo({ id: 'w2', x: 40, y: 88, item: 'potion', qty: 3 }),
    geo({ id: 'w3', x: 104, y: 70, item: 'super', qty: 2 }), geo({ id: 'w4', x: 60, y: 150, item: 'ball', qty: 5 }),
    geo({ id: 'w5', x: 112, y: 116, item: 'super', qty: 2 }), geo({ id: 'w6', x: 30, y: 30, item: 'ball', qty: 5 }),
    geo({ id: 'w7', x: 120, y: 24, item: 'super', qty: 3 }), geo({ id: 'w8', x: 160, y: 60, item: 'ball', qty: 5 }),
    geo({ id: 'w9', x: 188, y: 24, item: 'super', qty: 3 }), geo({ id: 'w10', x: 88, y: 22, item: 'potion', qty: 5 }),
  );
  W_NPCS.push(
    { id: 'consejera', ...(() => { const [x, y] = HB(24, 48); return { x, y }; })(), dir: 'down', pal: ['#e0a040', '#40a060', '#3a3a5a'],
      text: ['¡Hola! Te doy unos consejos para entrenar:', '1. Lucha primero en la hierba del Parque Miguel Servet: allí los Oscamon son de nivel 2 o 3.',
        '2. Mira las flechas del menú de ataques: ▲ es muy eficaz y ▼ es poco eficaz. ¡Usa los ▲!',
        '3. Cura a tus Oscamon en el Centro o en tu casa antes de que se debiliten. Las Pociones también ayudan.',
        '4. Captura más Oscamon: todos los del equipo ganan experiencia, aunque no luchen.'] },
    geo({ id: 'loarre_npc', x: 40, y: 87, dir: 'left', pal: ['#7a6a5a', '#8a3a2a', '#3a3a3a'],
      trainer: { name: 'Caballero Sancho', team: [['almenazo', 9], ['danzante', 10]], money: 100,
        intro: '¡Alto! Este castillo lo mandó construir el rey Sancho III el Mayor. ¡Defiéndete!', lose: '¡Las murallas han caído!',
        after: 'Aquí se rodaron escenas de la película "El reino de los cielos".' } }),
    geo({ id: 'riglos_esc', x: 22, y: 70, dir: 'down', pal: ['#e0c020', '#e04020', '#3a3a5a'],
      trainer: { name: 'Escaladora Ana', team: [['mallorroc', 10], ['quebranto', 11]], money: 110,
        intro: '¡Acabo de bajar del Mallo Pisón! ¿Combatimos?', lose: '¡Me he quedado sin cuerda!', after: 'Los buitres leonados anidan en las paredes de los Mallos.' } }),
    geo({ id: 'guara_npc', x: 94, y: 62, dir: 'down', pal: ['#3a3a3a', '#d06020', '#3a4a6a'],
      trainer: { name: 'Barranquista Jorge', team: [['ranisuela', 12], ['sarrion', 13], ['quebranto', 13]], money: 130,
        intro: '¡La Sierra de Guara es el paraíso de los barrancos! Y de los combates.', lose: '¡Me has arrastrado como una riada!', after: 'Si sigues al norte llegarás a Sabiñánigo.' } }),
    geo({ id: 'monegros_npc', x: 76, y: 150, dir: 'left', pal: ['#c0a060', '#e0e0d0', '#6a5a4a'],
      trainer: { name: 'Pastor Andrés', team: [['cierzin', 11], ['trenzon', 12], ['sarrion', 12]], money: 120,
        intro: 'Llevo las ovejas por Monegros desde que era un crío. ¿Te atreves?', lose: '¡Qué cierzo de entrenador!', after: 'Las sabinas de Monegros tienen cientos de años.' } }),
    geo({ id: 'tena_npc', x: 76, y: 42, dir: 'down', pal: ['#2a5a8a', '#f0f0f0', '#2a2a3a'],
      trainer: { name: 'Esquiadora Marta', team: [['nevero', 19], ['arminin', 20], ['marmotin', 20]], money: 200,
        intro: '¡Vengo de Formigal y vengo con ganas!', lose: '¡Me he salido de la pista!', after: 'Sube a Panticosa: su balneario te cura a todo el equipo.' } }),
    geo({ id: 'ordesa_npc', x: 106, y: 30, dir: 'left', pal: ['#5a3a1a', '#3a7a3a', '#4a3a2a'],
      trainer: { name: 'Guarda del Parque Elena', team: [['marmotin', 23], ['sarrion', 24], ['quebranto', 25]], money: 240,
        intro: 'Protejo el Parque Nacional. ¡Demuestra que lo mereces!', lose: 'Respetas la montaña. Bien.', after: 'Dicen que el espíritu del bucardo aún vive junto a la Cola de Caballo...' } }),
    geo({ id: 'benasque_npc', x: 171, y: 33, dir: 'down', pal: ['#8a2a2a', '#f0c030', '#3a3a3a'],
      trainer: { name: 'Montañero Pablo', team: [['nevero', 25], ['marmotin', 25], ['aneton', 27]], money: 260,
        intro: 'He subido al Aneto doce veces. ¡A ver cuánto aguantas tú!', lose: '¡Me has dejado sin aliento!', after: 'Arriba, en el glaciar del Aneto, viven los Anetón.' } }),
    geo({ id: 'ainsa_npc', x: 125, y: 81, dir: 'up', pal: ['#a02a2a', '#e8e0c8', '#4a3a2a'],
      trainer: { name: 'Juglar Mateo', team: [['danzante', 20], ['truchon', 21], ['mallorroc', 21]], money: 210,
        intro: '¡Canto historias de La Morisma! Y ahora cantaré tu derrota.', lose: 'Compondré una canción sobre ti.', after: 'Desde Aínsa puedes ir a Bielsa o bajar hacia Barbastro.' } }),
    geo({ id: 'somontano_npc', x: 120, y: 118, dir: 'right', pal: ['#6a2a5a', '#e8d8c8', '#4a3a2a'],
      trainer: { name: 'Vendimiadora Clara', team: [['albahaquin', 12], ['somontin', 13]], money: 130,
        intro: '¡Estamos de vendimia! Una pausa para un combate.', lose: '¡Uy, se me ha caído el cesto de uvas!', after: 'Vero, la Líder del Gimnasio, cuida las mejores cepas del Somontano.' } }),
  );
  generarRutas(water);
  // Lo que queda suelto por el campo se une con un sendero a la carretera más cercana
  const blocks = [blockRect(HUESCA_BLOCK), blockRect(JACA_BLOCK)];
  for (const o of [...W_SIGNS, ...W_NPCS, ...W_ITEMS]) {
    if (o.link || blocks.some(r => inRect(o.x, o.y, r)) || TOWNS.some(t => Math.abs(o.x - t.cx) <= 12 && Math.abs(o.y - t.cy) <= 9)) continue;
    let best = null, bd = 40;
    for (const pts of ROADS) walkPoly(pts, (x, y) => { const d = Math.abs(x - o.x) + Math.abs(y - o.y); if (d < bd && !blocks.some(r => inRect(x, y, r))) { bd = d; best = [x, y]; } });
    if (best) o.link = best;
  }
}

// ---------------- Rutas entre pueblos ----------------
const ROUTE_PATCHES = [];     // [x, y, radio] de hierba alta que cruza el camino
const ROUTE_INFO = [];        // { num, name, pts }
function srandW(seed) { let v = seed; return () => (v = (v * 16807) % 2147483647) / 2147483647; }
const RT_TITLES = {
  grass: ['Excursionista', 'Ciclista', 'Campesina', 'Pastor', 'Ornitóloga', 'Corredor', 'Seta-buscador', 'Pescadora'],
  rock: ['Escalador', 'Montañera', 'Barranquista', 'Geóloga', 'Senderista', 'Espeleólogo'],
  snow: ['Esquiador', 'Montañera', 'Guía de montaña', 'Raquetista', 'Alpinista'],
  palace: ['Paseante'],
};
const RT_NAMES = ['Luis', 'Marta', 'Pablo', 'Lucía', 'Javier', 'Carmen', 'Íñigo', 'Sara', 'Andrés', 'Pilar', 'Jorge', 'Elena', 'Miguel', 'Nuria',
  'Chema', 'Ana', 'Fernando', 'Raquel', 'Álvaro', 'Inés', 'Toño', 'Begoña', 'Ramón', 'Laura', 'Quique', 'Rosa'];
const RT_INTRO = ['¡Nuestras miradas se han cruzado! Eso significa combate.', '¡Llevo toda la mañana entrenando en esta ruta!',
  '¿A dónde vas tan deprisa? ¡Primero, un combate!', '¡Por fin alguien con quien luchar!', '¡Mis Oscamon conocen este camino como nadie!',
  '¡Alto ahí! Nadie pasa sin combatir.'];
const RT_LOSE = ['¡Vaya paliza!', '¡No me lo esperaba!', '¡Tengo que entrenar más!', '¡Qué fuerte eres!', '¡Uf, me rindo!'];
const RT_AFTER = ['Sigue el camino y llegarás al siguiente pueblo.', 'Cura a tus Oscamon en el próximo Centro.',
  'En la hierba alta de esta ruta salen Oscamon muy curiosos.', 'Dicen que más adelante hay entrenadores muy fuertes.',
  'Mira el cartel de la ruta para saber a dónde lleva.', '¡Qué paisaje más bonito tiene esta ruta!'];
const RT_PALS = [['#3a2a1a', '#d06040', '#3a4a6a'], ['#c0a060', '#60a060', '#4a3a2a'], ['#6a3a2a', '#5070c0', '#2a2a3a'],
  ['#2a2a2a', '#e0c040', '#4a4a5a'], ['#a05a2a', '#40a0a0', '#3a3a3a'], ['#d8d8d8', '#8a5aa0', '#3a3a4a'], ['#e0e0e0', '#d04040', '#2a3a6a']];

function generarRutas(water) {
  ROUTE_PATCHES.length = 0; ROUTE_INFO.length = 0;
  const rnd = srandW(77);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const blocks = [blockRect(HUESCA_BLOCK), blockRect(JACA_BLOCK)];
  const near = (x, y) => blocks.some(r => x >= r.x - 3 && y >= r.y - 3 && x < r.x + r.w + 3 && y < r.y + r.h + 3)
    || TOWNS.some(t => Math.abs(x - t.cx) <= (TOWN_W >> 1) + 4 && Math.abs(y - t.cy) <= (TOWN_H >> 1) + 5)
    || LANDMARKS.some(l => Math.abs(x - (l.x + l.w / 2)) <= l.w / 2 + 4 && Math.abs(y - (l.y + l.h / 2)) <= l.h / 2 + 4);
  ROADS.forEach((pts, i) => {
    const num = i + 1;
    ROUTE_INFO.push({ num, name: ROAD_NAMES[i] || '', pts });
    const segs = []; let total = 0;
    for (let k = 0; k < pts.length - 1; k++) { const L = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); segs.push(L); total += L; }
    const at = d => {
      for (let k = 0; k < segs.length; k++) {
        if (d <= segs[k] || k === segs.length - 1) {
          const L = segs[k] || 1, t = Math.min(1, Math.max(0, d / L));
          const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
          return { x: x0 + (x1 - x0) * t + 0.5, y: y0 + (y1 - y0) * t + 0.5, ux: (x1 - x0) / L, uy: (y1 - y0) / L };
        }
        d -= segs[k];
      }
    };
    const spot = (d, off) => {
      const p = at(d), nx = -p.uy, ny = p.ux;
      for (const o of [off, -off, off + 1, -off - 1]) {
        const x = Math.round(p.x + nx * o), y = Math.round(p.y + ny * o);
        if ([...W_SIGNS, ...W_NPCS, ...W_ITEMS].some(q => Math.abs(q.x - x) + Math.abs(q.y - y) < 2)) continue;
        if (x > 1 && y > 1 && x < WORLD_W - 2 && y < WORLD_H - 2 && !water.has(x + ',' + y) && !near(x, y)) return { x, y, o, nx, ny, link: [Math.round(p.x), Math.round(p.y)] };
      }
      return null;
    };
    // Carteles al principio y al final de la ruta
    if (total > 30) for (const d of [15, total - 15]) { const sp = spot(d, 3); if (sp) W_SIGNS.push({ x: sp.x, y: sp.y, link: sp.link, text: `RUTA ${num}\n${ROAD_NAMES[i] || ''}` }); }
    // Tramos de hierba alta que cortan el camino
    for (let d = 16; d < total - 16; d += 22) { const p = at(d); if (!near(Math.round(p.x), Math.round(p.y))) ROUTE_PATCHES.push([Math.round(p.x), Math.round(p.y), 3 + Math.floor(rnd() * 2)]); }
    // Entrenadores a los lados del camino, mirando hacia él
    const nT = Math.floor(total / 30);
    for (let k = 0; k < nT; k++) {
      const sp = spot(total * (k + 0.5) / nT, 3);
      if (!sp) continue;
      const dx = -sp.nx * Math.sign(sp.o), dy = -sp.ny * Math.sign(sp.o);
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      const z = worldZoneAt(sp.x, sp.y), lvl = z.lv[1];
      const tw = z.list.reduce((a, e) => a + e[1], 0), team = [];
      for (let j = 0; j < (lvl >= 14 ? 3 : 2); j++) {
        let r = rnd() * tw, sp2 = z.list[0][0];
        for (const e of z.list) if ((r -= e[1]) < 0) { sp2 = e[0]; break; }
        if (sp2 === 'aneton' && lvl < 28) sp2 = 'nevero';
        team.push([sp2, Math.max(2, lvl - 2 + j)]);
      }
      W_NPCS.push({ id: `ruta${num}_${k}`, x: sp.x, y: sp.y, link: sp.link, dir, pal: pick(RT_PALS),
        trainer: { name: `${pick(RT_TITLES[z.bg] || RT_TITLES.grass)} ${pick(RT_NAMES)}`, team, money: lvl * 12,
          intro: pick(RT_INTRO), lose: pick(RT_LOSE), after: pick(RT_AFTER) } });
    }
    // Un objeto escondido junto al camino
    if (total > 40) {
      const sp = spot(total * 0.62, 5);
      const z = sp && worldZoneAt(sp.x, sp.y);
      if (sp) W_ITEMS.push({ id: `rt${num}`, x: sp.x, y: sp.y, link: sp.link, item: z.lv[1] >= 15 ? 'super' : pick(['ball', 'potion']), qty: z.lv[1] >= 15 ? 2 : 3 });
    }
  });
}

// ---------------- Construcción del mapa ----------------
function waterMask() {
  const set = new Set();
  for (const [, w, pts] of RIVERS) walkPoly(pts, (x, y) => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) set.add((x + i - (w >> 1)) + ',' + (y + j - (w >> 1))); });
  for (const [, cx, cy, rx, ry] of LAKES) for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set.add(x + ',' + y);
  return set;
}

function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, s) => vnoise(x, y, s) * 0.55 + vnoise(x * 2, y * 2, s + 7) * 0.3 + vnoise(x * 4, y * 4, s + 13) * 0.15;
const fbm2 = (x, y, s) => vnoise(x, y, s) * 0.65 + vnoise(x * 2.3, y * 2.3, s + 7) * 0.35;

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
  const flats = [...TOWNS.map(t => [t.cx, t.cy, 16]),
    ...[[38, 82, 7], [21, 59, 6], [50, 18, 9], [112, 26, 8], [184, 24, 6], [73, 46, 26], [47, 47, 26], [74, 105, 32]].map(([x, y, r]) => [sc(x), sc(y), r * ESCALA])];

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
  const ridgeBoxes = RIDGES.map(([x0, y0, x1, y1, w]) => [Math.min(x0, x1) - w * 2, Math.min(y0, y1) - w * 2, Math.max(x0, x1) + w * 2, Math.max(y0, y1) + w * 2]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x / ESCALA, gy = y / ESCALA;                               // coordenadas geográficas
    let e = Math.max(0, Math.min(1, (58 - gy) / 46)) * 0.95;            // Pirineo: más alto cuanto más al norte
    e += (fbm(x / 26, y / 26, 1) - 0.5) * 0.55;
    for (let k = 0; k < ridgeBoxes.length; k++) {
      const rb = ridgeBoxes[k];
      if (x < rb[0] || x > rb[2] || y < rb[1] || y > rb[3]) continue;
      const [x0, y0, x1, y1, w, f] = RIDGES[k];
      const d = distToSeg(x, y, [x0, y0], [x1, y1]);
      if (d < w * 2) e += f * Math.max(0, 1 - d / (w * 2)) * (0.7 + vnoise(x / 5, y / 5, 3) * 0.6);
    }
    e -= 0.5 * Math.max(0, 1 - rdist[y * W + x] / 6);                     // los ríos excavan valles
    for (let k = 0; k < flats.length; k++) {
      const f = flats[k], dx = x - f[0], dy = y - f[1];
      if (dx > f[2] || dx < -f[2] || dy > f[2] || dy < -f[2]) continue;
      const d = Math.sqrt(dx * dx + dy * dy); if (d < f[2]) e -= 0.6 * (1 - d / f[2]);
    }
    const n2 = fbm2(x / 6, y / 6, 21);
    let c;
    if (e > 0.98) c = 'n';
    else if (e > 0.74) c = 'M';
    else if (e > 0.6) c = gy < 75 ? 'A' : 'T';
    else if (e > 0.5) c = n2 > 0.55 ? ',' : (hash2(x, y, 5) < 0.35 ? (gy < 75 ? 'A' : 'T') : '.');
    else if (gy > 136 && gx < 116 && gx > 36) c = n2 > 0.66 ? ',' : hash2(x, y, 9) < 0.04 ? 'T' : 'd';      // Monegros
    else if (gx > 104 && gx < 146 && gy > 108 && gy < 142) c = n2 > 0.68 ? ',' : (y % 3 === 0 ? '.' : 'V');   // Somontano
    else if (gy > 92) c = n2 > 0.64 ? ',' : hash2(x, y, 4) < 0.03 ? 'T' : (fbm(x / 9, y / 9, 31) > 0.5 ? 'Y' : '.');
    else c = n2 > 0.6 ? ',' : hash2(x, y, 6) < 0.12 ? (gy < 75 ? 'A' : 'T') : hash2(x, y, 8) < 0.04 ? 'F' : '.';
    m[y][x] = c;
  }
  // Glaciares
  for (const [cx, cy, rx, ry] of [[190, 12, 9, 7], [118, 10, 8, 5]].map(g => g.map(sc))) for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, 'n');
  // Mallos de Riglos
  for (const [x, y, w, h] of [[10, 64, 3, 7], [13, 63, 2, 9], [16, 65, 3, 6], [24, 64, 2, 8], [26, 66, 3, 5], [9, 70, 2, 3]]) rect(sc(x), sc(y), sc(w), sc(h), 'R');
  rect(sc(14), sc(72), sc(12), sc(2), ','); rect(sc(19), sc(63), sc(3), sc(10), ',');

  // 2) Ríos y embalses
  for (const [, w, pts] of RIVERS) walkPoly(pts, (x, y) => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) set(x + i - (w >> 1), y + j - (w >> 1), '~'); });
  for (const [, cx, cy, rx, ry] of LAKES) for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, '~');

  // 3) Carreteras
  for (const pts of ROADS) walkPoly(pts, (x, y) => {
    for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const X = x + i, Y = y + j;
      if (inBlock(X, Y)) continue;
      set(X, Y, get(X, Y) === '~' ? 'H' : 'D');
    }
  });
  // Tramos de hierba alta en las rutas
  for (const [cx, cy, r] of ROUTE_PATCHES) for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
    if (((x - cx) / (r + 1)) ** 2 + ((y - cy) / r) ** 2 > 1 || inBlock(x, y)) continue;
    const c = get(x, y);
    if (c && c !== '~' && c !== 'H' && c !== 'n') set(x, y, ',');
  }

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
    const ox = t.cx - (TOWN_W >> 1), oy = t.cy - (TOWN_H >> 1);
    const pave = (x, y, c) => {
      const cur = get(x, y);
      if (cur === '~' || cur === 'H') set(x, y, [0, 5, 6, 7, TOWN_H - 1].includes(y - oy) || y >= oy + TOWN_H ? 'H' : '~');
      else set(x, y, c);
    };
    for (let y = oy - 1; y <= oy + TOWN_H; y++) for (let x = ox - 1; x <= ox + TOWN_W; x++) { const c = get(x, y); if (c && c !== '~' && c !== 'H') set(x, y, '.'); }
    for (let y = oy; y < oy + TOWN_H; y++) for (let x = ox; x < ox + TOWN_W; x++) pave(x, y, y === oy + 6 && x > ox && x < ox + TOWN_W - 1 ? 'S' : '=');
    if (t.station) for (let y = oy + TOWN_H; y < oy + TOWN_H + 3; y++) for (let x = t.cx - 4; x < t.cx + 4; x++) pave(x, y, '=');
    for (const [x, y] of [[ox - 1, oy - 1], [ox + TOWN_W, oy - 1], [ox - 1, oy + TOWN_H], [ox + TOWN_W, oy + TOWN_H]]) if (get(x, y) === '.') set(x, y, t.style === 'pirineo' ? 'A' : 'T');
  }
  const LM = id => LANDMARKS.find(l => l.id === id);
  { const l = LM('loarre'); rect(l.x - 3, l.y - 3, l.w + 6, l.h + 6, 'M'); rect(l.x - 2, l.y - 1, l.w + 4, l.h + 3, '.'); rect(l.x + l.door - 1, l.y + l.h, 3, 4, 'D'); }
  { const l = LM('sjpena'); rect(l.x - 4, l.y - 5, l.w + 8, 5, 'M'); rect(l.x - 2, l.y, l.w + 4, l.h + 2, '.'); }
  { const l = LM('canfranc_est'); rect(l.x - 2, l.y - 1, l.w + 4, l.h + 4, '='); }
  { const l = LM('monzon_castillo'), m = TOWNS.find(t => t.id === 'monzon');
    rect(l.x - 3, l.y - 2, l.w + 6, l.h + 4, '.'); rect(l.x + l.door, l.y + l.h, 2, m.cy - (TOWN_H >> 1) - (l.y + l.h), 'D'); }
  { const l = LM('b_gym'); rect(l.x - 2, l.y - 1, l.w + 4, l.h + 3, '='); }
  { const l = LM('refugio'); rect(l.x - 5, l.y - 2, l.w + 10, l.h + 5, '.'); }
  { const l = LM('refugio_aneto'); rect(l.x - 5, l.y - 2, l.w + 10, l.h + 5, '.'); rect(l.x - 3, l.y + l.h + 2, 8, 2, ','); }
  { const L = WORLD_LEGENDS.find(l => l.sp === 'bucardo');                                    // pradera de Ordesa y Cola de Caballo
    rect(L.x - 8, L.y - 4, 18, 10, '.'); rect(L.x - 5, L.y + 2, 10, 3, ',');
    rect(L.x + 2, L.y - 9, 1, 9, '~'); rect(L.x + 1, L.y, 3, 2, '~'); }
  for (const b of W_BUILDINGS) {
    if (inBlock(b.x, b.y)) continue;
    if (b.kind === 'tower') { rect(b.x, b.y, b.w, b.h, 'B'); continue; }
    rect(b.x, b.y, b.w, b.h, 'B');
    if (b.door >= 0 && SOLID.has(get(b.x + b.door, b.y + b.h))) set(b.x + b.door, b.y + b.h, '=');
  }
  for (const o of [...W_SIGNS, ...W_NPCS, ...W_ITEMS, ...WORLD_LEGENDS]) {
    if (SOLID.has(get(o.x, o.y))) set(o.x, o.y, '.');
    // Sendero desde lo que hay junto a una ruta hasta el camino
    if (o.link) walkPoly([[o.x, o.y], [o.link[0], o.y], o.link], (x, y) => { const c = get(x, y); if (c && SOLID.has(c) && c !== 'B') set(x, y, c === '~' ? 'H' : '.'); });
  }
  // Bordes del mundo
  for (let x = 0; x < W; x++) { set(x, 0, 'n'); set(x, H - 1, 'T'); }
  for (let y = 0; y < H; y++) { set(0, y, y < sc(60) ? 'M' : 'T'); set(W - 1, y, y < sc(60) ? 'M' : 'T'); }
  return m;
}

const WORLD_LEGENDS = [
  { ...(() => { const [x, y] = HB(LEGEND.x, LEGEND.y); return { x, y }; })(), sp: 'bayardo', lvl: 20, flag: 'legend',
    intro: ['¡Un relincho resuena entre las peñas del Salto de Roldán!', '¡Es BAYARDO, el legendario caballo de Roldán!'] },
  { x: sc(116), y: sc(22), sp: 'bucardo', lvl: 35, flag: 'legend2',
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
  for (const t of TOWNS) if (Math.abs(x - t.cx) <= (TOWN_W >> 1) + 2 && Math.abs(y - t.cy) <= (TOWN_H >> 1) + 2) return t.name;
  const ruta = rutaCercana(x, y);
  if (ruta) return `Ruta ${ruta.num}`;
  for (const l of LANDMARKS) if (l.name && l.kind !== 'house' && Math.abs(x - (l.x + l.w / 2)) <= l.w / 2 + 4 && Math.abs(y - (l.y + l.h / 2)) <= l.h / 2 + 4) return l.name;
  const r = REGIONS.find(r => inRect(x, y, r));
  return r ? r.name : 'Alto Aragón';
}

function rutaCercana(x, y) {
  for (const r of ROUTE_INFO) for (let i = 0; i < r.pts.length - 1; i++) if (distToSeg(x, y, r.pts[i], r.pts[i + 1]) < 3) return r;
  return null;
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
  ...[['Loarre', 38, 82], ['Aneto', 188, 14], ['M. Perdido', 118, 10], ['S. J. Peña', 21, 58]].map(([n, x, y]) => [n, sc(x), sc(y)]),
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

// Versión del mapa grande (las partidas de una versión anterior se recolocan)
const WORLD_VER = 3;
function migrateWorldPos(pos) {
  // Mapa grande anterior (escala 1): Huesca empezaba en (49,81) y Jaca en (29,34)
  if (inRect(pos.x, pos.y, { x: 49, y: 81, w: 50, h: 50 })) { const p = HB(pos.x - 37, pos.y - 77); return { x: p[0], y: p[1], dir: pos.dir }; }
  if (inRect(pos.x, pos.y, { x: 29, y: 34, w: 37, h: 27 })) { const p = JB(pos.x - 28, pos.y - 30); return { x: p[0], y: p[1], dir: pos.dir }; }
  let best = TOWNS[0], bd = 1e9;
  for (const t of TOWNS) { const d = Math.hypot(t.gcx - pos.x, t.gcy - pos.y); if (d < bd) { bd = d; best = t; } }
  return { x: best.cx, y: best.cy, dir: 'down' };
}

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
