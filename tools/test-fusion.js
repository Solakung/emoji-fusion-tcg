// ตรวจว่าสูตรผสมใน fusion.js ให้ผลตรงกับ cards.json (สร้างจาก tools/gen_cards.py) ครบทั้ง 276 สูตร
// ใช้: node tools/test-fusion.js
const path = require('path');
const F = require(path.join(__dirname, '..', 'fusion.js'));
const d = require(path.join(__dirname, '..', 'cards.json'));
const base = {}; d.base.forEach(c => base[c.id] = c);
let bad = 0;
for (const t of d.tier2) {
  const [pa, pb] = t.parents;
  const r = F.fuse(base[pa], base[pb]);
  const same = r.atk === t.atk && r.hp === t.hp && r.cost === t.cost && r.element === t.element &&
    JSON.stringify(r.abilities.map(a => a.id)) === JSON.stringify(t.abilities.map(a => a.id)) && JSON.stringify(r.keywords) === JSON.stringify(t.keywords) && r.tier === 2;
  const rb = F.build(r.id, base), r2 = F.fuse(base[pb], base[pa]);
  if (!same || !rb || rb.id !== r.id || r2.id !== r.id || r2.atk !== r.atk) { bad++; console.log('MISMATCH', t.id); }
}
console.log('ตรวจแล้ว', d.tier2.length, 'สูตร · ไม่ตรง', bad);
process.exit(bad ? 1 : 0);
