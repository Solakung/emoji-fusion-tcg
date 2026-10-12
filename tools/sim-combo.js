// สมดุลการ์ดคอมโบทั่วไป (S19-24, F13, R17): เด็คที่ใส่คอมโบ 3 ใบ สู้เด็คสามัญเดิม (บอท hard)  ใช้: node tools/sim-combo.js [N] [รหัสการ์ดคั่นด้วย , เพื่อวัดทีละใบ]
const B = require('../battle.js'); const d = require('../cards.json');
const base = d.base, ex = d.extras;
const only = process.argv[3] ? process.argv[3].split(',') : null;
const COMBO = ['S19', 'S20', 'S21', 'S22', 'S23', 'S24', 'F13', 'R17'];
const isOld = c => !COMBO.includes(c.id) && +c.id.slice(1) <= (c.type === 'reaction' ? 8 : c.type === 'field' ? 6 : 12) && c.id !== 'S07' && c.id !== 'S09';
const pick = (a, n) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const oldTail = () => pick(ex.filter(c => c.type === 'spell' && isOld(c)), 4).concat(pick(ex.filter(c => c.type === 'field' && isOld(c)), 1), pick(ex.filter(c => c.type === 'reaction' && isOld(c)), 2));
const pool = only ? only.map(id => ex.find(c => c.id === id)) : COMBO.map(id => ex.find(c => c.id === id));
const mkCombo = () => { const t = oldTail(); const cs = pick(pool, only ? pool.length : 3); const keep = t.filter(c => !cs.some(x => x.type === c.type) || true); return pick(base, 13).concat(cs, t.slice(0, 7 - cs.length)); };
const N = +process.argv[2] || 300; let w = 0, l = 0, st = 0, err = 0;
for (let i = 0; i < N; i++) {
  const f = i % 2, dk = f ? [pick(base, 13).concat(oldTail()), mkCombo()] : [mkCombo(), pick(base, 13).concat(oldTail())]; const me = f ? 1 : 0;
  const G = B.create({ decks: dk, names: ['A', 'B'], first: 0, knows: [{ all: true }, { all: true }] });
  while (!G.over && G.turn < 120) { const s = G.active; let n = 0; while (!G.over && G.active === s && n < 60) {
    if (G.pending) { const rs = G.pending.resp; const r = B.apply(G, rs, B.botRespond(G, rs, 'hard')); n++; if (!r.ok) { err++; B.apply(G, rs, { t: 'pass' }); } continue; }
    const a = B.botAction(G, s, 'hard'); const r = B.apply(G, s, a); if (!r.ok) { err++; B.apply(G, s, { t: 'end' }); break; } n++; if (a.t === 'end') break; } }
  if (!G.over || G.over.winner < 0) st++; else if (G.over.winner === me) w++; else l++;
}
console.log(`${only ? only.join('+') : 'คอมโบ 3 ใบ'}: ชนะ ${w} แพ้ ${l} (${(100 * w / (w + l)).toFixed(0)}%) · ค้าง ${st} · ผิดกติกา ${err}`);
