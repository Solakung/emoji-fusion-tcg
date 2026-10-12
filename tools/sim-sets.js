// สมดุลชุดการ์ด: เด็คชุด (การ์ดชุด 12 ใบ ×2 สุ่ม 14 + สเปล/ปฏิกิริยา) สู้เด็คพื้นฐานสุ่ม บอท hard ทั้งคู่
const path = require('path'); const B = require('../battle.js'); const d = require('../cards.json'); const S = require('../sets.json').sets; const BUF = +process.env.BUF || 0; S.forEach(s => s.cards.forEach(c => { c.atk += (+process.env.BA || BUF); c.hp += (+process.env.BH || BUF); }));
const sp = d.extras.filter(c => c.type === 'spell'), fl = d.extras.filter(c => c.type === 'field'), rc = d.extras.filter(c => c.type === 'reaction');
const pick = (a, n) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const tail = () => pick(sp, 3).concat(pick(fl, 1), pick(rc, 2));
const baseDeck = () => pick(d.base, 14).concat(tail());
const setDeck = s => pick(s.cards.concat(s.cards), 14).concat(tail());
function play(decks, first) { const kn = [{ all: true }, { all: true }]; const G = B.create({ decks, names: ['A', 'B'], first, knows: kn }); let err = 0;
  while (!G.over && G.turn < 120) { const s = G.active; let n = 0; while (!G.over && G.active === s && n < 60) {
    if (G.pending) { const rs = G.pending.resp; const r = B.apply(G, rs, B.botRespond(G, rs, 'hard')); n++; if (!r.ok) { err++; B.apply(G, rs, { t: 'pass' }); } continue; }
    const a = B.botAction(G, s, 'hard'); const r = B.apply(G, s, a); if (!r.ok) { err++; B.apply(G, s, { t: 'end' }); break; } n++; if (a.t === 'end') break; } }
  return { w: G.over ? G.over.winner : -1, err }; }
const N = +process.argv[2] || 150;
S.forEach(s => { let w = 0, l = 0, e = 0, st = 0; for (let i = 0; i < N; i++) { const f = i % 2, r = play(f ? [baseDeck(), setDeck(s)] : [setDeck(s), baseDeck()], 0); const me = f ? 1 : 0; e += r.err; if (r.w < 0) st++; else if (r.w === me) w++; else l++; }
  console.log(`${s.name}: ชนะ ${w} แพ้ ${l} (${(100 * w / (w + l)).toFixed(0)}%) · ค้าง ${st} · ผิดกติกา ${e}`); });
