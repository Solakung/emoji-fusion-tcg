/* Emoji Fusion TCG — ส่วนออนไลน์ (Firebase: ล็อกอิน + เซฟบนคลาวด์ + ชื่อผู้เล่น)
   โหลดเป็น ES module แล้วเปิดเป็น window.Online ถ้าโหลดไม่ได้ เกมยังเล่นออฟไลน์ได้ตามปกติ */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, signInAnonymously, EmailAuthProvider, linkWithCredential
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getDatabase, ref, get, set, remove, update, onValue, onChildAdded, runTransaction, query, orderByChild, limitToLast, onDisconnect, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// ค่าฝั่งเว็บของ Firebase เปิดเผยได้ ความปลอดภัยอยู่ที่กฎฐานข้อมูล (docs/firebase-rules.json)
const firebaseConfig = {
  apiKey: 'AIzaSyBhRrxxA9uw3bRosS5YmNHcpp15jA0wXbM',
  authDomain: 'random-ore-generator.firebaseapp.com',
  databaseURL: 'https://random-ore-generator-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'random-ore-generator',
  storageBucket: 'random-ore-generator.firebasestorage.app',
  messagingSenderId: '343960666818',
  appId: '1:343960666818:web:6b5b2794c67e7d7f0bf15b'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const ROOT = 'efl';

const NAME_RE = /^[\p{L}\p{N}_ ]{2,16}$/u;
const nameKey = (n) => n.trim().toLowerCase().replace(/\s+/g, '_');

const ERR = {
  'auth/email-already-in-use': 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน',
  'auth/credential-already-in-use': 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน',
  'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
  'auth/weak-password': 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว',
  'auth/missing-password': 'กรอกรหัสผ่านก่อน',
  'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'auth/wrong-password': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'auth/user-not-found': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'auth/too-many-requests': 'ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่',
  'auth/network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้',
  'auth/operation-not-allowed': 'ยังไม่ได้เปิดวิธีล็อกอินนี้ใน Firebase',
  'PERMISSION_DENIED': 'ไม่มีสิทธิ์ทำรายการนี้ (กฎฐานข้อมูลอาจยังไม่อัปเดต)',
  'room-missing': 'ไม่พบห้องนี้ ตรวจรหัสอีกครั้ง',
  'room-full': 'ห้องนี้เต็มแล้ว',
  'room-self': 'นี่คือห้องของคุณเอง ให้เพื่อนเป็นคนใส่รหัส',
  'room-started': 'ห้องนี้เริ่มเล่นไปแล้ว',
  'need-member': 'โหมดจัดอันดับต้องล็อกอินด้วยอีเมลก่อน',
  'name-taken': 'ชื่อนี้มีคนใช้แล้ว',
  'name-invalid': 'ชื่อต้องยาว 2–16 ตัว ใช้ตัวอักษร ตัวเลข เว้นวรรค หรือ _ เท่านั้น'
};
function fail(e) {
  const code = (e && (e.code || e.message)) || '';
  const err = new Error(ERR[code] || 'เกิดข้อผิดพลาด (' + code + ')');
  err.code = code;
  return err;
}

const Online = {
  ready: true,
  user() { return auth.currentUser; },
  isMember() { const u = auth.currentUser; return !!u && !u.isAnonymous; },
  onAuth(cb) { return onAuthStateChanged(auth, cb); },

  async register(email, password) {
    try {
      const u = auth.currentUser;
      if (u && u.isAnonymous) { // อัปเกรดบัญชีแขกเป็นบัญชีจริง ตัวตนเดิมไม่หาย
        return (await linkWithCredential(u, EmailAuthProvider.credential(email, password))).user;
      }
      return (await createUserWithEmailAndPassword(auth, email, password)).user;
    } catch (e) { throw fail(e); }
  },
  async login(email, password) {
    try { return (await signInWithEmailAndPassword(auth, email, password)).user; } catch (e) { throw fail(e); }
  },
  async guest() {
    try { return (await signInAnonymously(auth)).user; } catch (e) { throw fail(e); }
  },
  async logout() { try { await signOut(auth); } catch (e) { throw fail(e); } },
  async reset(email) {
    try { await sendPasswordResetEmail(auth, email); } catch (e) { throw fail(e); }
  },

  // โปรไฟล์ = ชื่อผู้เล่น (ชื่อไม่ซ้ำกัน จองไว้ที่ efl/names/<ชื่อ>)
  async getProfile(uid) {
    try {
      const s = await get(ref(db, ROOT + '/users/' + uid + '/profile'));
      return s.exists() ? s.val() : null;
    } catch (e) { throw fail(e); }
  },
  async setName(name) {
    const u = auth.currentUser;
    if (!u) throw fail({ code: 'auth/network-request-failed' });
    name = String(name || '').trim().replace(/\s+/g, ' ');
    if (!NAME_RE.test(name)) throw fail({ code: 'name-invalid' });
    const key = nameKey(name);
    try {
      const old = await Online.getProfile(u.uid);
      try { await set(ref(db, ROOT + '/names/' + key), u.uid); }
      catch (e) { throw fail({ code: 'name-taken' }); } // กฎฐานข้อมูลปฏิเสธถ้ามีคนจองแล้ว
      await set(ref(db, ROOT + '/users/' + u.uid + '/profile'), { name: name, key: key, createdAt: (old && old.createdAt) || Date.now() });
      if (old && old.key && old.key !== key) { try { await remove(ref(db, ROOT + '/names/' + old.key)); } catch (e) { /* ไม่เป็นไร */ } }
      return { name: name, key: key };
    } catch (e) { throw e.code ? e : fail(e); }
  },

  // เซฟเกม: เก็บเป็นสตริง JSON หนึ่งก้อน + เวลาแก้ไข
  async loadSave(uid) {
    try {
      const s = await get(ref(db, ROOT + '/users/' + uid + '/save'));
      return s.exists() ? s.val() : null;
    } catch (e) { throw fail(e); }
  },
  async pushSave(uid, data, updatedAt) {
    try { await set(ref(db, ROOT + '/users/' + uid + '/save'), { data: data, updatedAt: updatedAt }); }
    catch (e) { throw fail(e); }
  }
};


/* ---------- ออนไลน์: ห้อง / จับคู่ / ส่งคำสั่ง ---------- */
let offset = 0;
try { onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0; }); } catch (e) { /* ไม่เป็นไร */ }
const now = () => Date.now() + offset;
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 5 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
const pad = (n) => String(n).padStart(4, '0');
const roomRef = (code, sub) => ref(db, ROOT + '/rooms/' + code + (sub ? '/' + sub : ''));
const lobbyRef = (ranked) => ref(db, ROOT + '/lobby/' + (ranked ? 'ranked' : 'casual'));
const hold = {}; // onDisconnect ที่ต้องยกเลิกเมื่อเริ่มเกม

