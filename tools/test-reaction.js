// ทดสอบกติกา Reaction (stack / ความเร็ว / fizzle / ความแน่นอนของผล)
const path = require('path');
const B = require(path.join(__dirname, '..', 'battle.js'));
const d = require(path.join(__dirname, '..', 'cards.json'));
const base = d.base, R = {}; d.extras.filter(c => c.type === 'reaction').forEach(c => R[c.id] = c);
let fails = 0; const t = (m, c) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const deck = () => base.slice(0, 20);
function game() {
  const G = B.create({ decks: [deck(), deck()], names: ['A', 'B'], first: 0, seed: 7, knows: [{ all: true }, { all: true }] });
  G.players.forEach(P => { P.hand = []; P.board = []; P.mana = 8; P.maxMana = 8; });
  return G;
}
function put(G, side, card) { const P = G.players[side]; P.hand.push(card); return P.hand.length - 1; }
function unit(G, side, card) { const P = G.players[side]; P.hand.push(card); const i = P.hand.length - 1; P.mana = 8; const g = G.active; G.active = side; B.apply(G, side, { t: 'play', hand: i }); G.active = g; const u = P.board[P.board.length - 1]; u.attacksLeft = 1; return u; }
const quiet = base.filter(c => c.hp >= 4 && c.atk >= 1 && !c.abilities.some(x => ['spark', 'firestorm', 'jolt', 'steam', 'sandstorm', 'attract', 'freeze', 'gale', 'taunt', 'guard', 'thorns', 'trap', 'metal'].includes(x.id)) && !(c.keywords || []).includes('evade'));
const c1 = quiet[0], c2 = quiet[1], c3 = quiet[2];

// 1) โล่น้ำยกเลิกการโจมตี
let G = game(); let a = unit(G, 0, c1), b = unit(G, 1, c2); G.players[1].sets.push(R.R01); G.players[1].mana = 2;
let hp0 = b.hp, hpa = a.hp;
let r = B.apply(G, 0, { t: 'attack', unit: a.uid, target: b.uid });
t('มีหน้าต่างตอบโต้เมื่อฝั่งตรงข้ามมีการ์ดคว่ำที่ใช้ได้', r.ok && G.pending && G.pending.resp === 1);
t('ฝ่ายโจมตีทำอะไรไม่ได้ระหว่างรอ', !B.apply(G, 0, { t: 'end' }).ok);
t('ฝั่งตอบโต้เท่านั้นที่ตอบได้', !B.apply(G, 0, { t: 'pass' }).ok);
r = B.apply(G, 1, { t: 'react', slot: 0 });
t('เปิด R01 แล้วไม่มีใครตอบโต้ต่อ → แก้ผลทันที', r.ok && !G.pending);
t('การโจมตีถูกยกเลิก (ไม่มีใครเสีย HP)', b.hp === hp0 && a.hp === hpa);
t('Mana ถูกหัก + การ์ดไปสุสาน', G.players[1].mana === 0 && G.players[1].sets.length === 0 && G.players[1].grave.includes(R.R01));

// 2) ผ่านแล้วโจมตีเข้า
G = game(); a = unit(G, 0, c1); b = unit(G, 1, c2); G.players[1].sets.push(R.R01); G.players[1].mana = 2;
B.apply(G, 0, { t: 'attack', unit: a.uid, target: b.uid }); B.apply(G, 1, { t: 'pass' });
t('ผ่าน → การโจมตีมีผล', b.hp < c2.hp || a.hp < c1.hp);

// 3) chain: ปกติ → Instant R02 → Hyper R06 ยกเลิก R02
G = game(); a = unit(G, 0, c1); b = unit(G, 1, c2); G.players[1].sets.push(R.R02); G.players[1].mana = 2; G.players[0].sets.push(R.R06); G.players[0].mana = 4;
B.apply(G, 0, { t: 'attack', unit: a.uid, target: b.uid });
B.apply(G, 1, { t: 'react', slot: 0 });
t('หลัง R02 ฝั่ง A ได้สิทธิ์ตอบโต้ด้วย Hyper', G.pending && G.pending.resp === 0 && G.pending.stack.length === 2);
t('Instant ตอบโต้ Hyper ไม่ได้ (ความเร็วต่ำกว่า)', !B.canRespond(G, 1, [{ kind: 'react', side: 0, speed: 3, card: R.R06 }]));
r = B.apply(G, 0, { t: 'react', slot: 0 });
t('R06 เปิดแล้ว chain ปิด', r.ok && !G.pending);
t('R02 ถูกยกเลิก การโจมตียังเกิด', a.hp === c1.hp - (c2.atk + (B.beats(c2.element, c1.element) ? 1 : 0)) || a.hp < c1.hp);

