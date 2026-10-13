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
    flags: {}, seen: {}, caught: {}, badges: 0, map: 'huesca', pos: { ...START },
  };
}
function markSeen(sp) { G.seen[sp] = true; }
function markCaught(sp) { G.seen[sp] = true; G.caught[sp] = true; }
const badgeCount = () => (G.flags.badge ? 1 : 0) + (G.flags.badgeJaca ? 1 : 0);
function setMap(id) {
  CUR = MAPS[id] || MAPS.huesca;
  if (!CUR.tiles) CUR.tiles = CUR.build();
  MAP = CUR.tiles;
  G.map = CUR.id;
}
function healParty() { for (const m of G.party) m.hp = maxHp(m); }

function saveGame(silent) {
  G.pos = { x: player.x, y: player.y, dir: player.dir };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); return true; }
  catch (e) { if (!silent) console.warn(e); return false; }
}
function loadGame() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

// ---------------- Mapa ----------------
const tileAt = (x, y) => (MAP[y] && MAP[y][x]) || 'T';
const signAt = (x, y) => CUR.signs.find(s => s.x === x && s.y === y);
const npcAt = (x, y) => CUR.npcs.find(n => n.x === x && n.y === y);
const legendAt = (x, y) => !!CUR.legend && !G.flags.legend && CUR.legend.x === x && CUR.legend.y === y;
const itemAt = (x, y) => CUR.items.find(i => i.x === x && i.y === y && !G.flags[i.id]);
function doorAt(x, y) { return CUR.buildings.find(b => b.door >= 0 && b.x + b.door === x && b.y + b.h - 1 === y); }
function blocked(x, y) {
  return SOLID.has(tileAt(x, y)) || !!signAt(x, y) || !!npcAt(x, y) || legendAt(x, y);
}
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

const zoneName = (x, y) => CUR.zoneName(x, y);
function huescaZoneName(x, y) {
  if (y < 22 && x < 14) return 'Mallos de Riglos';
  if (y < 10 && x >= 18 && x <= 36) return 'Salto de Roldán';
  if (y < 22 && x < 41) return 'Ruta del Pirineo';
  if (x >= 41) return y < 13 ? 'Castillo de Montearagón' : 'Riberas del Isuela';
  if (x < 12) return 'Huertas de la Hoya';
  if (x >= 12 && x <= 20 && y >= 39 && y <= 50) return 'Parque Miguel Servet';
  if (x >= 13 && x <= 38 && y >= 23 && y <= 37) return 'Casco Antiguo';
  if (y >= 52) return 'Vía del tren';
  return 'Huesca';
}

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
  if (tileAt(nx, ny) === ',' && !G.party.length) {
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
  if (tileAt(player.x, player.y) === ',' && Math.random() < 0.11) runScript(wildEncounter);
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
  const n = npcAt(x, y);
  if (n) return runScript(() => talkTo(n));
  if (legendAt(x, y)) return runScript(legendEncounter);
  const door = doorAt(x, y);
  if (door) return runScript(() => enterBuilding(door));
  const t = tileAt(x, y);
  if (t === '~') return runScript(() => say('El agua del Isuela baja fresquita desde la sierra de Guara.'));
  if (t === 'R') return runScript(() => say('Conglomerado rojo de los Mallos. ¡Impresionante!'));
  if (t === 'r') return runScript(() => say('La vía del tren Huesca-Canfranc. ¡No se juega en las vías!'));
};

// ---------------- Encuentros ----------------
function zoneAt(x, y) { return CUR.zones.find(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) || CUR.zones[CUR.defaultZone]; }

async function wildEncounter() {
  const z = zoneAt(player.x, player.y);
  const total = z.list.reduce((s, e) => s + e[3], 0);
  let r = Math.random() * total, pick = z.list[0];
  for (const e of z.list) { if ((r -= e[3]) < 0) { pick = e; break; } }
  const lvl = pick[1] + Math.floor(Math.random() * (pick[2] - pick[1] + 1));
  await battle({ wild: makeMon(pick[0], lvl), bg: z.bg });
}

