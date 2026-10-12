// สมดุลการ์ดสามัญชุดใหม่: เด็คที่ใช้เวทย์/สนาม/ปฏิกิริยาชุดใหม่ สู้เด็คที่ใช้ชุดเดิม (บอท hard ทั้งคู่)
const B = require('../battle.js'); const d = require('../cards.json');
const base = d.base, ex = d.extras, isNew = c => +c.id.slice(1) >= (c.type === 'reaction' ? 9 : c.type === 'field' ? 7 : 13);
const pick = (a, n) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const pool = (type, neu) => ex.filter(c => c.type === type && isNew(c) === neu && !(c.id === 'S07' || c.id === 'S09'));
const mk = neu => pick(base, 13).concat(pick(pool('spell', neu), 4), pick(pool('field', neu), 1), pick(pool('reaction', neu), 2));
const N = +process.argv[2] || 200; let w = 0, l = 0, st = 0, err = 0; const stat = {};
for (let i = 0; i < N; i++) {
  const f = i % 2, dk = f ? [mk(false), mk(true)] : [mk(true), mk(false)]; const me = f ? 1 : 0;
  const G = B.create({ decks: dk, names: ['A', 'B'], first: 0, knows: [{ all: true }, { all: true }] });
  while (!G.over && G.turn < 120) { const s = G.active; let n = 0; while (!G.over && G.active === s && n < 60) {
    if (G.pending) { const rs = G.pending.resp; const r = B.apply(G, rs, B.botRespond(G, rs, 'hard')); n++; if (!r.ok) { err++; B.apply(G, rs, { t: 'pass' }); } continue; }
    const a = B.botAction(G, s, 'hard'); const r = B.apply(G, s, a); if (!r.ok) { err++; B.apply(G, s, { t: 'end' }); break; } n++; if (a.t === 'end') break; } }
  if (!G.over || G.over.winner < 0) st++; else if (G.over.winner === me) w++; else l++;
}
console.log(`เด็คชุดใหม่: ชนะ ${w} แพ้ ${l} (${(100 * w / (w + l)).toFixed(0)}%) · ค้าง ${st} · ผิดกติกา ${err}`);
