// ผสมมั่วบนหน้าจอ: ปุ่ม, ค้นพบสูตรเข้าสมุด, ตัวบ่งชี้ 🧪
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0].replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route('**/online.js*', (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelector('.tab[data-view=deck]').click(); });
  await p.click('#btn-autodeck');
  await p.evaluate(() => document.querySelector('.tab[data-view=battle]').click());
  await p.click('.level[data-level=easy]'); await p.waitForTimeout(400);
  await p.evaluate(() => {
    const bs = window.EFL.battle(), G = bs.G; bs.busy = false; G.active = 0; G.players[0].mana = 10;
    const mk = (id, em, nm, el, c, a, h) => ({ id, type: 'creature', tier: 1, emoji: em, name: nm, element: el, cost: c, atk: a, hp: h, keywords: [], abilities: [], rarity: 'common' });
    G.players[0].hand = [mk('B09', '🌱', 'ต้นอ่อน', 'plant', 1, 1, 1), mk('B05', '💧', 'หยดน้ำ', 'water', 1, 1, 2)]; G.players[0].fusionsLeft = 1;
    window.EFL.render();
  });
  for (let i = 0; i < 2; i++) { await p.click('#b-hand .card'); await p.waitForTimeout(100); await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /ลง|เล่น/.test(x.textContent)).click()); await p.waitForTimeout(500); }
  const n = await p.evaluate(() => window.EFL.battle().G.players[0].board.length); ok(n === 2, 'ลงการ์ด 2 ใบ ' + n);
  // เลือกใบแรก → ผสม → ใบที่สอง
  await p.evaluate(() => { const bs = window.EFL.battle(), P = bs.G.players[0]; bs.sel = { k: 'unit', uid: P.board[0].uid, mode: 'fuse', other: P.board[1].uid }; window.EFL.render(); });
  const bt = await p.evaluate(() => [...document.querySelectorAll('#b-action button')].map((x) => x.textContent));
  ok(bt.some((t) => /ผสมมั่ว/.test(t)), 'มีปุ่มผสมมั่ว: ' + bt.join('|'));
  const hasKnown = await p.evaluate(() => window.EFL.state().found.includes('(B05+B09)')); ok(!hasKnown, 'ยังไม่รู้สูตรก่อนผสม');
  await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /ผสมมั่ว/.test(x.textContent)).click());
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => window.EFL.state().found.includes('(B05+B09)')), 'สูตรถูกบันทึกในสมุดหลังผสมมั่ว');
  ok(await p.evaluate(() => window.EFL.battle().G.players[0].board[0].unstable === true), 'การ์ดไม่เสถียร');
  ok((await p.locator('#b-me-board').innerText().catch(() => '')).includes('🧪') || (await p.content()).includes('🧪'), 'แสดงสัญลักษณ์ 🧪');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
