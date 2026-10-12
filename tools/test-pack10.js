// เปิดซอง 1 / 10: ราคา, การันตีนับต่อเนื่อง, อนิเมชันลุ้น (ไล่ระดับสี), เปิดอัตโนมัติ+ซองถัดไป+ข้ามไปสรุป, หน้าสรุป
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0].replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route(/online\.js|firebase/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForFunction(() => window.EFL); await p.waitForTimeout(700);
  await p.evaluate(() => { EFL.state().coins = 1000; EFL.state().shards = 0; document.querySelector('.tab[data-view=shop]').click(); });
  ok(/10 ซอง · 300/.test(await p.textContent('#btn-pack10')) && /1 ซอง · 30/.test(await p.textContent('#btn-pack')), 'มีปุ่ม เปิด 1 ซอง 30 / เปิด 10 ซอง 300');
  ok(await p.locator('.set-btn10').count() === 6, 'ซองชุดมีปุ่ม ×10 ทุกชุด');
  // --- 1 ซอง แบบมีอนิเมชัน: ฉีก → ลุ้น → พลิก
  await p.click('#btn-pack'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => EFL.state().coins) === 970, 'หัก 30 🪙');
  ok(await p.locator('.pack-stage').count() === 1, 'ขึ้นฉากฉีกซอง');
  await p.click('.pack-stage'); // แตะ = ฉีก
  await p.waitForSelector('.susp-stage', { timeout: 4000 });
  ok(true, 'ฉีกแล้วเข้าฉาก "ลุ้น"');
  await p.waitForSelector('#pack-result .card-back', { timeout: 6000 });
  ok(await p.locator('#pack-result .card-back').count() === 5 && await p.locator('.susp-stage').count() === 0, 'ลุ้นจบ → การ์ดคว่ำ 5 ใบรอพลิก');
  // --- ซองหายาก (ระดับสูงสุด = หายาก): ต้องไล่สี t0 → t1 → t2 → burst
  await p.evaluate(() => { EFL.state().shards = 100; document.querySelector('.tab[data-view=shop]').click(); EFL.render && 0; });
  await p.evaluate(() => { const bt = [...document.querySelectorAll('#shop-extra button')].find(x => /ซองหายาก/.test(x.textContent)); bt.click(); });
  await p.waitForSelector('.pack-stage'); await p.click('.pack-stage');
  const seen = new Set(); const t0 = Date.now();
  while (Date.now() - t0 < 6000) { const c = await p.evaluate(() => { const e = document.querySelector('.susp-stage'); return e ? e.className : ''; }); if (c) c.split(' ').forEach(x => seen.add(x)); if (!c && seen.size) break; await p.waitForTimeout(80); }
  ok(seen.has('t0') && seen.has('t1') && seen.has('t2') && seen.has('burst'), 'ซองหายาก: แสงไล่ระดับ ฟ้า→ม่วง→ทอง→ระเบิด (' + [...seen].join(',') + ')');
  ok(await p.evaluate(() => EFL.lastPacks[0].best) === 2, 'ซองหายากมีใบหายาก (best=2)');
  // --- ข้ามฉากลุ้นด้วยการแตะ
  await p.evaluate(() => { EFL.state().shards = 100; const bt = [...document.querySelectorAll('#shop-extra button')].find(x => /ซองหายาก/.test(x.textContent)); bt.click(); });
  await p.waitForSelector('.pack-stage'); await p.click('.pack-stage'); await p.waitForSelector('.susp-stage');
  const tk = Date.now(); await p.click('.susp-stage'); await p.waitForSelector('#pack-result .card-back', { timeout: 4000 }); ok(Date.now() - tk < 3000, 'แตะข้ามฉากลุ้นได้ (' + (Date.now() - tk) + ' ms)');
  // --- 10 ซอง (ไม่มีอนิเมชัน เพื่อเช็คตรรกะ)
  await p.evaluate(() => { EFL.noTear = true; EFL.state().coins = 1000; EFL.state().pity = 0; document.querySelector('.tab[data-view=shop]').click(); });
  const own0 = await p.evaluate(() => Object.values(EFL.state().owned).reduce((s, x) => s + x, 0)), sh0 = await p.evaluate(() => EFL.state().shards);
  await p.click('#btn-pack10'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => EFL.state().coins) === 700, 'เปิด 10 ซอง หัก 300 🪙');
  ok(await p.evaluate(() => EFL.lastPacks.length === 10 && EFL.lastPacks.every(r => r.cards.length === 5 && new Set(r.cards.map(c => c.id)).size === 5)), '10 ซอง ซองละ 5 ใบ ไม่ซ้ำในซอง');
  const after = await p.evaluate(() => ({ own: Object.values(EFL.state().owned).reduce((s, x) => s + x, 0), sh: EFL.state().shards, gain: EFL.lastPacks.reduce((s, r) => s + r.res.gain, 0), news: EFL.lastPacks.reduce((s, r) => s + r.res.news, 0) }));
  ok(after.own - own0 + (after.sh - sh0 > 0 ? 0 : 0) >= 0 && after.sh - sh0 === after.gain, 'ใบซ้ำแปลงเป็นเศษครบ (+' + after.gain + ' ✨) และคลังเพิ่ม ' + (after.own - own0) + ' ใบ');
  // เปิดอัตโนมัติ + ซองถัดไป
  await p.waitForSelector('#pack-next', { timeout: 6000 });
  ok(await p.locator('#pack-result .card-back').count() === 0 && await p.locator('#pack-result .card').count() === 5, 'ซองที่ 1 พลิกอัตโนมัติครบ 5 ใบ');
  await p.click('#pack-next'); await p.waitForSelector('#pack-next', { timeout: 6000 }); ok(/3\/10/.test(await p.textContent('#pack-next')), 'กดถัดไป → ซองที่ 2 → ปุ่มชี้ไปซองที่ 3');
  await p.click('#pack-skip'); await p.waitForTimeout(300);
  ok(/สรุป 10 ซอง \(50 ใบ\)/.test(await p.textContent('#pack-summary')), 'ข้ามไปสรุป: ' + (await p.textContent('#pack-summary')).slice(0, 80));
  const cnt = await p.evaluate(() => { const sum = [...document.querySelectorAll('#pack-result .card')].length; const tot = {}; EFL.lastPacks.forEach(r => r.cards.forEach(c => tot[c.id] = 1)); return { shown: sum, uniq: Object.keys(tot).length }; });
  ok(cnt.shown === cnt.uniq, 'หน้าสรุปรวมใบซ้ำเป็นใบเดียว ×n (' + cnt.shown + ' ใบไม่ซ้ำ)');
  // เงินไม่พอ
  await p.evaluate(() => { EFL.state().coins = 100; }); const c100 = await p.evaluate(() => EFL.state().coins);
  await p.click('#btn-pack10'); ok(await p.evaluate(() => EFL.state().coins) === c100, 'เหรียญไม่พอ 10 ซอง: ไม่หัก/ไม่เปิด');
  // การันตีหายาก: นับต่อเนื่องในชุด 10 ซอง — pity ต้องถูกรีเซ็ตเมื่อได้หายาก และไม่เกิน PITY_AT
  const pt = await p.evaluate(() => { EFL.state().coins = 3000; EFL.state().pity = 0; let worst = 0; for (let i = 0; i < 6; i++) { document.querySelector('#btn-pack10').click(); worst = Math.max(worst, EFL.state().pity); } return worst; });
  ok(pt <= 10, 'การันตีหายากทำงานต่อเนื่อง (pity สูงสุด ' + pt + ' ≤ 10)');
  // 10 ซอง แบบมีอนิเมชัน: ฉีกครั้งเดียว ลุ้นพร้อมตัวนับ + แถบสี
  await p.evaluate(() => { EFL.noTear = false; EFL.state().coins = 1000; });
  await p.click('#btn-pack10'); await p.waitForSelector('.pack-stage'); ok(/×10/.test(await p.textContent('.pack-stage')), 'ฟอยล์ป้าย ×10');
  await p.click('.pack-stage'); await p.waitForSelector('.susp-stage');
  ok(/ซองที่ 1 \/ 10/.test(await p.textContent('.susp-stage')) && await p.locator('.susp-pips i').count() === 10, 'ฉากลุ้นมีตัวนับ 1/10 และแถบสี 10 จุด');
  await p.click('.susp-stage'); await p.waitForSelector('#pack-next', { timeout: 8000 });
  await p.click('#pack-next'); await p.waitForSelector('.susp-stage');
  ok(/ซองที่ 2 \/ 10/.test(await p.textContent('.susp-stage')) && await p.locator('.susp-pips i.p0, .susp-pips i.p1, .susp-pips i.p2').count() === 1, 'ซองที่ 2: จุดสีของซองแรกขึ้นแล้ว');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
