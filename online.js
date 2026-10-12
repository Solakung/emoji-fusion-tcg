/* Emoji Fusion TCG — ส่วนออนไลน์ (Firebase: ล็อกอิน + เซฟบนคลาวด์ + ชื่อผู้เล่น)
   โหลดเป็น ES module แล้วเปิดเป็น window.Online ถ้าโหลดไม่ได้ เกมยังเล่นออฟไลน์ได้ตามปกติ */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, signInAnonymously, EmailAuthProvider, linkWithCredential
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, get, set, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

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

window.Online = Online;
window.dispatchEvent(new Event('efl-online'));
