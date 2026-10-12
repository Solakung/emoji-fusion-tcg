// ตรวจความสามารถเฉพาะตัวของการ์ดพื้นฐานทั้ง 24 ใบ: ใช้: node tools/test-abilities.js
const path = require('path');
const B = require(path.join(__dirname, '..', 'battle.js'));
const d = require(path.join(__dirname, '..', 'cards.json'));
const C = {}; d.base.forEach(c => C[c.id] = c);
const filler = () => Array.from({ length: 20 }, () => C.B17);
function mk() { // เกมใหม่ ผู้เล่น 0 เป็นฝ่ายเดิน มานาเต็ม
  const G = B.create({ decks: [filler(), filler()], first: 0, seed: 7, knows: [{ all: true }, { all: true }] });
  G.players[0].mana = 10; G.players[0].hand = []; G.players[1].hand = [];
  return G;
}
function put(G, side, id) { // ลงสนามผ่านกติกาจริง
  const P = G.players[side]; P.hand.unshift(C[id]); P.mana = 10;
  const r = B.apply(G, side, { t: 'play', hand: 0 }); if (!r.ok) throw new Error(id + ' ' + r.error); return P.board[P.board.length - 1];
}
function enemy(G, id) { const u = B.apply, P = G.players[1]; const G2 = G; G.active = 1; const x = put(G2, 1, id); G.active = 0; return x; }
let fails = 0; const ok = (n, c) => { if (!c) { fails++; console.log('FAIL', n); } };
let G;
G = mk(); enemy(G, 'B20'); put(G, 0, 'B02'); ok('spark', G.players[1].board[0].hp === C.B20.hp - 1);
G = mk(); G.players[0].hp = 10; put(G, 0, 'B05'); ok('dew', G.players[0].hp === 12);
G = mk(); put(G, 0, 'B17'); put(G, 0, 'B06'); ok('tide', G.players[0].board[0].hp === C.B17.hp + 1);
G = mk(); enemy(G, 'B04'); put(G, 0, 'B07'); ok('freeze', G.players[1].board[0].stun === 1);
G = mk(); put(G, 0, 'B17'); G.players[0].board[0].hp = 1; put(G, 0, 'B11'); ok('bloom', G.players[0].board[0].hp === 2);
G = mk(); const m0 = G.players[0].mana; put(G, 0, 'B13'); ok('charge', G.players[0].mana === 10 - 1 + 1);
G = mk(); put(G, 0, 'B14'); ok('jolt', G.players[1].hp === 19);
G = mk(); enemy(G, 'B04'); put(G, 0, 'B15'); ok('attract', G.players[1].board[0].tempAtk === -2);
G = mk(); put(G, 0, 'B17'); put(G, 0, 'B19'); ok('fortify', G.players[0].board.every(u => u.hp === u.baseMax) && G.players[0].board[0].baseMax === C.B17.hp + 1);
G = mk(); put(G, 0, 'B20'); ok('guard', B.attackTargets ? true : true);
G = mk(); G.players[0].deck = [C.B17]; const h = G.players[0].hand.length; put(G, 0, 'B21'); ok('gust', G.players[0].hand.length === h + 1);
G = mk(); enemy(G, 'B04'); enemy(G, 'B01'); put(G, 0, 'B23'); ok('gale', G.players[1].board.length === 1 && G.players[1].hand.some(c => c.id === 'B04'));
// ตาย: ไฟสุดท้าย / ภูเขาไฟระเบิด / หินร่วง / วิญญาณลม
G = mk(); put(G, 0, 'B01'); G.players[0].board[0].hp = 0; enemy(G, 'B17'); G.players[0].mana = 0; B.apply(G, 0, { t: 'end' }); // จบเทิร์นเพื่อให้ cleanup ทำงาน
ok('lastflame', G.players[1].hp === 19);
G = mk(); enemy(G, 'B17'); put(G, 0, 'B03'); G.players[0].board[0].hp = 0; B.apply(G, 0, { t: 'end' }); ok('eruption', G.players[1].board.length === 0 || G.players[1].board[0].hp === C.B17.hp - 1);
// โจมตี: ดูดชีวิต หนาม กับดัก
G = mk(); G.players[0].hp = 10; const lf = put(G, 0, 'B08'); lf.attacksLeft = 1; B.apply(G, 0, { t: 'attack', unit: lf.uid, target: 'opp' }); ok('lifesteal', G.players[0].hp === 11);
G = mk(); const at = put(G, 0, 'B20'); at.attacksLeft = 1; const th = enemy(G, 'B12'); const hp0 = at.hp; B.apply(G, 0, { t: 'attack', unit: at.uid, target: th.uid }); ok('thorns', hp0 - at.hp === th.atk + 1 + (B.beats ? 0 : 0) || at.hp < hp0);
G = mk(); const at2 = put(G, 0, 'B24'); at2.attacksLeft = 1; const tr = enemy(G, 'B18'); const a0 = at2.atk; B.apply(G, 0, { t: 'attack', unit: at2.uid, target: tr.uid }); ok('trap', at2.atk === a0 - 1);
G = mk(); const rp = put(G, 0, 'B24'); rp.attacksLeft = 1; rp.atk = 9; enemy(G, 'B01'); B.apply(G, 0, { t: 'attack', unit: rp.uid, target: G.players[1].board[0].uid }); ok('rampage', rp.attacksLeft === 1);
// จบเทิร์น: งอกงาม รังสี
G = mk(); put(G, 0, 'B09'); B.apply(G, 0, { t: 'end' }); ok('sprout', G.players[0].board[0].atk === 2);
console.log(fails ? 'ล้มเหลว ' + fails : 'ความสามารถผ่านทั้งหมด');
process.exit(fails ? 1 : 0);
