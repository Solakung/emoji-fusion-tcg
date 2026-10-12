# ตั้งค่าออนไลน์ (Firebase)

โปรเจกต์ใช้ Firebase Realtime Database + Authentication (อีเมล/รหัสผ่าน และ Anonymous) ค่า config อยู่ใน `online.js`
(ค่าฝั่งเว็บเปิดเผยได้ ความปลอดภัยอยู่ที่กฎฐานข้อมูล)

1. Authentication → Sign-in method → เปิด **Email/Password** และ **Anonymous**
2. Authentication → Settings → Authorized domains → เพิ่ม `<ชื่อผู้ใช้>.github.io`
3. Realtime Database → Rules → วางเนื้อหา `docs/firebase-rules.json` → Publish (กฎนี้แทนที่กฎเดิมทั้งหมดของโปรเจกต์)

ข้อมูลที่เก็บ (ใต้ `efl/`): `users/<uid>/profile` (ชื่อผู้เล่น), `users/<uid>/save` (การ์ด เหรียญ เด็ค สูตร สถิติ), `names/<ชื่อ>` (จองชื่อไม่ให้ซ้ำ)
บัญชีเก็บอีเมลกับรหัสผ่านที่ Firebase Authentication (รหัสผ่านถูกแฮช ผู้พัฒนาอ่านไม่ได้)
