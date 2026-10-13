'use strict';
// ============================================================
//  Combates por turnos
// ============================================================

let B = null;
const freshStages = () => ({ atk: 0, def: 0 });
const stageMult = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
const STAT_NAMES = { atk: 'El Ataque', def: 'La Defensa' };
const BP = () => G.party[B.pi];
const BE = () => B.enemyTeam[B.ei];
const other = s => (s === 'p' ? 'e' : 'p');
const sideMon = s => (s === 'p' ? BP() : BE());
function lbl(side) {
  const n = monName(sideMon(side));
  return side === 'p' ? n : `${n} ${B.wild ? 'salvaje' : 'enemigo'}`;
}

function calcDamage(att, def, mv, aSt, dSt) {
  const A = calcStat(att, 'atk') * stageMult(aSt.atk);
  const D = calcStat(def, 'def') * stageMult(dSt.def);
  let dmg = ((2 * att.lvl / 5 + 2) * mv.power * A / D) / 50 + 2;
  if (SPECIES[att.sp].types.includes(mv.type)) dmg *= 1.5;
  const eff = effectiveness(mv.type, SPECIES[def.sp].types);
  dmg *= eff;
  const crit = Math.random() < 1 / 16;
  if (crit) dmg *= 1.5;
  dmg *= 0.85 + Math.random() * 0.15;
  return { dmg: Math.max(1, Math.floor(dmg)), eff, crit };
}

async function battleTransition() {
  Sound.encounter();
  for (let i = 0; i < 3; i++) { await tween(80, k => (flash = k)); await tween(80, k => (flash = 1 - k)); }
  await tween(280, k => (fade = k));
}

// opts: { wild: mon } | { trainer: { name, team, money, lose, pal } } ; bg
async function battle(opts) {
  await battleTransition();
  const wild = opts.wild;
  B = {
    wild: !!wild, trainer: opts.trainer || null,
    enemyTeam: wild ? [wild] : opts.trainer.team.map(([s, l]) => makeMon(s, l)),
    ei: 0, pi: Math.max(0, G.party.findIndex(m => m.hp > 0)),
    st: { p: freshStages(), e: freshStages() },
    fx: { pX: 0, eX: 0, pShow: false, eShow: !!wild, pDrop: 0, eDrop: 0, pBlink: false, eBlink: false,
      ball: null, eScale: 1, trainerShow: !wild, playerShow: true, tX: 0, plX: 0 },
    hpD: { p: 0, e: 0 }, bg: opts.bg || 'grass', showPHud: false, showEHud: false, evo: null, runs: 0,
  };
  B.hpD.e = BE().hp; B.hpD.p = BP().hp;
  mode = 'battle';
  hideDialog();
  B.fx.eX = 180; B.fx.pX = -180; B.fx.plX = -180;
  await tween(250, k => (fade = 1 - k));
  await tween(550, k => { B.fx.eX = 180 * (1 - k); B.fx.plX = -180 * (1 - k); });

  if (B.wild) {
    markSeen(BE().sp);
    B.showEHud = true;
    await say(`¡Un ${monName(BE())} salvaje apareció!`);
  } else {
    await say(`¡${B.trainer.name} quiere luchar!`);
    await tween(300, k => (B.fx.tX = 120 * k));
    B.fx.trainerShow = false; await sendEnemy();
  }
  await tween(300, k => (B.fx.plX = -140 * k));
  B.fx.playerShow = false;
  await sendPlayer(B.pi);

  for (;;) {
    const act = await playerAction();
    if (act.type === 'run') {
      if (!B.wild) { await say('¡No puedes huir de un combate contra un entrenador!'); continue; }
      B.runs++;
      const ps = calcStat(BP(), 'spd'), es = calcStat(BE(), 'spd');
      if (ps >= es || Math.random() * 256 < ps * 32 / es + 30 * B.runs) {
        Sound.blip(); await say('¡Escapaste sin problemas!');
        return endBattle('run');
      }
      await say('¡No has podido escapar!');
    } else if (act.type === 'ball') {
      G.bag.ball--;
      if (await throwBall()) return endBattle('caught');
    } else if (act.type === 'item') {
      G.bag[act.item]--;
      const m = G.party[act.target], before = m.hp;
      m.hp = Math.min(maxHp(m), m.hp + ITEMS[act.item].heal);
      Sound.heal();
      if (act.target === B.pi) await until(() => B.hpD.p === m.hp);
      await say(`Has usado ${ITEMS[act.item].name}. ${monName(m)} recuperó ${m.hp - before} PS.`);
    } else if (act.type === 'switch') {
      await say(`¡Vuelve, ${monName(BP())}!`, { wait: false });
      B.showPHud = false;
      await tween(250, k => (B.fx.pX = -120 * k));
      await sendPlayer(act.idx);
    }

    if (act.type === 'move') {
      const em = enemyChooseMove();
      const ps = calcStat(BP(), 'spd'), es = calcStat(BE(), 'spd');
      const pFirst = ps > es || (ps === es && Math.random() < 0.5);
      const order = pFirst ? [['p', act.move], ['e', em]] : [['e', em], ['p', act.move]];
      for (const [side, mv] of order) {
        await doAttack(side, mv);
        if (BP().hp <= 0 || BE().hp <= 0) break;
      }
    } else {
      await doAttack('e', enemyChooseMove());
    }

    if (BE().hp <= 0) {
      if ((await enemyFainted()) === 'win') return endBattle('win');
    }
    if (BP().hp <= 0) {
      if ((await playerFainted()) === 'lose') return endBattle('lose');
    }
  }
}

