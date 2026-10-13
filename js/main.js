'use strict';
// ============================================================
//  OSCAMON — Edición Huesca
//  Bucle principal, mundo, historia, menús y guardado
// ============================================================

const VW = 240, VH = 160, SCALE = 3;
const canvas = $('screen');
const ctx = canvas.getContext('2d');
const SAVE_KEY = 'oscamon-huesca-v1';
const PLAYER_PAL = ['#d83030', '#3060c0', '#383848'];
const GYM_PAL = ['#f0c020', '#6a2a8a', '#3a2a5a'];

let MAP = null;
let CUR = null;      // mapa actual (MAPS.huesca / MAPS.jaca)
let mode = 'title';
let fade = 0, flash = 0;
let busy = false;
let G = null;
let BALL_SPRITE = null, BALL_SMALL = null;
let banner = { text: '', t: 0 };
let lastZone = '';
const player = { x: 0, y: 0, tx: 0, ty: 0, dir: 'down', moving: false, t: 0, parity: false };
const npcState = {};

function text(str, x, y, color, size = 6, align = 'left') {
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = color; ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

// ---------------- Estado de la partida ----------------
function newState() {
  return {
    party: [], box: [], bag: { ball: 0, potion: 0, super: 0 }, money: 100,
    flags: {}, seen: {}, caught: {}, badges: 0, map: 'world', worldVer: WORLD_VER, pos: { ...WORLD_START },
  };
}
function markSeen(sp) { G.seen[sp] = true; }
function markCaught(sp) { G.seen[sp] = true; G.caught[sp] = true; }
const badgeCount = () => Object.values(GYMS).filter(g => G.flags[g.flag]).length;
function setMap(id) {
  CUR = MAPS[id] || MAPS.world;
  if (!CUR.tiles) CUR.tiles = CUR.build();
  MAP = CUR.tiles;
  G.map = CUR.id;
}
function healParty() { for (const m of G.party) m.hp = maxHp(m); }

function saveGame(silent) {
  // Dentro de un edificio se guarda la posición de su puerta en el mapa grande
  G.pos = CUR && CUR.interior ? { ...CUR.back } : { x: player.x, y: player.y, dir: player.dir };
  const map = G.map; G.map = 'world';
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); return true; }
  catch (e) { if (!silent) console.warn(e); return false; }
  finally { G.map = map; }
}
function loadGame() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

// ---------------- Mapa ----------------
const tileAt = (x, y) => (MAP[y] && MAP[y][x]) || (CUR && CUR.interior ? 'w' : 'T');
const signAt = (x, y) => CUR.signs.find(s => s.x === x && s.y === y);
const npcAt = (x, y) => CUR.npcs.find(n => n.x === x && n.y === y);
const legendAt = (x, y) => (CUR.legends || []).find(l => !G.flags[l.flag] && l.x === x && l.y === y);
const itemAt = (x, y) => CUR.items.find(i => i.x === x && i.y === y && !G.flags[i.id]);
function doorAt(x, y) { return CUR.buildings.find(b => b.door >= 0 && b.x + b.door === x && b.y + b.h - 1 === y); }
function blocked(x, y) {
  return SOLID.has(tileAt(x, y)) || !!signAt(x, y) || !!npcAt(x, y) || !!legendAt(x, y);
}
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

const zoneName = (x, y) => CUR.zoneName(x, y);
// ---------------- Bucle ----------------
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  update(dt);
  render(now);
  requestAnimationFrame(loop);
}

function update(dt) {
  if (banner.t > 0) banner.t -= dt;
  if (mode === 'battle') return updateBattle(dt);
  if (mode !== 'world') return;
  if (player.moving) {
    player.t += dt * (held.b ? 8 : 4.6);
    if (player.t >= 1) {
      player.moving = false; player.t = 0;
      player.x = player.tx; player.y = player.ty;
      onStep();
    }
  }
  if (!player.moving && !busy && !uiHandler) {
    const d = held.up ? 'up' : held.down ? 'down' : held.left ? 'left' : held.right ? 'right' : null;
    if (d) tryMove(d);
  }
}

let lastBump = 0;
function tryMove(d) {
  player.dir = d;
  const [dx, dy] = DIRS[d], nx = player.x + dx, ny = player.y + dy;
  const door = doorAt(nx, ny);
  if (door) { runScript(() => enterBuilding(door)); return; }
  if (blocked(nx, ny)) {
    const now = performance.now();
    if (now - lastBump > 300) { Sound.bump(); lastBump = now; }
    return;
  }
  if ((tileAt(nx, ny) === ',' || tileAt(nx, ny) === 'V') && !G.party.length) {
    runScript(async () => {
      await say('¡Espera! Es peligroso entrar en la hierba alta sin un Oscamon.');
      await say('Ve al Laboratorio del Profesor Cajal, justo al este de tu casa.');
    });
    return;
  }
  player.tx = nx; player.ty = ny; player.moving = true; player.t = 0; player.parity = !player.parity;
}

function onStep() {
  const z = zoneName(player.x, player.y);
  if (z !== lastZone) { lastZone = z; banner = { text: z, t: 2.2 }; }
  const it = itemAt(player.x, player.y);
  if (it) {
    G.flags[it.id] = true;
    G.bag[it.item] += it.qty;
    runScript(async () => { Sound.item(); await say(`¡Has encontrado ${it.qty > 1 ? it.qty + ' × ' : ''}${ITEMS[it.item].name}!`); });
    return;
  }
  // entrenadores que te ven
  if (G.party.length) {
    for (const n of CUR.npcs) {
      if (!n.trainer || G.flags['tr_' + n.id]) continue;
      const [dx, dy] = DIRS[n.dir];
      for (let k = 1; k <= 4; k++) {
        const x = n.x + dx * k, y = n.y + dy * k;
        if (x === player.x && y === player.y) { runScript(() => trainerSpotted(n)); return; }
        if (blocked(x, y)) break;
      }
    }
  }
  const tl = tileAt(player.x, player.y);
  if (tl === 'm' && CUR.interior) { runScript(exitInterior); return; }
  if ((tl === ',' && Math.random() < 0.09) || (tl === 'V' && Math.random() < 0.05)) runScript(wildEncounter);
}

async function runScript(fn) {
  if (busy) return;
  busy = true;
  try { await fn(); }
  catch (e) { console.error(e); }
  finally { hideDialog(); uiHandler = null; busy = false; }
}

