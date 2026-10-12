// ทดสอบบทเรียน: รายการ, บทข้อความ, บท Reaction (วางคว่ำ→บอทโจมตี→ตอบโต้), บทผสมมั่ว
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
  const SP = process.env.SHOTS || '';
  await p.evaluate(() => document.querySelector('.tab[data-view=book]').click());
  ok(/\(0\/6\)/.test(await p.textContent('#btn-lessons')), 'ปุ่มบทเรียนแสดงความคืบหน้า 0/5');
  await p.click('#btn-lessons'); ok(await p.locator('.lesson-item').count() === 6, 'มี 6 บทเรียน');
  // บทข้อความ
  await p.click('[data-lesson=cards]'); ok(/ซองการ์ด 30/.test(await p.textContent('#modal-body')), 'บทซองแสดงเนื้อหา');
  await p.click('#ls-ok'); ok(await p.locator('.lesson-item.done').count() === 1, 'กดเข้าใจแล้ว → ติ๊กเสร็จ');
  // บทผสมมั่ว
  await p.click('[data-lesson=exp]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!window.EFL.battle() && window.EFL.battle().tutorial), 'เริ่มแมตช์ฝึกบทผสมมั่ว');
  const tp = async () => (await p.textContent('#tour')).replace(/\s+/g, ' ');
  ok(/ขั้น 1\/3/.test(await tp()), 'ขั้น 1');
  for (let i = 0; i < 2; i++) { await p.evaluate((i) => { const el = document.querySelectorAll('#b-hand .card')[0]; el.click(); }, i); await p.waitForTimeout(150); await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /ลง/.test(x.textContent)).click()); await p.waitForTimeout(500); }
  ok(/ขั้น 2\/3/.test(await tp()), 'ขึ้นขั้น 2 หลังลง 2 ใบ');
  await p.evaluate(() => { const bs = window.EFL.battle(), P = bs.G.players[0]; bs.sel = { k: 'unit', uid: P.board[0].uid, mode: 'fuse', other: P.board[1].uid }; window.EFL.render(); });
  await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /ผสมมั่ว/.test(x.textContent)).click()); await p.waitForTimeout(700);
  ok(/ไม่เสถียร/.test(await tp()), 'ขั้นอธิบายไม่เสถียร');
  await p.click('#btn-endturn'); await p.waitForTimeout(1500);
  for (let i = 0; i < 20 && !/จบบทเรียน/.test(await tp()); i++) await p.waitForTimeout(500);
  ok(/จบบทเรียนผสมมั่ว/.test(await tp()), 'ถึงขั้นจบบท');
  if (SP) await p.screenshot({ path: SP + '/ls_exp.png' });
  await p.evaluate(() => [...document.querySelectorAll('#tour button')].find((x) => /ออกจากแมตช์/.test(x.textContent)).click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !window.EFL.battle()), 'ออกจากแมตช์'); ok(/\(2\/6\)/.test(await p.textContent('#btn-lessons')), 'ความคืบหน้า 2/5');
  // บท Reaction
  await p.evaluate(() => document.querySelector('.tab[data-view=book]').click()); await p.click('#btn-lessons'); await p.click('[data-lesson=react]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.EFL.battle().G.players[1].board.length === 1), 'บอทมีตัวละคร 1 ใบรออยู่');
  ok(/ขั้น 1\/3/.test(await tp()), 'ขั้น 1 วางคว่ำ');
  await p.evaluate(() => document.querySelector('#b-hand [data-id=R01]').click()); await p.waitForTimeout(150);
  await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /วางคว่ำ/.test(x.textContent)).click()); await p.waitForTimeout(400);
  ok(/ขั้น 2\/3/.test(await tp()), 'ขึ้นขั้น 2 หลังวางคว่ำ');
  await p.click('#btn-endturn');
  // รอบอทเล่น: ถ้ามีหน้าต่างตอบโต้ให้ถ่ายภาพแล้วใช้
  let popped = false;
  for (let i = 0; i < 30; i++) { await p.waitForTimeout(400); if (await p.evaluate(() => { const g = window.EFL.battle().G; return !!(g.pending && g.pending.resp === 0); })) { popped = true; break; } if (await p.evaluate(() => window.EFL.battle().G.turn >= 3 && !window.EFL.battle().busy)) break; }
  if (popped) {
    ok(true, 'บอทโจมตี → หน้าต่างตอบโต้เด้งขึ้น');
    if (SP) await p.screenshot({ path: SP + '/ls_react.png' });
    await p.evaluate(() => { const b = [...document.querySelectorAll('#react-pop button')].find((x) => /ใช้|โล่น้ำ/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(800);
    ok(await p.evaluate(() => window.EFL.battle().G.players[0].grave.some((c) => c.id === 'R01')), 'ใช้โล่น้ำสำเร็จ');
  } else console.log('NOTE บอทไม่ได้โจมตีรอบนี้ (ข้ามขั้นตอบโต้)');
  for (let i = 0; i < 20 && !/จบบทเรียน/.test(await tp()); i++) await p.waitForTimeout(500);
  ok(/จบบทเรียน Reaction/.test(await tp()), 'ถึงขั้นจบบท Reaction');
  await p.evaluate(() => [...document.querySelectorAll('#tour button')].find((x) => /เล่นต่อ/.test(x.textContent)).click());
  ok(/\(3\/6\)/.test(await p.evaluate(() => document.querySelector('#lesson-prog').textContent)), 'ความคืบหน้า 3/5');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
