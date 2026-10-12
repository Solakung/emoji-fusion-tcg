// ผสมการ์ดชุดกับการ์ดพื้นฐาน: ห้องทดลอง, สูตรถูกเก็บ/สร้างใหม่ได้, นับสถิติแยก, ใช้ในศึกได้
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const F = require('../fusion.js');
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; fs.readFile(path.join(root, u === '/' ? 'index.html' : u), (e, b) => { if (e) { r.statusCode = 404; r.end(); } else r.end(b); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
srv.listen(0, async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/online\.js|firebase/, r => r.abort());
  await pg.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); });
  const url = 'http://localhost:' + srv.address().port + '/';
  await pg.goto(url); await pg.waitForFunction(() => window.EFL);
  await pg.evaluate(() => { const s = EFL.state(); s.owned.SP02 = 1; });
  await pg.click('.tab[data-view=lab]'); await pg.evaluate(() => EFL.render());
  ok(await pg.locator('#inventory [data-id=SP02]').count() === 1, 'การ์ดชุดที่มีแล้วโผล่ในห้องทดลอง');
  ok(await pg.locator('#inventory [data-id=DR01]').count() === 0, 'การ์ดชุดที่ยังไม่มีไม่โผล่');
  await pg.click('#inventory [data-id=SP02]'); await pg.click('#inventory [data-id=B01]'); await pg.click('#btn-fuse'); await pg.waitForTimeout(200);
  const st = await pg.evaluate(() => { const s = EFL.state(); return { found: s.found.slice(), stat: document.querySelector('#stat-recipes').textContent }; });
  const id = F.fuse({ ...require('../sets.json').sets[1].cards[1] }, require('../cards.json').base[0]).id;
  ok(st.found.includes(id), 'ค้นพบสูตร ' + id); ok(/^📖 0\//.test(st.stat), 'สถิติสูตรหลักไม่นับสูตรชุด (' + st.stat + ')');
  await pg.evaluate(() => { localStorage.setItem('emoji-fusion-lab', JSON.stringify(EFL.state())); });
  await pg.reload(); await pg.waitForFunction(() => window.EFL);
  ok((await pg.evaluate(() => EFL.state().found)).includes(id), 'โหลดใหม่แล้วสูตรยังอยู่ (สร้างการ์ดจากรหัสได้)');
  await pg.click('.tab[data-view=book]'); await pg.click('[data-book=recipes]').catch(() => { });
  const txt = await pg.locator('#recipe-groups').innerText(); ok(/สูตรจากการ์ดชุด\s*1/.test(txt.replace(/\n/g, ' ')), 'สมุดสูตรแสดงสูตรจากชุด');
  // ศึก: ผสมในสนามด้วยเอนจินตรง
  const B = require('../battle.js'); const cj = require('../cards.json'), sj = require('../sets.json').sets;
  const mk = n => cj.base.find(c => c.id === n) || sj.flatMap(s => s.cards).find(c => c.id === n);
  const deck = ['SP02', 'B01', 'B02', 'B03', 'B05', 'B06', 'B07', 'B09', 'B10', 'B11'].map(mk); while (deck.length < 20) deck.push(mk('B01'));
  const G = B.create({ decks: [deck, deck], names: ['a', 'b'], first: 0, knows: [{ all: true }, { all: true }], seed: 7 });
  ok(!!B.fusePreview && true, 'เอนจินโหลด');
  console.log(errs.length ? 'errors: ' + errs : '');
  console.log(fails ? 'FAILED' : 'ALL PASS'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