worldPress = btn => {
  if (mode !== 'world' || busy || player.moving) return;
  if (btn === 'start') return runScript(mainMenu);
  if (btn !== 'a') return;
  const [dx, dy] = DIRS[player.dir], x = player.x + dx, y = player.y + dy;
  const s = signAt(x, y);
  if (s) return runScript(() => say(s.text));
  const n = npcAt(x, y) || (tileAt(x, y) === 'q' ? npcAt(x + dx, y + dy) : null);
  if (n) return runScript(() => talkTo(n));
  const L = legendAt(x, y);
  if (L) return runScript(() => legendEncounter(L));
  const door = doorAt(x, y);
  if (door) return runScript(() => enterBuilding(door));
  const t = tileAt(x, y);
  if (t === '~') return runScript(() => say('El agua baja fresquita desde las montañas del Pirineo.'));
  if (t === 'R') return runScript(() => say('Conglomerado rojo de los Mallos de Riglos. ¡Impresionante!'));
  if (t === 'r') return runScript(() => say('La vía del tren Huesca-Canfranc. ¡No se juega en las vías!'));
  if (CUR.interior && FURNITURE_TEXT[t]) {
    const txt = t === 'o' && CUR.building.kind !== 'bodega' ? 'Un barril viejo de madera.' : FURNITURE_TEXT[t];
    return runScript(() => say(txt));
  }
};

// ---------------- Encuentros ----------------
function zoneAt(x, y) { return CUR.zoneAt(x, y); }

async function wildEncounter() {
  const z = zoneAt(player.x, player.y);
  const total = z.list.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total, pick = z.list[0];
  for (const e of z.list) { if ((r -= e[1]) < 0) { pick = e; break; } }
  const lvl = z.lv[0] + Math.floor(Math.random() * (z.lv[1] - z.lv[0] + 1));
  await battle({ wild: makeMon(pick[0], lvl), bg: z.bg });
}

async function legendEncounter(L) {
  if (!G.party.length) return say('Algo enorme te observa desde las rocas... Mejor vuelve con un Oscamon.');
  Sound.tone(500, 0.6, 'sawtooth', 0.05, 300);
  for (const line of L.intro) await say(line);
  const res = await battle({ wild: makeMon(L.sp, L.lvl), bg: L.sp === 'bucardo' ? 'snow' : 'rock' });
  if (res === 'caught') G.flags[L.flag] = true;
  else if (res === 'win') { G.flags[L.flag] = true; await say(`${SPECIES[L.sp].name} dio un salto de peña en peña y desapareció en el horizonte...`); }
}

async function trainerSpotted(n) {
  npcState[n.id] = { alert: true };
  Sound.tone(900, 0.15, 'square', 0.05);
  await sleep(700);
  npcState[n.id] = {};
  await trainerBattle(n);
}

async function trainerBattle(n) {
  const t = n.trainer;
  await say(`${t.name.toUpperCase()}: ${t.intro}`);
  const r = await battle({ trainer: { ...t, pal: n.pal }, bg: zoneAt(n.x, n.y).bg });
  if (r === 'win') G.flags['tr_' + n.id] = true;
}

async function talkTo(n) {
  n.dir = OPP[player.dir];
  if (n.host) return hostScript(n.b);
  if (n.trainer) {
    if (G.flags['tr_' + n.id]) return say(`${n.trainer.name.toUpperCase()}: ${n.trainer.after}`);
    if (!G.party.length) return say(`${n.trainer.name.toUpperCase()}: Vuelve cuando tengas un Oscamon y combatiremos.`);
    return trainerBattle(n);
  }
  for (const line of n.text) await say(line);
}

// ---------------- Edificios ----------------
async function enterBuilding(b) {
  Sound.seq([[523, 0.06], [659, 0.08]], 'square', 0.04);
  if (b.kind === 'center') G.lastCenter = { x: b.x + b.door, y: b.y + b.h, dir: 'down' };
  const room = getInterior(b);
  await tween(180, k => (fade = k));
  setMap(room.id);
  placePlayer(room.spawn);
  banner = { text: room.name, t: 2 };
  await tween(180, k => (fade = 1 - k));
}

async function exitInterior() {
  const back = CUR.back;
  Sound.seq([[659, 0.06], [523, 0.08]], 'square', 0.04);
  await tween(180, k => (fade = k));
  setMap('world');
  placePlayer(back);
  banner = { text: lastZone, t: 2 };
  await tween(180, k => (fade = 1 - k));
}

// Lo que pasa al hablar con quien atiende el edificio
async function hostScript(b) {
  if (b.gym) return gymScript(b.gym);
  if (b.station) return trainScript(b);
  if (b.kind === 'center') return centerScript(b.town || (b.id === 'j_centro' ? 'Jaca' : 'Huesca'));
  if (b.kind === 'shop') return shopScript();
  return buildingScript(b);
}

