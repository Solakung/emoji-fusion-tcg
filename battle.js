/* Emoji Fusion TCG — เอนจินต่อสู้ + บอท (ตามเอกสารออกแบบ v0.2)
   ใช้ได้ทั้งในเบราว์เซอร์ (window.Battle) และ node (module.exports) */
(function (root) {
  'use strict';

  var F = (typeof module !== 'undefined' && module.exports) ? require('./fusion.js') : root.Fusion;

  var RULES = { fuseInherit: true }; // การ์ดผสมโจมตีได้ทันที ถ้าแม่ทั้งสองพร้อมโจมตีอยู่
  var MAX_BOARD = 5, MAX_HAND = 8, MAX_MANA = 8, START_HP = 20, FATIGUE_DMG = 2;

  // ชนิดเป้าหมายของเวทย์แต่ละใบ
  var SPELL_TARGET = {
    S01: 'enemy-any', S02: 'none', S03: 'ally-any', S04: 'enemy-unit', S05: 'none', S06: 'any-unit',
    S07: 'none', S08: 'none', S09: 'none', S10: 'ally-unit', S11: 'ally-fused', S12: 'enemy-any'
  };

  /* ---------- เครื่องมือ ---------- */
  function rnd(G) {
    G.seed = (G.seed + 0x6D2B79F5) | 0;
    var t = G.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(G, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd(G) * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function beats(a, b) { return F.CYCLE[(F.CYCLE.indexOf(a) + 1) % 6] === b; }
  function curAtk(u) { return Math.max(0, u.atk + u.tempAtk); }
  function maxHp(u) { return u.baseMax + u.fieldBonus + u.tempHp; }
  function has(u, id) { return u.abil.indexOf(id) >= 0; }
  function kw(u, k) { return u.keywords.indexOf(k) >= 0; }
  function isHaste(u) { return kw(u, 'haste') || has(u, 'stormbolt'); }
  function isEvade(u) { return kw(u, 'evade') || has(u, 'fog'); }
  function maxAttacks(u) { return has(u, 'stormbolt') && curAtk(u) <= 3 ? 2 : 1; }
  function log(G, text) { G.log.push({ turn: G.turn, side: G.active, text: text }); if (G.log.length > 300) G.log.shift(); }
  function clone(G) {
    return (typeof structuredClone === 'function') ? structuredClone(G) : JSON.parse(JSON.stringify(G));
  }
  function knows(P, id) { return !!(P.knows && (P.knows.all || (P.knows.set && P.knows.set[id]))); }

  function mkUnit(G, card) {
    return {
      uid: G.nextUid++, card: card, name: card.name, emoji: card.emoji, element: card.element, tier: card.tier,
      atk: card.atk, tempAtk: 0, baseMax: card.hp, hp: card.hp, fieldBonus: 0, tempHp: 0,
      keywords: card.keywords.slice(), abil: card.abilities.map(function (a) { return a.id; }),
      attacksLeft: 0, attacked: false, burn: 0, stun: 0, evaded: false, grown: 0
    };
  }

  /* ---------- สร้างเกม ---------- */
  function create(opts) {
    var G = {
      seed: (opts.seed | 0) || ((Math.random() * 4294967296) | 0),
      turn: 0, active: 0, nextUid: 1, over: null, pending: null, log: [], players: []
    };
    for (var i = 0; i < 2; i++) {
      G.players.push({
        name: (opts.names && opts.names[i]) || ('ผู้เล่น ' + (i + 1)),
        hp: START_HP, deck: opts.decks[i].slice(), hand: [], board: [], mana: 0, maxMana: 0,
        field: null, sets: [], fusionsLeft: 0, fusionBoost: false, fatigue: 0, grave: [],
        knows: (opts.knows && opts.knows[i]) || { all: false, set: {} }
      });
      shuffle(G, G.players[i].deck);
    }
    G.active = (opts.first == null) ? (rnd(G) < 0.5 ? 0 : 1) : opts.first;
    G.first = G.active;
    for (var s = 0; s < 2; s++) {
      var n = (s === G.active) ? 5 : 6; // ผู้เล่นหลังจั่ว 6 ใบ
      for (var k = 0; k < n; k++) { var c = G.players[s].deck.pop(); if (c) G.players[s].hand.push(c); }
    }
    startTurn(G);
    return G;
  }

  function draw(G, side) {
    var P = G.players[side];
    if (!P.deck.length) {
      P.fatigue++;
      P.hp -= FATIGUE_DMG;
      log(G, P.name + ' จั่วไม่ได้ เสีย ' + FATIGUE_DMG + ' HP');
      checkOver(G);
      return null;
    }
    var c = P.deck.pop();
    if (P.hand.length >= MAX_HAND) { P.grave.push(c); log(G, P.name + ' มือเต็ม ทิ้ง ' + c.name); return null; }
    P.hand.push(c);
    return c;
  }

  function startTurn(G) {
    var side = G.active, P = G.players[side], O = G.players[1 - side];
    G.turn++;
    P.maxMana = Math.min(MAX_MANA, P.maxMana + 1);
    P.mana = P.maxMana;
    P.fusionsLeft = 1;
    P.fusionBoost = false;
    O.board.forEach(function (u) { u.evaded = false; });
    P.board.forEach(function (u) {
      u.attacked = false;
      if (u.stun > 0) { u.stun--; u.attacksLeft = 0; }
      else u.attacksLeft = maxAttacks(u);
    });
    draw(G, side);
    log(G, 'เทิร์น ' + G.turn + ' — ' + P.name + ' (Mana ' + P.mana + ')');
  }

  function checkOver(G) {
    if (G.over) return;
    var d0 = G.players[0].hp <= 0, d1 = G.players[1].hp <= 0;
    if (d0 && d1) G.over = { winner: -1 };
    else if (d0) G.over = { winner: 1 };
    else if (d1) G.over = { winner: 0 };
  }

  function lowestHp(arr) {
    return arr.slice().sort(function (a, b) { return a.hp - b.hp || a.uid - b.uid; })[0];
  }
  function highestAtk(arr) {
    return arr.slice().sort(function (a, b) { return curAtk(b) - curAtk(a) || a.uid - b.uid; })[0];
  }

  // เอฟเฟกต์ตอนถูกกำจัด
  function onDeath(G, side, u) {
    var P = G.players[side], O = G.players[1 - side];
    if (has(u, 'lastflame')) { O.hp -= 1; log(G, u.name + ': ผู้เล่นศัตรูโดน 1 ดาเมจ'); }
    if (has(u, 'eruption')) { O.board.forEach(function (e) { dmgUnit(e, 1); }); log(G, u.name + ': ศัตรูทุกตัวโดน 1 ดาเมจ'); }
    if (has(u, 'fall') && O.board.length) { var t = lowestHp(O.board); dmgUnit(t, 2); log(G, u.name + ': ' + t.name + ' โดน 2 ดาเมจ'); }
    if (has(u, 'wisp')) { draw(G, side); log(G, u.name + ': จั่วการ์ด'); }
  }

  function cleanup(G) {
    for (var guard = 0; guard < 20; guard++) {
      var dead = [];
      G.players.forEach(function (P, s) {
        var keep = [];
        P.board.forEach(function (u) { if (u.hp <= 0) dead.push({ u: u, side: s }); else keep.push(u); });
        P.board = keep;
      });
      if (!dead.length) break;
      dead.forEach(function (d) {
        G.players[d.side].grave.push(d.u.card);
        log(G, d.u.name + ' ถูกกำจัด');
        onDeath(G, d.side, d.u);
      });
    }
    checkOver(G);
  }

  function syncField(P) {
    P.board.forEach(function (u) {
      var b = (P.field && P.field.element === u.element) ? 1 : 0;
      var d = b - u.fieldBonus;
      if (d !== 0) {
        u.fieldBonus = b;
        if (d > 0) u.hp += d; else u.hp = Math.min(u.hp, maxHp(u));
      }
    });
  }

  function dmgUnit(u, amount) {
    if (amount <= 0) return 0;
    if (has(u, 'metal')) amount = Math.max(0, amount - 1);
    u.hp -= amount;
    return amount;
  }
  function findUnit(G, uid) {
    for (var s = 0; s < 2; s++) {
      var b = G.players[s].board;
      for (var i = 0; i < b.length; i++) if (b[i].uid === uid) return { u: b[i], side: s, idx: i };
    }
    return null;
  }

  // เอฟเฟกต์ตอนลงสนาม
  function enter(G, side, u) {
    var P = G.players[side], O = G.players[1 - side];
    if (has(u, 'steam')) { O.board.forEach(function (e) { e.tempAtk -= 1; }); log(G, u.name + ': ศัตรูทุกตัว ATK -1 เทิร์นนี้'); }
    if (has(u, 'firestorm')) { O.board.forEach(function (e) { dmgUnit(e, 1); }); log(G, u.name + ': ศัตรูทุกตัวโดน 1 ดาเมจ'); }
    if (has(u, 'seedpower')) { P.mana += 1; log(G, u.name + ': Mana +1'); }
    if (has(u, 'spore')) { draw(G, side); log(G, u.name + ': จั่วการ์ด'); }
    if (has(u, 'sandstorm') && O.board.length) {
      var t = O.board.slice().sort(function (a, b) { return curAtk(b) - curAtk(a); })[0];
      t.atk = Math.max(0, t.atk - 1);
      log(G, u.name + ': ' + t.name + ' ATK -1 ถาวร');
    }
    if (has(u, 'spark') && O.board.length) { var sp = lowestHp(O.board); dmgUnit(sp, 1); log(G, u.name + ': ' + sp.name + ' โดน 1 ดาเมจ'); }
    if (has(u, 'dew')) { P.hp = Math.min(START_HP, P.hp + 2); log(G, u.name + ': ฟื้น HP ผู้เล่น 2'); }
    if (has(u, 'tide')) {
      var al = P.board.filter(function (x) { return x !== u; });
      if (al.length) { var w = lowestHp(al); w.baseMax += 1; w.hp += 1; log(G, u.name + ': ' + w.name + ' HP +1'); }
    }
    if (has(u, 'freeze') && O.board.length) { var fz = highestAtk(O.board); fz.stun = 1; fz.attacksLeft = 0; log(G, u.name + ': ' + fz.name + ' ถูกแช่แข็ง'); }
    if (has(u, 'bloom')) { P.board.forEach(function (x) { x.hp = Math.min(maxHp(x), x.hp + 2); }); log(G, u.name + ': พวกเดียวกันฟื้น HP 2'); }
    if (has(u, 'charge')) { P.mana += 1; log(G, u.name + ': Mana +1'); }
    if (has(u, 'jolt')) { O.hp -= 1; log(G, u.name + ': ผู้เล่นศัตรูโดน 1 ดาเมจ'); }
    if (has(u, 'attract') && O.board.length) { var at = highestAtk(O.board); at.tempAtk -= 2; log(G, u.name + ': ' + at.name + ' ATK -2 เทิร์นนี้'); }
    if (has(u, 'fortify')) { P.board.forEach(function (x) { x.baseMax += 1; x.hp += 1; }); log(G, u.name + ': พวกเดียวกันทุกตัว HP +1'); }
    if (has(u, 'gust')) { draw(G, side); log(G, u.name + ': จั่วการ์ด'); }
    if (has(u, 'gale') && O.board.length) {
      var bt = O.board.slice().sort(function (a, b) { return b.card.cost - a.card.cost || a.uid - b.uid; })[0];
      O.board = O.board.filter(function (x) { return x !== bt; });
      if (O.hand.length < MAX_HAND) O.hand.push(bt.card); else O.grave.push(bt.card);
      log(G, u.name + ': ตี ' + bt.name + ' กลับเข้ามือ');
    }
    cleanup(G);
  }

  function place(G, side, card, idx) {
    var P = G.players[side];
    var u = mkUnit(G, card);
    u.attacksLeft = isHaste(u) ? maxAttacks(u) : 0;
    if (idx == null || idx > P.board.length) P.board.push(u); else P.board.splice(idx, 0, u);
    syncField(P);
    return u;
  }

  /* ---------- เป้าหมาย ---------- */
  function tauntUnits(G, side) {
    return G.players[side].board.filter(function (u) { return has(u, 'taunt') || has(u, 'guard'); });
  }

  function attackTargets(G, side, uid) {
    var P = G.players[side], O = G.players[1 - side];
    var u = P.board.filter(function (x) { return x.uid === uid; })[0];
    if (!u || u.attacksLeft <= 0 || curAtk(u) <= 0 || G.over || G.active !== side) return [];
    var t = tauntUnits(G, 1 - side);
    if (t.length) return t.map(function (x) { return x.uid; });
    return ['opp'].concat(O.board.map(function (x) { return x.uid; }));
  }

  function spellTargets(G, side, card) {
    var P = G.players[side], O = G.players[1 - side];
    var kind = SPELL_TARGET[card.id] || 'none';
    var ids = function (arr) { return arr.map(function (u) { return u.uid; }); };
    switch (kind) {
      case 'enemy-any': return ['opp'].concat(ids(O.board));
      case 'enemy-unit': return ids(O.board);
      case 'ally-any': return ['me'].concat(ids(P.board));
      case 'ally-unit': return ids(P.board);
      case 'any-unit': return ids(P.board).concat(ids(O.board));
      case 'ally-fused': return ids(P.board.filter(function (u) { return u.tier >= 2 && u.card.parts; }));
      default: return [];
    }
  }
  function targetsFor(G, side, handIdx) {
    var c = G.players[side].hand[handIdx];
    if (!c || c.type !== 'spell') return [];
    return spellTargets(G, side, c);
  }
  function needsTarget(card) {
    return card.type === 'spell' && (SPELL_TARGET[card.id] || 'none') !== 'none';
  }

  /* ---------- ผสม ---------- */
  function fuseCost(P, ua, ub, result) {
    var c = result.cost;
    if (P.field && (P.field.element === ua.card.element || P.field.element === ub.card.element)) c = Math.max(1, c - 1);
    return c;
  }

  function fusePreview(G, side, uidA, uidB) {
    var P = G.players[side];
    var fa = findUnit(G, uidA), fb = findUnit(G, uidB);
    if (!fa || !fb || fa.side !== side || fb.side !== side) return { ok: false, error: 'ต้องเลือกการ์ดฝั่งเรา 2 ใบ' };
    if (uidA === uidB) return { ok: false, error: 'ต้องเลือกคนละใบ' };
    if (P.fusionsLeft <= 0) return { ok: false, error: 'เทิร์นนี้ผสมครบแล้ว' };
    if (fa.u.attacked || fb.u.attacked) return { ok: false, error: 'การ์ดที่โจมตีแล้วผสมไม่ได้' };
    if (!F.canFuse(fa.u.card, fb.u.card)) return { ok: false, error: 'ผสมคู่นี้ไม่ได้ (ขั้น 3 / ใบเดียวกัน)' };
    var r = F.fuse(fa.u.card, fb.u.card);
    if (!knows(P, r.id)) return { ok: false, error: 'ยังไม่รู้สูตรนี้ (ไปค้นพบในห้องทดลอง)', unknown: true, card: null };
    return { ok: true, card: r, cost: fuseCost(P, fa.u, fb.u, r), idxA: fa.idx, idxB: fb.idx };
  }

  /* ---------- ลงการ์ด / เวทย์ ---------- */
  function resolveSpell(G, side, card, target) {
    var P = G.players[side], O = G.players[1 - side];
    var id = card.id;
    var tu = (typeof target === 'number') ? findUnit(G, target) : null;
    switch (id) {
      case 'S01': case 'S12':
        var amt = id === 'S01' ? 3 : 5;
        if (target === 'opp') O.hp -= amt; else if (tu) dmgUnit(tu.u, amt);
        log(G, card.name + ': ' + amt + ' ดาเมจ');
        break;
      case 'S02':
        P.board.forEach(function (u) { u.hp = Math.min(maxHp(u), u.hp + 2); });
        log(G, card.name + ': ฟื้น HP การ์ดฝั่งเรา');
        break;
      case 'S03':
        if (target === 'me') P.hp = Math.min(START_HP, P.hp + 3); else if (tu) tu.u.hp = Math.min(maxHp(tu.u), tu.u.hp + 3);
        log(G, card.name + ': ฟื้น HP 3');
        break;
      case 'S04': if (tu) dmgUnit(tu.u, 4); log(G, card.name + ': 4 ดาเมจ'); break;
      case 'S05': O.board.forEach(function (u) { dmgUnit(u, 2); }); log(G, card.name + ': ศัตรูทุกตัวโดน 2 ดาเมจ'); break;
      case 'S06':
        if (tu) {
          var owner = G.players[tu.side];
          owner.board.splice(tu.idx, 1);
          if (owner.hand.length < MAX_HAND) owner.hand.push(tu.u.card); else owner.grave.push(tu.u.card);
          log(G, card.name + ': ' + tu.u.name + ' กลับมือ');
        }
        break;
      case 'S07': P.fusionsLeft += 1; log(G, card.name + ': ผสมเพิ่มได้อีก 1 ครั้ง'); break;
      case 'S08': draw(G, side); draw(G, side); log(G, card.name + ': จั่ว 2 ใบ'); break;
      case 'S09': P.fusionBoost = true; log(G, card.name + ': การ์ดผสมเทิร์นนี้ +1/+1'); break;
      case 'S10': if (tu) { tu.u.tempHp += 3; tu.u.hp += 3; } log(G, card.name + ': HP +3 จนจบเทิร์น'); break;
      case 'S11':
        if (tu && tu.u.card.parts) {
          var parts = tu.u.card.parts;
          P.board.splice(tu.idx, 1);
          var u1 = place(G, side, parts[0], tu.idx), u2 = place(G, side, parts[1], tu.idx + 1);
          log(G, card.name + ': แยก ' + tu.u.name + ' เป็น ' + u1.name + ' + ' + u2.name);
        }
        break;
    }
  }

  /* ---------- Reaction: ตอบโต้ 3 ความเร็ว ----------
     ปกติ(1) = ลงการ์ด/เวทย์/ผสม/โจมตี · Instant(2) · Hyper(3)
     ตอบโต้ได้เฉพาะความเร็วเท่ากันหรือสูงกว่าใบบนสุดของ stack แล้วแก้ผลจากบนลงล่าง */
  var MAX_SETS = 2;
  function topSpeed(stack) { return stack.length ? stack[stack.length - 1].speed : 0; }
  function topLink(stack) { return stack.length ? stack[stack.length - 1] : null; }
  function strongest(side, G) { return highestAtk(G.players[side].board); }

  // เงื่อนไขการเปิดการ์ด reaction
  function reactLegal(G, side, card, stack) {
    var P = G.players[side], O = G.players[1 - side], top = topLink(stack);
    var opp = top && top.side !== side;
    switch (card.id) {
      case 'R01': case 'R02': return !!(opp && top.kind === 'attack');
      case 'R03': return P.board.length > 0;
      case 'R04': case 'R05': case 'R07': return O.board.length > 0;
      case 'R06': return !!(opp && top.speed < 3);
      case 'R08': return P.board.length < MAX_BOARD && P.grave.some(function (c) { return c.type === 'creature'; });
    }
    return false;
  }
  function reactOptions(G, side, stack) {
    var P = G.players[side], need = topSpeed(stack), out = [];
    P.sets.forEach(function (c, i) {
      if (c.speed >= Math.max(2, need) && c.cost <= P.mana && reactLegal(G, side, c, stack)) out.push(i);
    });
    return out;
  }
  function canRespond(G, side, stack) { return reactOptions(G, side, stack).length > 0; }

  function startChain(G, link) {
    var stack = [link];
    if (!canRespond(G, 1 - link.side, stack)) { resolveStack(G, stack); return; }
    G.pending = { stack: stack, resp: 1 - link.side };
    log(G, '⏳ ' + G.players[1 - link.side].name + ' ตอบโต้ได้');
  }

  function resolveStack(G, stack) {
    G.pending = null;
    for (var i = stack.length - 1; i >= 0 && !G.over; i--) {
      var l = stack[i];
      if (l.negated) {
        log(G, '🚫 ' + linkName(l) + ' ถูกยกเลิก');
        if (l.kind === 'summon' || l.kind === 'field') G.players[l.side].grave.push(l.card);
        continue;
      }
      resolveLink(G, l, stack, i);
      syncField(G.players[0]); syncField(G.players[1]);
      cleanup(G);
    }
  }
  function linkName(l) {
    if (l.kind === 'attack') return 'การโจมตี';
    if (l.kind === 'fuse') return 'การผสม';
    return (l.card && l.card.name) || 'การกระทำ';
  }

  function resolveLink(G, l, stack, idx) {
    var side = l.side, P = G.players[side], O = G.players[1 - side];
    switch (l.kind) {
      case 'summon':
        if (P.board.length >= MAX_BOARD) { P.grave.push(l.card); log(G, 'สนามเต็ม ' + l.card.name + ' ลงไม่ได้'); break; }
        var u = place(G, side, l.card);
        log(G, P.name + ' ลง ' + l.card.emoji + ' ' + l.card.name);
        enter(G, side, u);
        break;
      case 'field':
        if (P.field) P.grave.push(P.field);
        P.field = l.card; syncField(P);
        log(G, P.name + ' วางสนาม ' + l.card.emoji + ' ' + l.card.name);
        break;
      case 'spell':
        log(G, P.name + ' ใช้ ' + l.card.emoji + ' ' + l.card.name);
        resolveSpell(G, side, l.card, l.target);
        break;
      case 'fuse': resolveFuse(G, l); break;
      case 'attack': resolveAttack(G, l); break;
      case 'react': resolveReact(G, l, stack, idx); break;
    }
  }

  function resolveReact(G, l, stack, idx) {
    var side = l.side, P = G.players[side], O = G.players[1 - side], below = idx > 0 ? stack[idx - 1] : null;
    log(G, '⚡ ' + P.name + ' เปิด ' + l.card.emoji + ' ' + l.card.name);
    switch (l.card.id) {
      case 'R01': case 'R06': if (below) below.negated = true; break;
      case 'R02':
        if (below && below.kind === 'attack') { var at = findUnit(G, below.unit); if (at) dmgUnit(at.u, 2); }
        break;
      case 'R03': P.board.forEach(function (x) { x.hp = Math.min(maxHp(x), x.hp + 3); }); break;
      case 'R04': { var t4 = strongest(1 - side, G); if (t4) dmgUnit(t4, 2); break; }
      case 'R05': { var t5 = strongest(1 - side, G); if (t5) { t5.stun = 1; t5.attacksLeft = 0; } break; }
      case 'R07': O.board.forEach(function (x) { dmgUnit(x, 3); }); break;
      case 'R08':
        for (var k = P.grave.length - 1; k >= 0; k--) {
          if (P.grave[k].type === 'creature' && P.board.length < MAX_BOARD) { var c = P.grave.splice(k, 1)[0]; var nu = place(G, side, c); enter(G, side, nu); break; }
        }
        break;
    }
  }

  function resolveFuse(G, l) {
    var side = l.side, P = G.players[side];
    var fa = findUnit(G, l.a), fb = findUnit(G, l.b);
    if (!fa || !fb || fa.side !== side || fb.side !== side) { log(G, 'การผสมล้มเหลว (การ์ดหายไป)'); return; }
    var res = F.fuse(fa.u.card, fb.u.card);
    var idx = Math.min(fa.idx, fb.idx);
    P.board = P.board.filter(function (x) { return x.uid !== l.a && x.uid !== l.b; });
    var nu = place(G, side, res, idx);
    if (RULES.fuseInherit && fa.u.attacksLeft > 0 && fb.u.attacksLeft > 0) nu.attacksLeft = maxAttacks(nu);
    if (P.fusionBoost) { nu.atk += 1; nu.baseMax += 1; nu.hp += 1; }
    log(G, P.name + ' ผสม ' + fa.u.name + ' + ' + fb.u.name + ' → ' + res.name);
    enter(G, side, nu);
  }

  function resolveAttack(G, l) {
    var side = l.side, P = G.players[side], O = G.players[1 - side];
    var fa = findUnit(G, l.unit);
    if (!fa || fa.side !== side) { log(G, 'การโจมตีล้มเหลว (ผู้โจมตีหายไป)'); return; }
    var att = fa.u;
    if (l.target === 'opp') {
      var d = curAtk(att) + (has(att, 'plasma') ? 1 : 0);
      O.hp -= d;
      log(G, att.name + ' โจมตีผู้เล่น ' + d);
      if (has(att, 'lifesteal')) P.hp = Math.min(START_HP, P.hp + 1);
      return;
    }
    var ft = findUnit(G, l.target);
    if (!ft || ft.side === side) { log(G, 'การโจมตีล้มเหลว (เป้าหมายหายไป)'); return; }
    var tg = ft.u;
    if (isEvade(tg) && !tg.evaded) {
      tg.evaded = true;
      log(G, tg.name + ' หลบการโจมตีของ ' + att.name);
      return;
    }
    var da = curAtk(att) + (beats(att.element, tg.element) ? 1 : 0);
    var dt = curAtk(tg) + (beats(tg.element, att.element) ? 1 : 0);
    var gotT = dmgUnit(tg, da), gotA = dmgUnit(att, dt);
    log(G, att.name + ' ⇄ ' + tg.name + ' (' + gotT + '/' + gotA + ')');
    if (has(tg, 'thorns')) dmgUnit(att, 1);
    if (has(tg, 'trap')) att.atk = Math.max(0, att.atk - 1);
    if (has(att, 'lifesteal')) P.hp = Math.min(START_HP, P.hp + 1);
    if (has(att, 'chain')) {
      var oth = O.board.filter(function (x) { return x !== tg && x.hp > 0; });
      if (oth.length) { var ch = lowestHp(oth); dmgUnit(ch, 1); log(G, att.name + ': ฟ้าแลบต่อไป ' + ch.name); }
    }
    if (has(att, 'rampage') && tg.hp <= 0 && att.hp > 0) { att.attacksLeft++; log(G, att.name + ' คลั่ง! โจมตีได้อีกครั้ง'); }
    if (tg.hp > 0) {
      if (has(att, 'burn') || has(att, 'poison')) tg.burn = 2;
      if (has(att, 'mud')) tg.atk = Math.max(0, tg.atk - 1);
      if (has(att, 'shock')) tg.stun = 1;
    }
  }

  // ตรวจเงื่อนไข + จ่ายค่าใช้จ่าย แล้วคืน link ที่จะเข้า stack (ยังไม่แก้ผล)
  function declare(G, side, a) {
    var P = G.players[side];
    if (a.t === 'play') {
      var card = P.hand[a.hand];
      if (!card) return { ok: false, error: 'ไม่มีการ์ดนี้ในมือ' };
      if (card.cost > P.mana) return { ok: false, error: 'Mana ไม่พอ' };
      if (card.type === 'creature') {
        if (P.board.length >= MAX_BOARD) return { ok: false, error: 'สนามเต็ม' };
        P.hand.splice(a.hand, 1); P.mana -= card.cost;
        return { ok: true, link: { kind: 'summon', side: side, speed: 1, card: card } };
      }
      if (card.type === 'field') {
        P.hand.splice(a.hand, 1); P.mana -= card.cost;
        return { ok: true, link: { kind: 'field', side: side, speed: 1, card: card } };
      }
      if (card.type === 'spell') {
        var legal = spellTargets(G, side, card);
        if (needsTarget(card) && legal.indexOf(a.target) < 0) return { ok: false, error: 'เป้าหมายไม่ถูกต้อง' };
        if (card.id === 'S11' && P.board.length >= MAX_BOARD) return { ok: false, error: 'สนามเต็ม แยกตัวไม่ได้' };
        P.hand.splice(a.hand, 1); P.mana -= card.cost;
        P.grave.push(card);
        return { ok: true, link: { kind: 'spell', side: side, speed: 1, card: card, target: a.target } };
      }
      return { ok: false, error: 'การ์ดนี้ใช้คำสั่งวางคว่ำ' };
    }
    if (a.t === 'fuse') {
      var pv = fusePreview(G, side, a.a, a.b);
      if (!pv.ok) return pv;
      if (pv.cost > P.mana) return { ok: false, error: 'Mana ไม่พอ (ต้องใช้ ' + pv.cost + ')' };
      P.mana -= pv.cost; P.fusionsLeft--;
      return { ok: true, card: pv.card, link: { kind: 'fuse', side: side, speed: 1, a: a.a, b: a.b } };
    }
    if (a.t === 'attack') {
      var targets = attackTargets(G, side, a.unit);
      var att = P.board.filter(function (x) { return x.uid === a.unit; })[0];
      if (!att) return { ok: false, error: 'ไม่พบการ์ดที่โจมตี' };
      if (att.attacksLeft <= 0) return { ok: false, error: 'การ์ดนี้โจมตีไม่ได้ในตอนนี้' };
      if (curAtk(att) <= 0) return { ok: false, error: 'ATK เป็น 0' };
      if (targets.indexOf(a.target) < 0) {
        return { ok: false, error: tauntUnits(G, 1 - side).length ? 'ต้องโจมตีตัวล่อก่อน' : 'เป้าหมายไม่ถูกต้อง' };
      }
      att.attacksLeft--; att.attacked = true;
      return { ok: true, link: { kind: 'attack', side: side, speed: 1, unit: a.unit, target: a.target } };
    }
    return { ok: false, error: 'คำสั่งไม่รู้จัก' };
  }

  // เปิดการ์ด reaction (ในหน้าต่างตอบโต้ หรือเทิร์นตัวเองสำหรับ Instant)
  function doReact(G, side, a, stack) {
    var P = G.players[side], card = P.sets[a.slot];
    if (!card) return { ok: false, error: 'ไม่มีการ์ดคว่ำช่องนี้' };
    if (card.speed < Math.max(2, topSpeed(stack))) return { ok: false, error: 'ความเร็วไม่พอที่จะตอบโต้' };
    if (card.cost > P.mana) return { ok: false, error: 'Mana ไม่พอ (ต้องใช้ ' + card.cost + ')' };
    if (!reactLegal(G, side, card, stack)) return { ok: false, error: 'ใช้ตอนนี้ไม่ได้' };
    P.sets.splice(a.slot, 1); P.mana -= card.cost; P.grave.push(card);
    stack.push({ kind: 'react', side: side, speed: card.speed, card: card });
    return { ok: true };
  }

  /* ---------- actions ---------- */
  function apply(G, side, a) {
    if (G.over) return { ok: false, error: 'เกมจบแล้ว' };
    var P = G.players[side], O = G.players[1 - side];

    // กำลังรอแก้ chain
    if (G.pending) {
      var pd = G.pending;
      if (side !== pd.resp) return { ok: false, error: 'รอฝ่ายตรงข้ามตอบโต้อยู่' };
      if (a.t === 'pass') { resolveStack(G, pd.stack); return { ok: true }; }
      if (a.t === 'react') {
        var r0 = doReact(G, side, a, pd.stack);
        if (!r0.ok) return r0;
        var nx = 1 - side;
        if (canRespond(G, nx, pd.stack)) { pd.resp = nx; log(G, '⏳ ' + G.players[nx].name + ' ตอบโต้ได้'); }
        else resolveStack(G, pd.stack);
        return { ok: true };
      }
      return { ok: false, error: 'ตอนนี้ทำได้แค่ตอบโต้หรือผ่าน' };
    }

    if (G.active !== side) return { ok: false, error: 'ยังไม่ใช่เทิร์นของคุณ' };

    if (a.t === 'end') { endTurn(G); return { ok: true }; }

    if (a.t === 'set') {
      var rc = P.hand[a.hand];
      if (!rc || rc.type !== 'reaction') return { ok: false, error: 'วางคว่ำได้เฉพาะการ์ดปฏิกิริยา' };
      if (P.sets.length >= MAX_SETS) return { ok: false, error: 'ช่องวางคว่ำเต็ม (' + MAX_SETS + ')' };
      P.hand.splice(a.hand, 1); P.sets.push(rc);
      log(G, P.name + ' วางการ์ดคว่ำ 1 ใบ');
      return { ok: true };
    }

    if (a.t === 'react') { // Instant ในเทิร์นตัวเอง
      var stack = [];
      var cd = P.sets[a.slot];
      if (cd && cd.speed !== 2) return { ok: false, error: 'Hyper ใช้ได้เฉพาะตอนตอบโต้' };
      var r1 = doReact(G, side, a, stack);
      if (!r1.ok) return r1;
      if (canRespond(G, 1 - side, stack)) { G.pending = { stack: stack, resp: 1 - side }; log(G, '⏳ ' + O.name + ' ตอบโต้ได้'); }
      else resolveStack(G, stack);
      return { ok: true };
    }

    var d = declare(G, side, a);
    if (!d.ok) return d;
    startChain(G, d.link);
    return d.card ? { ok: true, card: d.card } : { ok: true };
  }

  function endTurn(G) {
    var side = G.active, P = G.players[side];
    P.board.forEach(function (u) {
      if (kw(u, 'regen')) u.hp = Math.min(maxHp(u), u.hp + 1);
      if (has(u, 'rainforest')) P.hp = Math.min(START_HP, P.hp + 1);
      if (has(u, 'sprout') && u.grown < 3) { u.grown++; u.atk += 1; }
    });
    P.board.forEach(function (u) {
      if (has(u, 'radiance')) {
        var Oe = G.players[1 - side];
        if (Oe.board.length) dmgUnit(lowestHp(Oe.board), 1);
      }
    });
    P.board.forEach(function (u) {
      if (u.burn > 0) { u.hp -= 1; u.burn--; }
    });
    G.players.forEach(function (Q) {
      Q.board.forEach(function (u) {
        u.tempAtk = 0;
        if (u.tempHp) { u.tempHp = 0; u.hp = Math.min(u.hp, maxHp(u)); }
      });
    });
    cleanup(G);
    if (G.over) return;
    G.active = 1 - side;
    startTurn(G);
  }

  /* ---------- บอท ---------- */
  function unitVal(u) {
    var v = curAtk(u) * 1.5 + Math.max(0, u.hp) + u.abil.length * 1.2 + u.keywords.length * 0.8;
    if (u.stun > 0) v -= 1;
    if (u.burn > 0) v -= u.burn * 0.7;
    return v;
  }
  function sum(arr, fn) { var s = 0; arr.forEach(function (x) { s += fn(x); }); return s; }

  function evaluate(G, me, hard) {
    if (G.over) return G.over.winner === me ? 1e6 : (G.over.winner === 1 - me ? -1e6 : 0);
    var P = G.players[me], O = G.players[1 - me];
    var s = (P.hp - O.hp) * 1.2;
    s += sum(P.board, unitVal) - sum(O.board, unitVal) * (hard ? 1.1 : 1);
    s += (P.hand.length - O.hand.length) * 1.1;
    if (P.field) s += 1.5;
    if (O.field) s -= 1.5;
    s += P.sets.length * 0.9 - O.sets.length * 0.9;
    if (hard) {
      var threat = sum(O.board, curAtk), danger = threat - (P.hp - 6);
      if (danger > 0) s -= danger * 0.6;
      var mine = sum(P.board, curAtk), opening = mine - (O.hp - 6);
      if (opening > 0) s += opening * 0.4;
    }
    return s;
  }

  function enumerate(G, side, level) {
    var P = G.players[side], list = [];
    P.hand.forEach(function (c, i) {
      if (c.type === 'reaction') { if (P.sets.length < MAX_SETS) list.push({ t: 'set', hand: i }); return; }
      if (c.cost > P.mana) return;
      if (c.type === 'creature') { if (P.board.length < MAX_BOARD) list.push({ t: 'play', hand: i }); }
      else if (c.type === 'field') list.push({ t: 'play', hand: i });
      else if (c.type === 'spell') {
        if (c.id === 'S07' || c.id === 'S09') return; // บอทไม่ใช้เวทย์เตรียมผสม
        if (needsTarget(c)) spellTargets(G, side, c).forEach(function (t) { list.push({ t: 'play', hand: i, target: t }); });
        else list.push({ t: 'play', hand: i });
      }
    });
    if (P.fusionsLeft > 0 && P.mana > 0) {
      for (var i = 0; i < P.board.length; i++) for (var j = i + 1; j < P.board.length; j++) {
        list.push({ t: 'fuse', a: P.board[i].uid, b: P.board[j].uid });
      }
    }
    P.board.forEach(function (u) {
      attackTargets(G, side, u.uid).forEach(function (t) { list.push({ t: 'attack', unit: u.uid, target: t }); });
    });
    return list;
  }

  function easyAction(G, side) {
    var P = G.players[side], i, best = -1, bc = 99;
    for (i = 0; i < P.hand.length; i++) {
      var c = P.hand[i];
      if (c.type === 'creature' && c.cost <= P.mana && P.board.length < MAX_BOARD && c.cost < bc) { best = i; bc = c.cost; }
    }
    if (best >= 0) return { t: 'play', hand: best };
    for (i = 0; i < P.board.length; i++) {
      var u = P.board[i], tg = attackTargets(G, side, u.uid);
      if (tg.length) return { t: 'attack', unit: u.uid, target: tg[Math.floor(Math.random() * tg.length)] };
    }
    return { t: 'end' };
  }

  // คืนคำสั่งถัดไปของบอท (เรียกซ้ำจนได้ {t:'end'})
  function botAction(G, side, level) {
    if (level === 'easy') return easyAction(G, side);
    var hard = level === 'hard', noise = hard ? 0 : 1.6;
    var P = G.players[side];
    var base = evaluate(G, side, hard), best = null, bestScore = base + 0.05;
    enumerate(G, side, level).forEach(function (a) {
      var C = clone(G);
      C.players[1 - side].sets = []; // บอทไม่รู้ว่าอีกฝั่งวางอะไรคว่ำไว้
      var r = apply(C, side, a);
      if (!r.ok) return;
      var sc = evaluate(C, side, hard) + 0.5 * (P.mana - C.players[side].mana) + (noise ? (Math.random() * 2 - 1) * noise : 0);
      if (sc > bestScore) { bestScore = sc; best = a; }
    });
    return best || { t: 'end' };
  }

  // ตัดสินใจตอนถูกเปิดหน้าต่างตอบโต้: คืน {t:'react',slot} หรือ {t:'pass'}
  function botRespond(G, side, level) {
    var pd = G.pending;
    if (!pd || pd.resp !== side || level === 'easy') return { t: 'pass' };
    var hard = level === 'hard', noise = hard ? 0 : 1.2;
    var opts = reactOptions(G, side, pd.stack);
    if (!opts.length) return { t: 'pass' };
    function score(a) {
      var C = clone(G);
      C.players[1 - side].sets = [];
      var r = apply(C, side, a);
      if (!r.ok) return -1e9;
      for (var g = 0; C.pending && g < 6; g++) apply(C, C.pending.resp, { t: 'pass' });
      return evaluate(C, side, hard);
    }
    var base = score({ t: 'pass' }), best = { t: 'pass' }, bestScore = base + 0.3;
    opts.forEach(function (slot) {
      var a = { t: 'react', slot: slot };
      var sc = score(a) - 0.25 * G.players[side].sets[slot].cost + (noise ? (Math.random() * 2 - 1) * noise : 0);
      if (sc > bestScore) { bestScore = sc; best = a; }
    });
    return best;
  }

  var api = {
    RULES: RULES, MAX_BOARD: MAX_BOARD, MAX_HAND: MAX_HAND, MAX_MANA: MAX_MANA, START_HP: START_HP,
    create: create, apply: apply, targetsFor: targetsFor, attackTargets: attackTargets,
    fusePreview: fusePreview, needsTarget: needsTarget, botAction: botAction, botRespond: botRespond, clone: clone,
    MAX_SETS: MAX_SETS, reactOptions: reactOptions, canRespond: canRespond, reactLegal: reactLegal,
    curAtk: curAtk, maxHp: maxHp, isHaste: isHaste, isEvade: isEvade, beats: beats, evaluate: evaluate
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Battle = api;
})(typeof window !== 'undefined' ? window : this);
