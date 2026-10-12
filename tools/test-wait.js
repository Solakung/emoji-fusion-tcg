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
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.exposeFunction('__db', async (o, a) => op(o, a));
  await ctx.route('**/online.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE('A') }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('efl_welcome', '1'); localStorage.setItem('efl_tour_done', '1'); localStorage.setItem('emoji-fusion-lab-seen', '0.8'); } catch (e) {} });
  await p.goto(url); await p.waitForTimeout(800);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  await p.evaluate(() => { document.querySelectorAll('#whatsnew,#welcome').forEach((e) => (e.hidden = true)); });
  await p.evaluate(() => document.querySelector('.tab[data-view=deck]').click()); await p.click('#btn-autodeck'); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('.tab[data-view=battle]').click());
  await p.click('#on-quick'); await p.waitForTimeout(1500);
  ok(await p.isVisible('#rc-time'), 'มีตัวนับเวลารอ');
  const t1 = await p.textContent('#rc-time'); ok(/รอมาแล้ว 0:0\d/.test(t1), 'เริ่มนับ: ' + t1);
  ok(!(await p.isVisible('#rc-bot')), 'ยังไม่เสนอบอทก่อน 60 วินาที');
  // เร่งเวลา: ปรับ Date.now ให้เดินเร็วขึ้น 65 วินาที
  await p.evaluate(() => { const o = Date.now; Date.now = () => o() + 65000; });
  await p.waitForTimeout(1300);
  ok(await p.isVisible('#rc-bot'), 'หลัง 60 วินาที เสนอเล่นกับบอท');
  await p.click('#rc-keep'); ok(!(await p.isVisible('#rc-bot')), 'กดรอต่อ → ข้อเสนอหาย');
  ok(/รอมาแล้ว 1:/.test(await p.textContent('#rc-time')), 'ตัวนับเดินต่อ');
  // ห้องว่างหลังยกเลิก
  await p.click('#rc-cancel'); await p.waitForTimeout(300);
  ok(Object.keys(rooms).length === 0, 'ยกเลิกแล้วห้องถูกลบ');
  // รอบสอง: เลือกเล่นกับบอท
  await p.click('#on-quick'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const o = Date.now; Date.now = () => o() + 65000; }); await p.waitForTimeout(1300);
  await p.click('#rc-bot'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!window.EFL.battle() && !window.EFL.battle().online), 'เริ่มศึกกับบอท (ไม่ออนไลน์)');
  ok(Object.keys(rooms).length === 0, 'ห้องรอถูกลบเมื่อไปสู้บอท');
  ok(!errs.length, 'ไม่มี error ' + errs);
  console.log(fails ? 'FAILED' : 'ALL PASS'); await br.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
