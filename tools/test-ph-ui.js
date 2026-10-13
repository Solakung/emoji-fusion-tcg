// ชุดทดลอง: ล็อกตามบัญชี (อีเมลแฮช) — คนอื่นไม่เห็น/ไม่มี · เจ้าของได้ครบ ใช้ในเด็ค สมุด ห้องทดลอง · สู้บอทได้
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
  const hasPH = () => p.evaluate(() => Object.keys(EFL.state().owned).filter(k => /^PH/.test(k) && EFL.state().owned[k] > 0).length);
  ok(await p.evaluate(() => EFL.phx().cards.length === 12 && EFL.phx().extras.length === 7), 'โหลดข้อมูลชุดทดลองครบ (12 + 7) ให้ทุกคนจำลองเกมได้');
  ok(await hasPH() === 0, 'ผู้เล่นทั่วไป: ไม่มีการ์ดชุดทดลอง');
  await p.evaluate(() => EFL.phCheck({ email: 'someone@example.com', isAnonymous: false })); await p.waitForTimeout(200);
  ok(await hasPH() === 0 && !(await p.evaluate(() => EFL.phx().owner)), 'ล็อกอินอีเมลอื่น: ยังไม่ได้');
  await p.evaluate(() => EFL.phCheck({ email: 'Spiritual936@gmail.com ', isAnonymous: false })); await p.waitForTimeout(300);
  ok(await hasPH() === 19 && await p.evaluate(() => EFL.phx().owner), 'เจ้าของ: ได้การ์ดครบ 19 ชนิด');
  ok(await p.evaluate(() => EFL.state().owned.PHR1 === 2 && EFL.state().owned.PH01 === 2), 'จำนวนสำเนาตามกฎเกม (ใบละ 2)');
  // เด็ค
  await p.evaluate(() => document.querySelector('.tab[data-view=deck]').click()); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !!document.querySelector('#deck-pool .card[data-id=PH12], #deck-pool .card')) && (await p.$$eval('#deck-pool .card', es => es.length)) > 30, 'คลังการ์ดในหน้าเด็ครวมการ์ดชุดทดลอง');
  await p.evaluate(() => { const s = EFL.state(); s.deck = []; const ids = 'PH01 PH01 PH02 PH02 PH03 PH04 PH06 PH07 PH07 PH09 PH10 PH11 PH12 PHS1 PHS1 PHS3 PHS5 PHS4 PHF1 PHR1'.split(' '); s.deck = ids; });
  ok(await p.evaluate(() => { const s = EFL.state(); return s.deck.length === 20; }), 'ใส่เด็คฟินิกส์ครบ 20 ใบ');
  // สมุด + ห้องทดลอง
  await p.evaluate(() => { document.querySelector('.tab[data-view=book]').click(); document.querySelector('[data-book=cards]').click(); }); await p.waitForTimeout(200);
  ok(/ชุดทดลอง/.test(await p.textContent('#col-sets')) && (await p.$$eval('#col-sets .grid:first-of-type .card', e => e.length)) === 19, 'สมุดการ์ด: ขึ้นหมวกชุดทดลอง 19 ใบ');
  await p.evaluate(() => document.querySelector('.tab[data-view=lab]').click()); await p.waitForTimeout(150);
  ok((await p.$$eval('#inventory .card[data-id^=PH]', e => e.length)) === 12, 'ห้องทดลอง: ผสมตัวละครฟินิกส์ได้ (12 ใบ)');
  // สู้บอท
  await p.evaluate(() => { document.querySelector('.tab[data-view=battle]').click(); }); await p.click('.level[data-level=easy]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => { const G = EFL.battle().G; return G.players[0].deck.concat(G.players[0].hand).filter(c => /^PH/.test(c.id)).length === 20; }), 'สู้บอทด้วยเด็คฟินิกส์ได้');
  // ออกจากบัญชี: ถูกลบ
  await p.evaluate(() => { const bsx = EFL.battle(); });
  await p.evaluate(() => EFL.phCheck(null)); await p.waitForTimeout(200);
  ok(await hasPH() === 0 && await p.evaluate(() => !EFL.state().deck.some(id => /^PH/.test(id))), 'ออกจากบัญชี: การ์ดชุดทดลองถูกเอาออกจากคลังและเด็ค');
  ok(errs.length === 0, 'ไม่มี error: ' + errs.join('|'));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