async function legendEncounter() {
  if (!G.party.length) return say('Algo enorme y blanco te observa desde las peñas... Mejor vuelve con un Oscamon.');
  Sound.tone(500, 0.6, 'sawtooth', 0.05, 300);
  await say('¡Un relincho resuena entre las peñas del Salto de Roldán!');
  await say('¡Es BAYARDO, el legendario caballo de Roldán!');
  const res = await battle({ wild: makeMon(CUR.legend.sp, CUR.legend.lvl), bg: 'rock' });
  if (res === 'caught') G.flags.legend = true;
  else if (res === 'win') { G.flags.legend = true; await say('Bayardo dio un salto de peña en peña y desapareció en el horizonte...'); }
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
  const r = await battle({ trainer: { ...t, pal: n.pal }, bg: n.id === 'montanera' ? 'rock' : CUR.id === 'jaca' ? 'snow' : 'grass' });
  if (r === 'win') G.flags['tr_' + n.id] = true;
}

async function talkTo(n) {
  n.dir = OPP[player.dir];
  if (n.trainer) {
    if (G.flags['tr_' + n.id]) return say(`${n.trainer.name.toUpperCase()}: ${n.trainer.after}`);
    if (!G.party.length) return say(`${n.trainer.name.toUpperCase()}: Vuelve cuando tengas un Oscamon y combatiremos.`);
    return trainerBattle(n);
  }
  for (const line of n.text) await say(line);
}

// ---------------- Edificios ----------------
async function enterBuilding(b) {
  Sound.blip();
  switch (b.id) {
    case 'lab': return labScript();
    case 'centro': return centerScript();
    case 'tienda': return shopScript();
    case 'gym': return gymScript();
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
    case 'estacion': {
      if (!G.flags.badge) {
        await say('JEFE DE ESTACIÓN: El tren sube por el Pirineo hasta Jaca y Canfranc.');
        return say('JEFE DE ESTACIÓN: Pero solo viajan entrenadores con la MEDALLA CAMPANA. ¡Vence a Ramiro II en el Palacio!');
      }
      say('JEFE DE ESTACIÓN: ¿Quieres un billete a Jaca? ¡Allí está el Gimnasio del Pabellón de Hielo!', { wait: false });
      if ((await choose(['Sí, a Jaca', 'No, gracias'])) === 0) return travel('jaca');
      return;
    }
    case 'j_estacion': {
      say('JEFE DE ESTACIÓN: ¿Vuelves a Huesca?', { wait: false });
      if ((await choose(['Sí, a Huesca', 'No, me quedo'])) === 0) return travel('huesca');
      return;
    }
    case 'j_centro': return centerScript();
    case 'j_tienda': return shopScript();
    case 'j_gym': return jacaGymScript();
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
  }
}

async function travel(to) {
  await say('¡Pasajeros al tren! El tren de la línea Huesca-Canfranc se pone en marcha...', { wait: false });
  Sound.seq([[330, 0.15], [0, 0.1], [330, 0.15], [0, 0.1], [440, 0.4]], 'square', 0.04);
  await sleep(900);
  hideDialog();
  await tween(500, k => (fade = k));
  setMap(to);
  placePlayer(CUR.station);
  saveGame(true);
  await sleep(500);
  await tween(500, k => (fade = 1 - k));
  banner = { text: CUR.name, t: 2.2 };
  await say(to === 'jaca' ? '¡Has llegado a Jaca, a los pies del Pirineo! Hace fresquito...' : '¡De vuelta en Huesca!');
}

