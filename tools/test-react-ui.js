// ทดสอบหน้าจอ Reaction (วางคว่ำ / หน้าต่างตอบโต้ / ซอง / เด็ค)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0].replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR', e.message)); await p.route('**/online.js*', (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('emoji-fusion-lab-seen', '0.8'); localStorage.setItem('emoji-fusion-lab-tour', '1'); localStorage.setItem('emoji-fusion-lab-welcome', '1'); });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.EFL.noTear = true; });
  // ซอง
  await p.evaluate(() => { window.EFL.state().coins = 5000; document.querySelector('.tab[data-view=shop]').click(); });
  for (let i = 0; i < 40; i++) await p.click('#btn-pack');
  const gotR = await p.evaluate(() => Object.keys(window.EFL.state().owned).filter((k) => /^R0/.test(k) && window.EFL.state().owned[k] > 0).length);
  ok(gotR >= 3, 'เปิดซองได้การ์ดปฏิกิริยา ' + gotR + ' ชนิด');
  // เด็คอัตโนมัติมีปฏิกิริยา
  await p.evaluate(() => document.querySelector('.tab[data-view=deck]').click());
  await p.click('#btn-cleardeck'); await p.click('#btn-autodeck');
  const dk = await p.evaluate(() => window.EFL.state().deck);
  ok(dk.length === 20 && dk.filter((x) => /^R0/.test(x)).length >= 1, 'จัดเด็คอัตโนมัติรวมปฏิกิริยา ' + dk.filter((x) => /^R0/.test(x)).join(','));
  ok(await p.isVisible('#deck-summary'), 'หน้าเด็คแสดงผล');
  // เริ่มสู้
  await p.evaluate(() => { document.querySelector('.tab[data-view=battle]').click(); });
  await p.click('.level[data-level=easy]'); await p.waitForTimeout(400);
  // จัดฉาก: ถึงตาเรา มือมี R01
  await p.evaluate(() => {
    const bs = window.EFL.battle(), G = bs.G, B = window.Battle, d = window.__cards;
    bs.busy = false; G.active = 0; G.players[0].mana = 8; G.players[1].mana = 8;
    const R01 = { id: 'R01', type: 'reaction', speed: 2, emoji: '🌊', name: 'โล่น้ำ', cost: 2, text: 'ยกเลิกการโจมตีของศัตรู' };
    G.players[0].hand = [R01]; G.players[0].sets = [];
    window.EFL.render();
  });
  await p.click('#b-hand .card'); await p.waitForTimeout(100);
  const btnTxt = await p.evaluate(() => [...document.querySelectorAll('#b-action button')].map((x) => x.textContent));
  ok(btnTxt.some((t) => /วางคว่ำ/.test(t)), 'ปุ่มวางคว่ำปรากฏ');
  await p.evaluate(() => [...document.querySelectorAll('#b-action button')].find((x) => /วางคว่ำ/.test(x.textContent)).click());
  await p.waitForTimeout(100);
  ok(await p.evaluate(() => window.EFL.battle().G.players[0].sets.length === 1), 'วางคว่ำสำเร็จ');
  ok(await p.isVisible('#sets-me .set-chip'), 'แสดงชิปการ์ดคว่ำ');
  // บอทโจมตีเรา: เปิดหน้าต่างตอบโต้
  await p.evaluate(() => {
    const bs = window.EFL.battle(), G = bs.G, B = window.Battle, base = window.__base;
  });
  const setup = await p.evaluate(async () => {
    const bs = window.EFL.battle(), G = bs.G, B = window.Battle;
    const cards = await (await fetch('cards.json')).json();
    const quiet = cards.base.filter((c) => c.hp >= 4 && c.atk >= 1 && !c.abilities.some((x) => ['spark', 'firestorm', 'jolt', 'steam', 'sandstorm', 'attract', 'freeze', 'gale', 'taunt', 'guard', 'thorns', 'trap', 'metal'].includes(x.id)) && !(c.keywords || []).includes('evade'));
    G.players[0].board = []; G.players[1].board = [];
    G.players[0].hand = [quiet[0]]; G.players[1].hand = [quiet[1]];
    B.apply(G, 0, { t: 'play', hand: 0 });
    G.active = 1; G.players[1].mana = 8; B.apply(G, 1, { t: 'play', hand: 0 });
    const mine = G.players[0].board[0], bot = G.players[1].board[0]; bot.attacksLeft = 1;
    const hp = mine.hp; G.players[0].mana = 8;
    const r = B.apply(G, 1, { t: 'attack', unit: bot.uid, target: mine.uid });
    window.EFL.render();
    return { ok: r.ok, pend: !!G.pending, resp: G.pending && G.pending.resp, hp, uid: mine.uid };
  });
  ok(setup.ok && setup.pend && setup.resp === 0, 'บอทโจมตี → เปิดหน้าต่างตอบโต้ให้เรา');
  ok(await p.isVisible('#react-pop'), 'ป๊อปอัปตอบโต้แสดง');
  const popTxt = await p.textContent('#react-pop');
  ok(/โล่น้ำ/.test(popTxt) && /ผ่าน/.test(popTxt), 'ป๊อปอัปมีตัวเลือก โล่น้ำ + ผ่าน');
  await p.evaluate(() => [...document.querySelectorAll('#react-pop button')].find((x) => /โล่น้ำ/.test(x.textContent)).click());
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => { const G = window.EFL.battle().G; return { pend: !!G.pending, hp: G.players[0].board[0] && G.players[0].board[0].hp, sets: G.players[0].sets.length, mana: G.players[0].mana }; });
  ok(!after.pend && after.hp === setup.hp && after.sets === 0 && after.mana === 6, 'เปิดโล่น้ำ → ยกเลิกการโจมตี (HP เท่าเดิม, Mana −2)');
  ok(!(await p.isVisible('#react-pop')), 'ป๊อปอัปปิดหลังตอบ');
  // ผ่าน
  const pass = await p.evaluate(() => {
    const bs = window.EFL.battle(), G = bs.G, B = window.Battle;
    const R04 = { id: 'R04', type: 'reaction', speed: 2, emoji: '🌩️', name: 'ฟ้าแลบ', cost: 2, text: 'x' };
    G.players[0].sets = [R04]; G.players[0].mana = 8; G.active = 1;
    const bot = G.players[1].board[0], mine = G.players[0].board[0]; bot.attacksLeft = 1; const hp = mine.hp;
    B.apply(G, 1, { t: 'attack', unit: bot.uid, target: mine.uid }); window.EFL.render();
    return { hp, pend: !!G.pending };
  });
  ok(pass.pend, 'หน้าต่างเปิดอีกครั้ง');
  await p.evaluate(() => [...document.querySelectorAll('#react-pop button')].find((x) => x.textContent === 'ผ่าน').click());
  await p.waitForTimeout(300);
  ok(await p.evaluate((hp) => { const G = window.EFL.battle().G; return !G.pending && G.players[0].board[0].hp < hp; }, pass.hp), 'กดผ่าน → การโจมตีมีผล');
  await b.close(); srv.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