async function sendEnemy() {
  markSeen(BE().sp);
  B.hpD.e = BE().hp; B.st.e = freshStages();
  B.fx.eDrop = 0; B.fx.eX = 0; B.fx.eShow = true; B.fx.eScale = 0;
  await say(`¡${B.trainer.name} saca a ${monName(BE())}!`, { wait: false });
  await tween(250, k => (B.fx.eScale = k));
  B.showEHud = true;
  await sleep(350);
}

async function sendPlayer(idx) {
  B.pi = idx; B.st.p = freshStages(); B.hpD.p = BP().hp;
  B.fx.pDrop = 0; B.fx.pShow = true; B.fx.pX = -120;
  await say(`¡Adelante, ${monName(BP())}!`, { wait: false });
  await tween(300, k => (B.fx.pX = -120 * (1 - k)));
  B.showPHud = true;
  await sleep(250);
}

async function playerAction() {
  for (;;) {
    say(`¿Qué hará ${monName(BP())}?`, { wait: false });
    const i = await choose(['LUCHAR', 'MOCHILA', 'OSCAMON', 'HUIR'], { layout: 'grid', cancel: false });
    if (i === 0) {
      const mv = BP().moves;
      const j = await choose(mv.map(id => {
        const m = MOVES[id], e = m.power ? effectiveness(m.type, SPECIES[BE().sp].types) : 1;
        return { label: m.name, sub: m.type + (e > 1 ? ' ▲' : e < 1 ? ' ▼' : ''), color: TYPE_COLORS[m.type] };
      }), { layout: 'grid moves' });
      if (j < 0) continue;
      return { type: 'move', move: mv[j] };
    }
    if (i === 1) {
      const keys = Object.keys(ITEMS).filter(k => G.bag[k] > 0);
      if (!keys.length) { await say('¡La mochila está vacía!'); continue; }
      hideDialog();
      const j = await choose(keys.map(k => ({ label: ITEMS[k].name, sub: '×' + G.bag[k] })), { title: 'MOCHILA' });
      if (j < 0) continue;
      const it = keys[j];
      if (it === 'ball') {
        if (!B.wild) { await say('¡No puedes capturar el Oscamon de otro entrenador!'); continue; }
        return { type: 'ball' };
      }
      const t = await partyChoose('¿En qué Oscamon?');
      if (t < 0) continue;
      const m = G.party[t];
      if (m.hp <= 0) { await say('¡Está debilitado! Llévalo al Centro Oscamon.'); continue; }
      if (m.hp >= maxHp(m)) { await say('No tendría ningún efecto.'); continue; }
      return { type: 'item', item: it, target: t };
    }
    if (i === 2) {
      const k = await partyChoose('¿Qué Oscamon sacas?');
      if (k < 0) continue;
      if (k === B.pi) { await say(`¡${monName(BP())} ya está combatiendo!`); continue; }
      if (G.party[k].hp <= 0) { await say(`¡${monName(G.party[k])} no tiene fuerzas para luchar!`); continue; }
      return { type: 'switch', idx: k };
    }
    if (i === 3) return { type: 'run' };
  }
}

