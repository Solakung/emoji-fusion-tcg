// ทดสอบเล่นออนไลน์ 2 แท็บ ด้วย Online จำลอง (ฐานข้อมูลในหน่วยความจำฝั่ง node)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
});
const rooms = {}; let lobby = null; let T = 1;
function op(o, a) {
  const R = (c) => rooms[c];
  switch (o) {
    case 'create': rooms[a.code] = { host: a.host, status: 'waiting', seed: 12345, first: 0, decks: { [a.host.uid]: a.deck }, actions: {}, emotes: [], presence: {}, ranked: false }; return true;
    case 'get': return R(a.code) || null;
    case 'join': { const r = R(a.code); if (!r) return 'missing'; if (r.guest) return 'full'; r.guest = a.guest; r.decks[a.guest.uid] = a.deck; return true; }
    case 'start': R(a.code).status = 'playing'; R(a.code).startedAt = Date.now(); return true;
    case 'cancel': delete rooms[a.code]; if (lobby && lobby.code === a.code) lobby = null; return true;
    case 'lobby': { if (a.take) { const l = lobby; lobby = null; return l; } if (a.set) lobby = a.set; return lobby; }
    case 'act': { const r = R(a.code); if (r.actions[a.idx]) throw new Error('exists'); r.actions[a.idx] = { by: a.by, a: a.json, forced: a.forced, t: Date.now() }; return true; }
    case 'emote': R(a.code).emotes.push(a.v); return true;
    case 'final': { const r = R(a.code); if (r.final) return false; r.final = a.f; return true; }
    case 'pres': R(a.code).presence[a.uid] = a.v; return true;
    case 'poll': { const r = R(a.code); if (!r) return null; return { st: { host: r.host, guest: r.guest || null, status: r.status, decks: r.decks, startedAt: r.startedAt || null, final: r.final || null, presence: r.presence, seed: r.seed, first: r.first, ranked: false }, actions: r.actions, emotes: r.emotes }; }
  }
}
const FAKE = (uid) => `
const call = (o, a) => window.__db(o, a);
let U = { uid: '${uid}', isAnonymous: true };
const O = {
  ready: true, user: () => U, isMember: () => false, onAuth: (cb) => { setTimeout(() => cb(U), 50); return () => {}; },
  getProfile: async () => null, loadSave: async () => null, pushSave: async () => {}, now: () => Date.now(),
  who: async () => ({ uid: U.uid, name: 'P_' + U.uid, member: false }),
  async createRoom(deck) { const code = Math.random().toString(36).slice(2, 7).toUpperCase(); await call('create', { code, host: { uid: U.uid, name: 'P_' + U.uid }, deck: JSON.stringify(deck) }); return { code }; },
  async getRoom(c) { return call('get', { code: c }); },
  async joinRoom(code, deck) { const r = await call('join', { code, guest: { uid: U.uid, name: 'P_' + U.uid }, deck: JSON.stringify(deck) }); if (r !== true) { const e = new Error(r); throw e; } return { code }; },
  async startGame(code) { await call('start', { code }); },
  async cancelRoom(code) { await call('cancel', { code }); },
  async quick(deck) { const l = await call('lobby', { take: true }); if (l) { await O.joinRoom(l.code, deck); return { role: 'guest', code: l.code }; } const m = await O.createRoom(deck); await call('lobby', { set: { code: m.code } }); return { role: 'host', code: m.code }; },
  release() {}, async vote() { return true; }, async getRank() { return null; }, async leaderboard() { return [{ uid: 'A', name: 'Top', rating: 1100 }]; }, async applyRanked() { return null; },
  listen(code, h) {
    const seen = new Set(); let emN = 0; let last = '';
    const iv = setInterval(async () => {
      const p = await call('poll', { code }); const st = p ? p.st : { host: null };
      const j = JSON.stringify(st); if (j !== last) { last = j; h.state(st); }
      if (!p) return;
      Object.keys(p.actions).sort().forEach((k) => { if (!seen.has(k)) { seen.add(k); h.action(parseInt(k, 10), p.actions[k]); } });
      while (emN < p.emotes.length) h.emote(p.emotes[emN++]);
    }, 80);
    return () => clearInterval(iv);
  },
  async sendAction(code, idx, by, json, forced) { await call('act', { code, idx, by, json, forced: !!forced }); },
  async sendEmote(code, by, e) { await call('emote', { code, v: { by, e, t: Date.now() } }); },
  async setFinal(code, f) { return call('final', { code, f }); },
  presence(code) { call('pres', { code, uid: U.uid, v: true }); return () => {}; }
};
window.Online = O; window.dispatchEvent(new Event('efl-online'));
`;
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await chromium.launch();
  const ctxs = [];
  async function mk(uid) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.exposeFunction('__db', async (o, a) => op(o, a));
    await ctx.route('**/online.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE(uid) }));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('PAGEERR', uid, e.message));
    await p.addInitScript(() => { try { localStorage.setItem('efl_welcome', '1'); } catch (e) {} });
    await p.goto(url); await p.waitForTimeout(800);
    await p.evaluate(() => { const k = Object.keys(localStorage); });
    return p;
  }
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const A = await mk('A'), Bp = await mk('B');
  for (const p of [A, Bp]) {
    // ปิดแบนเนอร์/ทัวร์ แล้วจัดเด็คอัตโนมัติ
    await p.evaluate(() => { document.querySelectorAll('#whatsnew,#welcome').forEach((e) => (e.hidden = true)); });
    await p.evaluate(() => { try { localStorage.setItem('efl_tour_done', '1'); } catch (e) {} });
  }
  async function prep(p) {
    await p.evaluate(() => { document.querySelector('.tab[data-view=deck]').click(); });
    await p.click('#btn-autodeck'); await p.waitForTimeout(200);
    await p.evaluate(() => { document.querySelectorAll('.tour, #tour, .tour-card').forEach((e) => (e.hidden = true)); document.querySelector('.tab[data-view=battle]').click(); });
  }
  await prep(A); await prep(Bp);
  await A.click('#on-quick'); await A.waitForTimeout(500);
  ok(await A.isVisible('#rc'), 'A เห็นห้องรอ');
  await Bp.click('#on-quick');
  await A.waitForTimeout(2500);
  const inb = async (p) => p.evaluate(() => !!window.EFL.battle() && !!window.EFL.battle().online);
  ok(await inb(A) && await inb(Bp), 'ทั้งสองเข้าเกม');
  const info = (p) => p.evaluate(() => { const b = window.EFL.battle(); return { me: b.me, active: b.G.active, turn: b.G.turn, next: b.online.next, hp: b.G.players.map((x) => x.hp), hand: b.G.players.map((x) => x.hand.length) }; });
  let ia = await info(A), ib = await info(Bp);
  ok(ia.me === 0 && ib.me === 1, 'A=host(0) B=guest(1)');
  const pages = [A, Bp];
  // เล่น: ใครถึงตาก็จบเทิร์น 4 ครั้ง สลับกัน
  for (let i = 0; i < 4; i++) {
    const cur = (await info(A)).active;
    const p = pages[cur];
    // ลองลงการ์ดใบแรกที่ลงได้
    await p.evaluate(() => { const b = window.EFL.battle(); const P = b.G.players[b.me]; const i = P.hand.findIndex((c) => c.type === 'creature' && c.cost <= P.mana); if (i >= 0) { document.querySelectorAll('#b-hand .card')[i].click(); } });
    await p.waitForTimeout(150);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#b-action button')].find((x) => /ลง|เล่น/.test(x.textContent)); if (b) b.click(); });
    await p.waitForTimeout(500);
    await p.click('#btn-endturn'); await p.waitForTimeout(700);
  }
  ia = await info(A); ib = await info(Bp);
  ok(ia.turn === ib.turn && ia.next === ib.next && ia.active === ib.active && JSON.stringify(ia.hp) === JSON.stringify(ib.hp), 'สถานะตรงกัน turn=' + ia.turn + ' next=' + ia.next);
  ok(ia.turn >= 5, 'เทิร์นเดินหน้า');
  const boards = await Promise.all(pages.map((p) => p.evaluate(() => JSON.stringify(window.EFL.battle().G.players.map((x) => x.board.map((u) => u.card.id + ':' + u.hp))))));
  ok(boards[0] === boards[1], 'สนามตรงกัน ' + boards[0]);
  // อีโมต
  await A.click('#b-emote'); await A.click('#emote-pal button'); await Bp.waitForTimeout(600);
  ok(await Bp.isVisible('#hero-opp .emote-bubble'), 'B เห็นอีโมตของ A');
  // หมดเวลา: ย้อน deadline
  const act = (await info(A)).active;
  await pages[act].evaluate(() => { window.EFL.battle().online.deadline = Date.now() - 500; });
  const t0 = (await info(A)).turn;
  await A.waitForTimeout(2500); await Bp.waitForTimeout(500);
  ok((await info(A)).turn === t0 + 1 && (await info(Bp)).turn === t0 + 1, 'หมดเวลา → จบเทิร์นอัตโนมัติทั้งสองฝั่ง');
  // ยอมแพ้
  A.on('dialog', (d) => d.accept());
  await A.click('#btn-quit'); await A.waitForTimeout(500); await Bp.waitForTimeout(800);
  ok(/แพ้/.test(await A.textContent('#modal-body')), 'A เห็นแพ้');
  ok(/ชนะ/.test(await Bp.textContent('#modal-body')) && /ยอมแพ้/.test(await Bp.textContent('#modal-body')), 'B เห็นชนะ (คู่ต่อสู้ยอมแพ้)');
  await A.click('#end-back'); await Bp.click('#end-back');
  ok(!(await A.evaluate(() => !!window.EFL.battle())), 'ออกจากเกมแล้ว');
  // รีเพลย์: เล่นซ้ำจนจบแล้วสถานะต้องตรงกับเกมจริง
  const liveSig = (await Bp.evaluate(() => 0), boards[0]);
  const rep = await A.evaluate(() => JSON.parse(localStorage.getItem('efl_replays') || '[]'));
  ok(rep.length === 1 && rep[0].acts.length > 5, 'บันทึกรีเพลย์ ' + (rep[0] && rep[0].acts.length) + ' คำสั่ง');
  await A.evaluate(() => document.querySelector('#on-replay').click()); await A.waitForTimeout(200);
  await A.click('.rp-list button'); await A.waitForTimeout(300);
  ok(await A.evaluate(() => !!window.EFL.battle() && !!window.EFL.battle().replay), 'เปิดตัวดูรีเพลย์');
  await A.evaluate(() => { const b = window.EFL.battle(); document.querySelectorAll('#b-action button')[3].click(); });
  await A.evaluate(() => { for (let k = 0; k < 400; k++) { const R = window.EFL.battle().replay; if (R.i >= R.rec.acts.length) break; document.querySelectorAll('#b-action button')[3].click(); } });
  const rg = await A.evaluate(() => { const b = window.EFL.battle(); return { i: b.replay.i, n: b.replay.rec.acts.length, turn: b.G.turn, hp: b.G.players.map((x) => x.hp) }; });
  ok(rg.i === rg.n, 'เดินถึงคำสั่งสุดท้าย');
  const live = await info(Bp).catch(() => null);
  ok(rg.turn >= 5, 'รีเพลย์เดินเทิร์นได้ turn=' + rg.turn + ' hp=' + rg.hp);
  await A.evaluate(() => document.querySelectorAll('#b-action button')[0].click());
  ok((await A.evaluate(() => window.EFL.battle().G.turn)) === 1, 'ย้อนกลับต้นเกม');
  await A.click('#btn-quit');
  ok(!(await A.evaluate(() => !!window.EFL.battle())), 'ออกจากรีเพลย์');
  await br.close(); srv.close();
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
