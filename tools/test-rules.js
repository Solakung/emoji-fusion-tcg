// ตัวจำลองกฎ Firebase แบบย่อ (ไม่ต้องใช้แพ็กเกจ) เพื่อทดสอบกฎสำคัญของห้อง/แรงก์
const rules = require('../docs/firebase-rules.json').rules;
class Snap {
  constructor(tree, p) { this.t = tree; this.p = p; }
  get v() { let x = this.t; for (const k of this.p) { if (x == null || typeof x !== 'object') return null; x = x[k]; } return x === undefined ? null : x; }
  child(path) { return new Snap(this.t, this.p.concat(String(path).split('/').filter(Boolean))); }
  val() { return this.v; } exists() { return this.v !== null; }
  isString() { return typeof this.v === 'string'; } isNumber() { return typeof this.v === 'number'; } isBoolean() { return typeof this.v === 'boolean'; }
  hasChildren(ks) { const v = this.v; return v && typeof v === 'object' && (!ks || ks.every((k) => v[k] !== undefined && v[k] !== null)); }
}
function setPath(tree, path, val) {
  const t = JSON.parse(JSON.stringify(tree)); let x = t;
  path.slice(0, -1).forEach((k) => { if (typeof x[k] !== 'object' || x[k] === null) x[k] = {}; x = x[k]; });
  if (val === null) delete x[path[path.length - 1]]; else x[path[path.length - 1]] = val; return t;
}
function ev(expr, ctx) {
  const names = Object.keys(ctx);
  const f = new Function(...names, 'String', 'return (' + expr.replace(/\.length\b/g, '.length') + ');');
  return f(...names.map((n) => ctx[n]), String);
}
function can(db, auth, path, val) {
  const parts = path.split('/').filter(Boolean);
  const after = setPath(db, parts, val);
  let node = rules, vars = {}, granted = false;
  for (let i = 0; i <= parts.length; i++) {
    if (i > 0) {
      const k = parts[i - 1];
      if (node[k]) node = node[k]; else { const w = Object.keys(node).find((x) => x[0] === '$'); if (!w) { node = null; break; } vars[w] = k; node = node[w]; }
    }
    const here = parts.slice(0, i);
    const ctx = Object.assign({}, vars, { auth, root: new Snap(db, []), data: new Snap(db, here), newData: new Snap(after, here) });
    if (node[".write"] && ev(node[".write"], ctx)) granted = true;
    if (node[".validate"] && !ev(node[".validate"], ctx)) return false;
  }
  return granted;
}
let fails = 0; const t = (m, got, want) => { const ok = got === want; if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
const H = { uid: 'H' }, G = { uid: 'G' }, X = { uid: 'X' };
const room = (extra) => Object.assign({ host: { uid: 'H', name: 'hh' }, guest: { uid: 'G', name: 'gg' }, status: 'playing', ranked: true, decks: {}, startedAt: 1 }, extra);
let db = { efl: { users: { H: { profile: { name: 'Hname', key: 'hname' } }, G: { profile: { name: 'Gname', key: 'gname' } } }, rooms: { ABCDE: room({}) } } };
t('G เขียนเด็คตัวเองได้', can(db, G, 'efl/rooms/ABCDE/decks/G', '{}'), true);
t('X เขียนเด็คในห้องคนอื่นไม่ได้', can(db, X, 'efl/rooms/ABCDE/decks/X', '{}'), false);
t('X แอบเขียน action ไม่ได้', can(db, X, 'efl/rooms/ABCDE/actions/0000', { by: 0, a: '{}', t: 1 }), false);
t('host เขียน action by=0', can(db, H, 'efl/rooms/ABCDE/actions/0000', { by: 0, a: '{"t":"end"}', t: 1 }), true);
t('host แอบเขียน action by=1', can(db, H, 'efl/rooms/ABCDE/actions/0000', { by: 1, a: '{}', t: 1 }), false);
t('host สั่งแทนเมื่อ forced', can(db, H, 'efl/rooms/ABCDE/actions/0000', { by: 1, a: '{}', t: 1, forced: true }), true);
t('ฟิลด์ index ผิดรูป', can(db, H, 'efl/rooms/ABCDE/actions/1', { by: 0, a: '{}', t: 1 }), false);
db = JSON.parse(JSON.stringify(db)); db.efl.rooms.ABCDE.actions = { '0000': { by: 0, a: 'x', t: 1 } };
t('เขียนทับ action ไม่ได้', can(db, H, 'efl/rooms/ABCDE/actions/0000', { by: 0, a: 'y', t: 1 }), false);
t('final: G ประกาศตัวเองชนะแบบ game ผ่านกฎห้อง', can(db, G, 'efl/rooms/ABCDE/final', { winner: 1, reason: 'game', by: 1 }), true);
t('final: ยอมแพ้แต่ให้ตัวเองชนะ ห้าม', can(db, G, 'efl/rooms/ABCDE/final', { winner: 1, reason: 'resign', by: 1 }), false);
t('final: ยอมแพ้ให้อีกฝั่งชนะ ได้', can(db, G, 'efl/rooms/ABCDE/final', { winner: 0, reason: 'resign', by: 1 }), true);
t('final: dc ต้องให้อีกฝั่งหลุดจริง', can(db, G, 'efl/rooms/ABCDE/final', { winner: 1, reason: 'dc', by: 1 }), false);
db.efl.rooms.ABCDE.presence = { H: false, G: true };
t('final: dc เมื่อ host หลุดจริง', can(db, G, 'efl/rooms/ABCDE/final', { winner: 1, reason: 'dc', by: 1 }), true);
t('final: by ปลอม', can(db, G, 'efl/rooms/ABCDE/final', { winner: 1, reason: 'game', by: 0 }), false);
// แรงก์
const fin = (w, reason) => { const d = JSON.parse(JSON.stringify(db)); d.efl.rooms.ABCDE.final = { winner: w, reason, by: 0 }; return d; };
let d1 = fin(0, 'game');
const rk = (name, rating) => ({ name, rating, w: 0, l: 0, last: 'ABCDE' });
t('แรงก์: ไม่มีโหวต → ไม่ผ่าน', can(d1, H, 'efl/ranks/H', rk('Hname', 1025)), false);
d1.efl.rooms.ABCDE.votes = { H: 0, G: 0 };
t('แรงก์: ผู้ชนะ +25 (ผ่าน)', can(d1, H, 'efl/ranks/H', rk('Hname', 1025)), true);
t('แรงก์: ผู้ชนะ +50 (โกง)', can(d1, H, 'efl/ranks/H', rk('Hname', 1050)), false);
t('แรงก์: ผู้แพ้ −20 เขียนโดยผู้ชนะ (ผ่าน)', can(d1, H, 'efl/ranks/G', rk('Gname', 980)), true);
t('แรงก์: ผู้แพ้ไม่ลด (โกง)', can(d1, G, 'efl/ranks/G', rk('Gname', 1000)), false);
t('แรงก์: ผู้แพ้ให้ตัวเองชนะ (โกง)', can(d1, G, 'efl/ranks/G', rk('Gname', 1025)), false);
t('แรงก์: คนนอกห้อง', can(d1, X, 'efl/ranks/H', rk('Hname', 1025)), false);
t('แรงก์: ชื่อไม่ตรงโปรไฟล์', can(d1, H, 'efl/ranks/H', rk('Fake', 1025)), false);
d1.efl.ranks = { H: rk('Hname', 1025) };
t('แรงก์: นับห้องเดิมซ้ำไม่ได้', can(d1, H, 'efl/ranks/H', rk('Hname', 1050)), false);
let d2 = fin(0, 'game'); d2.efl.rooms.ABCDE.votes = { H: 0, G: 1 };
t('แรงก์: โหวตไม่ตรง → ไม่ผ่าน', can(d2, H, 'efl/ranks/H', rk('Hname', 1025)), false);
let d3 = fin(0, 'resign'); d3.efl.ranks = { G: { name: 'Gname', rating: 10, w: 0, l: 0, last: 'OLD' } };
t('แรงก์: ต่ำสุดไม่ติดลบ', can(d3, H, 'efl/ranks/G', rk('Gname', 0)), true);
let d4 = fin(0, 'game'); d4.efl.rooms.ABCDE.ranked = false; d4.efl.rooms.ABCDE.votes = { H: 0, G: 0 };
t('แรงก์: ห้องไม่ใช่ ranked', can(d4, H, 'efl/ranks/H', rk('Hname', 1025)), false);
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