async function buildingScript(b) {
  switch (b.id) {
    case 'lab': return labScript();
    case 'centro': return centerScript();
    case 'tienda': return shopScript();
    case 'hogar': {
      await say('TU MADRE: ¡Hola, cariño! Pareces cansado. Descansa un poco.');
      healParty(); Sound.heal(); await sleep(600);
      await say('¡Tus Oscamon se han recuperado por completo!');
      if (!G.flags.momGift && G.party.length) {
        G.flags.momGift = true; G.bag.potion += 2; Sound.item();
        await say('TU MADRE: Toma, llévate estas 2 Pociones. ¡Y abrígate, que sopla el cierzo!');
      }
      return;
    }
    case 'catedral': {
      await say('Entras en la Catedral de Santa María. El retablo mayor de alabastro, obra de Damián Forment, te deja sin palabras.');
      if (!G.flags.sacristan) {
        G.flags.sacristan = true; G.bag.potion += 2; Sound.item();
        await say('SACRISTÁN: Hijo mío, un viaje así necesita provisiones. Toma 2 Pociones.');
      } else await say('SACRISTÁN: Que San Lorenzo y San Vicente, patronos de Huesca, te acompañen.');
      return;
    }
    case 'sanpedro':
      await say('El claustro románico de San Pedro el Viejo guarda los sepulcros de Alfonso I el Batallador y Ramiro II el Monje.');
      return say('...¿Ramiro II? ¡Pero si dicen que te espera en el Gimnasio del Palacio! Qué cosas pasan en Huesca.');
    case 'ayto': {
      await say('En el Ayuntamiento cuelga el famoso cuadro "La Campana de Huesca", de Casado del Alisal.');
      if (G.flags.badge && !G.flags.mayor) {
        G.flags.mayor = true; G.money += 300; G.bag.super += 3; Sound.item();
        await say('ALCALDÍA: ¡Enhorabuena, campeón de Huesca! La ciudad te entrega 300 € y 3 Superpociones.');
      } else if (!G.flags.badge) await say('FUNCIONARIO: Si vences a Ramiro II en el Palacio, vuelve. La ciudad sabrá recompensarte.');
      else await say('FUNCIONARIO: ¡Todo Huesca habla de ti!');
      return;
    }
    case 'casino': return say('El Círculo Oscense está de baile. Suena una jota y alguien grita "¡Viva San Lorenzo!".');
    case 'casa1': return say('Una familia está comiendo migas con uva. "¿Gustas?", te preguntan. ¡Qué amables!');
    case 'casa2': return say('Un señor mayor ve el fútbol: "¡Aúpa SD Huesca!". Mejor no molestar.');
    case 'j_centro': return centerScript();
    case 'j_tienda': return shopScript();
    case 'j_catedral': {
      await say('La Catedral de San Pedro de Jaca es del siglo XI. Fíjate en el ajedrezado jaqués que decora sus muros.');
      if (!G.flags.j_sacristan) {
        G.flags.j_sacristan = true; G.bag.super += 2; Sound.item();
        await say('SACRISTÁN: Ese frío de la Peña Oroel no perdona. Toma 2 Superpociones.');
      }
      return;
    }
    case 'j_ayto':
      return say('En el Ayuntamiento renacentista de Jaca se preparan las fiestas del Primer Viernes de Mayo.');
    case 'j_ciudadela': {
      await say('Entras en la Ciudadela. Desde la muralla ves los ciervos paseando tranquilos por el foso.');
      if (!G.flags.j_citadel) { G.flags.j_citadel = true; G.bag.ball += 5; Sound.item(); await say('Un soldado te regala 5 Oscaballs. "¡Para la Peña Oroel!"'); }
      return;
    }
    case 'castillo': {
      await say('Las ruinas del Castillo de Montearagón dominan toda la Hoya de Huesca. Se ve hasta el Moncayo.');
      if (!G.flags.castle) { G.flags.castle = true; G.bag.ball += 5; Sound.item(); await say('¡Entre las piedras encuentras 5 Oscaballs!'); }
      return;
    }
    case 'loarre': {
      await say('Entras en el Castillo de Loarre. Sus murallas románicas, del siglo XI, siguen en pie casi intactas.');
      await say('Desde la torre del homenaje se ve toda la Hoya de Huesca, hasta los Monegros.');
      if (!G.flags.loarre) { G.flags.loarre = true; G.bag.super += 3; Sound.item(); await say('Un guía te regala 3 Superpociones. "¡Para los valientes que suben hasta aquí!"'); }
      return;
    }
    case 'sjpena': {
      await say('El Monasterio de San Juan de la Peña está construido bajo una enorme roca.');
      await say('En su panteón descansan los primeros reyes de Aragón. Cuenta la leyenda que aquí se guardó el Santo Grial.');
      if (!G.flags.sjpena) { G.flags.sjpena = true; G.bag.ball += 5; Sound.item(); await say('Un monje te regala 5 Oscaballs.'); }
      return;
    }
    case 'monzon_castillo':
      await say('El Castillo de Monzón fue de los templarios. Aquí se crió de niño el rey Jaime I el Conquistador.');
      return say('Desde sus murallas se ve el río Cinca serpenteando por la llanura.');
    case 'refugio': {
      await say('REFUGIO DE GÓRIZ: Al pie del Monte Perdido, a 2.200 m. El guarda te da algo caliente.');
      healParty(); Sound.heal(); await sleep(600);
      return say('¡Tus Oscamon han descansado y están como nuevos!');
    }
    case 'refugio_aneto': {
      await say('REFUGIO DE LA RENCLUSA: Desde aquí sale la ruta al Aneto por el Portillón Superior.');
      healParty(); Sound.heal(); await sleep(600);
      return say('¡Tus Oscamon han descansado y están como nuevos!');
    }
  }
  if (b.heal) { for (const line of b.text) await say(line); healParty(); Sound.heal(); await sleep(600); return say('¡Tus Oscamon se han recuperado por completo!'); }
  if (b.text) { for (const line of b.text) await say(line); return; }
  if (b.kind === 'house') return say('¡Hola! Ponte cómodo, estás en tu casa.');
}

async function trainScript(b) {
  if (!G.flags.badge) {
    await say('JEFE DE ESTACIÓN: Esta es la línea Huesca-Canfranc, que sube por Ayerbe, Sabiñánigo y Jaca.');
    return say('JEFE DE ESTACIÓN: Solo viajan entrenadores con la MEDALLA CAMPANA. ¡Vence a Ramiro II en Huesca! (Andando también puedes llegar a todas partes.)');
  }
  const dests = Object.keys(STATIONS).filter(k => k !== b.station);
  say('JEFE DE ESTACIÓN: Línea Huesca-Canfranc. ¿A dónde viajas?', { wait: false });
  const i = await choose([...dests.map(k => STATIONS[k].name), 'No viajar']);
  if (i < 0 || i === dests.length) return;
  await travel(dests[i]);
}

async function travel(to) {
  await say('¡Pasajeros al tren! El tren de la línea Huesca-Canfranc se pone en marcha...', { wait: false });
  Sound.seq([[330, 0.15], [0, 0.1], [330, 0.15], [0, 0.1], [440, 0.4]], 'square', 0.04);
  await sleep(900);
  hideDialog();
  await tween(500, k => (fade = k));
  setMap('world');
  placePlayer(STATIONS[to]);
  saveGame(true);
  await sleep(500);
  await tween(500, k => (fade = 1 - k));
  banner = { text: lastZone, t: 2.2 };
  await say(`¡Has llegado a la estación de ${STATIONS[to].name}!`);
}

