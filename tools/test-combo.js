// ชุดคอมโบ: ความสามารถ tinker/seeker/recall/combo/surge/catalyst/salvage + เวทย์ S19-S24 + สนาม F13 + ตอบโต้ R17
const B = require('../battle.js'); const F = require('../fusion.js'); const d = require('../cards.json'); const S = require('../sets.json').sets;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const setCards = []; S.forEach(s => s.cards.forEach(c => setCards.push(c)));
const C = id => d.base.find(c => c.id === id) || d.extras.find(c => c.id === id) || setCards.find(c => c.id === id);
const AL = n => 'AL' + String(n).padStart(2, '0');
const filler = []; for (let i = 0; i < 20; i++) filler.push(C(['B05', 'B09', 'B02', 'B10'][i % 4]));
function game(seed) { const G = B.create({ decks: [filler.slice(), filler.slice()], names: ['a', 'b'], first: 0, knows: [{ all: true }, { all: true }], seed: seed || 5 }); G.players.forEach(P => { P.maxMana = 10; P.mana = 10; P.hand = []; }); return G; }
function pass(G) { for (let i = 0; i < 10 && G.pending; i++) B.apply(G, G.pending.resp, { t: 'pass' }); }
function play(G, side, id, target) { const P = G.players[side]; P.hand.push(C(id)); const prev = G.active; G.active = side; const r = B.apply(G, side, { t: 'play', hand: P.hand.length - 1, target }); pass(G); G.active = prev; if (!r.ok) throw new Error(id + ': ' + r.error); return r; }
function tryPlay(G, side, id, target) { const P = G.players[side]; P.hand.push(C(id)); const r = B.apply(G, side, { t: 'play', hand: P.hand.length - 1, target }); pass(G); if (!r.ok) P.hand.pop(); return r; }
function fuse(G, side, i, j) { const P = G.players[side]; const r = B.apply(G, side, { t: 'fuse', a: P.board[i].uid, b: P.board[j].uid }); pass(G); if (!r.ok) throw new Error('fuse: ' + r.error); return r; }
const unit = (G, side, i) => G.players[side].board[i || 0];
const deckSet = (G, ids) => { G.players[0].deck = ids.map(C); };