function enemyChooseMove() {
  const e = BE(), p = BP();
  const scored = e.moves.map(id => {
    const m = MOVES[id];
    let s;
    if (m.power) s = m.power * effectiveness(m.type, SPECIES[p.sp].types) * (SPECIES[e.sp].types.includes(m.type) ? 1.5 : 1);
    else {
      const tgt = m.effect.target === 'self' ? B.st.e : B.st.p;
      s = Math.abs(tgt[m.effect.stat]) >= 2 ? 5 : 45;
    }
    return { id, s };
  });
  // Los salvajes atacan al azar; los entrenadores eligen mejor
  if (B.wild || Math.random() < 0.3) return scored[Math.floor(Math.random() * scored.length)].id;
  scored.sort((a, b) => b.s - a.s);
  return scored[0].id;
}

async function doAttack(side, id) {
  const att = sideMon(side), def = sideMon(other(side)), mv = MOVES[id];
  const o = other(side);
  await say(`¡${lbl(side)} usó ${mv.name}!`, { wait: false });
  const dir = side === 'p' ? 1 : -1;
  await tween(180, k => (B.fx[side + 'X'] = dir * Math.sin(k * Math.PI) * 12));
  if (Math.random() * 100 >= mv.acc) { await say('¡Pero falló!'); return; }

  if (!mv.power) {
    const tgt = mv.effect.target === 'self' ? side : o;
    const st = B.st[tgt], cur = st[mv.effect.stat];
    const nv = Math.max(-6, Math.min(6, cur + mv.effect.stages));
    if (nv === cur) { await say('¡No ha tenido ningún efecto!'); return; }
    st[mv.effect.stat] = nv;
    Sound.stat(mv.effect.stages > 0);
    await tween(400, k => (B.fx[tgt + 'Blink'] = Math.floor(k * 6) % 2 === 1));
    B.fx[tgt + 'Blink'] = false;
    await say(`¡${STAT_NAMES[mv.effect.stat]} de ${lbl(tgt)} ${mv.effect.stages > 0 ? 'subió' : 'bajó'}!`);
    return;
  }

  const { dmg, eff, crit } = calcDamage(att, def, mv, B.st[side], B.st[o]);
  Sound.hit();
  B.shake = eff > 1 ? 4 : 2;
  await tween(420, k => (B.fx[o + 'Blink'] = Math.floor(k * 8) % 2 === 1));
  B.fx[o + 'Blink'] = false; B.shake = 0;
  def.hp = Math.max(0, def.hp - dmg);
  await until(() => B.hpD[o] === def.hp);
  if (crit) await say('¡Un golpe crítico!');
  if (eff > 1) await say('¡Es muy eficaz!');
  else if (eff < 1) await say('No es muy eficaz...');
  else await sleep(250);
}

async function enemyFainted() {
  Sound.faint();
  await tween(400, k => (B.fx.eDrop = k * 70));
  B.fx.eShow = false; B.showEHud = false;
  await say(`¡${lbl('e')} se debilitó!`);
  const e = BE();
  const gain = Math.max(1, Math.floor(SPECIES[e.sp].exp * e.lvl / 7 * (B.wild ? 1 : 1.5)));
  await giveExp(BP(), gain);
  const rest = G.party.filter(m => m !== BP() && m.hp > 0);
  if (rest.length) {
    const share = Math.max(1, Math.floor(gain / 2));
    await say(`El resto del equipo ganó ${share} puntos de experiencia.`);
    for (const m of rest) await giveExp(m, share, true);
  }
  if (!B.wild && B.ei < B.enemyTeam.length - 1) {
    B.ei++;
    await sendEnemy();
    return 'next';
  }
  return 'win';
}

async function giveExp(mon, gain, quiet) {
  if (!quiet) await say(`¡${monName(mon)} ganó ${gain} puntos de experiencia!`);
  mon.exp += gain;
  while (mon.lvl < 100 && mon.exp >= expForLevel(mon.lvl + 1)) {
    const oldMax = maxHp(mon);
    mon.lvl++;
    mon.hp += maxHp(mon) - oldMax;
    if (B && mon === BP()) B.hpD.p = mon.hp;
    Sound.levelup();
    await say(`¡${monName(mon)} subió al nivel ${mon.lvl}!`);
    for (const [l, mid] of SPECIES[mon.sp].moves) if (l === mon.lvl) await learnMove(mon, mid);
  }
}