async function labScript() {
  if (!G.party.length) {
    await say('PROF. CAJAL: ¡Hola! Soy el Profesor Cajal. Estudio a los OSCAMON, las criaturas del Alto Aragón.');
    await say('Osca era el nombre de Huesca en tiempos de los romanos. ¡De ahí viene el nombre!');
    await say('Toma, elige a tu primer compañero. Los tres viven solo en la provincia de Huesca.');
    const starters = ['parrillin', 'isuelin', 'somontin'];
    for (;;) {
      say('¿Qué Oscamon eliges?', { wait: false });
      const i = await choose(starters.map(s => ({ label: SPECIES[s].name, sub: SPECIES[s].types[0], color: TYPE_COLORS[SPECIES[s].types[0]], icon: monIconURL(s) })), { cancel: false, title: 'ELIGE' });
      const sp = starters[i];
      await say(`${SPECIES[sp].name}, tipo ${SPECIES[sp].types[0]}. ${SPECIES[sp].desc}`);
      say(`¿Te quedas con ${SPECIES[sp].name}?`, { wait: false });
      if ((await choose(['¡Sí!', 'Mejor otro'], { cancel: false })) === 0) {
        G.party.push(makeMon(sp, 5)); markCaught(sp); G.flags.starter = sp;
        Sound.catch();
        await say(`¡Has recibido a ${SPECIES[sp].name}!`);
        break;
      }
    }
    G.bag.ball += 5; G.bag.potion += 3; Sound.item();
    await say('PROF. CAJAL: Llévate también 5 Oscaballs y 3 Pociones.');
    await say('Empieza por la hierba alta del Parque Miguel Servet: allí los Oscamon son débiles, de nivel 2 o 3.');
    await say('Cuanto más lejos de Huesca vayas, más fuertes serán. El Pirineo es para entrenadores expertos.');
    await say('En combate, los ataques marcados con ▲ son muy eficaces y los marcados con ▼, poco eficaces.');
    await say('Hay ocho Gimnasios repartidos por la provincia, uno de cada tipo. El primero está aquí, en Huesca: Ramiro II, en el Palacio.');
    await say('Entre pueblo y pueblo hay rutas largas, con hierba alta y entrenadores. ¡Prepárate bien antes de salir!');
    await say('Pulsa MENÚ (tecla M) para ver el MAPA de la provincia, tu equipo, la mochila y para guardar. ¡Suerte!');
    saveGame(true);
    return;
  }
  const seen = Object.keys(G.seen).length, caught = Object.keys(G.caught).length;
  await say(`PROF. CAJAL: Veamos tu Oscadex... Has visto ${seen} y capturado ${caught} de ${DEX_ORDER.length} Oscamon.`);
  if (caught >= DEX_ORDER.length) await say('¡INCREÍBLE! ¡Has completado el Oscadex de Huesca! ¡Eres un auténtico maestro Oscamon!');
  else if (caught >= 10) await say('¡Gran trabajo! Ya conoces casi todos los rincones del Alto Aragón.');
  else await say('Explora los Mallos de Riglos, el Salto de Roldán y las riberas del Isuela. ¡Hay mucho por descubrir!');
}

async function centerScript(town = 'Huesca') {
  await say(`ENFERMERA: ¡Bienvenido al Centro Oscamon de ${town}!`);
  for (;;) {
    say('¿Qué deseas?', { wait: false });
    const i = await choose(['Curar a mis Oscamon', 'Usar la Caja', 'Adiós'], { cancel: true });
    if (i === 0) {
      if (!G.party.length) { await say('ENFERMERA: ¡Aún no tienes Oscamon! Visita al Profesor Cajal.'); continue; }
      await say('ENFERMERA: De acuerdo, dame a tus Oscamon un momento...', { wait: false });
      Sound.heal(); await sleep(1300); healParty(); saveGame(true);
      await say('ENFERMERA: ¡Listo! Tus Oscamon están como nuevos. ¡Vuelve cuando quieras!');
    } else if (i === 1) await boxScript();
    else return say('ENFERMERA: ¡Hasta pronto!');
  }
}

async function boxScript() {
  for (;;) {
    say(`Caja: ${G.box.length} Oscamon guardados.`, { wait: false });
    const i = await choose(['Sacar Oscamon', 'Dejar Oscamon', 'Salir']);
    if (i === 0) {
      if (!G.box.length) { await say('La Caja está vacía.'); continue; }
      hideDialog();
      const k = await choose(G.box.map(monOption), { title: 'CAJA' });
      if (k < 0) continue;
      if (G.party.length < 6) { G.party.push(G.box.splice(k, 1)[0]); await say('¡Añadido a tu equipo!'); }
      else {
        const j = await partyChoose('¿Por cuál lo cambias?');
        if (j < 0) continue;
        const tmp = G.party[j]; G.party[j] = G.box[k]; G.box[k] = tmp;
        await say('¡Intercambio hecho!');
      }
    } else if (i === 1) {
      if (G.party.length <= 1) { await say('¡No puedes quedarte sin Oscamon!'); continue; }
      const j = await partyChoose('¿Cuál dejas en la Caja?');
      if (j < 0) continue;
      const m = G.party.splice(j, 1)[0]; m.hp = maxHp(m); G.box.push(m);
      await say(`${monName(m)} se queda descansando en la Caja.`);
    } else return;
  }
}

async function shopScript() {
  await say('DEPENDIENTA: ¡Buenas! Bienvenido a Ultramarinos del Coso. Aquí hay de todo desde hace más de un siglo.');
  for (;;) {
    hideDialog();
    const keys = Object.keys(ITEMS);
    const i = await choose([...keys.map(k => ({ label: ITEMS[k].name, sub: ITEMS[k].price + ' €' })), 'Salir'], { title: `DINERO: ${G.money} €` });
    if (i < 0 || i === keys.length) return say('DEPENDIENTA: ¡Gracias, vuelve pronto! Y llévate una trenza, que están recién hechas.');
    const it = ITEMS[keys[i]];
    say(`${it.name}: ${it.desc} ¿Cuántas?`, { wait: false });
    const q = [1, 5, 10];
    const j = await choose(q.map(n => ({ label: '× ' + n, sub: n * it.price + ' €', disabled: n * it.price > G.money })));
    if (j < 0) continue;
    G.money -= q[j] * it.price; G.bag[keys[i]] += q[j];
    Sound.item();
    await say(`¡Has comprado ${q[j]} × ${it.name}!`);
  }
}

