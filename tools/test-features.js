// ทดสอบภารกิจรายวัน + รหัสแชร์เด็ค (ออฟไลน์)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0].replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR', e.message)); await p.route('**/online.js*', (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.7'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('.tab[data-view=battle]').click());
  ok((await p.$$('#daily-card .d-row')).length === 3, 'มีภารกิจ 3 ข้อ');
  const c0 = await p.evaluate(() => window.EFL.state().coins);
  await p.click('#daily-card .d-login button'); 
  const c1 = await p.evaluate(() => window.EFL.state().coins);
  ok(c1 === c0 + 10, 'โบนัสล็อกอินวันแรก +10');
  ok(await p.evaluate(() => window.EFL.state().daily.streak) === 1, 'streak=1');
  // รหัสเด็ค
  await p.evaluate(() => document.querySelector('.tab[data-view=deck]').click());
  await p.click('#btn-deckshare');
  const code = await p.inputValue('#dk-out');
  ok(/^EFD1:/.test(code), 'โค้ด ' + code.slice(0, 40));
  await p.evaluate(() => document.querySelector('#modal-close').click());
  await p.click('#btn-cleardeck'); 
  await p.evaluate(() => { try { window.confirm = () => true; } catch (e) {} });
  await p.click('#btn-deckshare'); await p.fill('#dk-in', code + ',Z99*2'); await p.click('#dk-import');
  const same = await p.evaluate((c) => { const s = window.EFL.state(); return s.deck.length; }, code);
  ok(same === 20, 'นำเข้าแล้วเด็คครบ 20');
  await p.click('#btn-deckshare'); const code2 = await p.inputValue('#dk-out');
  ok(code2 === code, 'โค้ดหลังนำเข้าตรงกับเดิม');
  // ภารกิจนับจากการผสมในแล็บ
  await p.evaluate(() => { const s = window.EFL.state(); s.daily.m = {}; });
  await b.close(); srv.close(); console.log(fails ? 'FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