async function learnMove(mon, mid) {
  if (mon.moves.includes(mid)) return;
  const n = monName(mon), mn = MOVES[mid].name;
  if (mon.moves.length < 4) { mon.moves.push(mid); Sound.item(); await say(`¡${n} aprendió ${mn}!`); return; }
  await say(`${n} quiere aprender ${mn}, pero ya conoce cuatro movimientos.`);
  say('¿Qué movimiento debería olvidar?', { wait: false });
  const i = await choose([...mon.moves.map(m => ({ label: MOVES[m].name, sub: MOVES[m].type, color: TYPE_COLORS[MOVES[m].type] })), `No aprender ${mn}`], { cancel: false });
  if (i < 4) {
    const old = MOVES[mon.moves[i]].name;
    mon.moves[i] = mid;
    await say(`1, 2 y... ¡puf! ${n} olvidó ${old} y aprendió ${mn}.`);
  } else await say(`${n} no aprendió ${mn}.`);
}

async function playerFainted() {
  Sound.faint();
  B.showPHud = false;
  await tween(400, k => (B.fx.pDrop = k * 70));
  B.fx.pShow = false;
  await say(`¡${monName(BP())} se debilitó!`);
  if (!G.party.some(m => m.hp > 0)) return 'lose';
  let k;
  for (;;) {
    k = await partyChoose('Elige al siguiente Oscamon.', false);
    if (G.party[k].hp > 0) break;
    await say('¡No tiene fuerzas para luchar!');
  }
  await sendPlayer(k);
  return 'next';
}

async function throwBall() {
  await say('¡Lanzas una Oscaball!', { wait: false });
  const sx = 50, sy = 96, ex = 182, ey = 34;
  await tween(500, k => (B.fx.ball = { x: sx + (ex - sx) * k, y: sy + (ey - sy) * k - Math.sin(k * Math.PI) * 40, rot: k * 10 }));
  await tween(220, k => (B.fx.eScale = 1 - k));
  B.fx.eShow = false; B.fx.eScale = 1;
  await tween(220, k => (B.fx.ball.y = ey + 22 * k));
  B.fx.ball.rot = 0;
  const e = BE(), hpF = e.hp / maxHp(e);
  const chance = Math.min(0.97, SPECIES[e.sp].catch * (1.6 - hpF) * 1.1);
  const p = Math.pow(chance, 1 / 3);
  for (let i = 0; i < 3; i++) {
    await sleep(300);
    if (Math.random() > p) {
      B.fx.ball = null; B.fx.eShow = true; Sound.bump();
      await say(['¡Oh, no! ¡Se ha escapado!', '¡Vaya! ¡Parecía que lo tenías!', '¡Arg! ¡Casi lo consigues!'][i]);
      return false;
    }
    Sound.shake();
    await tween(300, k => (B.fx.ball.rot = Math.sin(k * Math.PI * 2) * 0.5));
  }
  Sound.catch();
  B.fx.ball.caught = true;
  await say(`¡Ya está! ¡Has capturado a ${monName(e)}!`);
  const isNew = !G.caught[e.sp];
  markCaught(e.sp);
  if (isNew) await say(`Los datos de ${monName(e)} se han añadido al Oscadex.`);
  if (G.party.length < 6) G.party.push(e);
  else { G.box.push(e); await say(`Tu equipo está lleno. ${monName(e)} ha sido enviado a la Caja del Centro Oscamon.`); }
  return true;
}

async function evolve(m) {
  const from = m.sp, to = SPECIES[m.sp].evo[1], oldName = monName(m);
  B.evo = { show: from };
  B.showPHud = B.showEHud = false;
  await say(`¿Eh? ¡${oldName} está evolucionando!`, { wait: false });
  for (let i = 0; i < 12; i++) { B.evo.show = i % 2 ? to : from; Sound.tone(300 + i * 40, 0.08); await sleep(380 - i * 25); }
  B.evo.show = to; B.evo.flash = 1;
  tween(500, k => B.evo && (B.evo.flash = 1 - k));
  const oldMax = maxHp(m);
  m.sp = to;
  m.hp += maxHp(m) - oldMax;
  markCaught(to);
  Sound.levelup();
  await say(`¡Enhorabuena! ¡Tu ${oldName} ha evolucionado en ${monName(m)}!`);
  B.evo = null;
}