// ---------------- Gimnasios ----------------
// Orden recomendado = orden de la tabla. Los niveles suben con la distancia a Huesca.
const GYMS = {
  huesca: { town: 'Huesca', leader: 'Rey Ramiro II', type: 'Roca', flag: 'badge', badge: 'MEDALLA CAMPANA', pal: GYM_PAL, bg: 'palace',
    team: [['mallorroc', 10], ['danzante', 11], ['campanon', 13]], again: [['mallorroc', 30], ['danzante', 30], ['laurenton', 31], ['campanon', 33]],
    intro: ['En la sala de la Campana te espera un hombre con corona y hábito de monje...', 'RAMIRO II: Soy Ramiro II, el Rey Monje. Cuentan que con una "campana" di una lección a los nobles rebeldes.', 'RAMIRO II: ¡Veamos si tú suenas igual de fuerte! ¡Que repique la campana!'],
    win: '¡Increíble! El sonido de tu victoria se oirá en todo Aragón.', tip: 'Pasa por el Ayuntamiento, te tienen preparada una recompensa. La siguiente Líder está en Barbastro.' },
  barbastro: { town: 'Barbastro', leader: 'Líder Vero', type: 'Planta', flag: 'badgeBarbastro', badge: 'MEDALLA SOMONTANO', pal: ['#6a2a4a', '#e8d8c0', '#4a2a3a'], bg: 'grass',
    team: [['albahaquin', 14], ['somontin', 15], ['somontazo', 17]], again: [['albahaquin', 32], ['somontin', 32], ['ranisuela', 32], ['somontazo', 34]],
    intro: ['Huele a madera de roble y a uva madura...', 'VERO: ¡Bienvenido al Somontano! Soy Vero, Líder del Gimnasio de Barbastro.', 'VERO: Mis Oscamon de tipo Planta crecen entre las viñas. ¡A ver qué cosecha traes!'],
    win: '¡Qué buena cosecha la tuya!', tip: 'Baja por el Cinca hasta Monzón: allí te espera el Templario.' },
  monzon: { town: 'Monzón', leader: 'Templario Berenguer', type: 'Fuego', flag: 'badgeMonzon', badge: 'MEDALLA TEMPLARIA', pal: ['#f4f4f4', '#f4f4f4', '#c01818'], bg: 'palace',
    team: [['fogaril', 17], ['antorchon', 18], ['laurenton', 20]], again: [['fogaril', 34], ['antorchon', 35], ['laurenton', 36]],
    intro: ['Las antorchas iluminan los muros del castillo templario...', 'BERENGUER: En este castillo se crió el rey Jaime I. Yo guardo su fuego.', 'BERENGUER: ¡Que arda la batalla!'],
    win: 'Tu llama brilla más que la mía.', tip: 'Ahora sube al Pirineo: en Jaca, Nieves te espera sobre el hielo.' },
  jaca: { town: 'Jaca', leader: 'Líder Nieves', type: 'Hielo', flag: 'badgeJaca', badge: 'MEDALLA OROEL', pal: ['#eef6ff', '#3a7ad0', '#2a3a6a'], bg: 'snow',
    team: [['nevero', 19], ['arminin', 20], ['aneton', 22]], again: [['nevero', 36], ['arminin', 36], ['mallorroc', 36], ['aneton', 38]],
    intro: ['Hace un frío que pela y el suelo resbala...', 'NIEVES: ¡Bienvenido a la pista! Soy Nieves, Líder del Gimnasio de Jaca.', 'NIEVES: Mis Oscamon entrenan en Candanchú y Astún. ¿Aguantarás el frío?'],
    win: '¡Me has derretido!', tip: 'En Sabiñánigo, a orillas del Gállego, está el Gimnasio de tipo Agua.' },
  sabinanigo: { town: 'Sabiñánigo', leader: 'Líder Iris', type: 'Agua', flag: 'badgeSabi', badge: 'MEDALLA GÁLLEGO', pal: ['#2a6ab0', '#40c0e0', '#2a3a6a'], bg: 'water',
    team: [['ranisuela', 22], ['truchon', 23], ['isuelon', 25]], again: [['ranisuela', 38], ['truchon', 39], ['isuelon', 40]],
    intro: ['Se oye el agua del río Gállego corriendo junto al gimnasio...', 'IRIS: ¡Hola! Soy Iris, piragüista y Líder de Sabiñánigo.', 'IRIS: ¡Mis Oscamon bajan los rápidos del Gállego como nadie!'],
    win: '¡Me has volcado la piragua!', tip: 'Cruza el puerto de Cotefablo y baja hasta Aínsa, en el Sobrarbe.' },
  ainsa: { town: 'Aínsa', leader: 'Líder Guillem', type: 'Normal', flag: 'badgeAinsa', badge: 'MEDALLA PEÑA MONTAÑESA', pal: ['#a02a2a', '#d8c070', '#3a2a1a'], bg: 'palace',
    team: [['trenzon', 25], ['danzante', 26], ['marmotin', 26], ['sarrion', 28]], again: [['trenzon', 40], ['danzante', 40], ['marmotin', 41], ['sarrion', 42]],
    intro: ['Desde el castillo se ve la Peña Montañesa recortada en el cielo...', 'GUILLEM: Soy Guillem, señor del castillo de Aínsa y Líder del Gimnasio.', 'GUILLEM: ¡Que suenen los tambores de La Morisma!'],
    win: '¡Has tomado el castillo!', tip: 'Ve hacia el este, a Benasque. Allí el viento del Aneto sopla fuerte.' },
  benasque: { town: 'Benasque', leader: 'Líder Pirene', type: 'Aire', flag: 'badgeBenasque', badge: 'MEDALLA ANETO', pal: ['#e0e8f0', '#5a8ad0', '#2a3a5a'], bg: 'snow',
    team: [['cierzin', 28], ['quebranto', 29], ['buitron', 31]], again: [['cierzin', 42], ['quebranto', 43], ['buitron', 45]],
    intro: ['El viento silba entre las vigas de madera...', 'PIRENE: Soy Pirene, guía de alta montaña. He subido al Aneto cien veces.', 'PIRENE: ¡Mis Oscamon vuelan más alto que las cumbres!'],
    win: 'Tienes los pies en la tierra... ¡y la cabeza en las cumbres!', tip: 'El último Gimnasio está en Torla, a las puertas de Ordesa. Necesitarás las otras siete medallas.' },
  ordesa: { town: 'Torla-Ordesa', leader: 'Guardiana Lucía', type: 'Mixto', flag: 'badgeOrdesa', badge: 'MEDALLA MONTE PERDIDO', pal: ['#2a5a2a', '#e0d8b0', '#3a3a2a'], bg: 'rock', need: 7,
    team: [['buitron', 32], ['antorchon', 33], ['aneton', 33], ['isuelon', 34], ['somontazo', 35]], again: [['buitron', 45], ['antorchon', 46], ['aneton', 46], ['isuelon', 47], ['somontazo', 48]],
    intro: ['Por la ventana se ve el valle de Ordesa y, al fondo, Monte Perdido...', 'LUCÍA: Soy Lucía, guardiana del Parque Nacional y última Líder del Alto Aragón.', 'LUCÍA: Has recorrido toda la provincia. ¡Demuéstrame lo que has aprendido!'],
    win: 'Eres el mejor entrenador que ha pisado Ordesa.', tip: '¡Eres CAMPEÓN DEL ALTO ARAGÓN! Aún quedan legendarios por encontrar: Bayardo y el Bucardo.' },
};

async function gymScript(id) {
  const g = GYMS[id], name = g.leader.split(' ').slice(1).join(' ').toUpperCase() || g.leader.toUpperCase();
  if (!G.party.length) return say(`${name}: Vuelve cuando tengas un Oscamon.`);
  const again = !!G.flags[g.flag];
  if (!again && g.need && badgeCount() < g.need) {
    await say(`${name}: Solo acepto retos de quien tiene ${g.need} medallas. Tú tienes ${badgeCount()}.`);
    return say(`${name}: Recorre el Alto Aragón y vuelve cuando las tengas.`);
  }
  if (again) {
    await say(`${name}: ¡Hola de nuevo! Llevas la ${g.badge} con orgullo.`);
    say('¿Quieres una revancha? Esta vez no me contendré.', { wait: false });
    if ((await choose(['¡Sí!', 'No, gracias'])) !== 0) return;
  } else for (const line of g.intro) await say(line);
  const r = await battle({ trainer: { name: g.leader, pal: g.pal, money: (again ? g.again : g.team).slice(-1)[0][1] * 25, lose: g.win, team: again ? g.again : g.team }, bg: g.bg });
  if (r !== 'win' || again) return;
  G.flags[g.flag] = true; G.badges = badgeCount();
  await say(`${name}: Te la has ganado. ¡La ${g.badge}!`);
  Sound.catch();
  await say(`¡Has conseguido la ${g.badge}! Ya tienes ${badgeCount()} de ${Object.keys(GYMS).length} medallas.`);
  await say(`${name}: ${g.tip}`);
  saveGame(true);
}

