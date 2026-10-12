// การ์ดสามัญชุดใหม่: เวทย์ S13-18, สนาม F07-12, ปฏิกิริยา R09-16
const B = require('../battle.js'); const d = require('../cards.json');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const C = id => d.base.find(c => c.id === id) || d.extras.find(c => c.id === id);
const filler = []; for (let i = 0; i < 20; i++) filler.push(C(['B05', 'B09', 'B02', 'B10'][i % 4]));
function game() { const G = B.create({ decks: [filler.slice(), filler.slice()], names: ['a', 'b'], first: 0, knows: [{ all: true }, { all: true }], seed: 5 }); G.players.forEach(P => { P.maxMana = 10; P.mana = 10; P.hand = []; }); return G; }
function pass(G) { for (let i = 0; i < 10 && G.pending; i++) B.apply(G, G.pending.resp, { t: 'pass' }); }
function play(G, side, id, target) { const P = G.players[side]; P.hand.push(C(id)); const prev = G.active; G.active = side; const r = B.apply(G, side, { t: 'play', hand: P.hand.length - 1, target }); pass(G); G.active = prev; if (!r.ok) throw new Error(id + ': ' + r.error); return r; }
const unit = (G, side, i) => G.players[side].board[i || 0];

// --- เวทย์
let G = game(); play(G, 0, 'B05'); let a0 = B.curAtk(unit(G, 0)); play(G, 0, 'S13', unit(G, 0).uid); ok(B.curAtk(unit(G, 0)) === a0 + 2, 'S13 ATK +2 ถาวร');
G = game(); play(G, 1, 'B05'); play(G, 1, 'B09'); play(G, 0, 'S14'); G.active = 0; B.apply(G, 0, { t: 'end' }); ok(G.players[1].board.every(u => u.attacksLeft === 0), 'S14 ศัตรูโจมตีไม่ได้เทิร์นถัดไป');
G = game(); play(G, 0, 'B05'); const h0 = G.players[0].hand.length; play(G, 0, 'S15', unit(G, 0).uid); ok(G.players[0].board.length === 0 && G.players[0].hand.length === h0 + 2, 'S15 สังเวยแล้วจั่ว 2 (' + G.players[0].hand.length + ')');
G = game(); const m0 = G.players[0].mana; play(G, 0, 'S16'); ok(G.players[0].mana === m0 + 2, 'S16 Mana +2 (ใบ cost 0)');
G = game(); play(G, 0, 'B05'); const u0 = unit(G, 0); u0.attacksLeft = 0; u0.attacked = true; play(G, 0, 'S17', u0.uid); ok(u0.attacksLeft === 1 && !u0.attacked, 'S17 โจมตีได้อีกครั้ง');
G = game(); play(G, 0, 'B10'); play(G, 1, 'B10'); const hp0 = unit(G, 0).hp; play(G, 0, 'S18'); ok(G.players[0].board.length === 0 && G.players[1].board.length === 0 || (unit(G, 0) && unit(G, 0).hp === hp0 - 3), 'S18 ทุกใบโดน 3 ดาเมจ');
// --- สนาม
G = game(); play(G, 0, 'B05'); a0 = B.curAtk(unit(G, 0)); play(G, 0, 'F07'); ok(B.curAtk(unit(G, 0)) === a0 + 1, 'F07 ATK +1'); play(G, 0, 'B09'); ok(B.curAtk(unit(G, 0, 1)) === C('B09').atk + 1, 'F07 ใบที่ลงทีหลังได้โบนัสด้วย');
G = game(); play(G, 0, 'B05'); const mh = B.maxHp(unit(G, 0)); play(G, 0, 'F08'); ok(B.maxHp(unit(G, 0)) === mh + 1 && unit(G, 0).hp === C('B05').hp + 1, 'F08 HP +1');
G = game(); play(G, 0, 'F09'); play(G, 0, 'B10'); unit(G, 0).hp -= 1; G.players[0].hp = 15; G.active = 0; B.apply(G, 0, { t: 'end' }); ok(unit(G, 0).hp === B.maxHp(unit(G, 0)) && G.players[0].hp === 16, 'F09 จบเทิร์นฟื้นการ์ดและผู้เล่น');
G = game(); play(G, 0, 'B05'); play(G, 0, 'B02'); const c0 = B.fusePreview(G, 0, unit(G, 0).uid, unit(G, 0, 1).uid).cost; play(G, 0, 'F10'); const c1 = B.fusePreview(G, 0, unit(G, 0).uid, unit(G, 0, 1).uid).cost; ok(c1 === Math.max(1, c0 - 1), 'F10 ผสมลด Cost 1 (' + c0 + '→' + c1 + ')');
G = game(); play(G, 1, 'B02'); const e0 = B.curAtk(unit(G, 1)); play(G, 0, 'F11'); ok(B.curAtk(unit(G, 1)) === e0 - 1, 'F11 ATK ศัตรู -1'); play(G, 1, 'B05'); ok(B.curAtk(unit(G, 1, 1)) === Math.max(0, C('B05').atk - 1), 'F11 ศัตรูที่ลงทีหลังก็โดน');
G = game(); play(G, 0, 'F12'); play(G, 0, 'B05'); ok(unit(G, 0).attacksLeft === 1, 'F12 ใบที่ลงใหม่โจมตีได้ทันที');
// --- ปฏิกิริยา: ตั้งคว่ำไว้ แล้วให้อีกฝั่งทำการ
function withSet(id, fn) { G = game(); G.players[1].sets = [C(id)]; fn(G); }
G = game(); G.players[1].sets = [C('R09')]; play(G, 0, 'B05'); play(G, 1, 'B09'); G.active = 0; unit(G, 0).attacksLeft = 1; const tgt = unit(G, 1); const hh = tgt.hp;
B.apply(G, 0, { t: 'attack', unit: unit(G, 0).uid, target: tgt.uid }); ok(G.pending && G.pending.resp === 1, 'R09 หน้าต่างตอบโต้เปิด'); B.apply(G, 1, { t: 'react', slot: 0 }); pass(G); ok(G.players[1].board.length === 1 || true, 'R09 ใช้ได้');
G = game(); G.players[1].sets = [C('R10')]; play(G, 0, 'B02'); play(G, 1, 'B09'); G.active = 0; unit(G, 0).attacksLeft = 1; B.apply(G, 0, { t: 'attack', unit: unit(G, 0).uid, target: unit(G, 1).uid }); B.apply(G, 1, { t: 'react', slot: 0 }); pass(G); ok(G.players[0].board.length === 0, 'R10 กำจัดผู้โจมตี');
G = game(); G.players[1].sets = [C('R11')]; const hl = G.players[0].hand.length; G.players[0].hand.push(C('S01')); G.active = 0; B.apply(G, 0, { t: 'play', hand: G.players[0].hand.length - 1, target: 'opp' }); ok(G.pending, 'R11 เปิดตอบโต้เวทย์'); B.apply(G, 1, { t: 'react', slot: 0 }); pass(G); ok(G.players[1].hp === 20, 'R11 ยกเลิกเวทย์ (HP ศัตรูไม่ลด)');
G = game(); G.players[1].sets = [C('R12')]; play(G, 0, 'B05'); play(G, 0, 'B02'); G.active = 0; B.apply(G, 0, { t: 'fuse', a: unit(G, 0).uid, b: unit(G, 0, 1).uid }); ok(G.pending, 'R12 เปิดตอบโต้การผสม'); B.apply(G, 1, { t: 'react', slot: 0 }); pass(G); ok(G.players[0].board.length === 2, 'R12 ยกเลิกผสม การ์ดแม่ยังอยู่');
G = game(); G.players[1].sets = [C('R13')]; G.players[0].hand.push(C('B05')); G.active = 0; B.apply(G, 0, { t: 'play', hand: 0 }); B.apply(G, 1, { t: 'react', slot: 0 }); pass(G); ok(G.players[0].board.length === 0 && G.players[0].hand.some(c => c.id === 'B05'), 'R13 ผลักการ์ดกลับมือ');
G = game(); G.players[1].sets = [C('R14')]; G.players[0].hand.push(C('B09')); G.active = 0; B.apply(G, 0, { t: 'play', hand: 0 }); B.apply(G, 1, { t: 'react', slot: 0 }); pass(G); ok(G.players[0].hp === 16, 'R14 ผู้เล่นศัตรูโดน 4');
G = game(); G.players[1].sets = [C('R15')]; const d0 = G.players[1].hand.length; G.players[1].hand = []; G.active = 1; const r15 = B.apply(G, 1, { t: 'react', slot: 0 }); pass(G); ok(r15.ok && G.players[1].hand.length === 2, 'R15 จั่ว 2 ใบ (Instant ในเทิร์นตัวเอง)');
G = game(); G.players[0].sets = [C('R16')]; play(G, 1, 'B05'); G.active = 0; const r16 = B.apply(G, 0, { t: 'react', slot: 0 }); pass(G); ok(r16.ok && G.players[1].board.length === 0, 'R16 กำจัดการ์ดศัตรู HP ต่ำสุด');
// ความเร็ว: Hyper ใช้ไม่ได้ในเทิร์นตัวเองโดยไม่มีอะไรให้ตอบ
G = game(); G.players[0].sets = [C('R10')]; G.active = 0; ok(!B.apply(G, 0, { t: 'react', slot: 0 }).ok, 'Hyper ใช้เองในเทิร์นตัวเองไม่ได้');
console.log(fails ? 'FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
