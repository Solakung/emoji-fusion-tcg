// ทดสอบซอง: ความหายาก / การันตี / ใบซ้ำแลกเศษ / ซองธาตุ / ซองหายาก
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0].replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR', e.message)); await p.route('**/online.js*', (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(2000);
  await p.evaluate(() => { window.EFL.noTear = true; });
  const dist = await p.evaluate(() => { const c = { common: 0, uncommon: 0, rare: 0 }; let n = 0; for (let i = 0; i < 4000; i++) window.EFL.roll('normal').forEach((x) => { c[x.rarity]++; n++; }); return { c, n }; });
  const pr = (k) => dist.c[k] / dist.n;
  ok(pr('rare') < 0.1 && pr('rare') > 0.02, 'หายาก ~ ' + (pr('rare') * 100).toFixed(1) + '%');
  ok(pr('common') > pr('uncommon') && pr('uncommon') > pr('rare'), 'สัดส่วน ธรรมดา>พิเศษ>หายาก');
  const el = await p.evaluate(() => { let bad = 0; for (let i = 0; i < 300; i++) { const r = window.EFL.roll('elem', 'water'); if (r.slice(0, 4).some((c) => c.element !== 'water')) bad++; if (r.length !== 5) bad++; } return bad; });
  ok(el === 0, 'ซองธาตุ: 4 ใบแรกเป็นธาตุที่เลือก');
  const rr = await p.evaluate(() => { let bad = 0; for (let i = 0; i < 300; i++) { const r = window.EFL.roll('rare'); if (!r.some((c) => c.rarity === 'rare')) bad++; if (r.filter((c) => c.rarity !== 'common').length < 2) bad++; } return bad; });
  ok(rr === 0, 'ซองหายาก: มีใบหายาก + ใบพิเศษขึ้นไปอย่างน้อย 2');
  // ใบซ้ำแลกเศษ
  await p.evaluate(async () => { const s = window.EFL.state(); s.coins = 5000; s.shards = 0; document.querySelector('.tab[data-view=shop]').click(); const d = await (await fetch('cards.json')).json(); d.base.concat(d.extras).forEach((c) => (s.owned[c.id] = 2)); });
  await p.click('#btn-pack');
  const after = await p.evaluate(() => { const s = window.EFL.state(); return { sh: s.shards, mx: Math.max.apply(null, Object.values(s.owned)) }; });
  ok(after.sh >= 10 && after.mx === 2, 'ใบซ้ำไม่เพิ่มในคลัง แต่ได้เศษ ' + after.sh + ' ✨');
  // pity
  await p.evaluate(() => { const s = window.EFL.state(); s.pity = 9; });
  let rareHit = 0;
  for (let t = 0; t < 1; t++) { await p.click('#btn-pack'); }
  ok(await p.evaluate(() => window.EFL.state().pity === 0), 'ครบ 10 ซอง → ได้ใบหายากและรีเซ็ตตัวนับ');
  // ใบเกินเดิมแลก
  await p.evaluate(() => { const s = window.EFL.state(); s.owned.B01 = 5; s.shards = 0; document.querySelector('.tab[data-view=battle]').click(); document.querySelector('.tab[data-view=shop]').click(); });
  const exTxt = await p.evaluate(() => [...document.querySelectorAll('#shop-extra button')].find((x) => /แลกใบเกิน/.test(x.textContent)).textContent);
  ok(/3 ใบ/.test(exTxt), exTxt);
  await p.evaluate(() => [...document.querySelectorAll('#shop-extra button')].find((x) => /แลกใบเกิน/.test(x.textContent)).click());
  ok(await p.evaluate(() => window.EFL.state().owned.B01 === 2 && window.EFL.state().shards === 6), 'แลกใบเกิน B01 ×3 → 6 ✨');
  // ซองพิเศษ
  await p.evaluate(() => { window.EFL.state().shards = 60; document.querySelector('.tab[data-view=battle]').click(); document.querySelector('.tab[data-view=shop]').click(); });
  await p.evaluate(() => [...document.querySelectorAll('#shop-extra button')].find((x) => /ซองธาตุ/.test(x.textContent)).click());
  ok(await p.evaluate(() => document.querySelectorAll('#pack-result .card-back').length === 5), 'เปิดซองแล้วเห็นหลังการ์ดคว่ำ 5 ใบ');
  const rareBacks = await p.evaluate(() => document.querySelectorAll('#pack-result .card-back.r-rare, #pack-result .card-back.r-uncommon, #pack-result .card-back.r-common').length);
  ok(rareBacks === 5, 'หลังการ์ดมีสีขอบบอกความหายาก');
  await p.click('#pack-result .card-back'); await p.waitForTimeout(450);
  ok(await p.evaluate(() => document.querySelectorAll('#pack-result .card').length === 1 && document.querySelectorAll('#pack-result .card-back').length === 4), 'แตะพลิกทีละใบ');
  await p.click('#pack-flipall'); await p.waitForTimeout(1400);
  ok(await p.evaluate(() => document.querySelectorAll('#pack-result .card').length === 5 && /ได้ใบใหม่/.test(document.querySelector('#pack-summary').textContent)), 'พลิกทั้งหมด → เห็นการ์ด 5 ใบ + สรุป');
  ok(await p.evaluate(() => window.EFL.state().shards >= 40), 'หักเศษ/รับเศษถูกต้อง');
  // ใบหายาก: มีแสงวาบ
  await p.evaluate(() => { const s = window.EFL.state(); s.shards = 100; s.coins = 5000; });
  await p.evaluate(() => { const o = window.EFL.roll; });
  let sawFlash = false;
  for (let k = 0; k < 6 && !sawFlash; k++) {
    await p.evaluate(() => [...document.querySelectorAll('#shop-extra button')].find((x) => /ซองหายาก/.test(x.textContent)).click());
    await p.click('#pack-flipall');
    for (let t = 0; t < 12 && !sawFlash; t++) { await p.waitForTimeout(100); sawFlash = await p.evaluate(() => !!document.querySelector('.pack-flash.rare')); }
    await p.waitForTimeout(800);
    await p.evaluate(() => { window.EFL.state().shards = 100; document.querySelector('.tab[data-view=battle]').click(); document.querySelector('.tab[data-view=shop]').click(); });
  }
  ok(sawFlash, 'ซองหายาก: พลิกใบหายากแล้วมีแสงวาบ');
  await b.close(); srv.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