// 4) Hyper ใช้เองในเทิร์นตัวเองไม่ได้ / Instant ใช้ได้
G = game(); unit(G, 1, c2); G.players[0].sets.push(R.R06, R.R04);
t('Hyper ใช้เองไม่ได้', !B.apply(G, 0, { t: 'react', slot: 0 }).ok);
b = G.players[1].board[0]; const hpb = b.hp;
t('Instant ใช้เองในเทิร์นตัวเองได้', B.apply(G, 0, { t: 'react', slot: 1 }).ok && b.hp === hpb - 2);

// 5) ไม่มี Mana พอ → ไม่เปิดหน้าต่าง
G = game(); a = unit(G, 0, c1); b = unit(G, 1, c2); G.players[1].sets.push(R.R01); G.players[1].mana = 1;
r = B.apply(G, 0, { t: 'attack', unit: a.uid, target: b.uid });
t('Mana ไม่พอ → ไม่เปิดหน้าต่าง แก้ผลเลย', r.ok && !G.pending);

// 6) fizzle: ผู้โจมตีตายก่อนแก้ผล
G = game(); a = unit(G, 0, c1); a.hp = 2; b = unit(G, 1, c2); G.players[1].sets.push(R.R04); G.players[1].mana = 2;
const bhp = b.hp;
B.apply(G, 0, { t: 'attack', unit: a.uid, target: b.uid }); B.apply(G, 1, { t: 'react', slot: 0 });
t('ผู้โจมตีตายจากตอบโต้ → การโจมตี fizzle', G.players[0].board.length === 0 && b.hp === bhp);

// 7) เวทย์ถูก R06 ยกเลิก
G = game(); b = unit(G, 1, c2); const S = d.extras.find(c => c.id === 'S01'); const hi = put(G, 0, S); G.players[1].sets.push(R.R06); G.players[1].mana = 4;
const hp1 = G.players[1].hp;
B.apply(G, 0, { t: 'play', hand: hi, target: 'opp' }); B.apply(G, 1, { t: 'react', slot: 0 });
t('เวทย์ถูกยกเลิก ไม่มีดาเมจ แต่ Mana เสียไป', G.players[1].hp === hp1 && !G.pending);

// 8) วางคว่ำ / ช่องเต็ม
G = game(); const i1 = put(G, 0, R.R01), i2 = put(G, 0, R.R02), i3 = put(G, 0, R.R03);
t('วางคว่ำ 2 ใบได้ ใบที่ 3 ไม่ได้', B.apply(G, 0, { t: 'set', hand: 0 }).ok && B.apply(G, 0, { t: 'set', hand: 0 }).ok && !B.apply(G, 0, { t: 'set', hand: 0 }).ok);
t('การ์ดปฏิกิริยาลงด้วย play ไม่ได้', !B.apply(G, 0, { t: 'play', hand: 0 }).ok);

// 9) ผลคงที่ (lockstep): เล่นซ้ำคำสั่งเดิมต้องได้สถานะเดียวกัน
function run(seed) {
  const g = B.create({ decks: [deck().concat([]), deck()], names: ['A', 'B'], seed, first: 0, knows: [{ all: true }, { all: true }] });
  const acts = []; let guard = 0;
  while (!g.over && g.turn < 40 && guard++ < 4000) {
    let side, a;
    if (g.pending) { side = g.pending.resp; a = B.botRespond(g, side, 'medium'); } else { side = g.active; a = B.botAction(g, side, 'medium'); }
    const r = B.apply(g, side, a); if (!r.ok) { B.apply(g, side, g.pending ? { t: 'pass' } : { t: 'end' }); acts.push([side, g.pending ? { t: 'pass' } : { t: 'end' }]); continue; }
    acts.push([side, a]);
  }
  return { g, acts };
}
const run1 = run(99);
const g2 = B.create({ decks: [deck(), deck()], names: ['A', 'B'], seed: 99, first: 0, knows: [{ all: true }, { all: true }] });
run1.acts.forEach(([s, a]) => B.apply(g2, s, a));
t('เล่นซ้ำจาก seed + คำสั่ง ได้สถานะเดียวกัน', JSON.stringify(g2.players.map(p => [p.hp, p.board.length, p.hand.length])) === JSON.stringify(run1.g.players.map(p => [p.hp, p.board.length, p.hand.length])));
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