async function showBadges() {
  hideDialog();
  const ids = Object.keys(GYMS);
  for (;;) {
    const i = await choose(ids.map(id => {
      const g = GYMS[id], got = !!G.flags[g.flag];
      return { label: got ? g.badge.replace('MEDALLA ', '') : '???', sub: `${g.town} · ${g.type}`, color: got ? TYPE_COLORS[g.type] || '#8a7a5a' : '#9a9aa8' };
    }), { title: `MEDALLAS · ${badgeCount()} de ${ids.length}` });
    if (i < 0) return;
    const g = GYMS[ids[i]];
    await say(G.flags[g.flag] ? `${g.badge}: la ganaste a ${g.leader} en ${g.town}.` : `Gimnasio de ${g.town}: ${g.leader}, tipo ${g.type}.`);
  }
}

// ---------------- Menú principal ----------------
function monOption(m) {
  return { label: `${monName(m)} Nv${m.lvl}`, sub: m.hp > 0 ? `PS ${m.hp}/${maxHp(m)}` : 'DEBILITADO', icon: monIconURL(m.sp) };
}
async function partyChoose(title = 'EQUIPO', cancel = true) {
  hideDialog();
  return choose(G.party.map(monOption), { title, cancel });
}

async function showSummary(m) {
  const sp = SPECIES[m.sp];
  const next = expForLevel(m.lvl + 1) - m.exp;
  await say(`${sp.name} · Nv ${m.lvl} · Tipo ${sp.types.join('/')}\nPS ${m.hp}/${maxHp(m)} · ATQ ${calcStat(m, 'atk')} · DEF ${calcStat(m, 'def')} · VEL ${calcStat(m, 'spd')}`);
  await say(`Movimientos: ${m.moves.map(id => MOVES[id].name).join(', ')}.\nExperiencia para subir de nivel: ${next}.`);
}

async function mainMenu() {
  for (;;) {
    hideDialog();
    const i = await choose(['MAPA', 'OSCAMON', 'MOCHILA', 'OSCADEX', 'MEDALLAS', 'GUARDAR', `SONIDO: ${Sound.muted ? 'NO' : 'SÍ'}`, 'SALIR'],
      { title: `${G.money} € · Medallas: ${badgeCount()}` });
    if (i < 0 || i === 7) return;
    if (i === 0) { await showMap(); continue; }
    if (i === 4) { await showBadges(); continue; }
    if (i === 1) {
      if (!G.party.length) { await say('Aún no tienes ningún Oscamon.'); continue; }
      for (;;) {
        const k = await partyChoose('EQUIPO');
        if (k < 0) break;
        const j = await choose(['Ver datos', 'Poner el primero', 'Volver']);
        if (j === 0) await showSummary(G.party[k]);
        else if (j === 1) { const [m] = G.party.splice(k, 1); G.party.unshift(m); await say(`${monName(m)} irá el primero.`); }
      }
    } else if (i === 2) {
      for (;;) {
        hideDialog();
        const keys = Object.keys(ITEMS).filter(k => G.bag[k] > 0);
        if (!keys.length) { await say('La mochila está vacía.'); break; }
        const j = await choose(keys.map(k => ({ label: ITEMS[k].name, sub: '×' + G.bag[k] })), { title: 'MOCHILA' });
        if (j < 0) break;
        const it = keys[j];
        if (it === 'ball') { await say(ITEMS.ball.desc + ' Úsalas en combate.'); continue; }
        if (!G.party.length) { await say('No tienes Oscamon.'); continue; }
        const t = await partyChoose('¿En qué Oscamon?');
        if (t < 0) continue;
        const m = G.party[t];
        if (m.hp <= 0) { await say('Está debilitado. Llévalo al Centro Oscamon.'); continue; }
        if (m.hp >= maxHp(m)) { await say('No tendría ningún efecto.'); continue; }
        const before = m.hp;
        m.hp = Math.min(maxHp(m), m.hp + ITEMS[it].heal); G.bag[it]--;
        Sound.heal();
        await say(`${monName(m)} recuperó ${m.hp - before} PS.`);
      }
    } else if (i === 3) {
      let start = 0;
      for (;;) {
        hideDialog();
        const seen = Object.keys(G.seen).length, caught = Object.keys(G.caught).length;
        const k = await choose(DEX_ORDER.map((sp, n) => ({
          label: `${String(n + 1).padStart(2, '0')} ${G.seen[sp] ? SPECIES[sp].name : '?????'}`,
          sub: G.caught[sp] ? '●' : G.seen[sp] ? '○' : '',
          icon: G.seen[sp] ? monIconURL(sp) : undefined,
        })), { title: `OSCADEX · Vistos ${seen} · Capturados ${caught}`, start });
        if (k < 0) break;
        start = k;
        const sp = DEX_ORDER[k];
        if (!G.seen[sp]) { await say('Aún no has visto a este Oscamon.'); continue; }
        await say(`${SPECIES[sp].name} (tipo ${SPECIES[sp].types.join('/')}).\n${SPECIES[sp].desc}`);
      }
    } else if (i === 5) {
      await say(saveGame() ? '¡Partida guardada!' : 'No se ha podido guardar la partida en este navegador.');
    } else if (i === 6) {
      Sound.muted = !Sound.muted;
    }
  }
}

// ---------------- Dibujo del mundo ----------------
function camera() {
  const k = player.moving ? player.t : 0;
  const px = (player.x + (player.tx - player.x) * k) * 16, py = (player.y + (player.ty - player.y) * k) * 16;
  let cx = px + 8 - VW / 2, cy = py + 8 - VH / 2;
  // Las habitaciones más pequeñas que la pantalla se centran
  cx = CUR.w * 16 <= VW ? (CUR.w * 16 - VW) / 2 : Math.max(0, Math.min(CUR.w * 16 - VW, cx));
  cy = CUR.h * 16 <= VH ? (CUR.h * 16 - VH) / 2 : Math.max(0, Math.min(CUR.h * 16 - VH, cy));
  return [Math.round(cx * SCALE) / SCALE, Math.round(cy * SCALE) / SCALE, px, py];
}

