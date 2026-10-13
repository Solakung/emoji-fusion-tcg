// เอฟเฟกต์หน้าผสม (ห้องทดลอง) · หน้าสะสม (เงา/เอียงโฮโล) · ปุ่มเสียง
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0].replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route('**/online.js*', (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForFunction(() => window.EFL); await p.waitForTimeout(800);
  // ปุ่มเสียง
  ok((await p.textContent('#btn-snd')) === '🔊', 'มีปุ่มเสียง (เปิดอยู่)'); await p.click('#btn-snd'); ok((await p.textContent('#btn-snd')) === '🔇' && await p.evaluate(() => localStorage.getItem('emoji-fusion-lab-snd')) === '0', 'กดปิดเสียง จำค่าไว้'); await p.click('#btn-snd');
  // ผสมในห้องทดลอง
  await p.evaluate(() => { window.EFL.noSound = true; });
  const cards = await p.$$('#inventory .card'); await cards[0].click(); await (await p.$$('#inventory .card'))[3].click(); await p.waitForTimeout(100);
  await p.click('#btn-fuse');
  await p.waitForTimeout(120);
  const a = await p.evaluate(() => ({ ghost: document.querySelectorAll('.fx-ghost').length, hid: !!document.querySelector('#slot-result .fx-hide-lab'), has: !!document.querySelector('#slot-result .card') }));
  ok(a.ghost >= 2 && a.hid && a.has, 'หน้าผสม: การ์ด 2 ใบพุ่งเข้าวงเวท ผลลัพธ์ซ่อนรอ ' + JSON.stringify(a));
  await p.waitForTimeout(2000);
  const bq = await p.evaluate(() => ({ hid: !!document.querySelector('.fx-hide-lab'), fx: document.querySelectorAll('.fx').length, rv: !!document.querySelector('#slot-result .card') }));
  ok(!bq.hid && bq.rv && bq.fx === 0, 'หน้าผสม: ผลลัพธ์โผล่ เอฟเฟกต์หายหมด');
  // สมุดการ์ด
  await p.evaluate(() => { document.querySelector('.tab[data-view=book]') && document.querySelector('.tab[data-view=book]').click(); const t = document.querySelector('[data-book=cards]'); t && t.click(); });
  await p.waitForTimeout(300);
  const c = await p.evaluate(() => ({ unk: document.querySelectorAll('#book-cards .card.unknown').length, nm: (document.querySelector('#book-cards .card.unknown .name') || {}).textContent, vis: !!document.querySelector('#book-cards .card:not(.unknown)') }));
  ok(c.unk > 5 && c.nm === '???', 'สมุดการ์ด: ใบที่ยังไม่มีเป็นเงา ???  (' + c.unk + ' ใบ)');
  await p.evaluate(() => { const s = EFL.state(); s.owned.DR11 = 1; s.owned.B16 = 1; document.querySelector('.tab[data-view=lab]').click(); document.querySelector('.tab[data-view=book]').click(); });
  await p.waitForTimeout(200);
  const box = await p.evaluate(() => { const e = document.querySelector('#book-cards .card.r-rare:not(.unknown), #book-cards .card.tier3:not(.unknown)'); if (!e) return null; e.scrollIntoView(); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (box) { await p.mouse.move(box.x - 10, box.y); await p.mouse.move(box.x + 10, box.y + 5); const t = await p.evaluate(() => { const e = document.querySelector('#book-cards .card.tilting'); return e ? e.style.transform : ''; }); ok(/rotateY/.test(t), 'สมุดการ์ด: การ์ดหายากเอียงตามนิ้ว/เมาส์'); } else ok(true, 'ไม่มีการ์ดหายากให้ลองเอียง (ข้าม)');
  ok(errs.length === 0, 'ไม่มี error: ' + errs.join('|'));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
