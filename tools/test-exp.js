// ผสมมั่ว: สูตรที่ไม่รู้ผสมไม่ได้ปกติ แต่ลองได้ด้วย x:1 (+Mana, ไม่เสถียร, บันทึกใน G.disc)
const B = require('../battle.js'); const d = require('../cards.json'); const F = require('../fusion.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const mk = id => d.base.find(c => c.id === id);
const deck = []; for (let i = 0; i < 10; i++) deck.push(mk('B09'), mk('B05'));
function setup() {
  const G = B.create({ decks: [deck, deck], names: ['a', 'b'], first: 0, knows: [{ all: false, set: {} }, { all: true }], seed: 3 });
  const P = G.players[0]; P.mana = 10; P.hand = [mk('B09'), mk('B05')];
  ['0', '0'].forEach(() => { let r = B.apply(G, 0, { t: 'play', hand: 0 }); if (!r.ok) throw new Error(r.error); while (G.pending) B.apply(G, G.pending.resp, { t: 'pass' }); });
  return G;
}
let G = setup(); const P = G.players[0]; const [u1, u2] = P.board.map(u => u.uid);
ok(P.board.length === 2, 'ลงการ์ด 2 ใบ');
let r = B.apply(G, 0, { t: 'fuse', a: u1, b: u2 }); ok(!r.ok && r.unknown, 'ไม่รู้สูตร: ผสมปกติไม่ได้');
const exp = F.fuse(mk('B05'), mk('B09')); const m0 = P.mana;
const pv = B.fusePreview(G, 0, u1, u2, true); ok(pv.ok && pv.exp && pv.cost === exp.cost + B.EXP_EXTRA, 'ผสมมั่ว Cost +' + B.EXP_EXTRA + ' = ' + pv.cost);
r = B.apply(G, 0, { t: 'fuse', a: u1, b: u2, x: 1 }); ok(r.ok, 'ผสมมั่วสำเร็จ ' + (r.error || ''));
while (G.pending) B.apply(G, G.pending.resp, { t: 'pass' });
ok(m0 - P.mana === pv.cost, 'หัก Mana ' + (m0 - P.mana));
ok(P.board.length === 1 && P.board[0].unstable, 'ได้การ์ดไม่เสถียร 1 ใบ');
ok(G.disc && G.disc.length === 1 && G.disc[0].side === 0 && G.disc[0].id === exp.id, 'บันทึกการค้นพบ ' + (G.disc && G.disc[0].id));
const hp0 = P.board[0].hp; B.apply(G, 0, { t: 'end' }); while (G.pending) B.apply(G, G.pending.resp, { t: 'pass' });
ok(G.players[0].board.length === 0 || G.players[0].board[0].hp === hp0 - 1, 'จบเทิร์น เสีย 1 HP (' + hp0 + '→' + (G.players[0].board[0] ? G.players[0].board[0].hp : 'ตาย') + ')');
// ผู้รู้สูตรอยู่แล้วผสมปกติ ไม่ไม่เสถียร
G = setup(); G.players[0].knows = { all: true }; const q = G.players[0].board.map(u => u.uid);
B.apply(G, 0, { t: 'fuse', a: q[0], b: q[1] }); while (G.pending) B.apply(G, G.pending.resp, { t: 'pass' });
ok(!G.players[0].board[0].unstable && !(G.disc && G.disc.length), 'ผสมปกติ: เสถียร ไม่บันทึก disc');
// ซีเรียลไลซ์/โคลนไม่พัง
const C = B.clone(G); ok(C.players[0].board.length === 1, 'clone ได้');
console.log(fails ? 'FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
