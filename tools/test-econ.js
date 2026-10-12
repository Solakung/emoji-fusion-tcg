// เศรษฐกิจ: เหรียญจากสูตรใหม่ จำกัดวันละ 10 สูตร / ผสมมั่วในศึกไม่ให้เหรียญ
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
  const st = () => p.evaluate(() => { const s = window.EFL.state(); return { c: s.coins, p: s.points, f: s.found.length, dc: s.daily.dc }; });
  const fuse = async (a, b2) => { await p.evaluate(([a, b2]) => { document.querySelector('#inventory [data-id=' + a + ']').click(); document.querySelector('#inventory [data-id=' + b2 + ']').click(); document.querySelector('#btn-fuse').click(); }, [a, b2]); await p.waitForTimeout(60); };
  const s0 = await st();
  const pairs = ['B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12', 'B13'].map((x) => ['B01', x]);
  for (const [a, b2] of pairs) await fuse(a, b2);
  const s1 = await st();
  ok(s1.f - s0.f === 12, 'ค้นพบ 12 สูตรใหม่ (' + (s1.f - s0.f) + ')');
  ok(s1.c - s0.c === 50, 'ได้เหรียญเต็มแค่ 10 สูตรแรก = +50 (ได้ +' + (s1.c - s0.c) + ')');
  ok(s1.p - s0.p === 12, 'แต้มค้นพบยังได้ครบ 12');
  ok(/เหรียญวันนี้ครบ 10 สูตร/.test(await p.textContent('#lab-msg')), 'ข้อความแจ้งว่าเหรียญวันนี้ครบแล้ว');
  // สูตรเดิมซ้ำ ไม่ได้เหรียญอยู่แล้ว
  await fuse('B01', 'B02'); ok((await st()).c === s1.c, 'สูตรซ้ำไม่ได้เหรียญ');
  // วันใหม่ รีเซ็ต
  await p.evaluate(() => { window.EFL.state().daily.d = '2000-01-01'; });
  await fuse('B01', 'B14'); const s2 = await st(); ok(s2.c - s1.c === 5, 'วันใหม่ได้เหรียญอีก +5 (ได้ +' + (s2.c - s1.c) + ')'); ok(s2.dc === 1, 'ตัวนับรีเซ็ตเป็น 1');
  // ผสมมั่วในศึก: ได้แต้ม ไม่ได้เหรียญ
  await p.evaluate(() => document.querySelector('.tab[data-view=deck]').click()); await p.click('#btn-autodeck');
  await p.evaluate(() => document.querySelector('.tab[data-view=battle]').click()); await p.click('.level[data-level=easy]'); await p.waitForTimeout(400);
  await p.evaluate(() => {
    const bs = window.EFL.battle(), G = bs.G; bs.busy = false; G.active = 0; G.players[0].mana = 10; G.players[0].fusionsLeft = 1;
    const mk = (id, em, nm, el, c, a, h) => ({ id, type: 'creature', tier: 1, emoji: em, name: nm, element: el, cost: c, atk: a, hp: h, keywords: [], abilities: [], rarity: 'common' });
    G.players[0].hand = [mk('B09', '🌱', 'ต้นอ่อน', 'plant', 1, 1, 1), mk('B12', '🪨', 'หิน', 'earth', 1, 1, 2)]; window.EFL.render();
  });
  for (let i = 0; i < 2; i++) { await p.click('#b-hand .card'); await p.waitForTimeout(100); await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /ลง|เล่น/.test(x.textContent)).click()); await p.waitForTimeout(400); }
  const before = await st();
  await p.evaluate(() => { const bs = window.EFL.battle(), P = bs.G.players[0]; bs.sel = { k: 'unit', uid: P.board[0].uid, mode: 'fuse', other: P.board[1].uid }; window.EFL.render(); });
  await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /ผสมมั่ว/.test(x.textContent)).click()); await p.waitForTimeout(700);
  const after = await st(); ok(after.f === before.f + 1 && after.p === before.p + 1 && after.c === before.c, 'ผสมมั่วในศึก: ได้สูตร+แต้ม ไม่ได้เหรียญ (เหรียญ ' + before.c + '→' + after.c + ')');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