async function jacaGymScript() {
  const team = G.flags.badgeJaca
    ? [['nevero', 26], ['arminin', 26], ['mallorroc', 26], ['aneton', 28]]
    : [['nevero', 17], ['arminin', 18], ['aneton', 20]];
  if (G.flags.badgeJaca) {
    await say('NIEVES: ¡Hola de nuevo, campeón del Alto Aragón!');
    say('¿Quieres una revancha sobre el hielo?', { wait: false });
    if ((await choose(['¡Sí!', 'No, gracias'])) !== 0) return;
  } else {
    await say('Entras en el Pabellón de Hielo de Jaca. Hace un frío que pela y el suelo resbala...');
    await say('NIEVES: ¡Bienvenido a la pista! Soy Nieves, Líder del Gimnasio de Jaca.');
    await say('NIEVES: Mis Oscamon de hielo entrenan en las pistas de Candanchú y Astún. ¿Aguantarás el frío?');
  }
  const r = await battle({ trainer: { name: 'Líder Nieves', pal: ['#eef6ff', '#3a7ad0', '#2a3a6a'], money: G.flags.badgeJaca ? 250 : 400,
    lose: '¡Me has derretido! Tus Oscamon arden de energía.', team }, bg: 'snow' });
  if (r !== 'win' || G.flags.badgeJaca) return;
  G.flags.badgeJaca = true;
  await say('NIEVES: Te la has ganado. ¡La MEDALLA OROEL!');
  Sound.catch();
  await say('¡Has conseguido la MEDALLA OROEL!');
  await say('¡Con dos medallas eres el mejor entrenador del Alto Aragón! De Huesca al Pirineo, todos conocen tu nombre.');
  saveGame(true);
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
    await say('En la hierba alta del Parque Miguel Servet y en las afueras viven Oscamon salvajes. ¡Captúralos!');
    await say('Cuando estés en forma, desafía a Ramiro II en el Gimnasio del Palacio de los Reyes de Aragón, junto a la Catedral.');
    await say('Pulsa MENÚ (tecla M) para ver tu equipo, la mochila, el Oscadex y guardar la partida. ¡Suerte!');
    saveGame(true);
    return;
  }
  const seen = Object.keys(G.seen).length, caught = Object.keys(G.caught).length;
  await say(`PROF. CAJAL: Veamos tu Oscadex... Has visto ${seen} y capturado ${caught} de ${DEX_ORDER.length} Oscamon.`);
  if (caught >= DEX_ORDER.length) await say('¡INCREÍBLE! ¡Has completado el Oscadex de Huesca! ¡Eres un auténtico maestro Oscamon!');
  else if (caught >= 10) await say('¡Gran trabajo! Ya conoces casi todos los rincones del Alto Aragón.');
  else await say('Explora los Mallos de Riglos, el Salto de Roldán y las riberas del Isuela. ¡Hay mucho por descubrir!');
}

