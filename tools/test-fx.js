// เอฟเฟกต์อัญเชิญ/ผสม/เวทย์: โผล่ แล้วหายเอง ไม่บังการกด และเวลาออนไลน์หยุดนับระหว่างเอฟเฟกต์
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
  await p.evaluate(async () => { const d = await (await fetch('cards.json')).json(); window.__base = d.base.concat(d.extras); const s = EFL.state(); d.base.forEach(c => s.owned[c.id] = 3); document.querySelector('.tab[data-view=deck]').click(); });
  await p.click('#btn-cleardeck'); await p.click('#btn-autodeck');
  await p.evaluate(() => document.querySelector('.tab[data-view=battle]').click());
  await p.click('.level[data-level=easy]'); await p.waitForTimeout(500);
  const r = await p.evaluate(async () => {
    const E = window.EFL, bs = E.battle(), G = bs.G, P = G.players[0], O = G.players[1], base = window.__base, C = id => base.find(c => c.id === id);
    const sleep = ms => new Promise(r => setTimeout(r, ms)), out = {};
    bs.busy = false; G.active = 0; G.pending = null; P.mana = P.maxMana = 10; P.fusionsLeft = 2; O.board = []; P.board = [];
    P.hand = [C('B05'), C('B09'), C('B02'), C('S01')].filter(Boolean); if (!P.hand.length) return { err: 'no hand' };
    E.render(); await sleep(50);
    E.act({ t: 'play', hand: 0 }); out.land = !!document.querySelector('#board-me .fx-land'); await sleep(300); out.fxEls = document.querySelectorAll('.fx').length; out.busy1 = bs.fxUntil > Date.now();
    await sleep(900); out.fxGone = document.querySelectorAll('.fx').length;
    E.act({ t: 'play', hand: 0 }); await sleep(800);
    out.board = P.board.length;
    // ผสม
    const us = P.board; const t0 = Date.now();
    E.act({ t: 'fuse', a: us[0].uid, b: us[1].uid, x: true });
    out.ghost = document.querySelectorAll('.fx-ghost').length; out.hidden = !!document.querySelector('#board-me .fx-hide');
    out.fusedBoard = P.board.length; await sleep(1300);
    out.afterHidden = !!document.querySelector('#board-me .fx-hide'); out.fxLeft = document.querySelectorAll('.fx').length;
    // เวทย์ (S01 ดาเมจใส่ศัตรู)
    const si = P.hand.findIndex(c => c.type === 'spell');
    if (si >= 0) { const sc = P.hand[si]; const need = window.Battle.needsTarget(sc); E.act({ t: 'play', hand: si, target: need ? 'opp' : undefined }); await sleep(80); out.cardpop = !!document.querySelector('.fx-cardpop'); await sleep(1700); out.spellLeft = document.querySelectorAll('.fx').length; }
    return out;
  });
  console.log(JSON.stringify(r));
  ok(r.land, 'ลงการ์ด: การ์ดตกลงช่อง (fx-land)'); ok(r.fxEls > 0 && r.busy1, 'ลงการ์ด: มีเลเยอร์เอฟเฟกต์'); ok(r.fxGone === 0, 'เอฟเฟกต์หายเอง');
  ok(r.board === 2, 'ลงครบ 2 ใบ'); ok(r.ghost >= 2, 'ผสม: แม่ 2 ใบพุ่งเข้าหากัน'); ok(r.hidden, 'ผสม: ลูกซ่อนจนกว่าจะวาบ'); ok(r.fusedBoard === 1, 'ผสมสำเร็จ'); ok(!r.afterHidden && r.fxLeft === 0, 'ผสม: ลูกโผล่แล้วเอฟเฟกต์หายหมด');
  if (r.cardpop !== undefined) { ok(r.cardpop, 'เวทย์: การ์ดเด้งกลางจอ'); ok(r.spellLeft === 0, 'เวทย์: เอฟเฟกต์หายเอง'); }
  // โจมตี + ตาย
  const ad = await p.evaluate(async () => {
    const E = EFL, bs = E.battle(), G = bs.G, P = G.players[0], O = G.players[1], C = id => window.__base.find(c => c.id === id), sleep = ms => new Promise(r => setTimeout(r, ms)), out = {};
    bs.online = null; bs.busy = false; G.active = 0; G.pending = null; P.mana = P.maxMana = 10; O.mana = O.maxMana = 10; P.board = []; O.board = []; P.hand = [C('B05')]; O.hand = [C('B01')]; P.sets = []; O.sets = [];
    E.render(); await sleep(50); E.act({ t: 'play', hand: 0 }); await sleep(1000);
    G.active = 1; G.pending = null; E.render(); window.Battle.apply(G, 1, { t: 'play', hand: 0 }); E.render(); await sleep(1000);
    G.active = 0; const me = P.board[0], en = O.board[0]; me.hp = 9; me.baseMax = 9; me.attacksLeft = 1; me.attacked = false; me.rushTurn = 0; en.hp = 1; E.render(); await sleep(50);
    E.act({ t: 'attack', unit: me.uid, target: en.uid }); await sleep(60);
    out.lunge = !!document.querySelector('.fx-lunge'); await sleep(200); out.slash = !!document.querySelector('.fx-slash');
    await sleep(250); out.die = !!document.querySelector('.fx-die'); out.enemyGone = O.board.length === 0;
    await sleep(1500); out.left = document.querySelectorAll('.fx').length; out.lungeLeft = !!document.querySelector('.fx-lunge');
    return out;
  });
  console.log(JSON.stringify(ad));
  ok(ad.lunge, 'โจมตี: ผู้โจมตีพุ่งเข้าใส่'); ok(ad.slash, 'โจมตี: เอฟเฟกต์ฟันที่เป้าหมาย'); ok(ad.enemyGone ? ad.die : true, 'ตาย: การ์ดสลายพร้อมประกาย'); ok(ad.left === 0 && !ad.lungeLeft, 'โจมตี/ตาย: เอฟเฟกต์หายหมด');
  // เวลาออนไลน์หยุดนับระหว่างเอฟเฟกต์ (จำลองด้วยการวางการ์ดตรงๆ แล้ว render)
  const tz = await p.evaluate(async () => {
    const bs = EFL.battle(), G = bs.G, P = G.players[0], sleep = ms => new Promise(r => setTimeout(r, ms));
    bs.online = { deadline: Date.now() + 90000, pdl: Date.now() + 15000, timer: null, lastActive: 0 }; const d0 = bs.online.deadline;
    P.board = []; EFL.render(); await sleep(50);
    const C = id => window.__base.find(c => c.id === id); P.hand = [C('B05')]; P.mana = 10; G.active = 0; G.pending = null; bs.busy = false;
    window.Battle.apply(G, 0, { t: 'play', hand: 0 }); EFL.render(); await sleep(30);
    const during = !!bs.fz; const lab1 = document.querySelector('#b-turn') ? document.querySelector('#b-turn').textContent : '';
    await sleep(900);
    return { during, after: !bs.fz, shift: bs.online.deadline - d0 };
  }).catch(e => ({ err: String(e) }));
  ok(tz.during, 'ออนไลน์: เอฟเฟกต์เริ่ม → เวลาหยุดนับ'); ok(tz.after && tz.shift > 300, 'ออนไลน์: เอฟเฟกต์จบ → บวกเวลาที่หยุดคืน (' + tz.shift + 'ms)');
  ok(errs.length === 0, 'ไม่มี error: ' + errs.join('|'));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