async function endBattle(result) {
  const t = B.trainer;
  if (result === 'win' && t) {
    Sound.win();
    await say(`¡Has derrotado a ${t.name}!`);
    if (t.lose) await say(`${t.name.toUpperCase()}: ${t.lose}`);
    G.money += t.money;
    await say(`Has ganado ${t.money} € por la victoria.`);
  } else if (result === 'win' && B.wild) {
    const c = BE().lvl * 2;
    G.money += c;
    await say(`Encuentras ${c} € entre la hierba.`);
  }
  if (result !== 'lose') {
    for (const m of G.party) {
      const evo = SPECIES[m.sp].evo;
      if (evo && m.lvl >= evo[0] && m.hp > 0) await evolve(m);
    }
  } else {
    await say('¡No te quedan Oscamon con fuerzas para luchar!');
    const lost = Math.floor(G.money / 2);
    G.money -= lost;
    await say(lost ? `Has perdido ${lost} €... Todo se vuelve negro.` : 'Todo se vuelve negro...');
  }
  hideDialog();
  await tween(350, k => (fade = k));
  mode = 'world';
  B = null;
  if (result === 'lose') {
    healParty();
    setMap('world');
    placePlayer(G.lastCenter || HOME_CENTER);
  }
  await tween(350, k => (fade = 1 - k));
  if (result === 'lose') {
    await say('Corres al Centro Oscamon. Tus Oscamon se han recuperado por completo.');
  }
  return result;
}

// ---------------- Dibujo del combate ----------------
const BG_STYLES = {
  grass:  { top: '#f8f0c8', bot: '#a8dc90', plat: '#8cc870', rim: '#5a9a48' },
  rock:   { top: '#fbe2cc', bot: '#e0a888', plat: '#c89070', rim: '#8a5a40' },
  water:  { top: '#e0f0ff', bot: '#90c4ec', plat: '#78b0dc', rim: '#4a80b0' },
  palace: { top: '#ece4f4', bot: '#b0a4c4', plat: '#c8bca0', rim: '#8a7c60' },
  snow:   { top: '#eef6ff', bot: '#bcd4ec', plat: '#f4f9ff', rim: '#98b0c8' },
};

function drawHud(x, y, w, mon, hpD, isPlayer) {
  const h = isPlayer ? 34 : 26;
  ctx.fillStyle = '#384858'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#f8f8e8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#d8d8c0'; ctx.fillRect(x, y + h - 2, w, 2);
  text(monName(mon), x + 4, y + 4, '#303030', 6);
  text('Nv' + mon.lvl, x + w - 4, y + 4, '#303030', 6, 'right');
  if (!isPlayer && G.caught[mon.sp]) ctx.drawImage(BALL_SMALL, x + w - 38, y + 4, 6, 6);
  const mh = maxHp(mon), f = Math.max(0, hpD / mh);
  text('PS', x + 4, y + 14, '#e08020', 5);
  ctx.fillStyle = '#404850'; ctx.fillRect(x + 16, y + 13, w - 21, 7);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x + 17, y + 14, w - 23, 5);
  ctx.fillStyle = f > 0.5 ? '#48c050' : f > 0.2 ? '#f0c020' : '#e83838';
  ctx.fillRect(x + 17, y + 14, (w - 23) * f, 5);
  if (isPlayer) {
    text(`${Math.ceil(hpD)}/${mh}`, x + w - 4, y + 22, '#303030', 5, 'right');
    const e0 = expForLevel(mon.lvl), e1 = expForLevel(mon.lvl + 1);
    const ef = Math.max(0, Math.min(1, (mon.exp - e0) / (e1 - e0)));
    ctx.fillStyle = '#404850'; ctx.fillRect(x + 16, y + 29, w - 21, 3);
    ctx.fillStyle = '#48a0f0'; ctx.fillRect(x + 17, y + 30, (w - 23) * ef, 1);
  }
}

