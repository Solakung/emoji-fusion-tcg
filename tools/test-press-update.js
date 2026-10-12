// กดค้างดูรายละเอียดการ์ด (จัดเด็ค/ในศึก) + แถบแจ้งเตือนเวอร์ชันใหม่
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); let served = null;
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; let f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; }
  if (u === '/' || u === '/index.html') { let t = d.toString(); if (served) t = t.replace(/script\.js\?v=[^"']+/, 'script.js?v=' + served); d = Buffer.from(t); }
  r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route('**/online.js*', (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(2500);
  // --- กดค้างในหน้าเด็ค
  await p.evaluate(() => { window.EFL.state().owned.F11 = 1; document.querySelector('.tab[data-view=deck]').click(); });
  await p.click('#btn-cleardeck'); await p.waitForTimeout(100);
  const first = p.locator('#deck-pool .card').first(); const bb = await first.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(200);
  ok(await p.isVisible('#modal') && /Cost/.test(await p.textContent('#modal-body')), 'กดค้างในคลังการ์ด → เปิดรายละเอียด');
  ok(await p.evaluate(() => window.EFL.state().deck.length === 0), 'กดค้างไม่ถือว่าเป็นการแตะ (ไม่ใส่เด็ค)');
  await p.evaluate(() => document.querySelector('#modal').hidden = true);
  await p.click('#deck-pool .card >> nth=0'); ok(await p.evaluate(() => window.EFL.state().deck.length === 1), 'แตะปกติยังใส่เด็คได้');
  // การ์ดสนามใหม่ (ไม่มีธาตุ) เปิดรายละเอียดได้
  const err0 = errs.length; await p.evaluate(() => { document.querySelector('.tab[data-view=book]').click(); }); await p.click('[data-book=cards]'); await p.fill('#book-search', 'หมอกหนา'); await p.click('#col-field .card'); await p.waitForTimeout(150);
  ok(/ไม่ผูกธาตุ/.test(await p.textContent('#modal-body')) && errs.length === err0, 'รายละเอียดสนามไม่ผูกธาตุเปิดได้ ไม่ error');
  await p.evaluate(() => { document.querySelector('#modal').hidden = true; });
  // --- ในศึก
  await p.evaluate(() => document.querySelector('.tab[data-view=deck]').click()); await p.click('#btn-autodeck');
  await p.evaluate(() => document.querySelector('.tab[data-view=battle]').click()); await p.click('.level[data-level=easy]'); await p.waitForTimeout(500);
  const hb = await p.locator('#b-hand .card').first().boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(200);
  ok(await p.isVisible('#modal'), 'กดค้างการ์ดในมือระหว่างสู้ → รายละเอียด');
  ok(await p.evaluate(() => !window.EFL.battle().sel), 'ไม่ได้เลือกการ์ด (ไม่นับเป็นแตะ)');
  await p.evaluate(() => { document.querySelector('#modal').hidden = true; });
  // --- แถบอัปเดต
  ok(await p.evaluate(() => !document.querySelector('#update-bar') || document.querySelector('#update-bar').hidden), 'เวอร์ชันเท่ากัน ไม่มีแถบอัปเดต');
  served = '9.99'; await p.evaluate(() => window.EFL.checkUpdate(true)); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const e = document.querySelector('#update-bar'); return !!e && !e.hidden; }), 'เวอร์ชันบนเซิร์ฟเวอร์เปลี่ยน → ขึ้นแถบอัปเดต');
  ok(!(await p.isVisible('#update-bar')), 'แถบถูกซ่อนระหว่างอยู่ในแมตช์');
  await p.click('#btn-quit').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => { const m = document.querySelector('#modal'); if (!m.hidden) { const b = [...m.querySelectorAll('button')].find((x) => /ออก|ยอมแพ้|ใช่|ตกลง/.test(x.textContent)); if (b) b.click(); } }); await p.waitForTimeout(400);
  await p.evaluate(() => { window.EFL.battle() && 0; });
  if (await p.evaluate(() => !!window.EFL.battle())) { await p.evaluate(() => document.querySelector('#modal') && (document.querySelector('#modal').hidden = true)); }
  await p.evaluate(() => { document.body.classList.remove('in-battle'); document.querySelector('#battle').hidden = true; });
  ok(await p.isVisible('#update-bar'), 'ออกจากแมตช์ → เห็นแถบอัปเดต');
  await p.click('#upd-later'); ok(!(await p.isVisible('#update-bar')), 'กด "ทีหลัง" → ซ่อน');
  await p.evaluate(() => window.EFL.checkUpdate(true)); await p.waitForTimeout(300); ok(!(await p.isVisible('#update-bar')), 'เวอร์ชันเดิมที่ปฏิเสธแล้วไม่เด้งซ้ำ');
  served = '10.0'; await p.evaluate(() => window.EFL.checkUpdate(true)); await p.waitForTimeout(300); ok(await p.isVisible('#update-bar'), 'เวอร์ชันใหม่กว่าเด้งอีกครั้ง');
  served = null; await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(2500); served = '11.0'; await p.evaluate(() => window.EFL.checkUpdate(true)); await p.waitForTimeout(300);
  await Promise.all([p.waitForNavigation({ timeout: 5000 }).catch(() => null), p.click('#upd-go')]); await p.waitForTimeout(1500);
  ok(/\?u=\d+/.test(p.url()), 'กดอัปเดต → โหลดหน้าใหม่ (' + p.url().split('?')[1] + ')');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
