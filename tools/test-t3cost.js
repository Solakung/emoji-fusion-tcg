// ผสมสูตรขั้น 3 ที่ยังไม่รู้ ต้องใช้เศษการ์ด 3 ✨
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
  await p.evaluate(() => { const s = window.EFL.state(); s.found = ['(B01+B02)']; s.shards = 5; });
  await p.click('.seg-btn[data-pool=found]'); await p.waitForTimeout(100);
  const pick = (a, c) => p.evaluate(([a, c]) => { document.querySelector('#inventory [data-id="' + a + '"]').click(); }, [a, c]);
  const sh = () => p.evaluate(() => window.EFL.state().shards); const fd = () => p.evaluate(() => window.EFL.state().found.length);
  // ขั้น 3 ใหม่ ครั้งที่ 1
  await pick('(B01+B02)'); await p.click('.seg-btn[data-pool=base]'); await pick('B03');
  ok(/3 ✨/.test(await p.textContent('#btn-fuse')), 'ปุ่มผสมแสดงราคา: ' + (await p.textContent('#btn-fuse')).trim());
  ok(/ต้องใช้ 3 ✨/.test(await p.textContent('#lab-msg')), 'ข้อความเตือนก่อนผสม');
  await p.click('#btn-fuse'); await p.waitForTimeout(100);
  ok((await sh()) === 2 && (await fd()) === 2, 'ผสมสำเร็จ หักเศษ 5→2 และได้สูตรใหม่');
  // ครั้งที่ 2: เศษไม่พอ (2 < 3)
  await pick('B04'); ok(/3 ✨/.test(await p.textContent('#btn-fuse')), 'สูตรใหม่อีกอัน ยังคิด 3 ✨');
  await p.click('#btn-fuse'); await p.waitForTimeout(100);
  ok((await sh()) === 2 && (await fd()) === 2, 'เศษไม่พอ → ผสมไม่ได้ ไม่หักเศษ ไม่ได้สูตร');
  ok(/เศษการ์ด/.test(await p.textContent('#toast')), 'มี toast บอกว่าเศษไม่พอ');
  // สูตรที่เจอแล้ว ฟรี
  await pick('B03'); ok(!/✨/.test(await p.textContent('#btn-fuse')), 'สูตรที่เจอแล้ว ปุ่มไม่คิดเศษ');
  await p.click('#btn-fuse'); await p.waitForTimeout(100); ok((await sh()) === 2, 'ผสมสูตรเดิมซ้ำฟรี');
  // ขั้น 2 ฟรีเสมอ
  await p.reload(); await p.waitForFunction(() => window.EFL); await p.waitForTimeout(500);
  await p.evaluate(() => { window.EFL.state().shards = 0; });
  await p.click('.seg-btn[data-pool=base]'); await pick('B05'); await pick('B06'); const f0 = await fd(); await p.click('#btn-fuse'); await p.waitForTimeout(100);
  ok((await fd()) === f0 + 1, 'ขั้น 2 ผสมได้แม้เศษ = 0');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