function drawSpriteScaled(img, x, y, w, h, flip) {
  ctx.save();
  if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); }
  else ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function renderBattle(t) {
  const st = BG_STYLES[B.bg] || BG_STYLES.grass;
  const sh = B.shake ? (Math.random() - 0.5) * B.shake : 0;
  ctx.save(); ctx.translate(sh, 0);
  const g = ctx.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, st.top); g.addColorStop(1, st.bot);
  ctx.fillStyle = g; ctx.fillRect(-10, 0, 260, 160);

  if (B.evo) {
    ctx.fillStyle = '#101828'; ctx.fillRect(-10, 0, 260, 160);
    for (let i = 0; i < 20; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.3 * Math.sin(t / 200 + i)})`; ctx.fillRect((i * 37 + t / 20) % 240, (i * 53) % 110, 2, 2); }
    drawSpriteScaled(monSprite(B.evo.show), 72, 8, 96, 96);
    if (B.evo.flash) { ctx.fillStyle = `rgba(255,255,255,${B.evo.flash})`; ctx.fillRect(0, 0, 240, 160); }
    ctx.restore();
    return;
  }

  // decorado de fondo
  if (B.bg === 'rock') {
    ctx.fillStyle = '#d88a64';
    for (const [x, w, h] of [[10, 22, 50], [30, 18, 62], [190, 26, 46], [214, 20, 58]]) {
      ctx.beginPath(); ctx.ellipse(x + w / 2, 72, w / 2, h, 0, Math.PI, 0); ctx.fill();
    }
  } else if (B.bg === 'snow') {
    ctx.fillStyle = '#9aaecc';
    ctx.beginPath(); ctx.moveTo(-10, 80);
    [[20, 40], [50, 70], [90, 30], [130, 66], [170, 36], [210, 62], [250, 44], [250, 80]].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const [x, y] of [[20, 40], [90, 30], [170, 36]]) { ctx.beginPath(); ctx.moveTo(x - 9, y + 10); ctx.lineTo(x, y); ctx.lineTo(x + 9, y + 10); ctx.fill(); }
    for (let i = 0; i < 24; i++) ctx.fillRect((i * 47 + t / 30) % 240, (i * 29 + t / 18) % 112, 1, 1);
  } else if (B.bg === 'palace') {
    ctx.fillStyle = '#9c90b0';
    for (let x = 6; x < 240; x += 34) ctx.fillRect(x, 0, 10, 80);
    ctx.fillStyle = '#f4d020'; ctx.fillRect(110, 0, 20, 30);
    ctx.fillStyle = '#d01818'; for (let k = 0; k < 4; k++) ctx.fillRect(112 + k * 5, 0, 2, 30);
  } else {
    ctx.fillStyle = shade(st.bot, 0.92);
    ctx.beginPath(); ctx.ellipse(40, 80, 80, 26, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(200, 82, 90, 22, 0, Math.PI, 0); ctx.fill();
  }

  // plataformas
  const plat = (cx, cy, rx, ry) => {
    ctx.fillStyle = st.rim; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = st.plat; ctx.beginPath(); ctx.ellipse(cx, cy - 1, rx - 3, ry - 2, 0, 0, Math.PI * 2); ctx.fill();
  };
  plat(182, 66, 48, 11);
  plat(62, 112, 58, 12);

  const f = B.fx;
  // rival
  if (f.trainerShow && B.trainer) {
    drawSpriteScaled(charSprite(B.trainer.pal || ['#333', '#888', '#444'], 'down', 0), 154 + f.eX + f.tX, 6, 56, 56);
  } else if (f.eShow && !f.eBlink) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 240, 70); ctx.clip();
    const s = 64 * f.eScale;
    drawSpriteScaled(monSprite(BE().sp), 150 + f.eX + (64 - s) / 2, 6 + f.eDrop + (64 - s), s, s);
    ctx.restore();
  }
  // jugador
  if (f.playerShow) {
    drawSpriteScaled(charSprite(PLAYER_PAL, 'up', 0), 36 + f.plX, 54, 60, 60);
  } else if (f.pShow && !f.pBlink) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 240, 118); ctx.clip();
    drawSpriteScaled(monSprite(BP().sp), 30 + f.pX, 50 + f.pDrop, 64, 64, true);
    ctx.restore();
  }
  if (f.ball) {
    ctx.save(); ctx.translate(f.ball.x, f.ball.y); ctx.rotate(f.ball.rot || 0);
    ctx.drawImage(BALL_SPRITE, -5, -5, 10, 10);
    ctx.restore();
    if (f.ball.caught) for (let i = 0; i < 3; i++) text('★', f.ball.x - 12 + i * 10, f.ball.y - 14 - (i % 2) * 4, '#f0c020', 6);
  }
  // marcadores
  if (B.showEHud) drawHud(10, 10, 112, BE(), B.hpD.e, false);
  if (B.showPHud) drawHud(124, 74, 110, BP(), B.hpD.p, true);
  ctx.restore();
}

function updateBattle(dt) {
  if (!B) return;
  for (const s of ['p', 'e']) {
    const m = s === 'p' ? G.party[B.pi] : B.enemyTeam[B.ei];
    if (!m) continue;
    const target = m.hp, speed = Math.max(8, maxHp(m) * 0.9) * dt;
    if (B.hpD[s] > target) B.hpD[s] = Math.max(target, B.hpD[s] - speed);
    else if (B.hpD[s] < target) B.hpD[s] = Math.min(target, B.hpD[s] + speed);
  }
}