// ข้อมูลชุด
ok(S.find(s => s.id === 'alchemy').cards.length === 16 && S.find(s => s.id === 'ocean').cards.length === 16, 'ชุดใหม่ 16 ใบทั้งสอง');
ok(new Set(setCards.map(c => c.id)).size === setCards.length, 'id การ์ดชุดไม่ซ้ำกัน');
ok(['S19', 'S20', 'S21', 'S22', 'S23', 'S24', 'F13', 'R17'].every(id => C(id)), 'การ์ดคอมโบ 8 ใบอยู่ใน cards.json');
// --- ความสามารถ
let G = game(); play(G, 0, AL(4)); ok(G.players[0].fusionsLeft === 2, 'tinker: ผสมเพิ่มได้ 1 ครั้ง (fusionsLeft=2)');
G = game(); deckSet(G, ['B03', 'B01', 'B20', 'B07']); const hd = G.players[0].deck.length; const lowest = Math.min(...G.players[0].deck.map(c => c.cost));
play(G, 0, AL(2)); ok(G.players[0].hand.length === 1 && G.players[0].hand[0].cost === lowest && G.players[0].deck.length === hd - 1, 'seeker: ค้นตัวละคร Cost ต่ำสุดขึ้นมือ (cost ' + lowest + ')');
G = game(); G.players[0].grave = [C('B03'), C('B20'), C('B01')]; const hi = Math.max(...G.players[0].grave.map(c => c.cost));
play(G, 0, AL(9)); ok(G.players[0].hand.length === 1 && G.players[0].hand[0].cost === hi && G.players[0].grave.length === 2, 'recall: เก็บ Cost สูงสุดจากสุสานคืนมือ');
G = game(); play(G, 0, AL(7)); const base = B.curAtk(unit(G, 0)); G = game(); play(G, 0, 'B05'); play(G, 0, AL(7)); ok(B.curAtk(unit(G, 0, 1)) === base + 2, 'combo: ลงหลังทำอย่างอื่นแล้ว ATK +2 (' + base + '→' + B.curAtk(unit(G, 0, 1)) + ')');
G = game(); play(G, 0, AL(13)); const sb = B.curAtk(unit(G, 0)); G = game(); play(G, 0, 'B05'); play(G, 0, 'B02'); fuse(G, 0, 0, 1); play(G, 0, AL(13)); ok(B.curAtk(unit(G, 0, 1)) === sb + 1, 'surge: ผสมมา 1 ครั้ง ATK +1');
G = game(); play(G, 0, AL(3)); play(G, 0, 'B05'); const ex = F.fuse(C(AL(3)), C('B05')); fuse(G, 0, 0, 1); ok(unit(G, 0).atk === ex.atk + 1 && unit(G, 0).baseMax === ex.hp + 1, 'catalyst: การ์ดผสมได้ +1/+1');
G = game(); play(G, 0, AL(1)); play(G, 0, 'B05'); const h1 = G.players[0].hand.length; fuse(G, 0, 0, 1); ok(G.players[0].hand.length === h1 + 1, 'salvage: ใช้เป็นวัตถุดิบแล้วจั่ว 1');
// --- เวทย์
G = game(); const e19 = tryPlay(G, 0, 'S19'); ok(!e19.ok, 'S19 ใช้ไม่ได้ถ้ายังไม่ผสม (' + e19.error + ')');
G = game(); play(G, 0, 'B05'); play(G, 0, 'B02'); fuse(G, 0, 0, 1); const fl = G.players[0].fusionsLeft, hh = G.players[0].hand.length; play(G, 0, 'S19'); ok(G.players[0].fusionsLeft === fl + 1 && G.players[0].hand.length === hh + 1, 'S19: ผสมเพิ่ม +1 และจั่ว 1');
G = game(); deckSet(G, ['B01', 'B03', 'B20', 'B07']); const mx = Math.max(...G.players[0].deck.map(c => c.cost)); play(G, 0, 'S20'); ok(G.players[0].hand.length === 1 && G.players[0].hand[0].cost === mx, 'S20: ค้น Cost สูงสุด (cost ' + mx + ')');
G = game(); play(G, 0, 'B05'); deckSet(G, ['B06', 'B08', 'B01', 'B07']); const wl = Math.min(...G.players[0].deck.filter(c => c.element === 'water').map(c => c.cost)); play(G, 0, 'S21', unit(G, 0).uid); const got = G.players[0].hand[0]; ok(got && got.element === 'water' && got.cost === wl, 'S21: ค้นธาตุเดียวกัน (' + (got && got.name) + ')');
G = game(); play(G, 0, 'B05'); deckSet(G, ['B01']); ok(!tryPlay(G, 0, 'S21', unit(G, 0).uid).ok, 'S21 ไม่มีธาตุเดียวกันในเด็ค → ใช้ไม่ได้');
G = game(); play(G, 0, 'B05'); play(G, 0, 'B09'); play(G, 0, 'S22'); ok(G.players[1].hp === 18, 'S22: 2 การกระทำก่อนหน้า = 2 ดาเมจ (hp ' + G.players[1].hp + ')');
G = game(); ['B05', 'B09', 'B02', 'B10', 'B01'].forEach(i => play(G, 0, i)); G.players[0].mana = 10; play(G, 0, 'S22'); ok(G.players[1].hp === 15, 'S22: เพดาน 5 ดาเมจ (hp ' + G.players[1].hp + ')');
G = game(); ok(!tryPlay(G, 0, 'S23').ok, 'S23 สุสานว่าง → ใช้ไม่ได้'); G.players[0].grave = [C('B03')]; play(G, 0, 'S23'); ok(G.players[0].hand.length === 1 && G.players[0].hand[0].id === 'B03', 'S23: เก็บจากสุสาน');
G = game(); play(G, 0, 'B05'); play(G, 0, 'B02'); fuse(G, 0, 0, 1); const a2 = unit(G, 0).atk, m2 = unit(G, 0).baseMax; play(G, 0, 'S24'); ok(unit(G, 0).atk === a2 + 1 && unit(G, 0).baseMax === m2 + 1, 'S24: การ์ดผสม +1/+1');
// --- สนาม F13
G = game(); play(G, 0, 'F13'); play(G, 0, 'B05'); play(G, 0, 'B02'); play(G, 0, 'B10'); const x1 = F.fuse(C('B05'), C('B02')); G.players[0].mana = 10; fuse(G, 0, 0, 1);
ok(unit(G, 0).atk === x1.atk + 1 && unit(G, 0).baseMax === x1.hp, 'F13: ผสมครั้งแรก ATK +1 (HP ปกติ)');
G.players[0].fusionsLeft = 1; G.players[0].mana = 10; const before = unit(G, 0); const x2 = F.fuse(before.card, C('B10')); fuse(G, 0, 0, 1);
ok(unit(G, 0).atk === x2.atk + 1 && unit(G, 0).baseMax === x2.hp + 2 || x2 === null, 'F13: ผสมครั้งที่ 2 ได้ HP +2 ด้วย');
// --- R17
G = game(); G.players[1].sets = [C('R17')]; play(G, 0, 'B05'); play(G, 0, 'B09'); G.players[0].hand.push(C('B02')); G.active = 0; B.apply(G, 0, { t: 'play', hand: 0 });
ok(!G.pending, 'R17: ศัตรูทำแค่ 3 ครั้ง (รวมใบนี้) ยังตอบโต้ไม่ได้ → ไม่เปิดหน้าต่าง');
G = game(); G.players[1].sets = [C('R17')]; play(G, 0, 'B05'); play(G, 0, 'B09'); play(G, 0, 'B02'); G.players[0].hand.push(C('B10')); G.active = 0; B.apply(G, 0, { t: 'play', hand: 0 });
ok(G.pending && G.pending.resp === 1, 'R17: ศัตรูทำครบ 3 แล้ว ใบที่ 4 เปิดหน้าต่างตอบโต้'); B.apply(G, 1, { t: 'react', slot: 0 }); pass(G); ok(G.players[0].board.length === 3, 'R17: ยกเลิกการลงการ์ดใบที่ 4');
// --- เล่นซ้ำจาก seed
function run() { const g = game(77); const cmds = []; ['B05', 'B02', AL(4), AL(7)].forEach(id => play(g, 0, id)); fuse(g, 0, 0, 1); return JSON.stringify(g.players[0].board.map(u => [u.card.id, u.atk, u.hp]).concat([[g.players[0].fusionsLeft, g.players[0].combo, g.players[0].fusedNow]])); }
ok(run() === run(), 'เล่นซ้ำ seed เดิมได้ผลเหมือนกัน'); G = game(); play(G, 0, 'B05'); const cl = B.clone(G); ok(cl.players[0].combo === G.players[0].combo, 'clone เก็บตัวนับคอมโบ');
console.log(fails ? 'FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
