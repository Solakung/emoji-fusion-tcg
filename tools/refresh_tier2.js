// คำนวณสถิติการ์ดผสมขั้น 2 ใน cards.json ใหม่จากการ์ดพื้นฐาน (ใช้หลังแก้ ATK/HP/Cost ของการ์ดพื้นฐาน)
// ใช้: node tools/refresh_tier2.js   (จากนั้นรัน node tools/test-fusion.js)
const fs = require('fs'), path = require('path'); const F = require('../fusion.js');
const file = path.join(__dirname, '..', 'cards.json'); const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const base = {}; d.base.forEach(c => base[c.id] = c); let n = 0;
d.tier2.forEach(t => { const r = F.fuse(base[t.parents[0]], base[t.parents[1]]); ['atk', 'hp', 'cost'].forEach(k => { if (t[k] !== r[k]) { t[k] = r[k]; n++; } }); });
fs.writeFileSync(file, JSON.stringify(d, null, 1)); console.log('อัปเดตค่าในการ์ดผสม', n, 'จุด');
