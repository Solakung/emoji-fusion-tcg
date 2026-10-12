// จำลองบอทสู้บอทด้วยเด็คสุ่ม เพื่อตรวจว่าเอนจินไม่พัง และดูความแข็งของบอทแต่ละระดับ
// ใช้: node tools/simulate.js [จำนวนเกมต่อคู่]
const path = require('path');
const B = require(path.join(__dirname, '..', 'battle.js'));
const d = require(path.join(__dirname, '..', 'cards.json'));
const base = d.base, spells = d.extras.filter(c => c.type === 'spell'), fields = d.extras.filter(c => c.type === 'field');
function pick(arr, n) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
const reacts = d.extras.filter(c => c.type === 'reaction');
const deck = () => pick(base, 13).concat(pick(spells, 3), pick(fields, 1), pick(reacts, 3));
let reacts_used = 0;
function play(lv, first) {
  const knows = lv.map(l => l === 'easy' ? { all: false, set: {} } : { all: true });
  const G = B.create({ decks: [deck(), deck()], names: ['A', 'B'], first, knows });
  let errors = 0;
  while (!G.over && G.turn < 120) {
    const s = G.active; let n = 0;
    while (!G.over && G.active === s && n < 60) {
      if (G.pending) { const rs = G.pending.resp; const ra = B.botRespond(G, rs, lv[rs]); const rr = B.apply(G, rs, ra); n++; if (!rr.ok) { errors++; B.apply(G, rs, { t: 'pass' }); } else if (ra.t === 'react') reacts_used++; continue; }
      const a = B.botAction(G, s, lv[s]); const r = B.apply(G, s, a);
      if (!r.ok) { errors++; B.apply(G, s, { t: 'end' }); break; }
      n++; if (a.t === 'end') break;
    }
  }
  return { w: G.over ? G.over.winner : -2, turns: G.turn, errors };
}
const n = +process.argv[2] || 40;
for (const [a, b] of [['easy', 'easy'], ['medium', 'easy'], ['hard', 'easy'], ['hard', 'medium']]) {
  let w = [0, 0], t = 0, e = 0, stall = 0;
  for (let i = 0; i < n; i++) { const r = play([a, b], i % 2); if (r.w < 0) stall++; else w[r.w]++; t += r.turns; e += r.errors; }
  console.log(`${a} vs ${b}: ตอบโต้สะสม ${reacts_used} · ชนะ ${w[0]}-${w[1]} · เทิร์นเฉลี่ย ${(t / n).toFixed(1)} · ค้าง ${stall} · คำสั่งผิดกติกา ${e}`);
}
