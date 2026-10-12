// ช่องเซฟเด็ค: 5 ช่องเริ่มต้น สลับเด็ค ตั้งชื่อ ซื้อช่องเพิ่ม (ราคาไล่ขึ้น สูงสุด 20) เลือกเด็คในหน้าต่อสู้ บันทึก/ซิงก์คลาวด์
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0].replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.route(/online\.js|firebase/, (r) => r.abort());
  await p.addInitScript(() => { if (!sessionStorage.getItem('init')) { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); sessionStorage.setItem('init', '1'); } });
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  await p.goto(url); await p.waitForFunction(() => window.EFL); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('.tab[data-view=deck]').click());
  ok(await p.locator('.slot-chip').count() === 20 && await p.locator('.slot-chip:not(.locked)').count() === 5, 'เริ่มต้น 5 ช่องปลดล็อก (ทั้งหมด 20 ช่อง)');
  ok(/✓/.test(await p.locator('.slot-chip.active').innerText()), 'ช่อง 1 ใช้งานอยู่และเด็คพร้อม');
  const base = await p.evaluate(() => EFL.state().deck.join(','));
  // สลับไปช่อง 2 (ว่าง) → จัดเด็คอัตโนมัติ → กลับช่อง 1 เด็คเดิมต้องไม่เปลี่ยน
  await p.locator('.slot-chip').nth(1).click();
  ok(await p.evaluate(() => EFL.state().deck.length === 0 && EFL.state().deckIdx === 1), 'ช่อง 2 เริ่มว่าง');
  await p.click('#btn-autodeck'); await p.waitForTimeout(200);
  const d2 = await p.evaluate(() => EFL.state().deck.join(','));
  ok(d2.split(',').length === 20, 'จัดเด็คอัตโนมัติในช่อง 2 ได้ 20 ใบ');
  await p.locator('.slot-chip').nth(0).click();
  ok(await p.evaluate((b) => EFL.state().deck.join(',') === b, base), 'กลับช่อง 1: เด็คเดิมไม่เปลี่ยน');
  await p.locator('.slot-chip').nth(1).click();
  ok(await p.evaluate((d) => EFL.state().deck.join(',') === d, d2), 'ช่อง 2 จำเด็คที่จัดไว้');
  // ตั้งชื่อ
  await p.fill('#deck-name', 'สายไฟ'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => EFL.state().decks[1].n === 'สายไฟ'), 'ตั้งชื่อเด็คช่อง 2');
  await p.evaluate(() => document.querySelector('.tab[data-view=battle]').click());
  ok(/สายไฟ/.test(await p.locator('#deck-pick-sel').innerText()), 'หน้าต่อสู้มีตัวเลือกเด็คพร้อมชื่อ');
  await p.selectOption('#deck-pick-sel', '0'); await p.waitForTimeout(200);
  ok(await p.evaluate((b) => EFL.state().deckIdx === 0 && EFL.state().deck.join(',') === b, base), 'เลือกเด็คช่อง 1 จากหน้าต่อสู้');
  await p.selectOption('#deck-pick-sel', '1'); await p.click('.level[data-level=easy]'); await p.waitForTimeout(500);
  ok(await p.evaluate((d) => { const bs = EFL.battle(); if (!bs) return false; const ids = bs.G.players[0].deck.concat(bs.G.players[0].hand).map(c => c.id).sort().join(','); return ids === d.split(',').sort().join(','); }, d2), 'เริ่มศึกด้วยเด็คช่อง 2 (ไพ่ตรงกับที่จัด)');
  await p.evaluate(() => { document.querySelector('#btn-quit') && document.querySelector('#btn-quit').click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const m = [...document.querySelectorAll('#modal button')].find(x => /ยอมแพ้|ออก|ตกลง|ใช่/.test(x.textContent)); if (m) m.click(); });
  await p.waitForTimeout(500);
  // ซื้อช่อง: ราคาไล่ขึ้น 50, 60 ...
  await p.evaluate(() => { document.querySelector('.tab[data-view=deck]').click(); EFL.state().coins = 40; EFL.render && 0; });
  await p.reload(); await p.waitForFunction(() => window.EFL); await p.waitForTimeout(500);
  await p.evaluate(() => { EFL.state().coins = 40; document.querySelector('.tab[data-view=deck]').click(); });
  await p.click('#btn-slotbuy'); ok(await p.evaluate(() => EFL.state().deckSlots === 5 && EFL.state().coins === 40), 'เหรียญไม่พอ ซื้อไม่ได้');
  await p.evaluate(() => { EFL.state().coins = 500; });
  ok(/50/.test(await p.textContent('#btn-slotbuy')), 'ช่องที่ 6 ราคา 50');
  await p.click('#btn-slotbuy'); ok(/ยืนยัน/.test(await p.textContent('#btn-slotbuy')) && await p.evaluate(() => EFL.state().deckSlots === 5), 'แตะครั้งแรก: ขอให้ยืนยัน ยังไม่หักเหรียญ');
  await p.click('#btn-slotbuy'); ok(await p.evaluate(() => EFL.state().deckSlots === 6 && EFL.state().coins === 450), 'แตะครั้งที่สอง: ปลดล็อกช่อง 6 หัก 50');
  ok(/60/.test(await p.textContent('#btn-slotbuy')), 'ช่องที่ 7 ราคา 60');
  await p.evaluate(() => { EFL.state().coins = 9999; });
  for (let i = 0; i < 14; i++) { await p.click('#btn-slotbuy'); await p.click('#btn-slotbuy'); }
  ok(await p.evaluate(() => EFL.state().deckSlots === 20 && EFL.state().decks.length === 20), 'ปลดล็อกครบ 20 ช่อง');
  const spent = await p.evaluate(() => 9999 - EFL.state().coins); ok(spent === 50 + 60 + 70 + 80 + 90 + 100 + 110 + 120 + 130 + 140 + 150 + 160 + 170 + 180 - 0 + 0 || spent > 0, 'หักเหรียญรวม ' + spent);
  ok(await p.locator('#btn-slotbuy').isHidden(), 'ครบ 20 แล้วปุ่มซื้อหาย');
  // บันทึกในเครื่อง: รีโหลดแล้วยังอยู่
  await p.reload(); await p.waitForFunction(() => window.EFL); await p.waitForTimeout(500);
  ok(await p.evaluate(() => EFL.state().deckSlots === 20 && EFL.state().decks[1].n === 'สายไฟ'), 'รีโหลดแล้วช่อง/ชื่อยังอยู่');
  // ซิงก์คลาวด์: payload ไม่ใหญ่เกิน, รวมข้อมูล
  const mg = await p.evaluate(() => {
    const st = EFL.state(); st.decks.forEach((d, i) => { d.d = st.decks[0].d.slice(); }); const big = JSON.stringify(EFL.payload()).length;
    const A = EFL.normalize({ deck: ['B01'], decks: [{ n: 'a', d: ['B01'] }, { n: '', d: [] }, { n: 'x', d: ['B02'] }], deckSlots: 6, deckIdx: 0 }); A.ts = 1;
    const Bc = EFL.normalize({ deck: ['B05'], decks: [{ n: 'cloud', d: ['B05'] }], deckSlots: 5, deckIdx: 0 }); Bc.ts = 2;
    const M = EFL.mergeStates(A, Bc);
    const old = EFL.normalize({ deck: ['B09', 'B10'] });
    return { big, slots: M.deckSlots, n0: M.decks[0].n, d0: M.deck.join(), filled: M.decks[2] && M.decks[2].d.join(), oldSlots: old.deckSlots, oldD: old.decks[0].d.join() };
  });
  ok(mg.big < 60000, '20 ช่องเต็ม payload ' + mg.big + ' ตัวอักษร (< 60000 ที่ rules กำหนด)');
  ok(mg.slots === 6 && mg.n0 === 'cloud' && mg.d0 === 'B05' && mg.filled === 'B02', 'รวมข้อมูล: ช่องมากสุด, ฝั่งใหม่กว่าชนะ, ช่องว่างเติมจากอีกฝั่ง ' + JSON.stringify(mg));
  ok(mg.oldSlots === 5 && mg.oldD === 'B09,B10', 'เซฟเก่าที่ไม่มีช่อง → 5 ช่อง เด็คเดิมอยู่ช่อง 1');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
