/* Emoji Fusion TCG — ตรรกะผสมการ์ด (พอร์ตจาก gen_cards.py v0.2)
   ใช้ได้ทั้งในเบราว์เซอร์ (window.Fusion) และ node (module.exports) */
(function (root) {
  'use strict';

  var CONFIG = { factor: 0.9, costDelta: 0 }; // ตัวคูณค่าพลัง และ Cost = ปัดขึ้น(เฉลี่ยแม่) + costDelta (ตอนนี้ 0)
  // วงจรชนะทาง: แต่ละธาตุชนะธาตุถัดไป
  var CYCLE = ['fire', 'plant', 'earth', 'wind', 'electric', 'water'];

  var ELEMENTS = {
    fire:     { name: 'ไฟ',    emoji: '🔥', color: '#ff7a52' },
    water:    { name: 'น้ำ',   emoji: '💧', color: '#4ea8ff' },
    plant:    { name: 'พืช',   emoji: '🌿', color: '#5fd36b' },
    electric: { name: 'ไฟฟ้า', emoji: '⚡', color: '#ffd84a' },
    earth:    { name: 'ดิน',   emoji: '🪨', color: '#b8905e' },
    wind:     { name: 'ลม',    emoji: '💨', color: '#8fd8ea' }
  };

  var KEYWORDS = {
    regen: { name: 'ฟื้นฟู', text: 'ฟื้น HP 1 ทุกจบเทิร์น' },
    haste: { name: 'เร็ว',   text: 'ลงแล้วโจมตีการ์ดศัตรูได้เลย (โจมตีผู้เล่นได้ตั้งแต่เทิร์นถัดไป)' },
    evade: { name: 'หลบ',    text: 'หลบการโจมตีครั้งแรกที่โดนในแต่ละเทิร์น' }
  };

  // key = ชื่อธาตุสองตัวเรียงตามตัวอักษร คั่นด้วย |
  var PAIR = {
    'fire|water':      { name: 'ไอน้ำ',     id: 'steam',      text: 'ตอนลงสนาม ศัตรูทุกตัว ATK -1 ถึงจบเทิร์น' },
    'fire|plant':      { name: 'ไฟป่า',     id: 'burn',       text: 'โจมตีแล้วเป้าหมายโดนเผา 1 ดาเมจ/เทิร์น (2 เทิร์น)' },
    'electric|fire':   { name: 'พลาสมา',    id: 'plasma',     text: 'ดาเมจที่ทำใส่ผู้เล่นศัตรู +1' },
    'earth|fire':      { name: 'ลาวา',      id: 'lava',       text: 'HP +2' },
    'fire|wind':       { name: 'พายุไฟ',    id: 'firestorm',  text: 'ตอนลงสนาม ศัตรูทุกตัวโดน 1 ดาเมจ' },
    'plant|water':     { name: 'ป่าฝน',     id: 'rainforest', text: 'จบเทิร์น ฟื้น HP ผู้เล่น 1' },
    'electric|water':  { name: 'ช็อต',      id: 'shock',      text: 'เป้าหมายที่ถูกโจมตีข้ามการโจมตีเทิร์นถัดไป' },
    'earth|water':     { name: 'โคลน',      id: 'mud',        text: 'ศัตรูที่ถูกโจมตี ATK -1 ถาวร (ต่ำสุด 0)' },
    'water|wind':      { name: 'หมอก',      id: 'fog',        text: 'หลบการโจมตีครั้งแรกของทุกเทิร์น' },
    'electric|plant':  { name: 'เมล็ดพลัง', id: 'seedpower',  text: 'ตอนลงสนาม Mana +1 (เทิร์นนี้)' },
    'earth|plant':     { name: 'ป่าทึบ',    id: 'taunt',      text: 'ศัตรูต้องโจมตีตัวนี้ก่อน (ล่อ)' },
    'plant|wind':      { name: 'สปอร์',     id: 'spore',      text: 'ตอนลงสนาม จั่วการ์ด 1 ใบ' },
    'earth|electric':  { name: 'โลหะ',      id: 'metal',      text: 'ลดดาเมจที่โดนทุกครั้ง 1' },
    'electric|wind':   { name: 'พายุฟ้า',   id: 'stormbolt',  text: 'เร็ว และถ้า ATK ≤ 3 โจมตีได้ 2 ครั้ง/เทิร์น' },
    'earth|wind':      { name: 'พายุทราย',  id: 'sandstorm',  text: 'ตอนลงสนาม เป้าหมาย 1 ตัว ATK -1 ถาวร' }
  };
  var SAME = { name: 'เสริมพลัง', id: 'empower', text: 'ไม่มีความสามารถใหม่ แต่ได้ +1/+1' };

  function pairKey(a, b) { return [a, b].sort().join('|'); }

  function dominant(a, b) {
    if (a.cost !== b.cost) return (a.cost > b.cost ? a : b).element;
    return CYCLE.indexOf(a.element) <= CYCLE.indexOf(b.element) ? a.element : b.element;
  }

  function canFuse(x, y) {
    return !!x && !!y && x.type === 'creature' && y.type === 'creature' &&
           x.tier < 3 && y.tier < 3 && x.id !== y.id;
  }

  function uniqAbilities(list) {
    var seen = {}, out = [];
    list.forEach(function (a) { if (!seen[a.id]) { seen[a.id] = 1; out.push(a); } });
    return out;
  }

  function dominantCard(a, b) {
    if (a.cost !== b.cost) return a.cost > b.cost ? a : b;
    return CYCLE.indexOf(a.element) <= CYCLE.indexOf(b.element) ? a : b;
  }

  function fuse(x, y) {
    if (!canFuse(x, y)) return null;
    var pair = [x, y].sort(function (p, q) { return p.id < q.id ? -1 : p.id > q.id ? 1 : 0; });
    var a = pair[0], b = pair[1];
    var tier = Math.max(a.tier, b.tier) + 1;
    var atk = Math.ceil((a.atk + b.atk) * CONFIG.factor);
    var hp = Math.ceil((a.hp + b.hp) * CONFIG.factor);
    var abilities = [], name, key;

    if (tier === 2) {
      if (a.element === b.element) {
        atk += 1; hp += 1;
        abilities = [{ id: SAME.id, name: SAME.name, text: SAME.text }];
        name = SAME.name;
      } else {
        var pr = PAIR[pairKey(a.element, b.element)];
        if (pr.id === 'lava') hp += 2;
        abilities = [{ id: pr.id, name: pr.name, text: pr.text }];
        name = pr.name;
      }
      // สืบทอดความสามารถเฉพาะตัวของแม่ที่ Cost สูงกว่า
      dominantCard(a, b).abilities.forEach(function (ab) {
        if (ab.id !== 'empower') abilities.push({ id: ab.id, name: ab.name, text: ab.text });
      });
    } else {
      var notEmpower = function (ab) { return ab.id !== 'empower'; };
      var t2s = [a, b].filter(function (c) { return c.tier === 2; });
      if (t2s.length === 2) {
        abilities = uniqAbilities(a.abilities.filter(notEmpower).concat(b.abilities.filter(notEmpower))).slice(0, 3);
      } else {
        var p = t2s[0], o = (p === a) ? b : a;
        abilities = p.abilities.filter(notEmpower).slice();
        if (p.element !== o.element) {
          var pr2 = PAIR[pairKey(p.element, o.element)];
          if (pr2.id === 'lava') hp += 2;
          if (!abilities.some(function (ab) { return ab.id === pr2.id; })) {
            abilities.push({ id: pr2.id, name: pr2.name, text: pr2.text });
          }
        }
        abilities = abilities.slice(0, 3);
      }
      name = abilities.slice(0, 2).map(function (ab) { return ab.name; }).join('·') || 'ผสมซ้อน';
    }

    var keywords = [];
    a.keywords.concat(b.keywords).forEach(function (k) { if (keywords.indexOf(k) < 0) keywords.push(k); });
    keywords.sort();

    return {
      id: '(' + a.id + '+' + b.id + ')',
      type: 'creature',
      tier: tier,
      emoji: a.emoji + b.emoji,
      name: name,
      sub: a.name + ' + ' + b.name,
      element: dominant(a, b),
      cost: Math.max(1, Math.min(Math.ceil((a.cost + b.cost) / 2) + CONFIG.costDelta, 6)),
      atk: atk,
      hp: hp,
      keywords: keywords,
      abilities: abilities,
      rarity: tier === 2 ? 'uncommon' : 'legendary',
      parts: [a, b]
    };
  }

  // แยก "A+B" ที่ระดับนอกสุด (เคารพวงเล็บซ้อน)
  function splitTop(inner) {
    var depth = 0;
    for (var i = 0; i < inner.length; i++) {
      var ch = inner[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === '+' && depth === 0) return [inner.slice(0, i), inner.slice(i + 1)];
    }
    return null;
  }

  // สร้างการ์ดจาก id เช่น "(B01+B05)" หรือ "((B01+B05)+B09)"
  function build(id, baseMap) {
    if (baseMap[id]) return baseMap[id];
    if (id.charAt(0) !== '(' || id.charAt(id.length - 1) !== ')') return null;
    var parts = splitTop(id.slice(1, -1));
    if (!parts) return null;
    var A = build(parts[0], baseMap), B = build(parts[1], baseMap);
    return fuse(A, B);
  }

  var api = {
    CONFIG: CONFIG, CYCLE: CYCLE, ELEMENTS: ELEMENTS, KEYWORDS: KEYWORDS,
    PAIR: PAIR, SAME: SAME, pairKey: pairKey, canFuse: canFuse, fuse: fuse, build: build
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fusion = api;
})(typeof window !== 'undefined' ? window : this);
