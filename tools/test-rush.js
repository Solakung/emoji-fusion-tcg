// กฎ "เร็ว": การ์ด Haste/ลานเชียร์ที่เพิ่งลง ตีผู้เล่นไม่ได้ในเทิร์นที่ลง แต่ตีการ์ดศัตรูได้
const B = require('../battle.js'); const d = require('../cards.json');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const C = id => d.base.find(c => c.id === id) || d.extras.find(c => c.id === id);
const filler = []; for (let i = 0; i < 20; i++) filler.push(C(['B05', 'B09', 'B02', 'B10'][i % 4]));
function game() { const G = B.create({ decks: [filler.slice(), filler.slice()], names: ['a', 'b'], first: 0, knows: [{ all: true }, { all: true }], seed: 5 }); G.players.forEach(P => { P.maxMana = 10; P.mana = 10; P.hand = []; }); return G; }
function pass(G) { for (let i = 0; i < 10 && G.pending; i++) B.apply(G, G.pending.resp, { t: 'pass' }); }
function play(G, side, id) { const P = G.players[side]; P.hand.push(C(id)); const prev = G.active; G.active = side; const r = B.apply(G, side, { t: 'play', hand: P.hand.length - 1 }); pass(G); G.active = prev; if (!r.ok) throw new Error(id + ': ' + r.error); }
const unit = (G, side, i) => G.players[side].board[i || 0];
let G = game(); play(G, 0, 'B13');
ok(unit(G, 0).attacksLeft === 1, 'หลอดไฟ (เร็ว) ลงแล้วมีสิทธิ์โจมตี');
ok(B.attackTargets(G, 0, unit(G, 0).uid).indexOf('opp') < 0, 'แต่ตีผู้เล่นไม่ได้ในเทิร์นที่ลง');
const r = B.apply(G, 0, { t: 'attack', unit: unit(G, 0).uid, target: 'opp' }); ok(!r.ok && /เร็ว/.test(r.error), 'สั่งโจมตีผู้เล่นถูกปฏิเสธ + ข้อความอธิบาย: ' + r.error);
play(G, 1, 'B09'); const tg = B.attackTargets(G, 0, unit(G, 0).uid); ok(tg.length === 1 && tg[0] === unit(G, 1).uid, 'ตีการ์ดศัตรูได้');
const r2 = B.apply(G, 0, { t: 'attack', unit: unit(G, 0).uid, target: unit(G, 1).uid }); pass(G); ok(r2.ok, 'โจมตีการ์ดศัตรูสำเร็จ');
// เทิร์นถัดไป
G = game(); play(G, 0, 'B13'); G.active = 0; B.apply(G, 0, { t: 'end' }); B.apply(G, 1, { t: 'end' });
ok(G.active === 0 && B.attackTargets(G, 0, unit(G, 0).uid).indexOf('opp') >= 0, 'เทิร์นถัดไปตีผู้เล่นได้');
const hp0 = G.players[1].hp; B.apply(G, 0, { t: 'attack', unit: unit(G, 0).uid, target: 'opp' }); pass(G); ok(G.players[1].hp < hp0, 'ผู้เล่นโดนดาเมจจริง');
// ผสม: แม่ที่เก่าแล้วทั้งคู่ ลูกตีผู้เล่นได้ / แม่ที่เพิ่งลง ลูกตีผู้เล่นไม่ได้
G = game(); play(G, 0, 'B13'); play(G, 0, 'B14'); G.active = 0; B.apply(G, 0, { t: 'end' }); B.apply(G, 1, { t: 'end' });
B.apply(G, 0, { t: 'fuse', a: unit(G, 0).uid, b: unit(G, 0, 1).uid }); pass(G);
ok(unit(G, 0).attacksLeft > 0 && B.attackTargets(G, 0, unit(G, 0).uid).indexOf('opp') >= 0, 'ผสมจากแม่ที่พร้อมแล้ว: ลูกตีผู้เล่นได้');
G = game(); play(G, 0, 'B13'); play(G, 0, 'B14'); B.apply(G, 0, { t: 'fuse', a: unit(G, 0).uid, b: unit(G, 0, 1).uid }); pass(G);
ok(unit(G, 0).attacksLeft > 0 && B.attackTargets(G, 0, unit(G, 0).uid).indexOf('opp') < 0, 'ผสมจากแม่ที่เพิ่งลงด้วยเร็ว: ลูกยังตีผู้เล่นไม่ได้');
// ลานเชียร์
G = game(); play(G, 0, 'F12'); play(G, 0, 'B05'); ok(unit(G, 0).attacksLeft === 1 && B.attackTargets(G, 0, unit(G, 0).uid).indexOf('opp') < 0, 'ลานเชียร์: ตีได้ทันทีแต่ไม่โดนผู้เล่น');
// ปิดกฎได้ (สำหรับเทียบผลจำลอง)
B.RULES.rush = false; G = game(); play(G, 0, 'B13'); ok(B.attackTargets(G, 0, unit(G, 0).uid).indexOf('opp') >= 0, 'RULES.rush=false กลับเป็นกฎเดิม'); B.RULES.rush = true;
// สถิติ
ok(C('B13').atk === 1, 'หลอดไฟ ATK 1');
console.log(fails ? 'FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