async function who() {
  let u = auth.currentUser;
  if (!u) u = await Online.guest();
  const member = !u.isAnonymous;
  let name = null;
  if (member) { try { const p = await Online.getProfile(u.uid); name = p && p.name; } catch (e) { /* ไม่เป็นไร */ } }
  return { uid: u.uid, name: name || ('แขก' + u.uid.slice(-4).toUpperCase()), member };
}

Object.assign(Online, {
  now,
  who,
  async createRoom(deck, opts) {
    opts = opts || {};
    const me = await who();
    if (opts.ranked && !me.member) throw fail({ code: 'need-member' });
    for (let i = 0; i < 6; i++) {
      const code = genCode();
      const room = {
        host: { uid: me.uid, name: me.name }, status: 'waiting', ranked: !!opts.ranked,
        seed: ((Math.random() * 4294967295) | 0) || 1, first: Math.random() < 0.5 ? 0 : 1,
        createdAt: serverTimestamp(), decks: { [me.uid]: JSON.stringify(deck) }
      };
      try { await set(roomRef(code), room); } catch (e) { if (e && e.code === 'PERMISSION_DENIED' && i < 5) continue; throw fail(e); }
      try { const od = onDisconnect(roomRef(code)); od.remove(); hold[code] = hold[code] || {}; hold[code].room = od; } catch (e) { /* ไม่เป็นไร */ }
      return { code, me };
    }
    throw fail({ code: 'room-missing' });
  },
  async getRoom(code) {
    try { const s = await get(roomRef(String(code).trim().toUpperCase())); return s.exists() ? s.val() : null; }
    catch (e) { throw fail(e); }
  },
  async joinRoom(code, deck) {
    code = String(code || '').trim().toUpperCase();
    const me = await who();
    const room = await Online.getRoom(code);
    if (!room) throw fail({ code: 'room-missing' });
    if (room.host.uid === me.uid) throw fail({ code: 'room-self' });
    if (room.ranked && !me.member) throw fail({ code: 'need-member' });
    const mine = room.guest && room.guest.uid === me.uid;
    if (room.guest && !mine) throw fail({ code: 'room-full' });
    if (!mine) {
      try {
        await set(roomRef(code, 'guest'), { uid: me.uid, name: me.name });
        await set(roomRef(code, 'decks/' + me.uid), JSON.stringify(deck));
      } catch (e) { throw fail(e && e.code === 'PERMISSION_DENIED' ? { code: 'room-full' } : e); }
    }
    return { code, me, room };
  },
  async startGame(code) {
    try { await update(roomRef(code), { status: 'playing', startedAt: serverTimestamp() }); } catch (e) { throw fail(e); }
    Online.release(code);
  },
  release(code) { // เริ่มเล่นแล้ว: ยกเลิกการลบห้อง/ล็อบบี้ตอนหลุด
    const h = hold[code]; if (!h) return;
    try { if (h.room) h.room.cancel(); if (h.lobby) h.lobby.cancel(); } catch (e) { /* ไม่เป็นไร */ }
    delete hold[code];
  },
  async cancelRoom(code, ranked) {
    Online.release(code);
    try {
      await runTransaction(lobbyRef(ranked), (cur) => (cur && cur.code === code) ? null : (cur === undefined ? null : cur));
    } catch (e) { /* ไม่เป็นไร */ }
    try { await remove(roomRef(code)); } catch (e) { /* ไม่เป็นไร */ }
  },
  // จับคู่เร็ว: ถ้ามีคนรออยู่ ให้เข้าห้องเขา ไม่งั้นสร้างห้องแล้วประกาศรอ
  async quick(deck, ranked) {
    const me = await who();
    if (ranked && !me.member) throw fail({ code: 'need-member' });
    for (let i = 0; i < 6; i++) {
      let claimed = null;
      let res;
      try {
        res = await runTransaction(lobbyRef(ranked), (cur) => {
          claimed = null;
          if (cur && cur.uid !== me.uid && now() - cur.t < 180000) { claimed = cur; return null; }
          return cur === undefined ? null : cur;
        });
      } catch (e) { throw fail(e); }
      if (res.committed && claimed) {
        try { const r = await Online.joinRoom(claimed.code, deck); return { role: 'guest', code: r.code, me }; }
        catch (e) { continue; } // ห้องหายหรือเต็มแล้ว ลองใหม่
      }
      const made = await Online.createRoom(deck, { ranked });
      let post;
      try {
        post = await runTransaction(lobbyRef(ranked), (cur) =>
          (!cur || cur.uid === me.uid || now() - cur.t >= 180000) ? { code: made.code, uid: me.uid, t: now() } : undefined);
      } catch (e) { await Online.cancelRoom(made.code, ranked); throw fail(e); }
      if (post.committed) {
        try { const od = onDisconnect(lobbyRef(ranked)); od.remove(); hold[made.code] = hold[made.code] || {}; hold[made.code].lobby = od; } catch (e) { /* ไม่เป็นไร */ }
        return { role: 'host', code: made.code, me };
      }
      try { await remove(roomRef(made.code)); } catch (e) { /* ไม่เป็นไร */ }
    }
    throw fail({ code: 'room-missing' });
  },
  // ฟังการเปลี่ยนแปลงในห้อง: h.state(st) เมื่อ guest/status/decks/startedAt/final/presence เปลี่ยน, h.action(idx, val), h.emote(val)
  listen(code, h) {
    const offs = [], st = {};
    ['host', 'guest', 'status', 'decks', 'startedAt', 'final', 'presence', 'seed', 'first', 'ranked'].forEach((k) => {
      offs.push(onValue(roomRef(code, k), (s) => { st[k] = s.val(); if (h.state) h.state(st, k); }));
    });
    if (h.action) offs.push(onChildAdded(roomRef(code, 'actions'), (s) => h.action(parseInt(s.key, 10), s.val())));
    if (h.emote) offs.push(onChildAdded(roomRef(code, 'emotes'), (s) => h.emote(s.val())));
    return () => offs.forEach((f) => { try { f(); } catch (e) { /* ไม่เป็นไร */ } });
  },
  sendAction(code, idx, by, json, forced) {
    const v = { by: by, a: json, t: serverTimestamp() };
    if (forced) v.forced = true;
    return set(roomRef(code, 'actions/' + pad(idx)), v);
  },
  sendEmote(code, by, e) {
    return set(roomRef(code, 'emotes/' + by + '_' + Date.now()), { by: by, e: e, t: serverTimestamp() });
  },
  async setFinal(code, f) {
    try { await set(roomRef(code, 'final'), { winner: f.winner, reason: f.reason, by: f.by, t: serverTimestamp() }); return true; }
    catch (e) { return false; } // มีผลสรุปอยู่แล้ว
  },
  // สถานะออนไลน์ของเรา (หลุดแล้วเป็น false อัตโนมัติ และตั้งใหม่เมื่อเชื่อมต่อกลับ)
  presence(code) {
    const u = auth.currentUser; if (!u) return () => {};
    const p = roomRef(code, 'presence/' + u.uid);
    return onValue(ref(db, '.info/connected'), (s) => {
      if (s.val() === true) { try { onDisconnect(p).set(false); } catch (e) { /* ไม่เป็นไร */ } set(p, true).catch(() => {}); }
    });
  }
});