async function centerScript() {
  await say(`ENFERMERA: ¡Bienvenido al Centro Oscamon de ${CUR.name}!`);
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

async function gymScript() {
  if (!G.party.length) return say('Un guardia te detiene: "Sin Oscamon no se entra en el Palacio, joven".');
  if (G.flags.badge) {
    await say('RAMIRO II: ¡La campana repica en tu honor, campeón de Huesca!');
    say('¿Quieres una revancha?', { wait: false });
    if ((await choose(['¡Sí!', 'No, gracias'])) !== 0) return;
    await say('RAMIRO II: ¡Esta vez sonará más fuerte!');
    await battle({ trainer: { name: 'Rey Ramiro II', pal: GYM_PAL, money: 200, lose: '¡Sigues siendo digno de la corona!', team: [['mallorroc', 22], ['danzante', 22], ['laurenton', 23], ['campanon', 25]] }, bg: 'palace' });
    return;
  }
  await say('Entras en el Palacio de los Reyes de Aragón. En la sala de la Campana te espera un hombre con corona y hábito de monje...');
  await say('RAMIRO II: Soy Ramiro II, el Rey Monje. Cuentan que con una "campana" di una lección a los nobles rebeldes.');
  await say('RAMIRO II: ¡Veamos si tú suenas igual de fuerte! ¡Que repique la campana!');
  const r = await battle({ trainer: { name: 'Rey Ramiro II', pal: GYM_PAL, money: 300, lose: '¡Increíble! El sonido de tu victoria se oirá en todo Aragón.', team: [['mallorroc', 10], ['danzante', 11], ['campanon', 13]] }, bg: 'palace' });
  if (r !== 'win') return;
  G.flags.badge = true; G.badges = 1;
  await say('RAMIRO II: Te has ganado esto. ¡La MEDALLA CAMPANA!');
  Sound.catch();
  await say('¡Has conseguido la MEDALLA CAMPANA!');
  await say('¡Ahora eres CAMPEÓN DE HUESCA! Todo el Alto Aragón conoce tu nombre.');
  await say('RAMIRO II: Pasa por el Ayuntamiento, te tienen preparada una recompensa. Y dicen que en el Salto de Roldán aguarda un Oscamon legendario...');
  saveGame(true);
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
    const i = await choose(['OSCAMON', 'MOCHILA', 'OSCADEX', 'GUARDAR', `SONIDO: ${Sound.muted ? 'NO' : 'SÍ'}`, 'SALIR'],
      { title: `${G.money} € · Medallas: ${badgeCount()}` });
    if (i < 0 || i === 5) return;
    if (i === 0) {
      if (!G.party.length) { await say('Aún no tienes ningún Oscamon.'); continue; }
      for (;;) {
        const k = await partyChoose('EQUIPO');
        if (k < 0) break;
        const j = await choose(['Ver datos', 'Poner el primero', 'Volver']);
        if (j === 0) await showSummary(G.party[k]);
        else if (j === 1) { const [m] = G.party.splice(k, 1); G.party.unshift(m); await say(`${monName(m)} irá el primero.`); }
      }
    } else if (i === 1) {
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
    } else if (i === 2) {
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
    } else if (i === 3) {
      await say(saveGame() ? '¡Partida guardada!' : 'No se ha podido guardar la partida en este navegador.');
    } else if (i === 4) {
      Sound.muted = !Sound.muted;
    }
  }
}

// ---------------- Dibujo del mundo ----------------
function camera() {
  const k = player.moving ? player.t : 0;
  const px = (player.x + (player.tx - player.x) * k) * 16, py = (player.y + (player.ty - player.y) * k) * 16;
  let cx = px + 8 - VW / 2, cy = py + 8 - VH / 2;
  cx = Math.max(0, Math.min(CUR.w * 16 - VW, cx));
  cy = Math.max(0, Math.min(CUR.h * 16 - VH, cy));
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
  for (let y = y0; y <= y0 + 11; y++) for (let x = x0; x <= x0 + 15; x++) {
    const c = tileAt(x, y), fr = (c === 'R' && tileAt(x, y - 1) !== 'R' ? TILES.Rtop : TILES[c]) || TILES['.'];
    ctx.drawImage(fr[wf % fr.length], x * 16 - cx, y * 16 - cy);
  }
  for (const b of CUR.buildings) {
    if (b.x * 16 - cx > VW + 16 || (b.x + b.w) * 16 - cx < -16 || b.y * 16 - cy > VH + 16 || (b.y + b.h) * 16 - cy < -16) continue;
    drawBuilding(ctx, b, b.x * 16 - cx, b.y * 16 - cy);
  }
  for (const it of CUR.items) if (!G.flags[it.id]) ctx.drawImage(BALL_SPRITE, it.x * 16 - cx + 4, it.y * 16 - cy + 4 + Math.sin(t / 300) * 0.8);
  for (const s of CUR.signs) drawSign(s.x * 16 - cx, s.y * 16 - cy);
  const LEGEND = CUR.legend;
  if (LEGEND && !G.flags.legend) {
    const bob = Math.sin(t / 400) * 1.5;
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(LEGEND.x * 16 - cx + 8, LEGEND.y * 16 - cy + 14, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(monSprite(LEGEND.sp), LEGEND.x * 16 - cx - 8, LEGEND.y * 16 - cy - 14 + bob);
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

function render(t) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, VW, VH);
  if (mode === 'title') renderTitle(t);
  else if (mode === 'battle' && B) renderBattle(t);
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
  else { G = Object.assign(newState(), saved); G.bag = Object.assign({ ball: 0, potion: 0, super: 0 }, saved.bag); }
  setMap(G.map || 'huesca');
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
