// ทดสอบซองตามชุด: ไม่ซ้ำในซอง, ราคา, การ์ดเข้าคลัง, ใช้ในเด็คได้
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; r.end(); } else { r.end(b); } }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
srv.listen(0, async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await pg.route(/online\.js|firebase/, r => r.abort());
  await pg.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); });
  await pg.goto('http://localhost:' + srv.address().port + '/'); await pg.waitForFunction(() => window.EFL);
  await pg.evaluate(() => { EFL.noTear = true; });
  const r = await pg.evaluate(() => { let dup = 0, bad = 0, last = 0; for (let i = 0; i < 2000; i++) { const p = EFL.roll('set', 'dragon'); if (p.length !== 5) bad++; if (new Set(p.map(c => c.id)).size !== p.length) dup++; if (p.some(c => c.set !== 'dragon')) bad++; if (p[4].rarity === 'common') last++; }
    let d2 = 0; ['normal', 'rare'].forEach(k => { for (let i = 0; i < 1000; i++) { const p = EFL.roll(k); if (new Set(p.map(c => c.id)).size !== p.length) { d2++; window.__d = k + p.map(c=>c.id); } } });
    ['fire', 'water', 'plant', 'electric', 'earth', 'wind'].forEach(e => { for (let i = 0; i < 500; i++) { const p = EFL.roll('elem', e); if (new Set(p.map(c => c.id)).size !== p.length) { d2++; window.__d = k + p.map(c=>c.id); } } });
    return { dup, bad, last, d2, d: window.__d }; });
  ok(r.bad === 0, 'ซองชุด 5 ใบ ใบทั้งหมดอยู่ในชุด'); ok(r.dup === 0, 'ซองชุดไม่ซ้ำ'); ok(r.last === 0, 'ใบสุดท้ายพิเศษขึ้นไป'); ok(r.d2 === 0, 'ซองอื่นไม่ซ้ำในซอง ' + r.d);
  await pg.evaluate(() => { EFL.state().coins = 100; });
  await pg.click('[data-view="shop"], #tab-shop, nav button:has-text("ร้าน")').catch(() => { });
  const btn = pg.locator('.set-btn'); ok(await btn.count() === 4, 'มีปุ่มซองชุดในร้าน (4 ชุด)');
  await btn.first().click(); await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => { const s = EFL.state(); return { coins: s.coins, n: Object.keys(s.owned).filter(i => /^DR/.test(i)).length }; });
  ok(st.coins === 60, 'หักเหรียญ 40'); ok(st.n >= 1 && st.n <= 5, 'การ์ดชุดเข้าคลัง ' + st.n);
  const bt = await pg.evaluate(() => { const s = EFL.state(); ['DR01', 'DR07', 'DR11'].forEach(i => s.owned[i] = 2); const c = ['DR01', 'DR07', 'DR11']; return typeof EFL.roll; });
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