Object.assign(Online, {
  // โหวตผู้ชนะของแต่ละฝั่ง (แรงก์จะนับก็ต่อเมื่อทั้งสองฝั่งโหวตตรงกัน)
  async vote(code, uid, winner) {
    try { await set(roomRef(code, 'votes/' + uid), winner); return true; } catch (e) { return false; }
  },
  async getRank(uid) {
    try { const s = await get(ref(db, ROOT + '/ranks/' + uid)); return s.exists() ? s.val() : null; } catch (e) { return null; }
  },
  async leaderboard(n) {
    try {
      const s = await get(query(ref(db, ROOT + '/ranks'), orderByChild('rating'), limitToLast(n || 30)));
      const out = [];
      s.forEach((c) => { out.push(Object.assign({ uid: c.key }, c.val())); });
      return out.reverse();
    } catch (e) { throw fail(e); }
  },
  // อัปเดตแรงก์ของทั้งสองฝั่งจากผลในห้อง (กฎฐานข้อมูลตรวจเงื่อนไขและคะแนนที่เปลี่ยนให้) คืนค่าแรงก์ของเรา
  async applyRanked(code, tries) {
    const me = auth.currentUser; if (!me) return null;
    for (let i = 0; i < (tries || 8); i++) {
      const room = await Online.getRoom(code);
      if (!room || !room.ranked || !room.final || !room.guest) return null;
      const w = room.final.winner;
      let mineNew = null, done = 0;
      for (const side of [0, 1]) {
        const uid = side === 0 ? room.host.uid : room.guest.uid;
        const old = await Online.getRank(uid);
        if (old && old.last === code) { if (uid === me.uid) mineNew = old; done++; continue; }
        const cur = old ? old.rating : 1000;
        const won = w === side, lost = w === 1 - side;
        const rating = won ? cur + 25 : lost ? Math.max(0, cur - 20) : cur;
        let name = null;
        try { const p = await Online.getProfile(uid); name = p && p.name; } catch (e) { /* ไม่เป็นไร */ }
        if (!name) continue;
        const v = { name: name, rating: rating, w: ((old && old.w) || 0) + (won ? 1 : 0), l: ((old && old.l) || 0) + (lost ? 1 : 0), last: code };
        try { await set(ref(db, ROOT + '/ranks/' + uid), v); done++; if (uid === me.uid) mineNew = v; } catch (e) { /* รอโหวตครบแล้วลองใหม่ */ }
      }
      if (mineNew) return mineNew;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return null;
  }
});

window.Online = Online;
window.dispatchEvent(new Event('efl-online'));
