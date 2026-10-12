// วัดเมต้า: เด็คแอกโกร vs เด็คตั้งรับ vs เด็คสุ่ม (บอท hard ทั้งคู่) — วัดอย่างเดียว ไม่ปรับสมดุล
const B = require('../battle.js'); const d = require('../cards.json');
const C = id => d.base.find(c => c.id === id) || d.extras.find(c => c.id === id);
const mk = s => s.split(' ').flatMap(t => { const [id, n] = t.split('x'); return Array(+(n || 1)).fill(C(id)); });
const DECKS = {
  แอกโกร: () => mk('B01x2 B13x2 B14x2 B02x2 B03x2 B15x2 B16x2 S01x2 S04 S17 F07 R14'),
  ตั้งรับ: () => mk('B17x2 B05x2 B18x2 B19x2 B20x2 B11x2 B12 S02 S03 S05 S14 F09 R01 R09'),
  คอนโทรลผสม: () => mk('B06x2 B07x2 B10x2 B19x2 B20x2 B08x2 B12 S05 S14 S04 F08 R03 R09 R01'),
  สุ่ม: () => { const a = d.base.concat(d.base); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 20); }
};
DECKS.แอกโกร().length === 20 || (() => { throw new Error('aggro ' + DECKS.แอกโกร().length); })();
['ตั้งรับ', 'คอนโทรลผสม'].forEach(k => { if (DECKS[k]().length !== 20) throw new Error(k + ' ' + DECKS[k]().length); });
function game(da, db, first) {
  const G = B.create({ decks: [da, db], names: ['A', 'B'], first, knows: [{ all: true }, { all: true }] });
  while (!G.over && G.turn < 120) { const s = G.active; let n = 0; while (!G.over && G.active === s && n < 60) {
    if (G.pending) { const rs = G.pending.resp; const r = B.apply(G, rs, B.botRespond(G, rs, 'hard')); n++; if (!r.ok) B.apply(G, rs, { t: 'pass' }); continue; }
    const a = B.botAction(G, s, 'hard'); const r = B.apply(G, s, a); if (!r.ok) { B.apply(G, s, { t: 'end' }); break; } n++; if (a.t === 'end') break; } }
  return { w: G.over ? G.over.winner : -1, t: G.turn, first };
}
const N = +process.argv[2] || 200;
function match(a, b) {
  let wa = 0, wb = 0, st = 0, turns = [], firstW = 0;
  for (let i = 0; i < N; i++) { const sw = i % 2, f = i % 4 < 2 ? 0 : 1; const r = sw ? game(DECKS[b](), DECKS[a](), f) : game(DECKS[a](), DECKS[b](), f);
    if (r.w < 0) { st++; continue; } const winA = sw ? r.w === 1 : r.w === 0; winA ? wa++ : wb++; turns.push(r.t); if (r.w === r.first) firstW++; }
  turns.sort((x, y) => x - y); const avg = turns.reduce((s, x) => s + x, 0) / turns.length;
  console.log(`${a} vs ${b}: ${a} ชนะ ${wa} (${(100 * wa / (wa + wb)).toFixed(0)}%) · ${b} ชนะ ${wb} · เกมยาวเฉลี่ย ${avg.toFixed(1)} เทิร์น (มัธยฐาน ${turns[turns.length >> 1]}) · ผู้เล่นคนแรกชนะ ${(100 * firstW / turns.length).toFixed(0)}% · ค้าง ${st}`);
}
match('แอกโกร', 'ตั้งรับ'); match('แอกโกร', 'คอนโทรลผสม'); match('แอกโกร', 'สุ่ม'); match('ตั้งรับ', 'สุ่ม'); match('คอนโทรลผสม', 'สุ่ม'); match('สุ่ม', 'สุ่ม');