function drawSign(x, y) {
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + 7, y + 8, 2, 8);
  ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 1, y + 2, 14, 8);
  ctx.fillStyle = '#b07a44'; ctx.fillRect(x + 2, y + 3, 12, 6);
  ctx.fillStyle = '#e0b880'; ctx.fillRect(x + 4, y + 5, 8, 1); ctx.fillRect(x + 4, y + 7, 6, 1);
}

function renderWorld(t) {
  const [cx, cy, ppx, ppy] = camera();
  const wf = Math.floor(t / 500) % 2;
  const x0 = Math.floor(cx / 16), y0 = Math.floor(cy / 16);
  if (CUR.interior) { ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, VW, VH); }
  for (let y = y0; y <= y0 + 11; y++) for (let x = x0; x <= x0 + 16; x++) {
    if (CUR.interior && !(MAP[y] && MAP[y][x])) continue;
    const c = tileAt(x, y), fr = (c === 'R' && tileAt(x, y - 1) !== 'R' ? TILES.Rtop : TILES[c]) || TILES['.'];
    ctx.drawImage(fr[wf % fr.length], x * 16 - cx, y * 16 - cy);
  }
  for (const b of CUR.buildings) {
    if (b.x * 16 - cx > VW + 16 || (b.x + b.w) * 16 - cx < -16 || b.y * 16 - cy > VH + 16 || (b.y + b.h) * 16 - cy < -16) continue;
    drawBuilding(ctx, b, b.x * 16 - cx, b.y * 16 - cy);
  }
  for (const it of CUR.items) if (!G.flags[it.id]) ctx.drawImage(BALL_SPRITE, it.x * 16 - cx + 4, it.y * 16 - cy + 4 + Math.sin(t / 300) * 0.8);
  for (const s of CUR.signs) drawSign(s.x * 16 - cx, s.y * 16 - cy);
  for (const L of CUR.legends || []) {
    if (G.flags[L.flag]) continue;
    const bob = Math.sin(t / 400) * 1.5;
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(L.x * 16 - cx + 8, L.y * 16 - cy + 14, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(monSprite(L.sp), L.x * 16 - cx - 8, L.y * 16 - cy - 14 + bob);
  }
  // personajes ordenados por altura
  const ents = CUR.npcs.map(n => ({ y: n.y, draw: () => {
    const sx = n.x * 16 - cx, sy = n.y * 16 - cy;
    ctx.drawImage(charSprite(n.pal, n.dir, 0), sx, sy - 4);
    if (tileAt(n.x, n.y) === ',') ctx.drawImage(TALL_OVERLAY, 0, 9, 16, 7, sx, sy + 9, 16, 7);
    if (npcState[n.id] && npcState[n.id].alert) {
      ctx.fillStyle = '#202020'; ctx.fillRect(sx + 3, sy - 18, 10, 12);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 4, sy - 17, 8, 10);
      text('!', sx + 5, sy - 15, '#d02020', 6);
    }
  } }));
  ents.push({ y: player.moving ? Math.max(player.y, player.ty) : player.y, draw: () => {
    const frame = player.moving && player.t < 0.5 ? (player.parity ? 1 : 2) : 0;
    const sx = ppx - cx, sy = ppy - cy;
    ctx.drawImage(charSprite(PLAYER_PAL, player.dir, frame), sx, sy - 4);
    const gx = player.moving && player.t > 0.5 ? player.tx : player.x, gy = player.moving && player.t > 0.5 ? player.ty : player.y;
    if (tileAt(gx, gy) === ',') ctx.drawImage(TALL_OVERLAY, 0, 9, 16, 7, gx * 16 - cx, gy * 16 - cy + 9, 16, 7);
  } });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());

  if (banner.t > 0) {
    const k = Math.min(1, banner.t * 3, (2.2 - banner.t) * 4);
    const w = banner.text.length * 6 + 14;
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = '#384858'; ctx.fillRect(4, 4, w + 2, 16);
    ctx.fillStyle = '#f8f8e8'; ctx.fillRect(5, 5, w, 14);
    text(banner.text, 12, 9, '#303030', 6);
    ctx.globalAlpha = 1;
  }
}

function renderTitle(t) {
  const g = ctx.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, '#5aa0e8'); g.addColorStop(0.6, '#bfe0f8'); g.addColorStop(1, '#f8e8c0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 240, 160);
  // Pirineo
  ctx.fillStyle = '#8a9ab8';
  ctx.beginPath(); ctx.moveTo(0, 100);
  [[20, 70], [45, 88], [70, 58], [95, 84], [120, 62], [150, 86], [175, 54], [200, 80], [225, 66], [240, 78]].forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(240, 110); ctx.lineTo(0, 110); ctx.fill();
  ctx.fillStyle = '#f4f8ff';
  for (const [x, y] of [[70, 58], [120, 62], [175, 54], [20, 70], [225, 66]]) { ctx.beginPath(); ctx.moveTo(x - 7, y + 8); ctx.lineTo(x, y); ctx.lineTo(x + 7, y + 8); ctx.fill(); }
  // Silueta de Huesca: catedral en lo alto del cerro
  ctx.fillStyle = '#c89a6a';
  ctx.beginPath(); ctx.ellipse(120, 132, 140, 34, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#8a6040';
  ctx.fillRect(132, 82, 12, 22); ctx.fillRect(130, 80, 16, 3);
  ctx.beginPath(); ctx.moveTo(100, 104); ctx.lineTo(116, 90); ctx.lineTo(132, 104); ctx.fill();
  ctx.fillRect(100, 98, 32, 10);
  for (const [x, w, h] of [[60, 18, 14], [80, 14, 10], [150, 16, 12], [168, 20, 9], [190, 14, 13]]) ctx.fillRect(x, 108 - h, w, h + 4);
  ctx.fillStyle = '#7ccb5c'; ctx.fillRect(0, 128, 240, 32);
  // Título
  const bob = Math.sin(t / 500) * 2;
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]]) text('OSCAMON', 120 + dx, 14 + dy + bob, '#203a80', 20, 'center');
  text('OSCAMON', 120, 14 + bob, '#f8d030', 20, 'center');
  text('EDICION HUESCA', 121, 41, '#203a80', 8, 'center');
  text('EDICION HUESCA', 120, 40, '#ffffff', 8, 'center');
  ['parrillin', 'isuelin', 'somontin'].forEach((s, i) => {
    const y = 104 + Math.sin(t / 300 + i * 2) * 3;
    ctx.drawImage(monSprite(s), 54 + i * 50, y, 32, 32);
  });
  if (Math.floor(t / 500) % 2 && $('menu').classList.contains('hidden')) text('PULSA A · Z · ESPACIO', 120, 142, '#203a20', 6, 'center');
  text('Juego de fans no oficial', 120, 152, '#3a5a3a', 4, 'center');
}

