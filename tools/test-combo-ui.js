// ชุดคอมโบ/ชุดใหม่บนหน้าจอ: คลัง, เริ่มศึกด้วยเด็คชุดแล็บ, ลงช่างประกอบแล้วผสมเพิ่มได้
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0].replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route(/online\.js|firebase/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForFunction(() => window.EFL); await p.waitForTimeout(800);
  // ให้การ์ดใหม่ทั้งหมดอย่างละ 2 ใบ แล้วดูในคลัง/สมุด
  await p.evaluate(() => { const s = EFL.state(); ['AL','OC'].forEach(pre => { for (let i = 1; i <= 16; i++) s.owned[pre + String(i).padStart(2, '0')] = 2; }); ['S19','S20','S21','S22','S23','S24','F13','R17'].forEach(id => s.owned[id] = 2); });
  await p.evaluate(() => { document.querySelector('.tab[data-view=book]').click(); document.querySelector('[data-book=cards]').click(); }); await p.waitForTimeout(500);
  const html = await p.content();
  ok(['แล็บเล่นแร่', 'ใต้สมุทรลึก'].every(t => html.includes(t)), 'คลังมีหัวข้อชุดใหม่ทั้งสอง');
  ok(['ตำราต้องห้าม', 'โรงงานผสม', 'ตัดวงจร', 'ช่างประกอบ' ].filter(t => html.includes(t)).length >= 3, 'คลังแสดงการ์ดคอมโบ/ชุดใหม่');
  // เด็คชุดแล็บ (20 ใบ ซ้ำไม่เกิน 2)
  await p.evaluate(() => { const s = EFL.state(); const ids = []; for (let i = 1; i <= 10; i++) { const id = 'AL' + String(i).padStart(2, '0'); ids.push(id, id); } s.deck = ids; });
  await p.evaluate(() => document.querySelector('.tab[data-view=battle]').click());
  await p.click('.level[data-level=easy]'); await p.waitForTimeout(500);
  const info = await p.evaluate(() => { const bs = EFL.battle(); return { ok: !!bs, n: bs && bs.G.players[0].deck.length + bs.G.players[0].hand.length }; });
  ok(info.ok && info.n === 20, 'เริ่มศึกด้วยเด็คชุดแล็บ ' + info.n);
  // ลงช่างประกอบผ่านปุ่มจริง แล้วผสมเพิ่มได้ 2 ครั้ง
  await p.evaluate(() => { const bs = EFL.battle(), G = bs.G; bs.busy = false; G.active = 0; const P = G.players[0]; P.mana = 10; P.fusionsLeft = 1; P.board = []; P.hand = [JSON.parse(JSON.stringify(window.__al04 || null))].filter(Boolean); });
  const card = await p.evaluate(async () => { const r = await fetch('sets.json').then(x => x.json()); return r.sets.find(s => s.id === 'alchemy').cards.find(c => c.id === 'AL04'); });
  await p.evaluate((c) => { const bs = EFL.battle(); bs.G.players[0].hand = [c]; EFL.render(); }, card);
  await p.click('#b-hand .card'); await p.waitForTimeout(100);
  await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /ลง|เล่น/.test(x.textContent)).click()); await p.waitForTimeout(700);
  const fl = await p.evaluate(() => EFL.battle().G.players[0].fusionsLeft); ok(fl === 2, 'ช่างประกอบในศึกจริง: ผสมเพิ่มได้ (fusionsLeft=' + fl + ')');
  const log = await p.evaluate(() => EFL.battle().G.log.map(l => l.text).join('|')); ok(log.includes('ผสมเพิ่มได้อีก 1 ครั้ง'), 'บันทึกการเล่นแสดงเอฟเฟกต์');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
