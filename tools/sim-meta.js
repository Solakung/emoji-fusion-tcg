// วัดเมต้า: เด็คแอกโกร vs เด็คตั้งรับ vs เด็คสุ่ม (บอท hard ทั้งคู่) — วัดอย่างเดียว ไม่ปรับสมดุล
const B = require('../battle.js'); const d = require('../cards.json');
const SETC = []; require('../sets.json').sets.forEach(st => st.cards.forEach(c => SETC.push(c)));
SETC.forEach(c => { const p = c.id.slice(0, 2); const A = +process.env[p + "A"] || 0, H = +process.env[p + "H"] || 0; if (A || H) { c.atk += A; c.hp += H; } });
const FF = require('../fusion.js'); if (process.env.FACTOR) FF.CONFIG.factor = +process.env.FACTOR; if (process.env.CD) FF.CONFIG.costDelta = +process.env.CD; if (process.env.SLOT2) B.RULES.fuseSlot2Turn = +process.env.SLOT2; if (process.env.DISC === '0') B.RULES.fuseFirstDisc = false; if (process.env.INH === '0') B.RULES.fuseInherit = false;
if (process.env.RUSH === '0') B.RULES.rush = false;
d.base.forEach(c => { const A = +process.env[c.id + 'A'] || 0, H = +process.env[c.id + 'H'] || 0; c.atk += A; c.hp += H; });
const PHD = require('../ph.json'); const PHC = PHD.cards.concat(PHD.extras);
const C = id => d.base.find(c => c.id === id) || d.extras.find(c => c.id === id) || SETC.find(c => c.id === id) || PHC.find(c => c.id === id);
const mk = s => s.split(' ').flatMap(t => { const [id, n] = t.split('x'); return Array(+(n || 1)).fill(C(id)); });
const DECKS = {
  แอกโกร: () => mk('B01x2 B13x2 B14x2 B02x2 B03x2 B15x2 B16x2 S01x2 S04 S17 F07 R14'),
  ตั้งรับ: () => mk('B17x2 B05x2 B18x2 B19x2 B20x2 B11x2 B12 S02 S03 S05 S14 F09 R01 R09'),
  คอนโทรลผสม: () => mk('B06x2 B07x2 B10x2 B19x2 B20x2 B08x2 B12 S05 S14 S04 F08 R03 R09 R01'),
  โกเลม: () => mk('GO01x2 GO02 GO03x2 GO04x2 GO06 GO09x2 GO10x2 GO12 GO13 GO15 S02 S14 F08 R09 R01'),
  ละครสัตว์: () => mk('CI01x2 CI03x2 CI04x2 CI06x2 CI08x2 CI09 CI11x2 CI13 CI14 CI16 S14 S05 R13 R09'),
  ไฟฟ้า: () => mk('B13x2 B14x2 B15x2 B16x2 B21x2 B22x2 B17 B18 S01 S04 S17 F04 R09 R14'),
  ฟินิกส์: () => mk(process.env.PHDECK || 'PH01x2 PH02x2 PH03 PH04 PH06 PH07x2 PH09 PH10 PH11 PH12 PHS1x2 PHS3 PHS5 PHS4 PHF1 PHR1'),
  สุ่ม: () => { const a = d.base.concat(d.base); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 20); }
};
DECKS.แอกโกร().length === 20 || (() => { throw new Error('aggro ' + DECKS.แอกโกร().length); })();
['ตั้งรับ', 'คอนโทรลผสม', 'โกเลม', 'ละครสัตว์', 'ไฟฟ้า'].forEach(k => { if (DECKS[k]().length !== 20) throw new Error(k + ' ' + DECKS[k]().length); });
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
const only = process.argv[3];
if (only === 'ph') { ['แอกโกร', 'ไฟฟ้า', 'โกเลม', 'ละครสัตว์', 'ตั้งรับ', 'คอนโทรลผสม', 'สุ่ม'].forEach(k => match('ฟินิกส์', k)); process.exit(0); }
(only === 'rush' ? [['แอกโกร', 'โกเลม'], ['แอกโกร', 'ละครสัตว์'], ['แอกโกร', 'สุ่ม'], ['ไฟฟ้า', 'โกเลม'], ['ไฟฟ้า', 'ละครสัตว์'], ['ไฟฟ้า', 'สุ่ม'], ['สุ่ม', 'สุ่ม']] : only ? [['แอกโกร', 'โกเลม'], ['แอกโกร', 'ละครสัตว์'], ['โกเลม', 'สุ่ม'], ['ละครสัตว์', 'สุ่ม'], ['โกเลม', 'ละครสัตว์']] :
  [['แอกโกร', 'ตั้งรับ'], ['แอกโกร', 'คอนโทรลผสม'], ['แอกโกร', 'สุ่ม'], ['ตั้งรับ', 'สุ่ม'], ['คอนโทรลผสม', 'สุ่ม'], ['สุ่ม', 'สุ่ม'], ['แอกโกร', 'โกเลม'], ['แอกโกร', 'ละครสัตว์'], ['โกเลม', 'สุ่ม'], ['ละครสัตว์', 'สุ่ม'], ['โกเลม', 'ละครสัตว์']]
).forEach(p => match(p[0], p[1]));