// ---------------- Mapa de la provincia ----------------
let MINIMAP = null;
const MM_COLORS = { '.': '#7ccb5c', ',': '#4f9a3a', '=': '#e8dcc0', C: '#a0a0a8', S: '#f0e8d0', D: '#c89a58', '~': '#3f88dc', H: '#a87444',
  T: '#2f7a34', A: '#1f5a34', M: '#8a8276', n: '#f4f8fc', R: '#c4643c', F: '#7ccb5c', r: '#6a5a4a', B: '#b8503a', Y: '#e2c25a', V: '#9a8a4a', d: '#dcc79a' };
function buildMinimap() {
  const Wd = MAPS.world, T = Wd.tiles;
  const c = document.createElement('canvas'); c.width = Wd.w; c.height = Wd.h;
  const g = c.getContext('2d'), img = g.createImageData(Wd.w, Wd.h);
  for (let y = 0; y < Wd.h; y++) for (let x = 0; x < Wd.w; x++) {
    const [r, gg, b] = hexToRgb(MM_COLORS[T[y][x]] || '#7ccb5c'), i = (y * Wd.w + x) * 4;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  MINIMAP = c;
}
async function showMap() {
  hideDialog();
  if (!MINIMAP) buildMinimap();
  mode = 'map';
  await new Promise(res => { uiHandler = b => { if (b === 'a' || b === 'b' || b === 'start') { uiHandler = null; res(); } }; });
  mode = 'world';
}
function renderMap(t) {
  ctx.fillStyle = '#18202c'; ctx.fillRect(0, 0, VW, VH);
  const Wd = MAPS.world, sc = Math.min((VW - 8) / Wd.w, (VH - 20) / Wd.h), w = Wd.w * sc, h = Wd.h * sc, ox = (VW - w) / 2, oy = 16;
  ctx.drawImage(MINIMAP, ox, oy, w, h);
  ctx.strokeStyle = '#f0e0b0'; ctx.lineWidth = 0.6; ctx.strokeRect(ox - 0.5, oy - 0.5, w + 1, h + 1);
  text('PROVINCIA DE HUESCA', VW / 2, 5, '#f0e0b0', 6, 'center');
  for (const [name, x, y] of MAP_LABELS) {
    const px = ox + x * sc, py = oy + y * sc;
    ctx.fillStyle = '#202020'; ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 0.7, py - 0.7, 1.4, 1.4);
    const right = px < ox + w - 30;
    text(name, px + (right ? 2.5 : -2.5) + 0.4, py - 1.6 + 0.4, '#101010', 3.4, right ? 'left' : 'right');
    text(name, px + (right ? 2.5 : -2.5), py - 1.6, '#ffffff', 3.4, right ? 'left' : 'right');
  }
  if (Math.floor(t / 300) % 2) {
    const pos = CUR.interior ? CUR.back : player;
    const px = ox + pos.x * sc, py = oy + pos.y * sc;
    ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.stroke();
  }
}

function render(t) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, VW, VH);
  if (mode === 'title') renderTitle(t);
  else if (mode === 'battle' && B) renderBattle(t);
  else if (mode === 'map') renderMap(t);
  else if (G) renderWorld(t);
  if (flash > 0) { ctx.fillStyle = `rgba(16,16,24,${flash * 0.85})`; ctx.fillRect(0, 0, VW, VH); }
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, VW, VH); }
}

// ---------------- Inicio ----------------
function placePlayer(pos) {
  player.x = player.tx = pos.x; player.y = player.ty = pos.y; player.dir = pos.dir || 'down';
  player.moving = false; player.t = 0;
  lastZone = zoneName(pos.x, pos.y);
}

async function titleFlow() {
  mode = 'title';
  await waitA();
  const saved = loadGame();
  let fresh = true;
  if (saved && saved.party) {
    const i = await choose(['CONTINUAR', 'NUEVA PARTIDA'], { cancel: false });
    if (i === 0) fresh = false;
    else {
      say('¿Seguro? Se borrará la partida guardada al guardar de nuevo.', { wait: false });
      if ((await choose(['Sí, empezar', 'No'], { cancel: false })) === 1) fresh = false;
    }
  }
  hideDialog();
  await tween(400, k => (fade = k));
  if (fresh) G = newState();
  else {
    G = Object.assign(newState(), saved); G.bag = Object.assign({ ball: 0, potion: 0, super: 0 }, saved.bag);
    if (saved.map !== 'world') { G.pos = migratePos(saved.map, saved.pos || START); G.lastCenter = null; }
    else if (saved.worldVer !== WORLD_VER) { G.pos = migrateWorldPos(saved.pos || WORLD_START); G.lastCenter = null; }
    G.worldVer = WORLD_VER;
  }
  setMap('world');
  placePlayer(G.pos);
  mode = 'world';
  await tween(400, k => (fade = 1 - k));
  banner = { text: lastZone, t: 2.2 };
  if (fresh) {
    await runScript(async () => {
      await say('¡Bienvenido a HUESCA, capital del Alto Aragón!');
      await say('Desde los Mallos de Riglos hasta el río Isuela, esta tierra está llena de criaturas llamadas OSCAMON.');
      await say('El Profesor Cajal te espera en su laboratorio, al este de tu casa. ¡Tu aventura empieza hoy!');
      await say('Controles: flechas o WASD para moverte, Z/Espacio = A, X = B (mantén para correr) y M = Menú.');
    });
  }
}

async function boot() {
  initInput();
  makeTiles(); makeOverlay();
  BALL_SPRITE = makeBallSprite(8); BALL_SMALL = makeBallSprite(6);
  resize();
  window.addEventListener('resize', resize);
  try { await Promise.race([document.fonts.load('8px "Press Start 2P"'), sleep(2500)]); } catch (e) { /* fuente opcional */ }
  requestAnimationFrame(loop);
  titleFlow();
}

function resize() {
  const wrap = $('wrap');
  const controls = $('controls');
  const ctrlH = controls && getComputedStyle(controls).display !== 'none' ? controls.offsetHeight + 12 : 0;
  const helpH = $('help').offsetHeight + 16;
  let w = Math.min(window.innerWidth - 8, 960);
  const maxH = window.innerHeight - ctrlH - helpH - 8;
  if (w * 2 / 3 > maxH) w = Math.max(240, maxH * 1.5);
  wrap.style.width = w + 'px';
  wrap.style.height = (w * 2 / 3) + 'px';
  wrap.style.setProperty('--u', (w / 240) + 'px');
}

boot();
