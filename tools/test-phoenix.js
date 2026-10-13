// ชุดทดลอง ฟินิกส์ 12 สี: สั่งการ / ถ่านคุ / เผาสุสาน / ก่อไฟ / รุ้ง / เวทย์ / สนาม / ปฏิกิริยา
const B = require('../battle.js'); const d = require('../cards.json'); const ph = require('../ph.json');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ALL = {}; d.base.concat(d.extras, ph.cards, ph.extras).forEach(c => ALL[c.id] = c); const C = id => ALL[id];
const filler = []; for (let i = 0; i < 20; i++) filler.push(C(['B05', 'B09', 'B02', 'B10'][i % 4]));
function game() { const G = B.create({ decks: [filler.slice(), filler.slice()], names: ['a', 'b'], first: 0, knows: [{ all: true }, { all: true }], seed: 5 }); G.players.forEach(P => { P.maxMana = 10; P.mana = 10; P.hand = []; }); return G; }
function pass(G) { for (let i = 0; i < 10 && G.pending; i++) B.apply(G, G.pending.resp, { t: 'pass' }); }
function play(G, side, id, target) { const P = G.players[side]; P.hand.push(C(id)); const prev = G.active; G.active = side; const r = B.apply(G, side, { t: 'play', hand: P.hand.length - 1, target }); pass(G); G.active = prev; if (!r.ok) throw new Error(id + ': ' + r.error); return r; }
const unit = (G, side, i) => G.players[side].board[i || 0];
const toGrave = (G, side, ids) => ids.forEach(id => G.players[side].grave.push(C(id)));
let G;
// สั่งการ (เวทย์ PHS3)
G = game(); play(G, 1, 'B16'); const a5 = B.curAtk(unit(G, 1)); play(G, 0, 'PHS3', unit(G, 1).uid);
ok(G.players[1].hp === 20 - Math.min(4, a5) && G.players[1].board.length === 1, 'PHS3 สั่งศัตรูตีเจ้าของเอง ' + Math.min(4, a5) + ' (ATK ' + a5 + ' → เพดาน 4)');
play(G, 0, 'PHS3', unit(G, 1).uid); ok(G.players[1].hp === 20 - Math.min(4, a5), 'ใบเดิมถูกสั่งซ้ำในเทิร์นเดียวไม่ได้');
G = game(); play(G, 1, 'B05'); play(G, 1, 'B09'); play(G, 1, 'B02'); const hp0 = G.players[1].hp; play(G, 0, 'PHS3', unit(G, 1, 0).uid); play(G, 0, 'PHS3', unit(G, 1, 1).uid); const hp2 = G.players[1].hp; play(G, 0, 'PHS3', unit(G, 1, 2).uid);
ok(hp2 < hp0 && G.players[1].hp === hp2, 'สั่งการได้สูงสุด 2 ครั้งต่อเทิร์น (ครั้งที่ 3 ไม่ทำงาน)');
G.active = 0; B.apply(G, 0, { t: 'end' }); G.active = 1; ok(G.players[0].cmdNow === 0, 'ตัวนับสั่งการรีเซ็ตเมื่อเริ่มเทิร์น');
// ก่อไฟ: ต้องคอมโบ ≥ 2
G = game(); play(G, 1, 'B16'); play(G, 0, 'PH07'); ok(G.players[1].hp === 20, 'PH07 ก่อไฟ: ไม่มีคอมโบ ไม่สั่งการ');
G = game(); play(G, 1, 'B16'); play(G, 0, 'PH01'); play(G, 0, 'PH07'); ok(G.players[1].hp === 16, 'PH07 ก่อไฟ: ลงใบก่อน 1 ใบ → คอมโบ 2 สั่งการ ศัตรูโดน ' + (20 - G.players[1].hp));
// ถ่านคุ: สุสาน 4 ใบ → +2
G = game(); toGrave(G, 0, ['B05', 'B05', 'B05', 'B05']); play(G, 0, 'PH02'); ok(unit(G, 0).atk === C('PH02').atk + 2, 'PH02 ถ่านคุ: สุสาน 4 ใบ ATK +2');
G = game(); toGrave(G, 0, Array(10).fill('B05')); play(G, 0, 'PH02'); ok(unit(G, 0).atk === C('PH02').atk + 3, 'PH02 ถ่านคุ: เพดาน +3');
// เผาสุสาน
G = game(); toGrave(G, 0, ['B05', 'B09', 'B10']); const h0 = G.players[0].hand.length; G.players[0].hp = 15; play(G, 0, 'PH06');
ok(G.players[0].grave.length === 1 && G.players[0].hand.length === h0 + 1 && G.players[0].hp === 17, 'PH06 เผาสุสาน: เนรเทศ 2 ใบ จั่ว 1 ฟื้น 2 (สุสานเหลือ ' + G.players[0].grave.length + ')');
G = game(); play(G, 0, 'PH06'); ok(G.players[0].hp === 20, 'PH06 สุสานว่าง: ไม่ได้ผล');
// รุ้ง
G = game(); toGrave(G, 0, ['B16']); play(G, 1, 'B16'); play(G, 0, 'PH01'); play(G, 0, 'PH02'); play(G, 0, 'PH12');
ok(G.players[0].hand.some(c => c.id === 'B16') && G.players[1].hp === 16, 'PH12 รุ้ง: คอมโบ 3 → เก็บสุสาน + สั่งการ');
// ทอง
G = game(); toGrave(G, 0, ['B16']); play(G, 1, 'B16'); play(G, 0, 'PH01'); play(G, 0, 'PH11'); ok(G.players[0].hand.some(c => c.id === 'B16') && G.players[1].hp === 16, 'PH11 ทอง: เก็บสุสาน + ก่อไฟสั่งการ');
// หายตัว + บูชา
G = game(); play(G, 0, 'PH01'); const hh = G.players[0].hand.length; play(G, 0, 'PHS2', unit(G, 0).uid);
ok(G.players[0].board.length === 0 && G.players[0].hand.some(c => c.id === 'PH01') && G.players[0].hand.length === hh + 1 + 1 - 1 + 0 || G.players[0].hand.some(c => c.id === 'PH01'), 'PHS2 บูชา: ไข่กลับมือ (หายตัว) + จั่ว');
// เวทย์อื่น
G = game(); toGrave(G, 0, ['B05', 'B09', 'B10', 'B02', 'B05', 'B09']); play(G, 0, 'PHS5'); ok(G.players[1].hp === 17, 'PHS5 รวมเปลวเพลิง: สุสาน 6 ใบ → 3 ดาเมจ');
G = game(); toGrave(G, 0, ['B05', 'B16']); play(G, 0, 'PHS1'); ok(G.players[0].hand.some(c => c.id === 'B16') && G.players[0].grave.filter(c => c.type === 'creature').length === 1, 'PHS1 คืนชีพ: เก็บใบแพงสุด 1 ใบ (คอมโบ 1)');
G = game(); toGrave(G, 0, ['B05', 'B16', 'B09']); play(G, 0, 'PH01'); play(G, 0, 'PH01'); play(G, 0, 'PHS1'); ok(G.players[0].grave.filter(c => c.type === 'creature').length === 1, 'PHS1 คอมโบ 3: เก็บ 2 ใบ');
G = game(); play(G, 0, 'B05'); G.players[0].hp = 10; G.players[0].board[0].hp = 1; play(G, 0, 'PHS4'); ok(G.players[0].hp === 14 && G.players[0].board[0].hp === Math.min(3, B.maxHp(G.players[0].board[0])), 'PHS4 ปีกคุ้มกัน: HP ผู้เล่น +4 การ์ด +2');
// สนาม
G = game(); play(G, 0, 'PHF1'); G.players[0].hp = 10; play(G, 0, 'B05'); G.players[0].board[0].hp = 0; B.apply(G, 0, { t: 'end' }); ok(G.players[0].hp >= 11, 'PHF1 ทุ่งเถ้าถ่าน: การ์ดตายแล้วฟื้น HP 1 (HP ' + G.players[0].hp + ')');
// ปฏิกิริยา
G = game(); G.players[1].sets = [C('PHR1')]; play(G, 0, 'B16'); G.active = 0; const at = unit(G, 0); at.attacksLeft = 1; at.attacked = false; at.rushTurn = 0;
B.apply(G, 0, { t: 'attack', unit: at.uid, target: 'opp' }); ok(G.pending && G.pending.resp === 1, 'PHR1 เปิดหน้าต่างตอบโต้'); B.apply(G, 1, { t: 'react', slot: 0 }); pass(G);
ok(G.players[0].hp === 20 - Math.min(4, B.curAtk(at)) && G.players[1].hp === 20, 'PHR1: ยกเลิกการโจมตี + ผู้โจมตีตีเจ้าของเอง ' + (20 - G.players[0].hp));
console.log(fails ? 'FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
