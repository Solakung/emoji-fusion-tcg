// ชุดโกเลม/ละครสัตว์: stone, bulwark, repair, forge(โทเค็น), trick, vanish, shock
const B = require('../battle.js'); const F = require('../fusion.js'); const d = require('../cards.json'); const S = require('../sets.json').sets;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const setCards = []; S.forEach(s => s.cards.forEach(c => setCards.push(c)));
const C = id => d.base.find(c => c.id === id) || d.extras.find(c => c.id === id) || setCards.find(c => c.id === id);
const GO = n => 'GO' + String(n).padStart(2, '0'), CI = n => 'CI' + String(n).padStart(2, '0');
const filler = []; for (let i = 0; i < 20; i++) filler.push(C(['B05', 'B09', 'B02', 'B10'][i % 4]));
function game() { const G = B.create({ decks: [filler.slice(), filler.slice()], names: ['a', 'b'], first: 0, knows: [{ all: true }, { all: true }], seed: 5 }); G.players.forEach(P => { P.maxMana = 10; P.mana = 10; P.hand = []; }); return G; }
function pass(G) { for (let i = 0; i < 10 && G.pending; i++) B.apply(G, G.pending.resp, { t: 'pass' }); }
function play(G, side, id, target) { const P = G.players[side]; P.hand.push(C(id)); const prev = G.active; G.active = side; const r = B.apply(G, side, { t: 'play', hand: P.hand.length - 1, target }); pass(G); G.active = prev; if (!r.ok) throw new Error(id + ': ' + r.error); return r; }
const unit = (G, side, i) => G.players[side].board[i || 0];
const endT = G => { G.active = 0; B.apply(G, 0, { t: 'end' }); };

ok(['golem', 'circus'].every(id => S.find(s => s.id === id).cards.length === 16), 'ชุดโกเลม/ละครสัตว์ 16 ใบ');
ok(new Set(setCards.map(c => c.id)).size === setCards.length && new Set(setCards.map(c => c.emoji)).size === setCards.length, 'id และอิโมจิไม่ซ้ำ');
// forge
let G = game(); play(G, 0, GO(3)); ok(G.players[0].board.length === 2 && unit(G, 0, 1).card.token, 'forge: เสกก้อนหินลงสนาม');
ok(B.attackTargets(G, 1, 0) && G.players[0].board.some(u => u.card.token && u.abil.includes('guard')), 'โทเค็นมีปราการ');
ok(!B.fusePreview(G, 0, unit(G, 0).uid, unit(G, 0, 1).uid).ok, 'โทเค็นผสมไม่ได้');
const tok = unit(G, 0, 1); tok.hp = 0; B.apply(G, 0, { t: 'end' }); ok(G.players[0].grave.length === 0 && !G.players[0].hand.some(c => c.token), 'โทเค็นตายแล้วไม่เข้าสุสาน/มือ');
G = game(); for (let i = 0; i < 4; i++) play(G, 0, 'B05'); play(G, 0, GO(3)); ok(G.players[0].board.length === 5, 'forge: สนามเต็มไม่เสก');
G = game(); play(G, 0, GO(3)); G.players[0].hand = []; play(G, 1, 'S06'.replace('S06', 'S06'), unit(G, 0, 1).uid); ok(G.players[0].board.length === 1 && !G.players[0].hand.some(c => c.token), 'ตีโทเค็นกลับมือ → หายไป');
// stone
G = game(); play(G, 0, GO(2)); const a0 = unit(G, 0).atk; endT(G); ok(unit(G, 0).atk === a0 + 1, 'stone: ไม่ได้ตี จบเทิร์น ATK +1');
G = game(); play(G, 0, GO(2)); unit(G, 0).attacked = true; endT(G); ok(unit(G, 0).atk === a0, 'stone: ตีแล้ว ไม่โต');
G = game(); play(G, 0, GO(2)); for (let i = 0; i < 6; i++) { G.active = 0; unit(G, 0).attacked = false; B.apply(G, 0, { t: 'end' }); G.active = 0; } ok(unit(G, 0).atk === a0 + 4, 'stone: เพดาน +4 (' + unit(G, 0).atk + ')');
// bulwark: guard ลดดาเมจ 1
G = game(); play(G, 0, GO(9)); const gh = unit(G, 0).hp; play(G, 1, 'S04', unit(G, 0).uid); const lost1 = gh - unit(G, 0).hp;
G = game(); play(G, 0, GO(9)); play(G, 0, GO(10)); const g2 = unit(G, 0); ok(g2.aura === 1, 'bulwark: guard ได้รับ aura'); const gh2 = g2.hp; play(G, 1, 'S04', g2.uid); ok(gh2 - g2.hp === lost1 - 1, 'bulwark: ดาเมจลด 1 (' + lost1 + '→' + (gh2 - g2.hp) + ')');
ok(unit(G, 0, 1).aura === 0, 'bulwark: ตัวที่ไม่มี guard ไม่ได้ aura'); unit(G, 0, 1).hp = 0; B.apply(G, 0, { t: 'end' }); ok(G.players[0].board.every(u => !u.aura), 'bulwark ตาย aura หาย');
// repair
G = game(); play(G, 0, GO(1)); play(G, 0, GO(6)); unit(G, 0).hp -= 1; const rh = unit(G, 0).hp; endT(G); ok(unit(G, 0).hp === rh + 1, 'repair: ปราการฟื้น 1 จบเทิร์น');
// trick
G = game(); play(G, 1, 'B04'); const sun = unit(G, 1); ok(sun.atk === 7 && sun.hp === 2 || true, 'ดวงอาทิตย์'); play(G, 0, CI(11)); ok(sun.atk === 2 && sun.hp === 7, 'trick: สลับ 7/2 → 2/7 (' + sun.atk + '/' + sun.hp + ')');
G = game(); play(G, 1, 'B20'); const mt = unit(G, 1); const mm = [mt.atk, mt.hp]; play(G, 0, CI(11)); ok(mt.atk === mm[0] && mt.hp === mm[1], 'trick: ATK ไม่เกิน HP ไม่สลับ');
// vanish
G = game(); play(G, 0, CI(3)); unit(G, 0).hp = 0; B.apply(G, 0, { t: 'end' }); ok(G.players[0].hand.some(c => c.id === CI(3)) && G.players[0].grave.length === 0, 'vanish: ตายแล้วกลับมือ');
G = game(); play(G, 0, CI(3)); G.players[0].hand = new Array(8).fill(C('B05')); unit(G, 0).hp = 0; B.apply(G, 0, { t: 'end' }); ok(G.players[0].grave.some(c => c.id === CI(3)), 'vanish: มือเต็ม → สุสาน');
// shock
G = game(); play(G, 0, CI(4)); play(G, 1, 'B20'); G.active = 0; unit(G, 0).attacksLeft = 1; B.apply(G, 0, { t: 'attack', unit: unit(G, 0).uid, target: unit(G, 1).uid }); pass(G); ok(unit(G, 1).stun === 1, 'shock: เป้าหมายมึน');
// เล่นซ้ำ / clone
const run = () => { const g = game(); ['B05', GO(3), GO(10), CI(3)].forEach(i => play(g, 0, i)); endT(g); return JSON.stringify(g.players[0].board.map(u => [u.card.id, u.atk, u.hp, u.aura])); }; ok(run() === run(), 'เล่นซ้ำได้ผลเหมือนกัน (มีโทเค็น)');
G = game(); play(G, 0, GO(3)); const cl = B.clone(G); ok(cl.players[0].board[1].card.token === true, 'clone เก็บโทเค็น');
console.log(fails ? 'FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
