/* Emoji Fusion TCG — ห้องทดลอง / ต่อสู้ / เด็ค / ซอง / สมุด */
(function () {
  'use strict';

  var F = window.Fusion, B = window.Battle;
  var STORE_KEY = 'emoji-fusion-lab-v1';
  var T2_TOTAL = 276, DECK_SIZE = 20, MAX_COPIES = 2, PACK_PRICE = 30;
  var REWARD = { easy: 20, medium: 35, hard: 60, lose: 5, draw: 10 };
  var LEVEL_NAME = { easy: 'บอท (ง่าย)', medium: 'บอท (กลาง)', hard: 'บอท (ยาก)' };
  var AVATAR = { easy: '🐣', medium: '🦊', hard: '🐉' };
  var ELEM_ORDER = ['fire', 'water', 'plant', 'electric', 'earth', 'wind'];
  var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
  var STARTER_SPELLS = ['S01', 'S03', 'S07', 'S08', 'S10'];
  var DEFAULT_DECK = ['B01', 'B02', 'B03', 'B05', 'B06', 'B07', 'B09', 'B10', 'B11', 'B13', 'B14', 'B15', 'B17', 'B18', 'B21',
    'S01', 'S03', 'S07', 'S08', 'S10'];

  var BASE = [], BASE_MAP = {}, SPELLS = [], FIELDS = [], REACTS = [], ALL_MAP = {}, SETS = [], SET_MAP = {};
  function maxCopies(id) { var c = ALL_MAP[id]; return c && c.type === 'reaction' && c.speed === 3 ? 1 : MAX_COPIES; }
  var state = {};
  var slots = [null, null], result = null, pool = 'base', filter = 'all';
  var openGroups = {}, bookTab = 'recipes', bookQ = '';
  var CARD_CACHE = {}, SPRITES = {};
  var bs = null; // เซสชันต่อสู้
  function ME() { return (bs && bs.me) || 0; }   // ดัชนีผู้เล่นของเรา (บอท = 0 เสมอ, ออนไลน์: เจ้าของห้อง 0 / แขก 1)
  function OP() { return 1 - ME(); }

  function $(s) { return document.querySelector(s); }
  function $all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function make(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function pickRandom(arr, n) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, n);
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- บันทึกข้อมูล ---------- */
  function defaultState() {
    var owned = {};
    BASE.forEach(function (c) { owned[c.id] = 1; });
    STARTER_SPELLS.forEach(function (id) { owned[id] = 1; });
    owned.R01 = 1; owned.R04 = 1;
    return {
      found: [], points: 0, coins: 120, owned: owned, deck: DEFAULT_DECK.slice(), uid: null, ts: 0, shards: 0, pity: 0,
      stats: { easy: { w: 0, l: 0, d: 0 }, medium: { w: 0, l: 0, d: 0 }, hard: { w: 0, l: 0, d: 0 }, online: { w: 0, l: 0, d: 0 } },
      daily: { d: '', last: '', streak: 0, login: false, m: {} }
    };
  }
  function load() {
    var s = defaultState();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && Array.isArray(o.found)) s.found = o.found;
        if (o && typeof o.points === 'number') s.points = o.points;
        if (o && typeof o.coins === 'number') s.coins = o.coins;
        if (o && o.owned && typeof o.owned === 'object') s.owned = o.owned;
        if (o && Array.isArray(o.deck)) s.deck = o.deck;
        if (o && typeof o.uid === 'string') s.uid = o.uid;
        if (o && typeof o.ts === 'number') s.ts = o.ts;
        if (o && typeof o.shards === 'number') s.shards = o.shards;
        if (o && typeof o.pity === 'number') s.pity = o.pity;
        if (o && o.daily && typeof o.daily === 'object') s.daily = cleanDaily(o.daily);
        if (o && o.stats) { ['easy', 'medium', 'hard', 'online'].forEach(function (k) { if (o.stats[k]) s.stats[k] = o.stats[k]; }); }
      }
    } catch (e) { /* ใช้ค่าเริ่มต้น */ }
    s.owned.R01 = Math.max(s.owned.R01 || 0, 1); s.owned.R04 = Math.max(s.owned.R04 || 0, 1);
    state = s;
  }
  function saveLocal() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ไม่เป็นไร */ }
  }
  function save() {
    state.ts = Date.now();
    saveLocal();
    schedulePush();
  }

  function getCard(id) {
    if (ALL_MAP[id]) return ALL_MAP[id];
    if (!CARD_CACHE[id]) CARD_CACHE[id] = F.build(id, BASE_MAP);
    return CARD_CACHE[id];
  }

  /* ---------- พิกเซลอาร์ต ---------- */
  function q(v) { return Math.min(255, Math.round(v / 64) * 64); }

  function emojiSprite(emoji, size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = Math.round(size * 0.82) + 'px ' + EMOJI_FONT;
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.06);
    var img = ctx.getImageData(0, 0, size, size), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 110) { d[i] = q(d[i]); d[i + 1] = q(d[i + 1]); d[i + 2] = q(d[i + 2]); d[i + 3] = 255; }
      else d[i + 3] = 0;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function sprite(card) {
    if (SPRITES[card.id]) return SPRITES[card.id];
    var c;
    if (card.parts) {
      var size = card.tier === 2 ? 20 : 28;
      c = document.createElement('canvas');
      c.width = c.height = size;
      var x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      var sa = sprite(card.parts[0]), sb = sprite(card.parts[1]);
      x.drawImage(sa, 0, size - sa.width);
      x.drawImage(sb, size - sb.width, 0);
    } else {
      c = emojiSprite(card.emoji, 12);
    }
    SPRITES[card.id] = c;
    return c;
  }

  function spriteEl(card, target) {
    var src = sprite(card);
    var c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    var scale = Math.max(1, Math.round(target / src.width));
    c.style.width = (src.width * scale) + 'px';
    c.style.height = (src.height * scale) + 'px';
    return c;
  }

  /* ---------- ตัวการ์ด ---------- */
  function cardEl(card, mode, badge) {
    var cls = 'card ' + mode + ' tier' + (card.tier || 1);
    if (card.type === 'creature' || card.type === 'field') cls += ' el-' + card.element;
    if (card.type === 'spell') cls += ' spell';
    if (card.type === 'reaction') cls += ' reaction sp' + card.speed;
    if (!card.parts && (card.rarity === 'rare' || card.rarity === 'uncommon')) cls += ' r-' + card.rarity;
    if (card.type === 'field') cls += ' field';
    var d = make('div', cls);
    d.appendChild(make('span', 'cost', String(card.cost)));
    var tag = '';
    if (card.type === 'creature' || card.type === 'field') tag += F.ELEMENTS[card.element].emoji;
    if (card.type === 'reaction') tag += card.speed === 3 ? '🛡️' : '⚡';
    if (card.tier === 2) tag += '✦';
    if (card.tier === 3) tag += '★';
    d.appendChild(make('span', 'tag', tag));
    var art = make('div', 'art');
    art.appendChild(spriteEl(card, mode === 'full' ? 128 : 56));
    d.appendChild(art);
    d.appendChild(make('div', 'name', card.name));
    if (card.type === 'creature' && card.tier === 1 && card.abilities && card.abilities.length) {
      d.appendChild(make('div', 'ab', '✧ ' + card.abilities[0].name));
    }
    if (card.type === 'creature') {
      d.appendChild(make('div', 'stats-row', '<span class="a">⚔' + card.atk + '</span> <span class="h">❤' + card.hp + '</span>'));
    } else {
      d.appendChild(make('div', 'stats-row', '<span class="kw-dots">' + (card.type === 'spell' ? 'เวทย์' : card.type === 'reaction' ? (card.speed === 3 ? 'Hyper' : 'Instant') : 'สนาม') + '</span>'));
    }
    if (badge) d.appendChild(make('span', 'badge', badge));
    return d;
  }

  /* ---------- Toast / Modal ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
  }

  function showDetail(card) {
    var body = $('#modal-body');
    body.innerHTML = '';
    body.appendChild(cardEl(card, 'full'));
    var det = make('div', 'detail');
    var typeLabel = card.type === 'creature'
      ? ('ตัวละคร · ขั้น ' + card.tier + ' · ธาตุ' + F.ELEMENTS[card.element].name + ' ' + F.ELEMENTS[card.element].emoji)
      : card.type === 'spell' ? 'การ์ดเวทย์ · ใช้ครั้งเดียว'
      : card.type === 'reaction' ? (card.speed === 3 ? '🛡️ ปฏิกิริยา Hyper (ความเร็ว 3) · วางคว่ำ ใช้ตอนตอบโต้เท่านั้น · ใส่เด็คได้ 1 ใบ' : '⚡ ปฏิกิริยา Instant (ความเร็ว 2) · วางคว่ำ ตอบโต้ได้ หรือเปิดเองในเทิร์นตัวเอง')
      : 'การ์ดสนาม · ธาตุ' + F.ELEMENTS[card.element].name;
    det.appendChild(make('h3', null, card.emoji + ' ' + card.name));
    det.appendChild(make('div', 'subline', typeLabel + ' · Cost ' + card.cost + (!card.parts && RARITY_TH[card.rarity] ? ' · ความหายาก: ' + RARITY_TH[card.rarity] : '')));
    var ul = make('ul');
    if (card.type === 'creature') {
      ul.appendChild(make('li', null, 'ATK <b>' + card.atk + '</b> · HP <b>' + card.hp + '</b>'));
      (card.keywords || []).forEach(function (k) {
        var kw = F.KEYWORDS[k];
        if (kw) ul.appendChild(make('li', null, '<b>' + kw.name + '</b> — ' + kw.text));
      });
      (card.abilities || []).forEach(function (a) {
        ul.appendChild(make('li', null, '<b>' + a.name + '</b> — ' + a.text));
      });
      if (card.parts) ul.appendChild(make('li', null, 'ผสมจาก: ' + card.parts[0].emoji + ' ' + card.parts[0].name + ' + ' + card.parts[1].emoji + ' ' + card.parts[1].name));
    } else {
      ul.appendChild(make('li', null, card.text));
    }
    det.appendChild(ul);
    if (card.type === 'creature') {
      var i = F.CYCLE.indexOf(card.element);
      var beats = F.CYCLE[(i + 1) % 6], lose = F.CYCLE[(i + 5) % 6];
      det.appendChild(make('div', 'beats', 'ชนะธาตุ ' + F.ELEMENTS[beats].emoji + ' ' + F.ELEMENTS[beats].name +
        ' · แพ้ธาตุ ' + F.ELEMENTS[lose].emoji + ' ' + F.ELEMENTS[lose].name));
    }
    body.appendChild(det);
    modalKind = '';
    $('#modal').hidden = false;
    if (tour && STEPS[tour.i] && STEPS[tour.i].id === 'look') tour.detailSeen = true;
    tourSync();
  }
  var modalKind = '';
  function closeModal() {
    if (modalKind === 'merge') { resolveMerge('merge'); return; }
    if (modalKind === 'wait') cancelWaiting();
    $('#modal').hidden = true;
    if (modalKind === 'end') { modalKind = ''; closeBattle(); showView('battle'); }
    modalKind = '';
    tourSync();
  }

  /* ---------- สถิติหัวเว็บ ---------- */
  function isSetRecipe(c) { return /[A-Z]{2}\d{2}/.test(c.id); } // สูตรที่มีการ์ดจากชุดเป็นส่วนผสม
  function foundByTier(t, core) {
    return state.found.map(getCard).filter(function (c) { return c && c.tier === t && (!core || !isSetRecipe(c)); });
  }
  function ownedSetCards() {
    var out = [];
    SETS.forEach(function (st) { st.cards.forEach(function (c) { if ((state.owned[c.id] || 0) > 0) out.push(c); }); });
    return out;
  }
  function renderStats() {
    $('#stat-coins').textContent = '🪙 ' + state.coins;
    $('#stat-points').textContent = '⭐ ' + state.points;
    $('#stat-recipes').textContent = '📖 ' + foundByTier(2, true).length + '/' + T2_TOTAL;
    $('#found-count').textContent = state.found.length;
  }

  /* =====================================================
     ห้องทดลอง
     ===================================================== */
  function setMsg(text, good) {
    var m = $('#lab-msg');
    m.textContent = text;
    m.className = 'lab-msg' + (good ? ' good' : '');
  }

  function pick(card) {
    if (card.tier >= 3) { toast('การ์ดขั้น 3 ผสมต่อไม่ได้'); return; }
    if ((slots[0] && slots[0].id === card.id) || (slots[1] && slots[1].id === card.id)) {
      toast('ต้องเลือกการ์ดคนละใบกัน');
      return;
    }
    if (!slots[0]) slots[0] = card;
    else if (!slots[1]) slots[1] = card;
    else slots[1] = card;
    result = null;
    renderLab();
  }

  function renderSlots() {
    for (var i = 0; i < 2; i++) {
      (function (idx) {
        var s = $('#slot-' + idx);
        s.innerHTML = '';
        if (slots[idx]) {
          s.classList.add('filled');
          s.appendChild(cardEl(slots[idx], 'mini'));
        } else {
          s.classList.remove('filled');
          s.appendChild(make('span', 'slot-hint', idx === 0 ? 'แตะการ์ด<br>ด้านล่าง' : 'การ์ด<br>ใบที่ 2'));
        }
      })(i);
    }
    var rs = $('#slot-result');
    rs.innerHTML = '';
    var both = slots[0] && slots[1];
    var preview = null;
    if (both) {
      var p = F.fuse(slots[0], slots[1]);
      if (p && state.found.indexOf(p.id) >= 0) preview = p;
    }
    if (result) {
      rs.classList.add('filled');
      var ce = cardEl(result, 'mini');
      ce.classList.add('pop');
      rs.appendChild(ce);
    } else if (preview) {
      rs.classList.add('filled');
      var pe = cardEl(preview, 'mini');
      pe.classList.add('dim');
      rs.appendChild(pe);
    } else {
      rs.classList.remove('filled');
      rs.appendChild(make('span', 'slot-hint', '?'));
    }
    $('#btn-fuse').disabled = !both;
    $('#btn-continue').hidden = !(result && result.tier < 3);

    if (!result) {
      if (!both) setMsg('เลือกการ์ด 2 ใบแล้วกดผสม');
      else if (preview) setMsg('รู้สูตรนี้แล้ว: จะได้ ' + preview.name);
      else setMsg('ยังไม่รู้ว่าจะได้อะไร… ลองผสมดู!');
    }
  }

  function doFuse() {
    if (!slots[0] || !slots[1]) return;
    var r = F.fuse(slots[0], slots[1]);
    if (!r) { toast('ผสมคู่นี้ไม่ได้'); return; }
    CARD_CACHE[r.id] = r;
    var isNew = state.found.indexOf(r.id) < 0;
    var pts = 0, coins = 0;
    if (isNew) {
      pts = r.tier === 3 ? 3 : 1;
      coins = r.tier === 3 ? 15 : 5;
      state.found.unshift(r.id);
      state.points += pts;
      state.coins += coins;
      save();
    }
    bump('fuseLab');
    if (isNew) bump('newRecipe');
    result = r;
    renderLab();
    renderStats();
    setMsg(isNew
      ? '🎉 ค้นพบสูตรใหม่! ได้ ' + r.name + ' (+' + pts + ' แต้ม +' + coins + ' 🪙)'
      : 'ได้ ' + r.name + ' (สูตรที่เคยค้นพบแล้ว)', isNew);
  }

  function renderFilters() {
    var box = $('#filters');
    box.innerHTML = '';
    var all = make('button', 'f-chip' + (filter === 'all' ? ' active' : ''), 'ทั้งหมด');
    all.onclick = function () { filter = 'all'; renderFilters(); renderInventory(); };
    box.appendChild(all);
    ELEM_ORDER.forEach(function (e) {
      var b = make('button', 'f-chip' + (filter === e ? ' active' : ''), F.ELEMENTS[e].emoji + ' ' + F.ELEMENTS[e].name);
      b.onclick = function () { filter = e; renderFilters(); renderInventory(); };
      box.appendChild(b);
    });
  }

  function renderInventory() {
    var box = $('#inventory');
    box.innerHTML = '';
    var list = pool === 'base' ? BASE.concat(ownedSetCards()) : state.found.map(getCard).filter(Boolean);
    if (filter !== 'all') list = list.filter(function (c) { return c.element === filter; });
    if (!list.length) {
      box.appendChild(make('div', 'empty', pool === 'found'
        ? 'ยังไม่มีการ์ดที่ค้นพบ<br>ลองผสมการ์ดพื้นฐานดูสิ!' : 'ไม่มีการ์ดในธาตุนี้'));
      return;
    }
    list.forEach(function (c) {
      var e = cardEl(c, 'mini');
      if (c.tier >= 3) e.classList.add('dim');
      e.setAttribute('data-id', c.id);
      e.onclick = function () { c.tier >= 3 ? showDetail(c) : pick(c); };
      box.appendChild(e);
    });
  }

  function renderLab() {
    renderSlots();
    $('#found-count').textContent = state.found.length;
    renderInventory();
    tourSync();
  }

  /* =====================================================
     สมุด (สูตร + การ์ด)
     ===================================================== */
  var GROUPS = [];
  function buildGroups() {
    GROUPS = [];
    for (var i = 0; i < ELEM_ORDER.length; i++) {
      for (var j = i; j < ELEM_ORDER.length; j++) {
        var e1 = ELEM_ORDER[i], e2 = ELEM_ORDER[j];
        var key = F.pairKey(e1, e2);
        var same = e1 === e2;
        var info = same ? F.SAME : F.PAIR[key];
        GROUPS.push({
          key: key,
          title: F.ELEMENTS[e1].emoji + ' + ' + F.ELEMENTS[e2].emoji,
          name: info.name, text: info.text,
          total: same ? 6 : 16
        });
      }
    }
  }

  // ค้นหาการ์ด: ชื่อ, อีโมจิ, ชื่อพ่อแม่ (สูตร), ความสามารถ, ธาตุ, ชื่อชุด, รหัส — พิมพ์หลายคำ = ต้องตรงทุกคำ
  function cardHay(c) {
    var el = c.element && F.ELEMENTS[c.element] ? F.ELEMENTS[c.element].name + ' ' + F.ELEMENTS[c.element].emoji : '';
    var ab = (c.abilities || []).map(function (a) { return (a.name || '') + ' ' + (a.text || ''); }).join(' ');
    var kws = (c.keywords || []).map(function (k) { return k + ' ' + (F.KEYWORDS[k] ? F.KEYWORDS[k].name : ''); }).join(' ');
    var st = c.set && SET_MAP[c.set] ? SET_MAP[c.set].name : '';
    return (c.name + ' ' + c.emoji + ' ' + (c.sub || '') + ' ' + c.id + ' ' + el + ' ' + ab + ' ' + kws + ' ' + st + ' ' + (c.text || '') + ' ' + (c.type === 'creature' ? '' : c.type)).toLowerCase();
  }
  function cardMatch(c, q) {
    if (!q) return true;
    var h = cardHay(c);
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return h.indexOf(w) >= 0; });
  }

  function renderRecipes() {
    var t2 = foundByTier(2, true), t2set = foundByTier(2).filter(isSetRecipe), t3 = foundByTier(3);
    var pct = Math.round(t2.length / T2_TOTAL * 100);
    $('#recipe-summary').innerHTML =
      '<div class="sum-box"><b>' + t2.length + '/' + T2_TOTAL + '</b><span>สูตรขั้น 2</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="sum-box"><b>' + t3.length + '</b><span>ตำนานขั้น 3</span></div>' +
      '<div class="sum-box"><b>' + state.points + '</b><span>แต้มค้นพบ</span></div>';

    var counts = {}, byGroup = {};
    t2.forEach(function (c) {
      var k = F.pairKey(c.parts[0].element, c.parts[1].element);
      counts[k] = (counts[k] || 0) + 1;
      (byGroup[k] = byGroup[k] || []).push(c);
    });

    var box = $('#recipe-groups');
    box.innerHTML = '';
    if (bookQ) { // โหมดค้นหา: แสดงผลลัพธ์รวมจากทุกสูตรที่ค้นพบ
      var hits = state.found.map(getCard).filter(function (c) { return c && cardMatch(c, bookQ); });
      box.appendChild(make('div', 'muted', 'พบ ' + hits.length + ' สูตรที่ตรงกับ “' + bookQ.replace(/</g, '&lt;') + '” (จากสูตรที่ค้นพบแล้ว)'));
      var rg = make('div', 'grid');
      if (!hits.length) rg.appendChild(make('div', 'empty', 'ไม่พบ ลองคำอื่น หรือผสมการ์ดเพิ่ม'));
      hits.forEach(function (c) { var e = cardEl(c, 'mini'); e.onclick = function () { showDetail(c); }; rg.appendChild(e); });
      box.appendChild(rg);
      $('#t3-list').innerHTML = '';
      return;
    }
    GROUPS.forEach(function (g) {
      var n = counts[g.key] || 0;
      var wrap = make('div', 'group' + (n === g.total ? ' complete' : ''));
      var head = make('button', 'group-head',
        '<div class="row"><span class="ttl">' + g.title + ' ' + g.name + '</span><span class="cnt">' + n + '/' + g.total + '</span></div>' +
        '<div class="ab">' + g.text + '</div>' +
        '<div class="bar"><i style="width:' + Math.round(n / g.total * 100) + '%"></i></div>');
      head.onclick = function () { openGroups[g.key] = !openGroups[g.key]; renderRecipes(); };
      wrap.appendChild(head);
      if (openGroups[g.key]) {
        var body = make('div', 'group-body');
        var grid = make('div', 'grid');
        var arr = byGroup[g.key] || [];
        if (!arr.length) grid.appendChild(make('div', 'empty', 'ยังไม่ค้นพบสูตรในกลุ่มนี้'));
        arr.forEach(function (c) {
          var e = cardEl(c, 'mini');
          e.onclick = function () { showDetail(c); };
          grid.appendChild(e);
        });
        body.appendChild(grid);
        wrap.appendChild(body);
      }
      box.appendChild(wrap);
    });

    if (SETS.length) {
      var sw = make('div', 'group');
      sw.appendChild(make('div', 'group-head', '<div class="row"><span class="ttl">🧩 สูตรจากการ์ดชุด</span><span class="cnt">' + t2set.length + '</span></div><div class="ab">ผสมการ์ดชุดกับการ์ดอื่นในห้องทดลอง (ต้องมีการ์ดชุดในคลังก่อน)</div>'));
      var sg = make('div', 'grid');
      if (!t2set.length) sg.appendChild(make('div', 'empty', 'ยังไม่ค้นพบสูตรจากการ์ดชุด'));
      t2set.forEach(function (c) { var e = cardEl(c, 'mini'); e.onclick = function () { showDetail(c); }; sg.appendChild(e); });
      sw.appendChild(sg); box.appendChild(sw);
    }

    var t3box = $('#t3-list');
    t3box.innerHTML = '';
    if (!t3.length) t3box.appendChild(make('div', 'empty', 'ผสมการ์ดขั้น 2 กับการ์ดอื่น<br>เพื่อค้นพบตำนานขั้น 3'));
    t3.forEach(function (c) {
      var e = cardEl(c, 'mini');
      e.onclick = function () { showDetail(c); };
      t3box.appendChild(e);
    });
  }

  function renderCollection() {
    function fill(sel, list) {
      var box = $(sel);
      box.innerHTML = '';
      list.filter(function (c) { return cardMatch(c, bookQ); }).forEach(function (c) {
        var n = state.owned[c.id] || 0;
        var e = cardEl(c, 'mini', n ? '×' + n : null);
        if (!n) e.classList.add('dim');
        e.onclick = function () { showDetail(c); };
        box.appendChild(e);
      });
    }
    fill('#col-base', BASE);
    fill('#col-spell', SPELLS);
    fill('#col-field', FIELDS);
    fill('#col-react', REACTS);
    var cs = $('#col-sets'); if (cs) {
      cs.innerHTML = '';
      SETS.forEach(function (st) {
        cs.appendChild(make('h2', 'sec', st.emoji + ' ชุด' + st.name));
        var g = make('div', 'grid'); cs.appendChild(g);
        st.cards.filter(function (c) { return cardMatch(c, bookQ); }).forEach(function (c) {
          var n = state.owned[c.id] || 0, e = cardEl(c, 'mini', n ? '×' + n : null);
          if (!n) e.classList.add('dim');
          e.onclick = function () { showDetail(c); };
          g.appendChild(e);
        });
      });
    }
  }

  function renderBook() {
    $('#book-recipes').hidden = bookTab !== 'recipes';
    $('#book-cards').hidden = bookTab !== 'cards';
    $all('[data-book]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-book') === bookTab); });
    if (bookTab === 'recipes') renderRecipes(); else renderCollection();
  }

  /* =====================================================
     เด็ค
     ===================================================== */
  function deckCounts() {
    var m = {};
    state.deck.forEach(function (id) { m[id] = (m[id] || 0) + 1; });
    return m;
  }

  function validDeck() {
    if (state.deck.length !== DECK_SIZE) return false;
    var c = deckCounts();
    return Object.keys(c).every(function (id) { return c[id] <= maxCopies(id) && c[id] <= (state.owned[id] || 0) && !!ALL_MAP[id]; });
  }

  function knownRecipesInDeck() {
    var ids = [], seen = {};
    state.deck.forEach(function (id) {
      var c = ALL_MAP[id];
      if (c && c.type === 'creature' && !seen[id]) { seen[id] = 1; ids.push(c); }
    });
    var n = 0;
    for (var i = 0; i < ids.length; i++) for (var j = i + 1; j < ids.length; j++) {
      var r = F.fuse(ids[i], ids[j]);
      if (r && state.found.indexOf(r.id) >= 0) n++;
    }
    return n;
  }

  function typeOrder(c) { return c.type === 'creature' ? 0 : c.type === 'spell' ? 1 : c.type === 'reaction' ? 2 : 3; }
  function sortCards(a, b) {
    return typeOrder(a) - typeOrder(b) || a.cost - b.cost || (a.id < b.id ? -1 : 1);
  }

  function renderDeck() {
    var counts = deckCounts(), n = state.deck.length;
    var cr = 0, sp = 0, fl = 0, rc = 0;
    state.deck.forEach(function (id) {
      var c = ALL_MAP[id];
      if (!c) return;
      if (c.type === 'creature') cr++; else if (c.type === 'spell') sp++; else if (c.type === 'reaction') rc++; else fl++;
    });
    var ok = validDeck();
    $('#deck-summary').innerHTML =
      '<div class="sum-box ' + (ok ? 'ok' : 'warn') + '"><b>' + n + '/' + DECK_SIZE + '</b><span>' + (ok ? 'เด็คพร้อมสู้' : 'ต้องมี ' + DECK_SIZE + ' ใบ') + '</span></div>' +
      '<div class="sum-box"><b>' + cr + '·' + sp + '·' + fl + '·' + rc + '</b><span>ตัว·เวทย์·สนาม·ตอบโต้</span></div>' +
      '<div class="sum-box"><b>' + knownRecipesInDeck() + '</b><span>สูตรผสมที่ใช้ได้</span></div>';
    $('#deck-count-small').textContent = '(' + n + '/' + DECK_SIZE + ')';

    var listBox = $('#deck-list');
    listBox.innerHTML = '';
    var uniq = Object.keys(counts).map(function (id) { return ALL_MAP[id]; }).filter(Boolean).sort(sortCards);
    if (!uniq.length) listBox.appendChild(make('div', 'empty', 'เด็คว่าง<br>แตะการ์ดจากคลังด้านล่างเพื่อใส่'));
    uniq.forEach(function (c) {
      var e = cardEl(c, 'mini', '×' + counts[c.id]);
      e.onclick = function () {
        var i = state.deck.indexOf(c.id);
        if (i >= 0) { state.deck.splice(i, 1); save(); renderDeck(); }
      };
      listBox.appendChild(e);
    });

    var poolBox = $('#deck-pool');
    poolBox.innerHTML = '';
    Object.keys(state.owned).map(function (id) { return ALL_MAP[id]; }).filter(function (c) { return c && state.owned[c.id] > 0; })
      .sort(sortCards).forEach(function (c) {
        var inDeck = counts[c.id] || 0, owned = state.owned[c.id];
        var e = cardEl(c, 'mini', '×' + owned + (inDeck ? ' · ใช้ ' + inDeck : ''));
        if (inDeck >= Math.min(maxCopies(c.id), owned)) e.classList.add('dim');
        e.onclick = function () {
          if (state.deck.length >= DECK_SIZE) { toast('เด็คเต็ม ' + DECK_SIZE + ' ใบแล้ว'); return; }
          if ((counts[c.id] || 0) >= maxCopies(c.id)) { toast('ใส่ซ้ำได้ไม่เกิน ' + maxCopies(c.id) + ' ใบ'); return; }
          if ((counts[c.id] || 0) >= (state.owned[c.id] || 0)) { toast('การ์ดไม่พอ'); return; }
          state.deck.push(c.id); save(); renderDeck();
        };
        poolBox.appendChild(e);
      });
  }

  function autoDeck(quiet) {
    var deck = state.deck.filter(function (id) { return !!ALL_MAP[id]; });
    var counts = {};
    deck.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    var owned = Object.keys(state.owned).filter(function (id) { return state.owned[id] > 0 && ALL_MAP[id]; });
    function addFrom(type, limit) {
      var have = deck.filter(function (id) { return ALL_MAP[id].type === type; }).length;
      pickRandom(owned.filter(function (id) { return ALL_MAP[id].type === type; }), 99).forEach(function (id) {
        while (have < limit && deck.length < DECK_SIZE && (counts[id] || 0) < Math.min(maxCopies(id), state.owned[id])) {
          deck.push(id); counts[id] = (counts[id] || 0) + 1; have++;
          if (type !== 'creature') break;
        }
      });
    }
    addFrom('creature', 13);
    addFrom('spell', 4);
    addFrom('field', 1);
    addFrom('reaction', 2);
    addFrom('creature', DECK_SIZE);
    addFrom('spell', DECK_SIZE);
    state.deck = deck.slice(0, DECK_SIZE);
    save(); renderDeck();
    if (quiet === true) return;
    toast(validDeck() ? 'จัดเด็คแล้ว' : 'การ์ดในคลังยังไม่พอสำหรับ ' + DECK_SIZE + ' ใบ');
  }

  /* =====================================================
     ซอง
     ===================================================== */
  var RARITY_W = { common: 70, uncommon: 24, rare: 6 };
  var RARITY_TH = { common: 'ธรรมดา', uncommon: 'พิเศษ', rare: 'หายาก' };
  var SHARD_VAL = { common: 2, uncommon: 5, rare: 12 };
  var CARD_CAP = 2, PITY_AT = 10, SHARDS_ELEM = 20, SHARDS_RARE = 35, SET_PRICE = 40;
  function wpick(list) {
    var tot = 0; list.forEach(function (c) { tot += RARITY_W[c.rarity] || 70; });
    var r = Math.random() * tot;
    for (var i = 0; i < list.length; i++) { r -= RARITY_W[list[i].rarity] || 70; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  function upick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function allCards() { return BASE.concat(SPELLS, FIELDS, REACTS); } // ไม่รวมการ์ดในชุด (ออกเฉพาะซองชุด)
  function lastSlot() { var r = Math.random(); return r < 0.2 ? upick(FIELDS) : r < 0.4 ? wpick(REACTS) : wpick(BASE); }

  // รูปแบบซอง: normal | elem(ธาตุ) | rare(การันตี) | set(รหัสชุด) — ซองละ 5 ใบ ไม่ซ้ำกันในซองเดียว
  function rollPack(kind, arg) {
    var cards = [], ids = {};
    function add(fn, n, pool, pick) { // pool: ถ้ามี จะคัดใบที่ซ้ำออกก่อนสุ่ม (ไม่มีทางวนไม่จบ)
      for (var i = 0; i < (n || 1); i++) {
        var c;
        if (pool) { var left = pool.filter(function (x) { return !ids[x.id]; }); c = (pick || wpick)(left.length ? left : pool); }
        else { c = fn(); var t = 0; while (ids[c.id] && t++ < 200) c = fn(); }
        ids[c.id] = 1; cards.push(c);
      }
    }
    if (kind === 'elem') {
      var pool = BASE.filter(function (c) { return c.element === arg; });
      add(null, 4, pool);
      add(lastSlot);
    } else if (kind === 'rare') {
      var all = allCards();
      add(null, 3, all);
      add(null, 1, all.filter(function (c) { return c.rarity === 'rare'; }), upick);
      add(null, 1, all.filter(function (c) { return c.rarity !== 'common'; }));
    } else if (kind === 'set') {
      var sp = (SET_MAP[arg] || SETS[0]).cards, up = sp.filter(function (c) { return c.rarity !== 'common'; });
      add(null, 4, sp);
      add(null, 1, up); // ช่องสุดท้ายการันตีพิเศษขึ้นไป
    } else {
      add(null, 3, BASE);
      add(null, 1, SPELLS);
      add(lastSlot);
    }
    return cards;
  }

  // บันทึกการ์ดเข้าคลัง (หรือแปลงเป็นเศษ) แล้วคืนรายการสำหรับเปิดโชว์
  function showPack(cards) {
    var seenNew = {}, gain = 0, items = [], news = 0;
    cards.forEach(function (c) {
      var have = state.owned[c.id] || 0, badge = null;
      if (have >= CARD_CAP) { var v = SHARD_VAL[c.rarity] || 2; state.shards += v; gain += v; badge = 'ซ้ำ +' + v + '✨'; }
      else { state.owned[c.id] = have + 1; if (!have && !seenNew[c.id]) { badge = 'ใหม่!'; news++; } seenNew[c.id] = 1; }
      items.push({ c: c, badge: badge });
    });
    return { items: items, gain: gain, news: news };
  }

  var revealToken = 0;
  function flash(rare) {
    var f = make('div', 'pack-flash' + (rare ? ' rare' : ''));
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000);
    if (rare) { document.body.classList.add('shake-s'); setTimeout(function () { document.body.classList.remove('shake-s'); }, 450); }
  }
  function sparkle(el) {
    for (var k = 0; k < 10; k++) {
      var sp = make('span', 'spark', '✨');
      sp.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      sp.style.setProperty('--dy', (-30 - Math.random() * 90) + 'px');
      sp.style.animationDelay = (Math.random() * 0.25) + 's';
      el.appendChild(sp);
    }
  }

  function tearPack(kind, elem, done) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || (window.EFL && window.EFL.noTear)) { done(); return; }
    var st = make('div', 'pack-stage');
    var foil = make('div', 'foil ' + kind + (kind === 'elem' ? ' e-' + elem : ''));
    var setInfo = kind === 'set' ? (SET_MAP[elem] || SETS[0]) : null;
    if (setInfo && setInfo.color) { foil.style.setProperty('--g', 'linear-gradient(160deg,' + setInfo.color[0] + ',' + setInfo.color[1] + ')'); }
    foil.innerHTML = '<div class="foil-top"></div><div class="foil-body"><span class="foil-ico">' + (setInfo ? setInfo.emoji : '🧪') + '</span><b>EMOJI FUSION</b><small>' + (setInfo ? 'ชุด' + setInfo.name : kind === 'rare' ? 'ซองหายาก' : kind === 'elem' ? 'ซองธาตุ ' + F.ELEMENTS[elem].emoji : 'ซองการ์ด') + '</small></div><div class="foil-glow"></div><div class="tear-line"><i></i></div><span class="scissor">✂️</span>';
    st.appendChild(foil);
    var hint = make('div', 'tear-hint', 'ลากนิ้วตัดตามรอยประ (หรือแตะ)');
    st.appendChild(hint);
    document.body.appendChild(st);
    var torn = false;
    function tear() {
      if (torn) return; torn = true;
      hint.remove(); foil.classList.remove('dragging'); sc.style.opacity = 0; top.style.transform = ''; fill.style.width = '100%'; foil.classList.add('tearing'); st.classList.add('burst');
      setTimeout(function () { st.classList.add('out'); setTimeout(function () { if (st.parentNode) st.parentNode.removeChild(st); done(); }, 320); }, 950);
    }
    var top = foil.querySelector('.foil-top'), fill = foil.querySelector('.tear-line i'), sc = foil.querySelector('.scissor');
    var down = null, prog = 0, moved = false;
    function show(pg) {
      prog = pg;
      fill.style.width = (pg * 100) + '%';
      sc.style.left = (pg * 100) + '%'; sc.style.opacity = pg > 0 ? 1 : 0;
      top.style.transform = pg > 0 ? 'translate(' + (pg * 10) + 'px,' + (-pg * 8) + 'px) rotate(' + (-pg * 7) + 'deg)' : '';
    }
    st.addEventListener('pointerdown', function (e) { if (torn) return; down = { x: e.clientX, y: e.clientY }; moved = false; foil.classList.add('dragging'); try { st.setPointerCapture(e.pointerId); } catch (x) { } });
    st.addEventListener('pointermove', function (e) {
      if (!down || torn) return;
      var dx = Math.abs(e.clientX - down.x);
      if (dx > 8) moved = true;
      show(Math.min(1, dx / 150));
      if (prog >= 0.98) { down = null; tear(); }
    });
    function up() { if (!down || torn) return; down = null; foil.classList.remove('dragging'); if (!moved) tear(); else show(0); }
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  }

  function revealPack(res) {
    var token = ++revealToken, box = $('#pack-result'), sum = $('#pack-summary'), packEl = document.querySelector('.shop-box .pack');
    box.innerHTML = ''; sum.innerHTML = '';
    var left = res.items.length, slots = [];
    function summary() {
      sum.innerHTML = '<b>ได้ใบใหม่ ' + res.news + ' ใบ</b>' + (res.gain ? ' · ใบซ้ำแลกเป็น <b>+' + res.gain + ' ✨</b>' : '') +
        ' · การันตีหายาก ' + Math.min(state.pity, PITY_AT) + '/' + PITY_AT;
    }
    function flip(k) {
      var sl = slots[k]; if (!sl || sl.done || token !== revealToken) return;
      sl.done = true;
      var it = res.items[k], back = sl.back;
      back.classList.add('flipping');
      setTimeout(function () {
        if (token !== revealToken) return;
        var e = cardEl(it.c, 'mini', it.badge);
        e.classList.add('flipin');
        e.onclick = function () { showDetail(it.c); };
        var wrap = make('div', 'reveal-wrap');
        wrap.appendChild(e);
        if (it.c.rarity === 'rare') { flash(true); sparkle(wrap); }
        else if (it.c.rarity === 'uncommon') { e.classList.add('glow-blue'); }
        back.parentNode.replaceChild(wrap, back);
        if (--left === 0) { summary(); var fa = $('#pack-flipall'); if (fa) fa.hidden = true; }
      }, 200);
    }
    res.items.forEach(function (it, k) {
      var back = make('button', 'card-back r-' + (it.c.rarity || 'common'), '<span>🎴</span>');
      back.onclick = function () { flip(k); };
      slots.push({ back: back, done: false });
      back.style.animationDelay = (k * 0.1) + 's';
      box.appendChild(back);
    });
    var all = $('#pack-flipall'); all.hidden = false;
    all.onclick = function () { res.items.forEach(function (x, k) { setTimeout(function () { flip(k); }, k * 160); }); };
  }

  function openPack(kind, elem, cost) {
    if (typeof kind !== 'string') kind = 'normal';
    var useShards = kind !== 'normal' && kind !== 'set';
    if (useShards) {
      var need = kind === 'elem' ? SHARDS_ELEM : SHARDS_RARE;
      if (state.shards < need) { toast('เศษการ์ดไม่พอ (ต้องใช้ ' + need + ' ✨)'); return; }
      state.shards -= need;
    } else {
      var price = kind === 'set' ? SET_PRICE : PACK_PRICE;
      if (state.coins < price) { toast('เหรียญไม่พอ (ต้องใช้ ' + price + ')'); return; }
      state.coins -= price;
    }
    bump('openPack');
    var cards = rollPack(kind, elem);
    if (kind === 'normal') { // การันตีใบหายากทุก 10 ซอง
      var any = cards.some(function (c) { return c.rarity === 'rare'; });
      if (!any && state.pity >= PITY_AT - 1) {
        var rares = allCards().filter(function (c) { return c.rarity === 'rare'; });
        cards[2] = upick(rares); any = true;
      }
      state.pity = any ? 0 : state.pity + 1;
    }
    var res = showPack(cards);
    save();
    renderStats(); renderShop();
    tearPack(kind, elem, function () { revealPack(res); });
  }

  function excessList() {
    var out = [];
    Object.keys(state.owned).forEach(function (id) {
      var c = ALL_MAP[id], n = state.owned[id] || 0;
      if (c && n > CARD_CAP) out.push({ c: c, n: n - CARD_CAP });
    });
    return out;
  }
  function exchangeExcess() {
    var ex = excessList(), gain = 0;
    ex.forEach(function (x) { state.owned[x.c.id] = CARD_CAP; gain += x.n * (SHARD_VAL[x.c.rarity] || 2); });
    if (!gain) { toast('ไม่มีใบเกิน'); return; }
    state.shards += gain; save(); renderShop(); renderStats();
    toast('แลกใบเกินได้ +' + gain + ' ✨');
  }

  var shopElem = 'fire', shopOdds = null;
  function renderShop() {
    var box = $('#shop-extra'); if (!box) return;
    var ex = excessList(), exGain = 0, exN = 0;
    ex.forEach(function (x) { exN += x.n; exGain += x.n * (SHARD_VAL[x.c.rarity] || 2); });
    box.innerHTML = '';
    box.appendChild(make('div', 'shard-bar', '✨ เศษการ์ด <b>' + state.shards + '</b> · การันตีใบหายากในซองปกติ: <b>' + Math.min(state.pity, PITY_AT) + '/' + PITY_AT + '</b>'));
    if (!shopOdds) { var n = 3000, withRare = 0, unc = 0, tot = 0; for (var k = 0; k < n; k++) { var r = rollPack('normal'); if (r.some(function (c) { return c.rarity === 'rare'; })) withRare++; r.forEach(function (c) { tot++; if (c.rarity === 'uncommon') unc++; }); } shopOdds = { rare: Math.round(100 * withRare / n), unc: Math.round(100 * unc / tot) }; }
    box.appendChild(make('div', 'odds', 'ซองปกติ: มีใบหายากประมาณ ' + shopOdds.rare + '% ต่อซอง · ใบพิเศษประมาณ ' + shopOdds.unc + '% ต่อใบ · ใบซ้ำเกิน ' + CARD_CAP + ' ใบแลกเป็นเศษ (ธรรมดา ' + SHARD_VAL.common + ' · พิเศษ ' + SHARD_VAL.uncommon + ' · หายาก ' + SHARD_VAL.rare + ' ✨)'));
    var ex1 = make('button', 'btn small', 'แลกใบเกิน ' + exN + ' ใบ → +' + exGain + ' ✨'); ex1.disabled = !exN; ex1.onclick = exchangeExcess;
    box.appendChild(ex1);
    if (SETS.length) {
      box.appendChild(make('h3', null, '📦 ซองตามชุด (' + SET_PRICE + ' 🪙)'));
      SETS.forEach(function (st) {
        var have = st.cards.filter(function (c) { return (state.owned[c.id] || 0) > 0; }).length;
        var sb = make('button', 'btn set-btn', st.emoji + ' ' + st.name + ' · สะสมแล้ว ' + have + '/' + st.cards.length);
        sb.disabled = state.coins < SET_PRICE;
        sb.onclick = function () { openPack('set', st.id); };
        box.appendChild(sb);
        box.appendChild(make('p', 'muted', st.desc + ' · 5 ใบ ไม่ซ้ำกันในซอง · ใบสุดท้ายการันตีพิเศษขึ้นไป'));
      });
    }
    box.appendChild(make('h3', null, '🎁 ซองพิเศษ (ใช้เศษการ์ด)'));
    var chips = make('div', 'elem-chips');
    ELEM_ORDER.forEach(function (e) {
      var b = make('button', 'f-chip' + (shopElem === e ? ' active' : ''), F.ELEMENTS[e].emoji + ' ' + F.ELEMENTS[e].name);
      b.onclick = function () { shopElem = e; renderShop(); };
      chips.appendChild(b);
    });
    box.appendChild(chips);
    var b1 = make('button', 'btn', '🌈 ซองธาตุ ' + F.ELEMENTS[shopElem].emoji + ' · ' + SHARDS_ELEM + ' ✨'); b1.disabled = state.shards < SHARDS_ELEM;
    b1.onclick = function () { openPack('elem', shopElem); };
    var b2 = make('button', 'btn', '💎 ซองหายาก · ' + SHARDS_RARE + ' ✨'); b2.disabled = state.shards < SHARDS_RARE;
    b2.onclick = function () { openPack('rare'); };
    box.appendChild(b1); box.appendChild(b2);
    box.appendChild(make('p', 'muted', 'ซองธาตุ: การ์ดตัวละครธาตุที่เลือก 4 ใบ + 1 ใบสุ่ม · ซองหายาก: การันตีใบหายาก 1 ใบ และใบพิเศษขึ้นไปอีก 1 ใบ'));
  }

  /* =====================================================
     ต่อสู้ — เมนู
     ===================================================== */
  function renderBattleMenu() {
    state.daily = state.daily || cleanDaily({});
    renderAccount();
    var ok = validDeck();
    var n = $('#battle-deck-status');
    n.className = 'notice ' + (ok ? 'ok' : 'warn');
    n.innerHTML = ok ? '✅ เด็คพร้อมแล้ว (' + DECK_SIZE + ' ใบ)'
      : '⚠️ เด็คยังไม่ครบ ' + DECK_SIZE + ' ใบ <button class="btn small" id="goto-deck">ไปจัดเด็ค</button>';
    var g = $('#goto-deck');
    if (g) g.onclick = function () { showView('deck'); };
    renderRankCard(); renderDaily();
    var st = state.stats;
    var on = st.online || { w: 0, l: 0 };
    $('#battle-stats').innerHTML = ['easy', 'medium', 'hard'].map(function (k) {
      return '<div class="sum-box"><b>' + st[k].w + '–' + st[k].l + '</b><span>' + AVATAR[k] + ' ชนะ–แพ้</span></div>';
    }).join('') + '<div class="sum-box"><b>' + on.w + '–' + on.l + '</b><span>🌐 ออนไลน์</span></div>';
  }

  function makeBotDeck(level) {
    if (level === 'easy') return pickRandom(BASE.concat(BASE), 40).reduce(function (acc, c) {
      var n = acc.filter(function (x) { return x.id === c.id; }).length;
      if (acc.length < DECK_SIZE && n < MAX_COPIES) acc.push(c);
      return acc;
    }, []);
    var spellPool = SPELLS.filter(function (c) { return c.id !== 'S07' && c.id !== 'S09'; });
    return pickRandom(BASE, 13).concat(pickRandom(spellPool, 4), pickRandom(FIELDS, 1), pickRandom(REACTS, 2));
  }

  function startBattle(level) {
    if (!validDeck()) { toast('เด็คต้องมี ' + DECK_SIZE + ' ใบก่อน'); showView('deck'); return; }
    var myDeck = state.deck.map(function (id) { return ALL_MAP[id]; });
    var knowsMe = { all: false, set: {} };
    state.found.forEach(function (id) { knowsMe.set[id] = true; });
    var knowsBot = level === 'easy' ? { all: false, set: {} } : { all: true };
    var G = B.create({
      decks: [myDeck, makeBotDeck(level)], names: ['คุณ', LEVEL_NAME[level]], knows: [knowsMe, knowsBot]
    });
    bs = { G: G, level: level, sel: null, busy: false, over: false, prev: {}, prevHp: [G.players[0].hp, G.players[1].hp] };
    document.body.classList.add('in-battle');
    $('#battle').hidden = false;
    renderBattle();
    if (G.active === 1) runBot();
  }

  /* =====================================================
     ต่อสู้ — หน้าจอเล่น
     ===================================================== */
  function manaText(P) { return '<span class="mana">◆ ' + P.mana + '/' + P.maxMana + '</span>'; }

  function statusIcons(u) {
    var s = '';
    if (u.abil.indexOf('taunt') >= 0 || u.abil.indexOf('guard') >= 0) s += '🛡️';
    if (B.isEvade(u)) s += '💨';
    if (u.keywords.indexOf('regen') >= 0) s += '♻️';
    if (B.isHaste(u)) s += '⏩';
    if (u.abil.indexOf('metal') >= 0) s += '⚙️';
    if (u.burn > 0) s += '🔥';
    if (u.stun > 0) s += '💫';
    return s;
  }

  function unitEl(u, side, targets) {
    var G = bs.G;
    var myTurn = G.active === ME() && !G.over && !bs.busy && !G.pending;
    var cls = 'unit el-' + u.element + (u.tier >= 2 ? ' tier' + u.tier : '');
    if (bs.sel && bs.sel.k === 'unit' && bs.sel.uid === u.uid) cls += ' sel';
    if (targets.indexOf(u.uid) >= 0) cls += ' tgt';
    if (side === ME() && myTurn && u.attacksLeft > 0 && B.curAtk(u) > 0) cls += ' ready';
    var d = make('div', cls);
    d.setAttribute('data-id', u.card.id);
    var art = make('div', 'u-art');
    art.appendChild(spriteEl(u.card, 52));
    d.appendChild(art);
    d.appendChild(make('div', 'u-name', u.name));
    var abn = (u.card.abilities || []).map(function (a) { return a.name; }).filter(Boolean);
    if (abn.length) d.appendChild(make('div', 'u-ab', '✧ ' + abn.join('·')));
    var atk = B.curAtk(u), mh = B.maxHp(u);
    var ac = atk > u.card.atk ? ' up' : atk < u.card.atk ? ' down' : '';
    var hc = u.hp < mh ? ' down' : u.hp > u.card.hp ? ' up' : '';
    d.appendChild(make('div', 'u-stats', '<span class="a' + ac + '">' + atk + '</span>/<span class="h' + hc + '">' + u.hp + '</span>'));
    var ic = statusIcons(u);
    d.appendChild(make('div', 'u-icons', ic || '&nbsp;'));
    var key = side + ':' + u.uid;
    var pv = bs.prev[key];
    if (pv != null && u.hp < pv) d.classList.add('hit');
    else if (pv != null && u.hp > pv) d.classList.add('heal');
    bs.prev[key] = u.hp;
    d.onclick = function (ev) { ev.stopPropagation(); onUnitClick(side, u.uid); };
    return d;
  }

  function currentTargets() {
    var G = bs.G, sel = bs.sel;
    if (!sel || G.active !== ME() || bs.busy) return [];
    if (sel.k === 'spell') return B.targetsFor(G, ME(), sel.i);
    if (sel.k === 'unit' && sel.mode === 'attack') return B.attackTargets(G, ME(), sel.uid);
    if (sel.k === 'unit' && sel.mode === 'fuse') {
      var me = G.players[ME()], out = [];
      me.board.forEach(function (u) {
        if (u.uid === sel.uid) return;
        var a = me.board.filter(function (x) { return x.uid === sel.uid; })[0];
        if (a && F.canFuse(a.card, u.card) && !a.attacked && !u.attacked) out.push(u.uid);
      });
      return out;
    }
    return [];
  }

  function renderTurnLabel() {
    if (!bs) return;
    var G = bs.G, t;
    if (G.over) t = 'จบเกม';
    else if (G.active === ME()) t = bs.busy ? '…' : '🟢 ตาคุณ';
    else t = '🔴 ตา' + (bs.online || bs.replay ? 'คู่ต่อสู้' : 'บอท');
    if (bs.replay) t = '🎞️ ' + bs.replay.i + '/' + bs.replay.rec.acts.length + ' · ' + t;
    if (bs.online && !G.over) {
      var left = Math.max(0, Math.ceil(((G.pending ? bs.online.pdl : bs.online.deadline) - Date.now()) / 1000));
      if (G.pending) t = '⏳ ตอบโต้';
      t += ' ⏱' + left;
      if (bs.online.dc) t = '⚠️ คู่ต่อสู้หลุด… ' + t;
    }
    $('#b-turn').textContent = t;
  }

  function renderBattle() {
    if (!bs) return;
    var G = bs.G, me = G.players[ME()], op = G.players[OP()];
    var myTurn = G.active === ME() && !G.over && !bs.busy && !G.pending;
    var targets = currentTargets();

    // แถบฮีโร่
    var hOpp = $('#hero-opp'), hMe = $('#hero-me');
    $('#opp-avatar').textContent = bs.online ? '🧑‍🎤' : AVATAR[bs.level];
    $('#opp-name').textContent = op.name;
    $('#opp-sub').innerHTML = manaText(op) + ' · 🂠' + op.deck.length + ' · ✋' + op.hand.length + (op.sets.length ? ' · 🎴×' + op.sets.length : '') + (op.field ? ' · ' + op.field.emoji : '');
    $('#me-sub').innerHTML = manaText(me) + ' · 🂠' + me.deck.length + (me.field ? ' · ' + me.field.emoji : '');
    $('#opp-hp').textContent = '❤ ' + Math.max(0, op.hp);
    $('#me-hp').textContent = '❤ ' + Math.max(0, me.hp);
    hOpp.classList.toggle('tgt', targets.indexOf('opp') >= 0);
    hMe.classList.toggle('tgt', targets.indexOf('me') >= 0);
    [['#opp-hp', OP()], ['#me-hp', ME()]].forEach(function (p) {
      var el = $(p[0]), hp = G.players[p[1]].hp, prev = bs.prevHp[p[1]];
      el.classList.remove('hit', 'heal');
      if (hp < prev) { void el.offsetWidth; el.classList.add('hit'); } else if (hp > prev) el.classList.add('heal');
      bs.prevHp[p[1]] = hp;
    });

    // สนาม
    [['#board-opp', op, OP()], ['#board-me', me, ME()]].forEach(function (cfg) {
      var box = $(cfg[0]);
      box.innerHTML = '';
      cfg[1].board.forEach(function (u) { box.appendChild(unitEl(u, cfg[2], targets)); });
      for (var i = cfg[1].board.length; i < B.MAX_BOARD; i++) box.appendChild(make('div', 'unit empty-slot'));
    });

    // บรรทัดกลาง
    var last = G.log.length ? G.log[G.log.length - 1].text : '—';
    $('#b-log').textContent = last;
    renderTurnLabel();
    $('#btn-endturn').disabled = !myTurn;

    // มือ
    var hand = $('#b-hand');
    hand.innerHTML = '';
    me.hand.forEach(function (c, i) {
      var e = cardEl(c, 'mini');
      e.setAttribute('data-id', c.id);
      var playable = myTurn && (c.type === 'reaction' ? me.sets.length < B.MAX_SETS : (c.cost <= me.mana && !(c.type === 'creature' && me.board.length >= B.MAX_BOARD)));
      if (!playable) e.classList.add('dim');
      if (bs.sel && (bs.sel.k === 'hand' || bs.sel.k === 'spell') && bs.sel.i === i) e.classList.add('sel');
      e.onclick = function () { onHandClick(i); };
      hand.appendChild(e);
    });
    if (!me.hand.length) hand.appendChild(make('div', 'empty', 'ไม่มีการ์ดในมือ'));

    renderSets();
    renderAction();
    renderReactPop();
    tourSync();
  }

  function renderAction() {
    if (bs && bs.replay) { renderReplayBar(); return; }
    var G = bs.G, me = G.players[ME()], sel = bs.sel, bar = $('#b-action');
    bar.innerHTML = '';
    var myTurn = G.active === ME() && !G.over && !bs.busy && !G.pending;
    function btn(label, fn, cls, disabled) {
      var b = make('button', 'btn small ' + (cls || ''), label);
      b.disabled = !!disabled;
      b.onclick = fn;
      bar.appendChild(b);
      return b;
    }
    function info(html) { bar.insertBefore(make('div', 'a-info', html), bar.firstChild); }

    if (G.pending && !G.over) { info(G.pending.resp === ME() ? '⏳ <b>ตอบโต้ได้</b> — เลือกในหน้าต่างด้านล่าง หรือกดผ่าน' : '⏳ รอ' + (bs.online ? 'คู่ต่อสู้' : 'บอท') + 'ตัดสินใจตอบโต้…'); return; }
    if (!myTurn) { info(G.over ? 'เกมจบแล้ว' : '⏳ ตา' + (bs.online ? 'คู่ต่อสู้' : 'บอท') + ' กำลังเล่น…'); return; }
    if (!sel) { info('แตะการ์ดในมือเพื่อลง · แตะการ์ดบนสนามเพื่อโจมตี/ผสม'); return; }

    if (sel.k === 'set') {
      var sc = me.sets[sel.i];
      if (!sc) { bs.sel = null; renderAction(); return; }
      info('<b>' + sc.emoji + ' ' + sc.name + '</b> · ' + (sc.speed === 3 ? '🛡️ Hyper' : '⚡ Instant') + ' · Cost ' + sc.cost + ' — ' + sc.text);
      if (sc.speed === 2) {
        var why = sc.cost > me.mana ? 'Mana ไม่พอ' : (!B.reactLegal(G, ME(), sc, []) ? 'ใช้ตอนนี้ไม่ได้' : '');
        btn('⚡ เปิดใช้เอง', function () { act({ t: 'react', slot: sel.i }); }, 'primary', !!why);
        if (why) bar.appendChild(make('span', 'a-warn', why));
      } else bar.appendChild(make('span', 'a-warn', 'Hyper ใช้ได้เฉพาะตอนตอบโต้'));
      btn('รายละเอียด', function () { showDetail(sc); });
      btn('✕', function () { bs.sel = null; renderBattle(); });
      return;
    }

    if (sel.k === 'hand' || sel.k === 'spell') {
      var c = me.hand[sel.i];
      if (!c) { bs.sel = null; renderAction(); return; }
      var txt = '<b>' + c.emoji + ' ' + c.name + '</b> · Cost ' + c.cost + ' — ';
      if (c.type === 'creature') {
        txt += '⚔' + c.atk + ' ❤' + c.hp + (c.abilities.length ? ' · ' + c.abilities.map(function (a) { return a.name; }).join(', ') : '');
      } else txt += c.text;
      info(txt);
      if (sel.k === 'spell') {
        info('<b>เลือกเป้าหมาย</b> ที่เรืองแสง · ' + c.name);
        btn('ยกเลิก', function () { bs.sel = null; renderBattle(); });
        return;
      }
      var cant = c.type === 'reaction' ? (me.sets.length >= B.MAX_SETS ? 'ช่องคว่ำเต็ม' : '') : c.cost > me.mana ? 'Mana ไม่พอ' : (c.type === 'creature' && me.board.length >= B.MAX_BOARD ? 'สนามเต็ม' : '');
      if (c.type === 'spell' && B.needsTarget(c)) {
        btn('🎯 เลือกเป้าหมาย', function () {
          if (!B.targetsFor(G, ME(), sel.i).length) { toast('ไม่มีเป้าหมาย'); return; }
          bs.sel = { k: 'spell', i: sel.i }; renderBattle();
        }, 'primary', !!cant);
      } else if (c.type === 'reaction') {
        btn('🎴 วางคว่ำ (ไม่เสีย Mana)', function () { act({ t: 'set', hand: sel.i }); }, 'primary', !!cant);
      } else {
        btn(c.type === 'creature' ? '⬇ ลงสนาม' : c.type === 'field' ? '⬇ วางสนาม' : '✨ ใช้เวทย์',
          function () { act({ t: 'play', hand: sel.i }); }, 'primary', !!cant);
      }
      if (cant) bar.appendChild(make('span', 'a-warn', cant));
      btn('รายละเอียด', function () { showDetail(c); });
      btn('✕', function () { bs.sel = null; renderBattle(); });
      return;
    }

    if (sel.k === 'unit') {
      var u = me.board.filter(function (x) { return x.uid === sel.uid; })[0];
      if (!u) { bs.sel = null; renderAction(); return; }
      var base = '<b>' + u.emoji + ' ' + u.name + '</b> ⚔' + B.curAtk(u) + ' ❤' + u.hp + '/' + B.maxHp(u);
      if (sel.mode === 'fuse' && sel.other) {
        var pv = B.fusePreview(G, ME(), sel.uid, sel.other);
        if (pv.ok) {
          info('ผสมได้ <b>' + pv.card.emoji + ' ' + pv.card.name + '</b> ⚔' + pv.card.atk + ' ❤' + pv.card.hp + ' · Cost ' + pv.cost +
            (pv.card.abilities.length ? ' · ' + pv.card.abilities.map(function (a) { return a.name; }).join(', ') : ''));
          btn('⚗️ ยืนยันผสม', function () { act({ t: 'fuse', a: sel.uid, b: sel.other }); }, 'primary', pv.cost > me.mana);
          btn('รายละเอียด', function () { showDetail(pv.card); });
        } else info(pv.error);
        btn('ยกเลิก', function () { bs.sel = null; renderBattle(); });
        return;
      }
      if (sel.mode === 'fuse') {
        info(base + ' — <b>เลือกการ์ดฝั่งเราอีกใบ</b> ที่เรืองแสงเพื่อผสม');
        btn('ยกเลิก', function () { bs.sel = { k: 'unit', uid: sel.uid, mode: 'attack' }; renderBattle(); });
        return;
      }
      var canAtk = u.attacksLeft > 0 && B.curAtk(u) > 0;
      info(base + (canAtk ? ' — แตะศัตรูเพื่อโจมตี' : u.attacked ? ' — โจมตีแล้ว' : ' — ยังโจมตีไม่ได้'));
      btn('⚗️ ผสม', function () {
        if (me.fusionsLeft <= 0) { toast('เทิร์นนี้ผสมครบแล้ว'); return; }
        if (u.attacked) { toast('การ์ดที่โจมตีแล้วผสมไม่ได้'); return; }
        bs.sel = { k: 'unit', uid: sel.uid, mode: 'fuse' }; renderBattle();
      }, '', false);
      btn('รายละเอียด', function () { showDetail(u.card); });
      btn('✕', function () { bs.sel = null; renderBattle(); });
    }
  }


  /* ---------- Reaction UI ---------- */
  function linkText(l) {
    var G = bs.G, P = G.players[l.side], nm = P.name;
    if (l.kind === 'attack') {
      var a = null, t = null;
      G.players.forEach(function (Q) { Q.board.forEach(function (u) { if (u.uid === l.unit) a = u; if (u.uid === l.target) t = u; }); });
      return '⚔ ' + esc(nm) + ': ' + (a ? a.emoji + ' ' + esc(a.name) : 'การ์ด') + ' โจมตี ' + (l.target === 'opp' ? 'ผู้เล่น' : t ? t.emoji + ' ' + esc(t.name) : 'เป้าหมาย');
    }
    if (l.kind === 'fuse') return '⚗️ ' + esc(nm) + ' กำลังผสมการ์ด';
    if (l.kind === 'summon') return '⬇ ' + esc(nm) + ' ลง ' + l.card.emoji + ' ' + esc(l.card.name);
    if (l.kind === 'field') return '🏞️ ' + esc(nm) + ' วางสนาม ' + l.card.emoji + ' ' + esc(l.card.name);
    if (l.kind === 'spell') return '✨ ' + esc(nm) + ' ใช้ ' + l.card.emoji + ' ' + esc(l.card.name);
    return (l.card.speed === 3 ? '🛡️ ' : '⚡ ') + esc(nm) + ' เปิด ' + l.card.emoji + ' ' + esc(l.card.name);
  }

  function renderSets() {
    var box = $('#sets-me'); if (!box) return;
    var G = bs.G, me = G.players[ME()];
    box.innerHTML = '';
    box.hidden = !me.sets.length;
    me.sets.forEach(function (c, i) {
      var chip = make('button', 'set-chip sp' + c.speed + (bs.sel && bs.sel.k === 'set' && bs.sel.i === i ? ' sel' : ''), '🎴 ' + esc(c.name) + ' <small>' + (c.speed === 3 ? '🛡️' : '⚡') + c.cost + '</small>');
      chip.onclick = function () {
        if (bs.replay) { showDetail(c); return; }
        if (G.active === ME() && !bs.busy && !G.over && !G.pending) { bs.sel = { k: 'set', i: i }; renderBattle(); } else showDetail(c);
      };
      box.appendChild(chip);
    });
  }

  function renderReactPop() {
    var pop = $('#react-pop'); if (!pop) return;
    var G = bs.G, pd = G.pending;
    if (bs.replay || G.over || !pd || pd.resp !== ME()) { pop.hidden = true; pop.innerHTML = ''; return; }
    var me = G.players[ME()], opts = B.reactOptions(G, ME(), pd.stack);
    var html = '<div class="rp-h">⏳ ตอบโต้ไหม?</div>';
    pd.stack.slice().reverse().forEach(function (l, k) { html += '<div class="rp-link' + (k === 0 ? ' top' : '') + '">' + (k === 0 ? 'ล่าสุด: ' : '↳ ') + linkText(l) + '</div>'; });
    pop.innerHTML = html;
    var row = make('div', 'rp-btns');
    opts.forEach(function (slot) {
      var c = me.sets[slot];
      var b = make('button', 'btn small primary', (c.speed === 3 ? '🛡️ ' : '⚡ ') + esc(c.name) + ' · ' + c.cost + '◆');
      b.title = c.text; b.onclick = function () { act({ t: 'react', slot: slot }); };
      row.appendChild(b);
      pop.appendChild(make('div', 'rp-desc', (c.speed === 3 ? '🛡️ ' : '⚡ ') + esc(c.name) + ': ' + esc(c.text)));
    });
    var pass = make('button', 'btn small', 'ผ่าน');
    pass.onclick = function () { act({ t: 'pass' }); };
    row.appendChild(pass);
    pop.appendChild(row);
    pop.hidden = false;
  }

  function announce(from) {
    if (!bs) return;
    var L = bs.G.log, out = [];
    for (var i = Math.max(0, Math.min(from, L.length)); i < L.length; i++) {
      var t = L[i].text;
      if (t.charAt(0) === '⚡' || t.indexOf('🚫') === 0) out.push(t);
    }
    if (out.length) toast(out.slice(0, 2).join(' · '));
  }
  function botContinue() {
    if (bs && !bs.online && !bs.replay && !bs.G.over && (bs.G.active === 1 || (bs.G.pending && bs.G.pending.resp === 1))) runBot();
  }

  function act(a) {
    if (!bs) return;
    if (bs.busy && !(bs.G.pending && bs.G.pending.resp === ME())) return;
    if (bs.online) { sendOnline(a); return; }
    var n0 = bs.G.log.length;
    var r = B.apply(bs.G, ME(), a);
    if (!r.ok) { toast(r.error); return; }
    bs.sel = null;
    if (!bs.tutorial) { if (a.t === 'play') bump('playCard'); else if (a.t === 'fuse') bump('fuseBattle'); }
    announce(n0);
    renderBattle();
    if (!checkEnd()) botContinue();
  }

  function onHandClick(i) {
    var G = bs.G, c = G.players[ME()].hand[i];
    if (!c) return;
    if (G.active !== ME() || bs.busy || G.over || G.pending) { showDetail(c); return; }
    bs.sel = { k: 'hand', i: i };
    renderBattle();
  }

  function onUnitClick(side, uid) {
    var G = bs.G, sel = bs.sel;
    var found = null;
    G.players[side].board.forEach(function (u) { if (u.uid === uid) found = u; });
    if (!found) return;
    if (G.active !== ME() || bs.busy || G.over || G.pending) { showDetail(found.card); return; }

    if (sel && sel.k === 'spell') {
      if (B.targetsFor(G, ME(), sel.i).indexOf(uid) >= 0) act({ t: 'play', hand: sel.i, target: uid });
      else toast('เป้าหมายไม่ถูกต้อง');
      return;
    }
    if (side === OP()) {
      if (sel && sel.k === 'unit' && sel.mode === 'attack') {
        if (B.attackTargets(G, ME(), sel.uid).indexOf(uid) >= 0) act({ t: 'attack', unit: sel.uid, target: uid });
        else {
          var hasTaunt = G.players[OP()].board.some(function (x) { return x.abil.indexOf('taunt') >= 0 || x.abil.indexOf('guard') >= 0; });
          toast(hasTaunt ? 'ต้องโจมตีตัวล่อก่อน' : 'โจมตีไม่ได้');
        }
        return;
      }
      showDetail(found.card);
      return;
    }
    if (sel && sel.k === 'unit' && sel.mode === 'fuse' && uid !== sel.uid) {
      bs.sel = { k: 'unit', uid: sel.uid, mode: 'fuse', other: uid };
      renderBattle();
      return;
    }
    bs.sel = { k: 'unit', uid: uid, mode: 'attack' };
    renderBattle();
  }

  function onHeroClick(who) {
    if (!bs) return;
    var G = bs.G, sel = bs.sel;
    if (G.active !== ME() || bs.busy || G.over || G.pending || !sel) return;
    if (sel.k === 'spell') {
      if (B.targetsFor(G, ME(), sel.i).indexOf(who) >= 0) act({ t: 'play', hand: sel.i, target: who });
      else toast('เป้าหมายไม่ถูกต้อง');
    } else if (sel.k === 'unit' && sel.mode === 'attack' && who === 'opp') {
      if (B.attackTargets(G, ME(), sel.uid).indexOf('opp') >= 0) act({ t: 'attack', unit: sel.uid, target: 'opp' });
      else toast('ต้องโจมตีตัวล่อก่อน');
    }
  }

  function endMyTurn() {
    if (!bs || bs.busy || bs.G.active !== ME() || bs.G.over || bs.G.pending) return;
    bs.sel = null;
    if (bs.online) { sendOnline({ t: 'end' }); return; }
    var r = B.apply(bs.G, ME(), { t: 'end' });
    if (!r.ok) { toast(r.error); return; }
    renderBattle();
    if (!checkEnd() && !bs.online && bs.G.active === 1) runBot();
  }

  function runBot() {
    var session = bs;
    if (!session || session.busy) return;
    session.busy = true;
    renderBattle();
    var G = session.G, guard = 0;
    function finish(delay) {
      setTimeout(function () { if (bs !== session) return; session.busy = false; renderBattle(); checkEnd(); }, delay || 0);
    }
    function step() {
      if (bs !== session) return;
      if (G.over || guard++ > 80) { finish(0); return; }
      if (G.pending) {
        if (G.pending.resp === 1) {
          var ra = B.botRespond(G, 1, session.level), n1 = G.log.length;
          var rr = B.apply(G, 1, ra);
          if (!rr.ok) B.apply(G, 1, { t: 'pass' });
          announce(n1); renderBattle();
          setTimeout(step, 750);
        } else { session.busy = false; renderBattle(); } // รอผู้เล่นตอบโต้
        return;
      }
      if (G.active !== 1) { finish(0); return; }
      var a = B.botAction(G, 1, session.level), n0 = G.log.length;
      var r = B.apply(G, 1, a);
      announce(n0);
      renderBattle();
      if (!r.ok) { B.apply(G, 1, { t: 'end' }); }
      if (!r.ok || a.t === 'end') { finish(350); return; }
      setTimeout(step, 650);
    }
    setTimeout(step, 600);
  }

  function checkEnd() {
    if (!bs || bs.over || !bs.G.over) return false;
    bs.over = true;
    if (bs.online) { endOnline(); return true; }
    var w = bs.G.over.winner, lvl = bs.level, st = state.stats[lvl];
    var title, reward;
    var tut = !!bs.tutorial;
    if (w === ME()) { if (!tut) { st.w++; bump('winBot'); } reward = REWARD[lvl]; title = '🏆 คุณชนะ!'; }
    else if (w === OP()) { if (!tut) st.l++; reward = REWARD.lose; title = '💥 คุณแพ้'; }
    else { if (!tut) st.d = (st.d || 0) + 1; reward = REWARD.draw; title = '🤝 เสมอ'; }
    if (tut) reward = 0;
    state.coins += reward;
    save();
    renderStats();
    var body = $('#modal-body');
    body.innerHTML = '<div class="detail endgame"><h3>' + title + '</h3>' +
      '<div class="subline">เทิร์นที่ ' + bs.G.turn + ' · พบ ' + LEVEL_NAME[lvl] + '</div>' +
      (tut ? '<div class="subline">แมตช์ฝึก ไม่นับรางวัลและสถิติ</div>' : '<div class="reward">+' + reward + ' 🪙</div>') +
      '<div class="actions"><button class="btn primary" id="end-again">เล่นอีกครั้ง</button><button class="btn" id="end-back">กลับเมนู</button></div></div>';
    $('#modal').hidden = false;
    modalKind = 'end';
    $('#end-again').onclick = function () { modalKind = ''; $('#modal').hidden = true; closeBattle(); startBattle(lvl); };
    $('#end-back').onclick = function () { closeModal(); };
    return true;
  }

  function closeBattle() {
    if (bs && bs.online) leaveOnline();
    if (bs && bs.replay) clearInterval(bs.replay.timer);
    bs = null;
    $('#battle').hidden = true;
    document.body.classList.remove('in-battle');
  }

  function showBattleLog() {
    if (!bs) return;
    var lines = bs.G.log.slice(-30).reverse().map(function (l) { return '<li>' + l.text + '</li>'; }).join('');
    $('#modal-body').innerHTML = '<div class="detail"><h3>บันทึกการต่อสู้</h3><ul class="logs">' + lines + '</ul></div>';
    modalKind = '';
    $('#modal').hidden = false;
  }

  function quitBattle() {
    if (!bs) return;
    if (bs.replay) { closeBattle(); showView('battle'); return; }
    if (bs.online && !bs.over && !bs.G.over) {
      if (confirm('ยอมแพ้และออกจากการต่อสู้?')) {
        Online.setFinal(bs.online.code, { winner: OP(), reason: 'resign', by: ME() });
        bs.finalReason = 'resign'; bs.G.over = { winner: OP() };
        renderBattle(); checkEnd();
      }
      return;
    }
    if (bs.over || confirm('ยอมแพ้และออกจากการต่อสู้?')) {
      if (!bs.over && !bs.G.over && !bs.tutorial) { state.stats[bs.level].l++; save(); }
      closeBattle();
      showView('battle');
    }
  }


  /* =====================================================
     ออนไลน์ — ห้อง / จับคู่เร็ว / เล่นแบบ lockstep
     ทั้งสองเครื่องรันเอนจินเดียวกันด้วย seed เดียวกัน แล้วแลกเปลี่ยนเฉพาะ "คำสั่ง"
     ===================================================== */
  var net = null;
  var TURN_SECS = 90, ROOM_KEY = 'efl_room';
  var EMOTES = ['👍 เก่งมาก', '😄 555', '😮 ว้าว', '🙏 ขอบคุณ', '😢 โอ๊ย', '⏩ เร็วหน่อย'];

  function roomMark(code) { try { if (code) localStorage.setItem(ROOM_KEY, code); else localStorage.removeItem(ROOM_KEY); } catch (e) { } }
  function myPayload() { return { d: state.deck.slice(), f: state.found.slice() }; }
  function onlineReady() {
    if (!window.Online) { toast('ออนไลน์ใช้ไม่ได้ตอนนี้ (กำลังเชื่อมต่อ หรือไม่มีอินเทอร์เน็ต)'); return false; }
    if (bs) return false;
    if (!validDeck()) { toast('เด็คต้องมี ' + DECK_SIZE + ' ใบก่อน'); showView('deck'); return false; }
    return true;
  }
  function netFail(e) { toast((e && e.message) || 'เกิดข้อผิดพลาด'); }

  function bindOnline() {
    var q = $('#on-quick'), c = $('#on-create'), j = $('#on-join'), inp = $('#on-code');
    if (!q) return;
    q.onclick = function () {
      if (!onlineReady()) return;
      q.disabled = true;
      window.Online.quick(myPayload(), false).then(function (r) { openNet(r.code, r.role); }).catch(netFail)
        .then(function () { q.disabled = false; });
    };
    c.onclick = function () {
      if (!onlineReady()) return;
      window.Online.createRoom(myPayload(), {}).then(function (r) { openNet(r.code, 'host'); }).catch(netFail);
    };
    j.onclick = function () {
      if (!onlineReady()) return;
      var code = (inp.value || '').trim().toUpperCase();
      if (code.length !== 5) { toast('รหัสห้องมี 5 ตัวอักษร'); return; }
      window.Online.joinRoom(code, myPayload()).then(function (r) { openNet(r.code, 'guest'); }).catch(netFail);
    };
    $('#b-emote').onclick = toggleEmotePalette;
    $('#on-ranked').onclick = function () {
      if (!onlineReady()) return;
      if (!window.Online.isMember()) { toast('โหมดจัดอันดับต้องล็อกอินด้วยอีเมลก่อน'); openAuthModal('login'); return; }
      if (!cloud.name) { toast('ตั้งชื่อผู้เล่นก่อน (ปุ่มตั้งชื่อด้านบน)'); return; }
      window.Online.quick(myPayload(), true).then(function (r) { openNet(r.code, r.role); }).catch(netFail);
    };
    $('#on-board').onclick = showBoard;
    $('#on-replay').onclick = openReplays;
  }

  var TIERS = [[1450, '👑 มาสเตอร์'], [1250, '💎 ไดมอนด์'], [1100, '🥇 โกลด์'], [1000, '🥈 ซิลเวอร์'], [0, '🥉 บรอนซ์']];
  function tierOf(r) { for (var i = 0; i < TIERS.length; i++) if (r >= TIERS[i][0]) return TIERS[i][1]; return TIERS[4][1]; }
  function renderRankCard() {
    var box = $('#rank-card'); if (!box) return;
    if (!window.Online || !cloud.user) { box.innerHTML = '<small>ล็อกอินด้วยอีเมลเพื่อเล่นโหมดจัดอันดับ</small>'; return; }
    box.innerHTML = '<small>กำลังโหลดแรงก์…</small>';
    var uid = cloud.user.uid;
    window.Online.getRank(uid).then(function (r) {
      if (!cloud.user || cloud.user.uid !== uid) return;
      var rt = r ? r.rating : 1000;
      box.innerHTML = '<b>' + tierOf(rt) + '</b> · ' + rt + ' แต้ม<br><small>ชนะ ' + (r ? r.w : 0) + ' · แพ้ ' + (r ? r.l : 0) + ' · ชนะ +25 / แพ้ −20</small>';
    });
  }
  function showBoard() {
    if (!window.Online) { toast('ออนไลน์ใช้ไม่ได้ตอนนี้'); return; }
    $('#modal-body').innerHTML = '<div class="detail"><h3>📊 ตารางอันดับ</h3><div class="subline">กำลังโหลด…</div></div>';
    modalKind = ''; $('#modal').hidden = false;
    window.Online.leaderboard(30).then(function (list) {
      var mine = cloud.user && cloud.user.uid;
      var rows = list.map(function (r, i) {
        return '<li class="' + (r.uid === mine ? 'me' : '') + '"><span class="pos">' + (i + 1) + '</span><span class="nm">' + esc(r.name) + '</span><span class="rt">' + tierOf(r.rating) + ' ' + r.rating + '</span></li>';
      }).join('');
      $('#modal-body').innerHTML = '<div class="detail"><h3>📊 ตารางอันดับ</h3>' + (rows ? '<ol class="board">' + rows + '</ol>' : '<div class="subline">ยังไม่มีใครมีอันดับ</div>') + '</div>';
    }).catch(function (e) { $('#modal-body').innerHTML = '<div class="detail"><h3>📊 ตารางอันดับ</h3><div class="subline">' + esc(e.message) + '</div></div>'; });
  }
  function tryRank() {
    if (!bs || !bs.online || !bs.ranked || bs.rankDone || !net || !net.st.final || !bs.G.over) return;
    bs.rankDone = true;
    var session = bs;
    window.Online.applyRanked(bs.online.code).then(function (r) {
      var el = $('#rank-line');
      if (r && el && bs === session) el.innerHTML = '🏆 แรงก์: <b>' + tierOf(r.rating) + ' ' + r.rating + '</b>';
      else if (!r && el) el.textContent = 'บันทึกแรงก์ไม่สำเร็จ (อีกฝั่งอาจยังไม่ยืนยันผล)';
      renderRankCard();
    });
  }

  function openNet(code, role, rejoin) {
    closeNet();
    net = { code: code, role: role, queue: {}, hold: {}, st: {}, rejoin: !!rejoin, sawRoom: false, started: false, lastEmote: 0 };
    var mine = net;
    net.off = window.Online.listen(code, {
      state: function (st) { if (net === mine) netState(st); },
      action: function (i, v) {
        if (net !== mine) return;
        mine.queue[i] = v;
        drain();
      },
      emote: function (v) { if (net === mine) onEmote(v); }
    });
    showWaiting();
  }

  function closeNet() {
    if (!net) return;
    try { if (net.off) net.off(); } catch (e) { }
    try { if (net.pres) net.pres(); } catch (e) { }
    net = null;
  }

  function showWaiting() {
    var n = net; if (!n) return;
    var txt = n.rejoin ? 'กำลังกลับเข้าเกม…' : n.role === 'host' ? 'รอคู่ต่อสู้…' : 'กำลังเข้าห้อง…';
    $('#modal-body').innerHTML = '<div class="detail endgame"><h3>🌐 ' + txt + '</h3>' +
      (n.role === 'host' ? '<div class="subline">แชร์รหัสนี้ให้เพื่อน หรือรอคนจับคู่เร็ว</div><div class="room-code" id="rc">' + n.code + '</div>' +
        '<div class="actions"><button class="btn" id="rc-copy">คัดลอกรหัส</button></div>' : '') +
      '<div class="actions"><button class="btn" id="rc-cancel">ยกเลิก</button></div></div>';
    $('#modal').hidden = false;
    modalKind = 'wait';
    var cp = $('#rc-copy');
    if (cp) cp.onclick = function () {
      try { navigator.clipboard.writeText(n.code); toast('คัดลอกแล้ว'); } catch (e) { toast('รหัสห้อง: ' + n.code); }
    };
    $('#rc-cancel').onclick = function () { closeModal(); };
  }

  function cancelWaiting() {
    modalKind = '';
    var n = net;
    if (!n || n.started) return;
    if (n.role === 'host' && !n.rejoin) window.Online.cancelRoom(n.code, false);
    roomMark(null);
    closeNet();
  }

  function netState(st) {
    var n = net; n.st = st;
    if (st.host) n.sawRoom = true;
    if (!n.started) {
      if (n.sawRoom && !st.host) { modalKind = ''; $('#modal').hidden = true; roomMark(null); closeNet(); toast('ห้องถูกยกเลิก'); return; }
      if (n.role === 'host' && !n.rejoin && st.guest && st.status === 'waiting' && !n.starting) {
        n.starting = true;
        window.Online.startGame(n.code).catch(function (e) { n.starting = false; netFail(e); });
      }
      if (st.status === 'playing' && st.host && st.guest && st.decks && st.decks[st.host.uid] && st.decks[st.guest.uid] &&
          st.seed != null && st.first != null) beginGame();
      return;
    }
    if (bs && bs.online) {
      var fz = st.final, trust = fz && (fz.reason === 'resign' || fz.reason === 'dc' || fz.reason === 'baddeck' ||
        (fz.reason === 'idle' && bs.online.timeouts[1 - fz.winner] >= 3));
      if (trust && !bs.G.over) {
        bs.finalReason = fz.reason;
        bs.G.over = { winner: fz.winner };
        renderBattle(); checkEnd();
      }
      evalPresence();
      tryRank();
    }
  }

  function cleanName(n) { return String(n || '').replace(/[^\p{L}\p{N}_ ]/gu, '').slice(0, 16) || 'ผู้เล่น'; }

  function beginGame() {
    var n = net, st = n.st, uid = window.Online.user().uid;
    n.started = true;
    var me = st.host.uid === uid ? 0 : 1;
    var parsed, decks, knows;
    try {
      parsed = [JSON.parse(st.decks[st.host.uid]), JSON.parse(st.decks[st.guest.uid])];
      decks = parsed.map(function (p) {
        var cnt = {};
        if (!Array.isArray(p.d) || p.d.length !== DECK_SIZE) throw new Error('size');
        return p.d.map(function (id) {
          if (typeof id !== 'string' || (cnt[id] = (cnt[id] || 0) + 1) > maxCopies(id)) throw new Error('copies');
          var c = getCard(id); if (!c || !c.type) throw new Error('card');
          return c;
        });
      });
      knows = parsed.map(function (p) { var s = {}; (Array.isArray(p.f) ? p.f : []).forEach(function (id) { if (typeof id === 'string') s[id] = true; }); return { all: false, set: s }; });
    } catch (e) {
      toast('เด็คไม่ถูกต้อง เกมถูกยกเลิก');
      window.Online.setFinal(n.code, { winner: me, reason: 'baddeck', by: me });
      closeNet(); roomMark(null); modalKind = ''; $('#modal').hidden = true;
      return;
    }
    var G = B.create({ decks: decks, names: [cleanName(st.host.name), cleanName(st.guest.name)], knows: knows, seed: st.seed, first: st.first });
    bs = {
      G: G, level: 'online', ranked: !!st.ranked, sel: null, busy: false, over: false, prev: {}, prevHp: [G.players[0].hp, G.players[1].hp], me: me,
      online: { code: n.code, next: 0, pending: false, forcing: false, timeouts: [0, 0], deadline: Date.now() + TURN_SECS * 1000,
        startedAt: Date.now(), uids: [st.host.uid, st.guest.uid], dc: false, lastActive: G.active, log: [],
        rec: { v: 1, seed: st.seed, first: st.first, names: [cleanName(st.host.name), cleanName(st.guest.name)], decks: [parsed[0].d, parsed[1].d], ranked: !!st.ranked, code: n.code } }
    };
    bs.online.timer = setInterval(onlineTick, 1000);
    n.pres = window.Online.presence(n.code);
    roomMark(n.code);
    modalKind = ''; $('#modal').hidden = true;
    document.body.classList.add('in-battle');
    $('#battle').hidden = false;
    $('#b-emote').hidden = false;
    drain(true);
    renderBattle();
    if (st.final) netState(st);
  }

  // นำคำสั่งที่ยืนยันแล้วมาใช้ตามลำดับ
  function drain(quiet) {
    if (!bs || !bs.online || !net) return;
    var o = bs.online, G = bs.G, applied = false, n0 = G.log.length;
    while (net.queue[o.next] && !net.hold[o.next]) {
      var v = net.queue[o.next]; delete net.queue[o.next]; o.next++;
      o.forcing = false;
      if (v.by === ME()) o.pending = false;
      if (v.by !== 0 && v.by !== 1) continue;
      var a; try { a = JSON.parse(v.a); } catch (e) { continue; }
      var r = B.apply(G, v.by, a);
      if (!r.ok) continue;
      if (v.by === ME() && !quiet && !v.forced) { if (a.t === 'play') bump('playCard'); else if (a.t === 'fuse') bump('fuseBattle'); }
      applied = true;
      o.log.push([v.by, v.a]);
      if (v.forced) {
        o.timeouts[v.by]++;
        if (o.timeouts[v.by] >= 3 && !G.over) window.Online.setFinal(o.code, { winner: 1 - v.by, reason: 'idle', by: ME() });
      } else o.timeouts[v.by] = 0;
      if (v.by !== ME()) bs.sel = null;
      if (G.active !== o.lastActive) { o.lastActive = G.active; o.deadline = Date.now() + TURN_SECS * 1000; }
    }
    var pk = G.pending ? G.turn + ':' + G.pending.stack.length + ':' + G.pending.resp : '';
    if (pk !== o.pk) {
      o.pk = pk;
      if (pk) o.pdl = Date.now() + 15000; else o.deadline = Math.max(o.deadline, Date.now() + 20000);
    }
    if (applied && !quiet) { announce(n0); renderBattle(); checkEnd(); }
    else if (applied) checkEnd();
  }

  function sendOnline(a) {
    var o = bs.online;
    if (o.pending || bs.G.over) return;
    var t = B.apply(B.clone(bs.G), ME(), a);
    if (!t.ok) { toast(t.error); return; }
    pushAction(ME(), a, false, true);
    bs.sel = null; renderBattle();
  }

  function pushAction(side, a, forced, mine) {
    var o = bs.online, idx = o.next, json = JSON.stringify(a), n = net, session = bs;
    if (mine) o.pending = true; else o.forcing = true;
    n.hold[idx] = true;
    window.Online.sendAction(o.code, idx, side, json, forced).then(function () {
      if (net !== n) return;
      delete n.hold[idx]; drain();
    }).catch(function () {
      if (net !== n || bs !== session) return;
      delete n.hold[idx];
      var q = n.queue[idx];
      if (q && q.by === side && q.a === json) delete n.queue[idx];
      if (mine) { o.pending = false; toast('ส่งคำสั่งไม่สำเร็จ ลองอีกครั้ง'); }
      else o.forcing = false;
      drain(); renderBattle();
    });
  }

  function onlineTick() {
    if (!bs || !bs.online) return;
    var o = bs.online, G = bs.G;
    if (bs.over || G.over) { renderTurnLabel(); return; }
    renderTurnLabel();
    if (G.pending) {
      var pl = (o.pdl - Date.now()) / 1000;
      if (o.pending || o.forcing) return;
      if (G.pending.resp === ME() && pl <= 0) { toast('หมดเวลาตอบโต้ ผ่านให้อัตโนมัติ'); pushAction(ME(), { t: 'pass' }, true, false); }
      else if (G.pending.resp === OP() && pl <= -8) pushAction(OP(), { t: 'pass' }, true, false);
      return;
    }
    var left = (o.deadline - Date.now()) / 1000;
    if (o.pending || o.forcing || document.hidden && G.active !== ME()) return;
    if (G.active === ME() && left <= 0) { toast('หมดเวลา จบเทิร์นให้อัตโนมัติ'); pushAction(ME(), { t: 'end' }, true, false); }
    else if (G.active === OP() && left <= -8) pushAction(OP(), { t: 'end' }, true, false);
  }

  function evalPresence() {
    if (!bs || !bs.online || !net) return;
    var o = bs.online, pr = net.st.presence || {}, ou = o.uids[OP()], v = pr[ou];
    var gone = v === false || (v === undefined && Date.now() - o.startedAt > 45000);
    if (gone && !o.dcTimer && !bs.G.over) {
      o.dc = true;
      o.dcTimer = setTimeout(function () {
        o.dcTimer = null;
        var p2 = (net && net.st.presence) || {};
        if (bs && bs.online === o && !bs.G.over && p2[ou] !== true) window.Online.setFinal(o.code, { winner: ME(), reason: 'dc', by: ME() });
      }, 20000);
    } else if (!gone && o.dcTimer) { clearTimeout(o.dcTimer); o.dcTimer = null; o.dc = false; }
    else if (!gone) o.dc = false;
    renderTurnLabel();
  }

  function leaveOnline() {
    var o = bs.online;
    clearInterval(o.timer); clearTimeout(o.dcTimer);
    roomMark(null);
    closeNet();
    $('#b-emote').hidden = true;
    $('#emote-pal').hidden = true;
  }

  var REASON = { resign: 'ยอมแพ้', dc: 'หลุดการเชื่อมต่อ', idle: 'ไม่ได้เล่นหลายเทิร์น', baddeck: 'เด็คไม่ถูกต้อง' };
  function endOnline() {
    var G = bs.G, o = bs.online, w = G.over.winner, turn = G.turn;
    if (!bs.finalReason) window.Online.setFinal(o.code, { winner: w, reason: 'game', by: ME() });
    window.Online.vote(o.code, window.Online.user().uid, w);
    clearInterval(o.timer);
    roomMark(null);
    saveReplay(w);
    var st = state.stats.online = state.stats.online || { w: 0, l: 0, d: 0 };
    var title, reward;
    if (w === ME()) { st.w++; reward = 30; title = '🏆 คุณชนะ!'; }
    else if (w === OP()) { st.l++; reward = 10; title = '💥 คุณแพ้'; }
    else { st.d = (st.d || 0) + 1; reward = 15; title = '🤝 เสมอ'; }
    if (turn < 4) reward = 0;
    if (turn >= 3) bump('playOnline');
    if (w === ME() && turn >= 3) bump('winOnline');
    state.coins += reward;
    save(); renderStats();
    var why = REASON[bs.finalReason];
    var oppName = G.players[OP()].name;
    var whyTxt = why ? (w === ME() ? (bs.finalReason === 'resign' ? 'คู่ต่อสู้ยอมแพ้' : 'คู่ต่อสู้ ' + why) : (bs.finalReason === 'resign' ? 'คุณยอมแพ้' : why)) : '';
    $('#modal-body').innerHTML = '<div class="detail endgame"><h3>' + title + '</h3>' +
      '<div class="subline">เทิร์นที่ ' + turn + ' · พบ ' + esc(oppName) + (whyTxt ? ' · ' + whyTxt : '') + '</div>' +
      (bs.ranked ? '<div class="subline" id="rank-line">🏆 กำลังบันทึกแรงก์…</div>' : '') +
      (reward ? '<div class="reward">+' + reward + ' 🪙</div>' : '<div class="subline">เกมสั้นเกินไป ไม่มีรางวัล</div>') +
      '<div class="actions"><button class="btn primary" id="end-back">กลับเมนู</button></div></div>';
    $('#modal').hidden = false;
    modalKind = 'end';
    $('#end-back').onclick = function () { closeModal(); };
    tryRank();
  }

  /* ---------- อีโมต ---------- */
  function toggleEmotePalette() {
    var pal = $('#emote-pal');
    if (!pal.hidden) { pal.hidden = true; return; }
    pal.innerHTML = '';
    EMOTES.forEach(function (e) {
      var b = make('button', 'btn small', e);
      b.onclick = function () { pal.hidden = true; sendEmote(e); };
      pal.appendChild(b);
    });
    var muted = emoteMuted();
    var m = make('button', 'btn small', muted ? '🔔 เปิดอีโมตคู่ต่อสู้' : '🔕 ซ่อนอีโมตคู่ต่อสู้');
    m.onclick = function () { try { localStorage.setItem('efl_mute', muted ? '' : '1'); } catch (e) { } pal.hidden = true; };
    pal.appendChild(m);
    pal.hidden = false;
  }
  function emoteMuted() { try { return !!localStorage.getItem('efl_mute'); } catch (e) { return false; } }
  function sendEmote(e) {
    if (!bs || !bs.online || !net) return;
    if (Date.now() - net.lastEmote < 2500) { toast('ส่งอีโมตถี่เกินไป'); return; }
    net.lastEmote = Date.now();
    window.Online.sendEmote(net.code, ME(), e).catch(function () { });
  }
  function onEmote(v) {
    if (!bs || !bs.online || !v || typeof v.e !== 'string') return;
    if (typeof v.t === 'number' && window.Online.now() - v.t > 6000) return;
    var mineSide = v.by === ME();
    if (!mineSide && emoteMuted()) return;
    var host = $(mineSide ? '#hero-me' : '#hero-opp');
    var b = make('div', 'emote-bubble ' + (mineSide ? 'me' : 'opp'), esc(v.e.slice(0, 20)));
    host.appendChild(b);
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 2600);
  }


  /* =====================================================
     รีเพลย์ (เอนจินกำหนดผลล่วงหน้าได้ จึงเก็บแค่ seed + เด็ค + คำสั่ง)
     ===================================================== */
  var RP_KEY = 'efl_replays';
  function loadReplays() { try { var a = JSON.parse(localStorage.getItem(RP_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveReplay(winner) {
    var o = bs.online, rec = JSON.parse(JSON.stringify(o.rec));
    rec.acts = o.log.slice(); rec.me = ME(); rec.winner = winner; rec.reason = bs.finalReason || 'game'; rec.t = Date.now(); rec.turns = bs.G.turn;
    var list = loadReplays().filter(function (r) { return r.code !== rec.code; });
    list.unshift(rec);
    try { localStorage.setItem(RP_KEY, JSON.stringify(list.slice(0, 8))); } catch (e) { /* ไม่เป็นไร */ }
  }
  function recFromRoom(room, uid) {
    var acts = Object.keys(room.actions || {}).sort().map(function (k) { return [room.actions[k].by, room.actions[k].a]; });
    var dk = [JSON.parse(room.decks[room.host.uid]).d, JSON.parse(room.decks[room.guest.uid]).d];
    return { v: 1, seed: room.seed, first: room.first, names: [cleanName(room.host.name), cleanName(room.guest.name)], decks: dk, acts: acts,
      me: room.host.uid === uid ? 0 : 1, winner: room.final ? room.final.winner : -2, reason: room.final ? room.final.reason : '', t: room.startedAt || Date.now(), ranked: !!room.ranked };
  }
  function replayG(rec, upto) {
    var decks = rec.decks.map(function (d) { return d.map(getCard); });
    var G = B.create({ decks: decks, names: rec.names, knows: [{ all: true }, { all: true }], seed: rec.seed, first: rec.first });
    for (var i = 0; i < upto; i++) { var x = rec.acts[i]; try { B.apply(G, x[0], JSON.parse(x[1])); } catch (e) { } }
    return G;
  }
  function openReplays() {
    var list = loadReplays();
    var html = '<div class="detail"><h3>🎞️ รีเพลย์</h3>';
    html += list.length ? '<ul class="rp-list">' + list.map(function (r, i) {
      var res = r.winner === r.me ? '🏆 ชนะ' : r.winner === -1 ? '🤝 เสมอ' : '💥 แพ้';
      var d = new Date(r.t);
      return '<li><span>' + res + ' vs ' + esc(r.names[1 - r.me]) + '<br><small>' + d.toLocaleDateString('th-TH') + ' · ' + (r.turns || '?') + ' เทิร์น' + (r.ranked ? ' · แรงก์' : '') + '</small></span><button class="btn small" data-i="' + i + '">ดู</button></li>';
    }).join('') + '</ul>' : '<div class="subline">ยังไม่มีรีเพลย์ (เล่นออนไลน์จบหนึ่งเกมก่อน)</div>';
    html += '<div class="subline">หรือดูจากรหัสห้อง (ห้องที่ยังไม่ถูกลบ)</div><div class="join-row"><input id="rp-code" maxlength="5" placeholder="รหัสห้อง"><button class="btn" id="rp-go">ดู</button></div></div>';
    $('#modal-body').innerHTML = html; modalKind = ''; $('#modal').hidden = false;
    $all('.rp-list button').forEach(function (b) { b.onclick = function () { startReplay(list[+b.getAttribute('data-i')]); }; });
    $('#rp-go').onclick = function () {
      if (!window.Online) { toast('ออนไลน์ใช้ไม่ได้ตอนนี้'); return; }
      window.Online.getRoom($('#rp-code').value).then(function (room) {
        if (!room || !room.guest || !room.final) { toast('ไม่พบเกมที่จบแล้วในห้องนี้'); return; }
        startReplay(recFromRoom(room, window.Online.user() ? window.Online.user().uid : ''));
      }).catch(netFail);
    };
  }
  function startReplay(rec) {
    if (bs) return;
    var G;
    try { G = replayG(rec, 0); } catch (e) { toast('เปิดรีเพลย์ไม่ได้'); return; }
    closeModal();
    bs = { G: G, level: 'replay', sel: null, busy: true, over: false, prev: {}, me: rec.me, prevHp: [G.players[0].hp, G.players[1].hp],
      replay: { rec: rec, i: 0, play: false, speed: 1, timer: null } };
    document.body.classList.add('in-battle');
    $('#battle').hidden = false; $('#b-emote').hidden = true;
    renderBattle();
  }
  function replayGoto(i) {
    var R = bs.replay; i = Math.max(0, Math.min(R.rec.acts.length, i));
    if (i === R.i + 1) { var x = R.rec.acts[R.i]; B.apply(bs.G, x[0], JSON.parse(x[1])); }
    else { bs.G = replayG(R.rec, i); bs.prevHp = [bs.G.players[0].hp, bs.G.players[1].hp]; bs.prev = {}; }
    R.i = i;
    if (i >= R.rec.acts.length) replayPlay(false);
    renderBattle();
  }
  function replayPlay(on) {
    var R = bs.replay; clearInterval(R.timer); R.play = on;
    if (on) {
      if (R.i >= R.rec.acts.length) replayGoto(0);
      R.timer = setInterval(function () { if (!bs || !bs.replay) return; replayGoto(R.i + 1); }, 1000 / R.speed);
    }
  }
  function renderReplayBar() {
    var bar = $('#b-action'), R = bs.replay; bar.innerHTML = '';
    function btn(t, f) { var b = make('button', 'btn small', t); b.onclick = f; bar.appendChild(b); return b; }
    btn('⏮', function () { replayPlay(false); replayGoto(0); });
    btn('◀', function () { replayPlay(false); replayGoto(R.i - 1); });
    btn(R.play ? '⏸' : '▶', function () { replayPlay(!R.play); renderReplayBar(); });
    btn('▶|', function () { replayPlay(false); replayGoto(R.i + 1); });
    btn('×' + R.speed, function () { R.speed = R.speed >= 4 ? 1 : R.speed * 2; if (R.play) replayPlay(true); renderReplayBar(); });
  }

  /* ---------- กลับเข้าเกมที่ค้าง ---------- */
  function checkRejoin() {
    var code; try { code = localStorage.getItem(ROOM_KEY); } catch (e) { }
    if (!code || !window.Online || !window.Online.user() || bs || net) return;
    window.Online.getRoom(code).then(function (room) {
      var u = window.Online.user();
      if (!u || !room || room.status !== 'playing' || room.final || !room.guest || (room.host.uid !== u.uid && room.guest.uid !== u.uid) ||
          window.Online.now() - (room.startedAt || 0) > 3 * 3600 * 1000) { roomMark(null); return; }
      if (bs || net) return;
      if (confirm('มีเกมออนไลน์ที่ยังค้างอยู่ กลับเข้าไปเล่นต่อไหม?')) openNet(code, room.host.uid === u.uid ? 'host' : 'guest', true);
      else roomMark(null);
    }).catch(function () { roomMark(null); });
  }


  /* =====================================================
     ภารกิจรายวัน + โบนัสล็อกอิน
     ===================================================== */
  var MISSIONS = [
    { id: 'winBot', t: 'ชนะบอท 1 ครั้ง', goal: 1, reward: 25 },
    { id: 'playOnline', t: 'เล่นออนไลน์ 1 แมตช์', goal: 1, reward: 30 },
    { id: 'winOnline', t: 'ชนะออนไลน์ 1 ครั้ง', goal: 1, reward: 40 },
    { id: 'fuseLab', t: 'ผสมในห้องทดลอง 5 ครั้ง', goal: 5, reward: 15 },
    { id: 'fuseBattle', t: 'ผสมการ์ดในสนามต่อสู้ 2 ครั้ง', goal: 2, reward: 25 },
    { id: 'playCard', t: 'ลงการ์ด 10 ใบในการต่อสู้', goal: 10, reward: 20 },
    { id: 'newRecipe', t: 'ค้นพบสูตรใหม่ 1 สูตร', goal: 1, reward: 20 },
    { id: 'openPack', t: 'เปิดซองการ์ด 1 ซอง', goal: 1, reward: 15 }
  ];
  var LOGIN_BONUS = [10, 15, 20, 25, 30, 40, 60];
  function dayKey(off) { var d = new Date(Date.now() + (off || 0) * 86400000); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function cleanDaily(x) {
    var m = {};
    if (x.m && typeof x.m === 'object') Object.keys(x.m).forEach(function (k) { var v = x.m[k]; if (v) m[k] = { p: +v.p || 0, c: !!v.c }; });
    return { d: typeof x.d === 'string' ? x.d : '', last: typeof x.last === 'string' ? x.last : '', streak: +x.streak || 0, login: !!x.login, m: m };
  }
  function mergeDaily(a, b) {
    a = cleanDaily(a || {}); b = cleanDaily(b || {});
    var hi = a.d >= b.d ? a : b, lo = hi === a ? b : a, out = { d: hi.d, last: a.last > b.last ? a.last : b.last, streak: Math.max(a.streak, b.streak), login: hi.login, m: {} };
    if (a.d === b.d) out.login = a.login || b.login;
    Object.keys(hi.m).forEach(function (k) {
      var o = hi.m[k], q = a.d === b.d ? lo.m[k] : null;
      out.m[k] = { p: Math.max(o.p, q ? q.p : 0), c: o.c || !!(q && q.c) };
    });
    if (a.d === b.d) Object.keys(lo.m).forEach(function (k) { if (!out.m[k]) out.m[k] = lo.m[k]; });
    return out;
  }
  function todayMissions() {
    var key = dayKey(), h = 0, i;
    for (i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    var pool = MISSIONS.slice(), out = [];
    while (out.length < 3) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
    return out;
  }
  function ensureDaily() {
    var key = dayKey(), D = state.daily;
    if (D.d !== key) { D.d = key; D.login = false; D.m = {}; }
    return D;
  }
  function bump(ev, n) {
    var D = ensureDaily(), changed = false;
    todayMissions().forEach(function (m) {
      if (m.id !== ev) return;
      var o = D.m[m.id] = D.m[m.id] || { p: 0, c: false };
      if (o.p < m.goal) { o.p = Math.min(m.goal, o.p + (n || 1)); changed = true; if (o.p >= m.goal) toast('✅ ภารกิจสำเร็จ: ' + m.t); }
    });
    if (changed) save();
  }
  function claimLogin() {
    var D = ensureDaily();
    if (D.login) return;
    D.streak = D.last === dayKey(-1) ? D.streak + 1 : 1;
    D.last = dayKey(); D.login = true;
    var c = LOGIN_BONUS[(D.streak - 1) % 7];
    state.coins += c; save(); renderStats(); renderDaily();
    toast('🎁 โบนัสล็อกอินวันที่ ' + D.streak + ': +' + c + ' 🪙');
  }
  function claimMission(id) {
    var D = ensureDaily(), m = todayMissions().filter(function (x) { return x.id === id; })[0], o = D.m[id];
    if (!m || !o || o.c || o.p < m.goal) return;
    o.c = true; state.coins += m.reward; save(); renderStats(); renderDaily();
    toast('+' + m.reward + ' 🪙');
  }
  function renderDaily() {
    var box = $('#daily-card'); if (!box) return;
    var D = ensureDaily();
    var next = D.login ? D.streak : (D.last === dayKey(-1) ? D.streak + 1 : 1);
    var html = '<h3>📅 ภารกิจวันนี้</h3><div class="d-login"><span>ล็อกอินต่อเนื่อง <b>' + D.streak + '</b> วัน · วันนี้ +' + LOGIN_BONUS[(next - 1) % 7] + ' 🪙</span></div>';
    box.innerHTML = html;
    var lg = make('button', 'btn small ' + (D.login ? '' : 'primary'), D.login ? 'รับแล้ว ✓' : 'รับโบนัสล็อกอิน');
    lg.disabled = D.login; lg.onclick = claimLogin;
    box.querySelector('.d-login').appendChild(lg);
    todayMissions().forEach(function (m) {
      var o = D.m[m.id] || { p: 0, c: false }, done = o.p >= m.goal;
      var row = make('div', 'd-row' + (o.c ? ' got' : ''));
      row.appendChild(make('div', 'd-txt', esc(m.t) + '<div class="d-bar"><i style="width:' + Math.round(100 * o.p / m.goal) + '%"></i></div><small>' + o.p + '/' + m.goal + '</small>'));
      var b = make('button', 'btn small ' + (done && !o.c ? 'primary' : ''), o.c ? '✓' : '+' + m.reward + ' 🪙');
      b.disabled = !done || o.c; b.onclick = function () { claimMission(m.id); };
      row.appendChild(b); box.appendChild(row);
    });
  }

  /* =====================================================
     รหัสแชร์เด็ค
     ===================================================== */
  function deckCode() {
    var c = {}, order = [];
    state.deck.forEach(function (id) { if (!c[id]) { c[id] = 0; order.push(id); } c[id]++; });
    order.sort();
    return 'EFD1:' + order.map(function (id) { return c[id] > 1 ? id + '*' + c[id] : id; }).join(',');
  }
  function parseDeckCode(txt) {
    var m = /EFD1:([A-Za-z0-9*,_]+)/.exec(String(txt || '').replace(/\s+/g, ''));
    if (!m) return null;
    var ids = [];
    m[1].split(',').forEach(function (part) {
      var p = part.split('*'), n = parseInt(p[1] || '1', 10) || 1;
      if (!ALL_MAP[p[0]]) return;
      n = Math.min(maxCopies(p[0]), n);
      for (var i = 0; i < n; i++) ids.push(p[0]);
    });
    return ids.length ? ids : null;
  }
  function openDeckShare() {
    var code = deckCode();
    $('#modal-body').innerHTML = '<div class="detail"><h3>🔗 รหัสแชร์เด็ค</h3>' +
      '<div class="subline">คัดลอกรหัสนี้ส่งให้เพื่อนได้เลย</div><textarea id="dk-out" class="dk-ta" readonly rows="3"></textarea>' +
      '<div class="actions"><button class="btn primary" id="dk-copy">คัดลอก</button></div>' +
      '<div class="subline">นำเข้าเด็คจากรหัส</div><textarea id="dk-in" class="dk-ta" rows="3" placeholder="วางรหัส EFD1:… ที่นี่"></textarea>' +
      '<div class="actions"><button class="btn" id="dk-import">นำเข้า</button></div><div class="subline" id="dk-msg"></div></div>';
    $('#dk-out').value = code;
    modalKind = ''; $('#modal').hidden = false;
    $('#dk-copy').onclick = function () { try { navigator.clipboard.writeText(code); toast('คัดลอกแล้ว'); } catch (e) { $('#dk-out').select(); toast('เลือกข้อความแล้ว กดคัดลอกเอง'); } };
    $('#dk-import').onclick = function () {
      var ids = parseDeckCode($('#dk-in').value);
      if (!ids) { $('#dk-msg').textContent = 'รหัสไม่ถูกต้อง'; return; }
      var got = {}, kept = [], miss = [];
      ids.forEach(function (id) {
        got[id] = (got[id] || 0) + 1;
        if (got[id] <= (state.owned[id] || 0)) kept.push(id); else miss.push(ALL_MAP[id].name);
      });
      state.deck = kept.slice(0, DECK_SIZE);
      save();
      if (state.deck.length < DECK_SIZE) autoDeck(true); else renderDeck();
      closeModal();
      toast(miss.length ? 'นำเข้าแล้ว · ขาด ' + miss.length + ' ใบ (เติมให้อัตโนมัติ): ' + miss.slice(0, 3).join(', ') : 'นำเข้าเด็คแล้ว');
    };
  }

  /* =====================================================
     แท็บ / เริ่มต้น
     ===================================================== */
  function showView(name) {
    $all('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    $all('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-view') === name); });
    if (name === 'book') renderBook();
    if (name === 'lab') renderLab();
    if (name === 'deck') renderDeck();
    if (name === 'shop') renderShop();
    if (name === 'battle') renderBattleMenu();
    window.scrollTo(0, 0);
  }

  function bind() {
    $all('.tab').forEach(function (t) {
      t.onclick = function () { showView(t.getAttribute('data-view')); };
    });
    $all('.seg-btn[data-pool]').forEach(function (b) {
      b.onclick = function () {
        pool = b.getAttribute('data-pool');
        $all('.seg-btn[data-pool]').forEach(function (x) { x.classList.toggle('active', x === b); });
        renderInventory();
      };
    });
    $all('.seg-btn[data-book]').forEach(function (b) {
      b.onclick = function () { bookTab = b.getAttribute('data-book'); renderBook(); };
    });
    [0, 1].forEach(function (i) {
      $('#slot-' + i).onclick = function () {
        if (slots[i]) { slots[i] = null; result = null; renderLab(); }
      };
    });
    $('#slot-result').onclick = function () { if (result) showDetail(result); };
    $('#book-search').oninput = function () { bookQ = this.value.trim(); renderBook(); };
    $('#btn-fuse').onclick = doFuse;
    $('#btn-clear').onclick = function () { slots = [null, null]; result = null; renderLab(); };
    $('#btn-continue').onclick = function () {
      if (!result || result.tier >= 3) return;
      slots = [result, null]; result = null; renderLab();
    };
    $('#modal-close').onclick = closeModal;
    $('#modal').onclick = function (e) { if (e.target === this) closeModal(); };
    $('#btn-reset').onclick = function () {
      if (confirm('ล้างข้อมูลทั้งหมด (สูตร เหรียญ คลังการ์ด เด็ค) แล้วเริ่มใหม่?')) {
        state = defaultState();
        save(); slots = [null, null]; result = null; openGroups = {};
        renderStats(); renderBook(); renderLab();
        toast('ล้างข้อมูลแล้ว');
      }
    };
    $all('.level[data-level]').forEach(function (b) { b.onclick = function () { startBattle(b.getAttribute('data-level')); }; });
    bindOnline();
    $('#btn-autodeck').onclick = autoDeck;
    $('#btn-deckshare').onclick = openDeckShare;
    $('#btn-cleardeck').onclick = function () { state.deck = []; save(); renderDeck(); };
    $('#btn-pack').onclick = function () { openPack('normal'); };
    $('#btn-endturn').onclick = endMyTurn;
    $('#b-log').onclick = showBattleLog;
    $('#btn-quit').onclick = quitBattle;
    $('#hero-opp').onclick = function () { onHeroClick('opp'); };
    $('#hero-me').onclick = function () { onHeroClick('me'); };
  }

  /* ---------- มีอะไรใหม่ ---------- */
  var VERSION = '0.8', SEEN_KEY = 'emoji-fusion-lab-seen';
  function showWhatsNew() { $('#whatsnew').hidden = false; }
  function closeWhatsNew() {
    $('#whatsnew').hidden = true;
    try { localStorage.setItem(SEEN_KEY, VERSION); } catch (e) { /* ไม่เป็นไร */ }
    maybeStartTour();
  }
  function checkWhatsNew() {
    var seen = null;
    try { seen = localStorage.getItem(SEEN_KEY); } catch (e) { /* ไม่เป็นไร */ }
    if (seen !== VERSION) { showWhatsNew(); return true; }
    return false;
  }

  /* =====================================================
     ทัวร์สอนเล่น (ครั้งแรก ข้ามได้)
     ===================================================== */
  var TOUR_KEY = 'emoji-fusion-lab-tour';
  var tour = null;
  var mePlayed = function (id) { return !!bs && bs.G.players[0].board.some(function (u) { return u.card.id === id; }); };
  var STEPS = [
    { id: 'pick', pos: 'bottom', text: '<b>ขั้น 1/3 · ผสมการ์ด</b><br>แตะ 🔥 เปลวไฟ แล้วแตะ 💧 หยดน้ำ (ที่กะพริบ) เพื่อใส่ช่องผสม',
      hl: ['#inventory [data-id=B02]', '#inventory [data-id=B05]'], done: function () { return !!(slots[0] && slots[1]); } },
    { id: 'fuse', pos: 'bottom', text: 'ดีมาก! กดปุ่ม <b>⚗️ ผสม!</b>', hl: ['#btn-fuse'], done: function () { return !!result; } },
    { id: 'look', pos: 'bottom', text: 'ได้การ์ดใหม่แล้ว! แตะ <b>การ์ดผลลัพธ์</b> ที่กะพริบ เพื่อดูความสามารถ',
      hl: ['#slot-result'], done: function () { return !!tour.detailSeen; } },
    { id: 'read', pos: 'top', text: '<b>ขั้น 2/3 · ดูความสามารถ</b><br>การ์ดผสมได้ความสามารถตามคู่ธาตุ + ความสามารถเฉพาะตัวของแม่ใบที่ Cost สูงกว่า อ่านแล้วกด ✕ เพื่อปิด',
      hl: [], done: function () { return $('#modal').hidden; } },
    { id: 'go', pos: 'top', text: 'ไปลองใช้ในการต่อสู้จริงกัน แมตช์ฝึกให้มานาพิเศษ 7 (เกมจริงเริ่มที่ 1 และเพิ่มทีละ 1) และไม่นับรางวัล',
      hl: [], button: { label: 'เริ่มแมตช์ฝึก ▶', fn: function () { startTutorialBattle(); } } },
    { id: 'play1', battle: true, pos: 'top', text: '<b>ขั้น 3/3 · แมตช์ฝึก</b><br>แตะ ⚡ หลอดไฟ ในมือ แล้วกด <b>⬇ ลงสนาม</b> (ธาตุไฟฟ้าลงแล้วโจมตีได้เลย)',
      hl: ['#b-hand [data-id=B13]'], btns: ['ลงสนาม'], done: function () { return mePlayed('B13'); } },
    { id: 'atk', battle: true, pos: 'top', text: 'แตะ ⚡ หลอดไฟ บนสนามของคุณ แล้วแตะ <b>ผู้เล่นศัตรูด้านบน</b> เพื่อโจมตี',
      hl: ['#board-me [data-id=B13]'], hero: true, done: function () { return bs.G.players[0].board.some(function (u) { return u.attacked; }); } },
    { id: 'play2', battle: true, pos: 'top', text: 'ลง 💧 หยดน้ำ และ 🔥 เปลวไฟ เพิ่ม (เตรียมผสมกันในสนาม)',
      hl: ['#b-hand [data-id=B05]', '#b-hand [data-id=B02]'], btns: ['ลงสนาม'], done: function () { return mePlayed('B05') && mePlayed('B02'); } },
    { id: 'fuse2', battle: true, pos: 'top', text: '<b>ผสมในสนาม</b><br>แตะ 💧 บนสนาม → กด ⚗️ ผสม → แตะ 🔥 → กด ⚗️ ยืนยันผสม',
      hl: ['#board-me [data-id=B05]', '#board-me [data-id=B02]'], btns: ['ผสม'], done: function () { return bs.G.players[0].board.some(function (u) { return u.tier === 2; }); } },
    { id: 'end', battle: true, pos: 'top', text: 'ปิดเทิร์นด้วย <b>จบเทิร์น</b>', hl: ['#btn-endturn'], done: function () { return bs.G.turn >= 2; } },
    { id: 'wait', battle: true, pos: 'top', text: '⏳ ตาบอท กำลังเล่น… ดูว่าเขาลงอะไร',
      hl: [], done: function () { return bs.G.active === 0 && bs.G.turn >= 3 && !bs.busy; } },
    { id: 'fin', battle: true, pos: 'top', text: '🎓 <b>จบทัวร์!</b> คุณรู้พื้นฐานแล้ว: ลงการ์ด · โจมตี · ผสม · จบเทิร์น เล่นต่อได้เลย (แมตช์นี้ไม่นับรางวัล)',
      hl: [], button: { label: 'เล่นต่อ', fn: function () { endTour(); } },
      button2: { label: 'ออกจากแมตช์', fn: function () { endTour(); closeBattle(); showView('battle'); } } }
  ];

  function tourSeen() {
    try { return localStorage.getItem(TOUR_KEY) === '1'; } catch (e) { return false; }
  }
  function tourMark() { try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) { /* ไม่เป็นไร */ } }
  function maybeStartTour() { if (!tour && !tourSeen()) startTour(); }

  function startTour() {
    if (bs) return;
    tour = { i: 0, detailSeen: false };
    slots = [null, null]; result = null; pool = 'base'; filter = 'all';
    $all('.seg-btn[data-pool]').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-pool') === 'base'); });
    $('#modal').hidden = true;
    showView('lab');
    renderFilters();
    renderLab();
  }

  function endTour() {
    tour = null;
    tourMark();
    var p = $('#tour'); if (p) p.hidden = true;
    $all('.tour-hl').forEach(function (e) { e.classList.remove('tour-hl'); });
  }

  function startTutorialBattle() {
    var deck = DEFAULT_DECK.map(function (id) { return ALL_MAP[id]; }).filter(Boolean);
    var G = B.create({
      decks: [deck, makeBotDeck('easy')], names: ['คุณ', LEVEL_NAME.easy], first: 0,
      knows: [{ all: true }, { all: false, set: {} }]
    });
    var me = G.players[0];
    me.hand = [BASE_MAP.B13, BASE_MAP.B05, BASE_MAP.B02].concat(me.hand.slice(0, 2));
    me.maxMana = 7; me.mana = 7;
    bs = { G: G, level: 'easy', tutorial: true, sel: null, busy: false, over: false, prev: {}, prevHp: [G.players[0].hp, G.players[1].hp] };
    tour.i = 5;
    document.body.classList.add('in-battle');
    $('#battle').hidden = false;
    renderBattle();
  }

  function tourSync() {
    if (!tour) return;
    for (var k = 0; k < 20; k++) {
      var st = STEPS[tour.i];
      if (!st) { endTour(); return; }
      if (st.battle && !bs) { endTour(); return; }
      if (!st.done) break;
      if (st.battle) {
        var hi = -1;
        for (var j = tour.i; j < STEPS.length; j++) if (STEPS[j].battle && STEPS[j].done && STEPS[j].done()) hi = j;
        if (hi >= tour.i) { tour.i = hi + 1; continue; }
        break;
      }
      if (st.done()) { tour.i++; continue; }
      break;
    }
    tourPanel();
  }

  function tourPanel() {
    var st = STEPS[tour.i];
    if (!st) return;
    var p = $('#tour');
    if (!p) { p = make('div'); p.id = 'tour'; document.body.appendChild(p); }
    p.hidden = false;
    p.className = 'tour pos-' + st.pos;
    p.innerHTML = '';
    p.appendChild(make('div', 'tour-step', '🎓 ทัวร์สอนเล่น · ' + (tour.i + 1) + '/' + STEPS.length));
    p.appendChild(make('div', 'tour-text', st.text));
    var row = make('div', 'tour-row');
    [st.button, st.button2].forEach(function (b) {
      if (!b) return;
      var e = make('button', 'btn small primary', b.label);
      e.onclick = b.fn;
      row.appendChild(e);
    });
    var skip = make('button', 'btn small', st.id === 'fin' ? 'ปิด' : 'ข้ามทัวร์');
    skip.onclick = endTour;
    row.appendChild(skip);
    p.appendChild(row);

    $all('.tour-hl').forEach(function (e) { e.classList.remove('tour-hl'); });
    (st.hl || []).forEach(function (sel) { var e = document.querySelector(sel); if (e) e.classList.add('tour-hl'); });
    if (st.btns) $all('#b-action button').forEach(function (b) {
      if (st.btns.some(function (t) { return b.textContent.indexOf(t) >= 0; })) b.classList.add('tour-hl');
    });
    if (st.hero && bs && bs.sel && bs.sel.k === 'unit') $('#hero-opp').classList.add('tour-hl');
  }

  /* =====================================================
     บัญชีผู้เล่น + เซฟบนคลาวด์ (ใช้ window.Online จาก online.js)
     ===================================================== */
  var cloud = { status: 'connecting', user: null, name: null, last: 0, timer: null, started: false, pending: null };

  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function payload() { return { found: state.found, points: state.points, coins: state.coins, owned: state.owned, deck: state.deck, stats: state.stats, daily: state.daily, shards: state.shards, pity: state.pity }; }
  function sig(x) { return JSON.stringify({ f: x.found, p: x.points, c: x.coins, o: x.owned, d: x.deck, s: x.stats, y: x.daily, h: x.shards, t: x.pity }); }
  function pristine(s) { return sig(s) === sig(defaultState()); }

  function normalize(c) {
    var d = defaultState();
    var s = { found: Array.isArray(c.found) ? c.found.filter(function (x) { return typeof x === 'string'; }) : [],
      points: +c.points || 0, coins: typeof c.coins === 'number' ? c.coins : d.coins,
      owned: (c.owned && typeof c.owned === 'object') ? c.owned : d.owned,
      deck: Array.isArray(c.deck) ? c.deck : d.deck, stats: d.stats, daily: c.daily ? cleanDaily(c.daily) : d.daily, shards: +c.shards || 0, pity: +c.pity || 0 };
    ['easy', 'medium', 'hard', 'online'].forEach(function (k) {
      var o = c.stats && c.stats[k];
      if (o) s.stats[k] = { w: +o.w || 0, l: +o.l || 0, d: +o.d || 0 };
    });
    return s;
  }

  function mergeStates(a, b) { // a = ในเครื่อง, b = บนคลาวด์ (รวมแบบไม่ทำให้เสียของฝั่งใด)
    var m = defaultState();
    var seen = {};
    m.found = b.found.concat(a.found).filter(function (id) { if (seen[id]) return false; seen[id] = 1; return true; });
    m.points = Math.max(a.points, b.points);
    m.coins = Math.max(a.coins, b.coins);
    m.owned = {};
    Object.keys(a.owned).concat(Object.keys(b.owned)).forEach(function (id) {
      m.owned[id] = Math.max(a.owned[id] || 0, b.owned[id] || 0);
    });
    m.deck = (b.ts || 0) > (a.ts || 0) ? b.deck : a.deck;
    ['easy', 'medium', 'hard', 'online'].forEach(function (k) {
      var sa = a.stats[k] || {}, sb = b.stats[k] || {};
      m.stats[k] = { w: Math.max(sa.w || 0, sb.w || 0), l: Math.max(sa.l || 0, sb.l || 0), d: Math.max(sa.d || 0, sb.d || 0) };
    });
    m.daily = mergeDaily(a.daily, b.daily);
    m.shards = Math.max(a.shards || 0, b.shards || 0); m.pity = Math.max(a.pity || 0, b.pity || 0);
    return m;
  }

  function refreshAll() {
    state.found = state.found.filter(function (id) { return !!getCard(id); });
    renderStats(); renderLab(); renderBook(); renderDeck(); renderBattleMenu();
  }

  function adopt(next, uid, ts) { // ใช้ข้อมูลชุดใหม่แทนของเดิมในเครื่อง
    state = next; state.uid = uid; state.ts = ts || Date.now();
    var owned = state.owned;
    owned.R01 = Math.max(owned.R01 || 0, 1); owned.R04 = Math.max(owned.R04 || 0, 1);
    state.deck = state.deck.filter(function (id) { return !!ALL_MAP[id]; });
    var cnt = {};
    state.deck = state.deck.filter(function (id) { cnt[id] = (cnt[id] || 0) + 1; return cnt[id] <= (owned[id] || 0); });
    if (state.deck.length !== DECK_SIZE) state.deck = DEFAULT_DECK.slice();
    saveLocal();
    refreshAll();
  }

  function pushNow() {
    if (!cloud.user || state.uid !== cloud.user.uid || !window.Online) return Promise.resolve();
    clearTimeout(cloud.timer); cloud.timer = null;
    cloud.status = 'syncing'; renderAccount();
    return window.Online.pushSave(cloud.user.uid, JSON.stringify(payload()), state.ts).then(function () {
      cloud.last = Date.now(); cloud.status = 'member'; renderAccount();
    }).catch(function () { cloud.status = 'error'; renderAccount(); });
  }
  function schedulePush() {
    if (!cloud.user || state.uid !== cloud.user.uid) return;
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(pushNow, 1500);
  }

  function syncDown(u) {
    return window.Online.loadSave(u.uid).then(function (cs) {
      var cstate = null;
      if (cs && cs.data) { try { cstate = normalize(JSON.parse(cs.data)); cstate.ts = cs.updatedAt || 0; } catch (e) { cstate = null; } }
      if (!cstate) { state.uid = u.uid; state.ts = state.ts || Date.now(); saveLocal(); return pushNow(); } // บัญชีใหม่: อัปโหลดข้อมูลในเครื่องขึ้นไป
      if (state.uid === u.uid) {                                        // เครื่องนี้ผูกกับบัญชีนี้อยู่แล้ว: ใช้ชุดที่ใหม่กว่า
        if (cstate.ts > (state.ts || 0)) { adopt(cstate, u.uid, cstate.ts); cloud.last = Date.now(); cloud.status = 'member'; renderAccount(); return null; }
        return pushNow();
      }
      if (pristine(state)) { adopt(cstate, u.uid, cstate.ts); cloud.last = Date.now(); cloud.status = 'member'; renderAccount(); return null; }
      askMerge(u, cstate);                                              // ทั้งสองฝั่งมีข้อมูล: ให้ผู้เล่นเลือก
      return null;
    });
  }

  function askMerge(u, cstate) {
    cloud.pending = { user: u, cstate: cstate };
    $('#modal-body').innerHTML = '<div class="detail"><h3>พบข้อมูลทั้งสองที่</h3>' +
      '<p class="muted">บัญชีนี้มีเซฟบนคลาวด์ และเครื่องนี้ก็มีข้อมูลที่เล่นไว้ เลือกวิธีรวม</p>' +
      '<div class="actions wrap"><button class="btn primary" id="mg-merge">รวมข้อมูล (แนะนำ)</button>' +
      '<button class="btn" id="mg-cloud">ใช้ของคลาวด์ ทิ้งของเครื่องนี้</button></div>' +
      '<p class="muted">รวม = ได้การ์ดและสูตรจากทั้งสองที่ ใช้ค่าเหรียญและแต้มที่สูงกว่า</p></div>';
    modalKind = 'merge';
    $('#modal').hidden = false;
    $('#mg-merge').onclick = function () { resolveMerge('merge'); };
    $('#mg-cloud').onclick = function () { resolveMerge('cloud'); };
  }
  function resolveMerge(mode) {
    var p = cloud.pending; cloud.pending = null;
    modalKind = ''; $('#modal').hidden = true;
    if (!p) return;
    var next = mode === 'cloud' ? p.cstate : mergeStates(normalizeLocal(), p.cstate);
    adopt(next, p.user.uid, Date.now());
    pushNow().then(function () { toast(mode === 'cloud' ? 'ใช้ข้อมูลจากคลาวด์แล้ว' : 'รวมข้อมูลแล้ว'); });
    afterSync();
  }
  function normalizeLocal() { var s = normalize(payload()); s.ts = state.ts || 0; return s; }

  function afterSync() { if (cloud.user && !cloud.name) openNameModal(); }

  var WELCOME_KEY = 'emoji-fusion-lab-welcome', startupDone = false;
  function welcomeSeen() { try { return localStorage.getItem(WELCOME_KEY) === '1'; } catch (e) { return false; } }
  function welcomeMark(on) { try { if (on) localStorage.setItem(WELCOME_KEY, '1'); else localStorage.removeItem(WELCOME_KEY); } catch (e) { /* ไม่เป็นไร */ } }
  function proceedStartup() { if (!checkWhatsNew()) maybeStartTour(); }
  function startup() { // เรียกครั้งเดียวหลังรู้สถานะล็อกอิน (หรือหมดเวลารอ)
    if (startupDone) return;
    startupDone = true;
    if (!cloud.user && window.Online && !welcomeSeen()) showWelcome(); else proceedStartup();
  }
  function showWelcome() { $('#welcome').hidden = false; }
  function closeWelcome() { $('#welcome').hidden = true; welcomeMark(true); proceedStartup(); }

  function handleAuth(u) {
    var first = !startupDone;
    if (first) setTimeout(checkRejoin, 1200);
    if (!u || u.isAnonymous) {
      cloud.user = null; cloud.name = null; cloud.status = 'guest'; renderAccount();
      if (first) startup();
      return;
    }
    if (!$('#welcome').hidden) closeWelcome();
    if (!u || u.isAnonymous) {
      cloud.user = null; cloud.name = null; cloud.status = 'guest'; renderAccount(); return;
    }
    cloud.user = u; cloud.status = 'syncing'; renderAccount();
    if (first) startup();
    window.Online.getProfile(u.uid).then(function (p) { cloud.name = p ? p.name : null; }).catch(function () { })
      .then(function () { return syncDown(u); })
      .then(function () { if (!cloud.pending) afterSync(); })
      .catch(function () { cloud.status = 'error'; renderAccount(); });
  }

  function initCloud() {
    if (cloud.started || !window.Online) return;
    cloud.started = true; cloud.status = 'guest'; renderAccount();
    window.Online.onAuth(handleAuth);
  }

  function renderAccount() {
    var box = $('#account-card'); if (!box) return;
    var st = cloud.status, html = '', btns = [];
    if (st === 'offline') html = '☁️ ออนไลน์ใช้ไม่ได้ตอนนี้ · เล่นออฟไลน์ได้ตามปกติ';
    else if (st === 'connecting') html = '☁️ กำลังเชื่อมต่อ…';
    else if (st === 'guest') {
      html = '👤 <b>เล่นแบบแขก</b><br><small>ข้อมูลอยู่ในเครื่องนี้เท่านั้น ล็อกอินเพื่อเซฟไว้บนคลาวด์</small>';
      btns.push(['เข้าสู่ระบบ / สมัคร', function () { openAuthModal('login'); }, 'primary']);
    } else {
      var who = cloud.name ? '<b>' + esc(cloud.name) + '</b>' : '<b>ยังไม่ตั้งชื่อ</b>';
      var sync = st === 'syncing' ? 'กำลังซิงก์…' : st === 'error' ? '⚠️ ซิงก์ไม่สำเร็จ'
        : cloud.last ? '☁️ ซิงก์แล้ว ' + new Date(cloud.last).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '☁️ ล็อกอินแล้ว';
      html = '👤 ' + who + '<br><small>' + sync + '</small>';
      if (!cloud.name) btns.push(['ตั้งชื่อ', openNameModal, 'primary']);
      if (st === 'error') btns.push(['ลองใหม่', function () { pushNow(); }]);
      btns.push(['ออกจากระบบ', doLogout]);
    }
    var chip = $('#btn-acct');
    if (chip) { var inn = (st === 'guest' || st === 'offline' || st === 'connecting'); chip.textContent = inn ? '👤' : '👤✓'; chip.classList.toggle('on', !inn); }
    box.innerHTML = '';
    box.appendChild(make('div', 'acc-text', html));
    var row = make('div', 'acc-btns');
    btns.forEach(function (b) { var e = make('button', 'btn small ' + (b[2] || ''), b[0]); e.onclick = b[1]; row.appendChild(e); });
    if (btns.length) box.appendChild(row);
  }

  function openAuthModal(mode) {
    if (!window.Online) { toast('ออนไลน์ใช้ไม่ได้ตอนนี้'); return; }
    var reg = mode === 'reg';
    $('#modal-body').innerHTML = '<div class="detail authbox"><h3>บัญชีผู้เล่น</h3>' +
      '<div class="seg"><button class="seg-btn' + (reg ? '' : ' active') + '" id="au-t-login">เข้าสู่ระบบ</button>' +
      '<button class="seg-btn' + (reg ? ' active' : '') + '" id="au-t-reg">สมัครใหม่</button></div>' +
      '<label class="fld">อีเมล<input id="au-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off"></label>' +
      '<label class="fld">รหัสผ่าน (อย่างน้อย 6 ตัว)<input id="au-pass" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '"></label>' +
      '<div class="au-msg" id="au-msg"></div>' +
      '<div class="actions"><button class="btn primary" id="au-go">' + (reg ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ') + '</button></div>' +
      (reg ? '' : '<button class="linkbtn" id="au-forgot">ลืมรหัสผ่าน?</button>') +
      '<p class="muted">เซฟการ์ด เหรียญ เด็ค ไว้บนคลาวด์ เล่นต่อได้ทุกเครื่อง</p></div>';
    modalKind = ''; $('#modal').hidden = false;
    $('#au-t-login').onclick = function () { openAuthModal('login'); };
    $('#au-t-reg').onclick = function () { openAuthModal('reg'); };
    var msg = function (t) { $('#au-msg').textContent = t || ''; };
    var go = $('#au-go');
    go.onclick = function () {
      var email = $('#au-email').value.trim(), pass = $('#au-pass').value;
      if (!email || !pass) { msg('กรอกอีเมลและรหัสผ่านก่อน'); return; }
      go.disabled = true; msg('กำลังดำเนินการ…');
      (reg ? window.Online.register(email, pass) : window.Online.login(email, pass)).then(function () {
        closeModal(); toast(reg ? 'สมัครสำเร็จ' : 'เข้าสู่ระบบแล้ว');
      }).catch(function (e) { go.disabled = false; msg(e.message); });
    };
    var fg = $('#au-forgot');
    if (fg) fg.onclick = function () {
      var email = $('#au-email').value.trim();
      if (!email) { msg('กรอกอีเมลก่อน แล้วกดลืมรหัสผ่านอีกครั้ง'); return; }
      window.Online.reset(email).then(function () { msg('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว (เช็คจดหมายขยะด้วย)'); })
        .catch(function (e) { msg(e.message); });
    };
  }

  function openNameModal() {
    if (!window.Online || !cloud.user) return;
    $('#modal-body').innerHTML = '<div class="detail authbox"><h3>ตั้งชื่อผู้เล่น</h3>' +
      '<p class="muted">ชื่อนี้จะโชว์ให้คนอื่นเห็นตอนเล่นออนไลน์และในตารางอันดับ ไม่ซ้ำกับคนอื่น</p>' +
      '<label class="fld">ชื่อ (2–16 ตัว)<input id="nm-input" maxlength="16" autocomplete="off"></label>' +
      '<div class="au-msg" id="nm-msg"></div>' +
      '<div class="actions"><button class="btn primary" id="nm-go">ตกลง</button></div></div>';
    modalKind = ''; $('#modal').hidden = false;
    var go = $('#nm-go');
    go.onclick = function () {
      go.disabled = true; $('#nm-msg').textContent = 'กำลังตรวจสอบ…';
      window.Online.setName($('#nm-input').value).then(function (p) {
        cloud.name = p.name; closeModal(); renderAccount(); toast('ตั้งชื่อแล้ว: ' + p.name);
      }).catch(function (e) { go.disabled = false; $('#nm-msg').textContent = e.message; });
    };
  }

  function doLogout() {
    if (!window.Online || !confirm('ออกจากระบบ? ข้อมูลของคุณอยู่บนคลาวด์แล้ว (เครื่องนี้จะกลับเป็นค่าเริ่มต้น)')) return;
    pushNow().then(function () {
      if (cloud.status === 'error' && !confirm('ซิงก์ครั้งล่าสุดไม่สำเร็จ ออกต่อจะเสียความคืบหน้าล่าสุด ออกเลยไหม?')) return null;
      return window.Online.logout().then(function () {
        welcomeMark(false);
        state = defaultState(); state.uid = null; state.ts = 0; saveLocal();
        slots = [null, null]; result = null; refreshAll(); toast('ออกจากระบบแล้ว');
      });
    });
  }

  window.addEventListener('efl-online', initCloud);
  document.addEventListener('visibilitychange', function () { if (document.hidden && cloud.timer) pushNow(); });
  setTimeout(function () { if (!cloud.started) { cloud.status = 'offline'; renderAccount(); } }, 7000);

  function fail(msg) {
    $('#view-lab').innerHTML = '<div class="empty">' + msg + '</div>';
  }

  function init() {
    var setsP = fetch('sets.json?v=0.19').then(function (r) { return r.ok ? r.json() : { sets: [] }; }).catch(function () { return { sets: [] }; });
    fetch('cards.json?v=0.19')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        return setsP.then(function (sd) { data.sets = sd.sets || []; return data; });
      })
      .then(function (data) {
        BASE = data.base;
        BASE.forEach(function (c) { BASE_MAP[c.id] = c; ALL_MAP[c.id] = c; });
        SPELLS = data.extras.filter(function (c) { return c.type === 'spell'; });
        FIELDS = data.extras.filter(function (c) { return c.type === 'field'; });
        REACTS = data.extras.filter(function (c) { return c.type === 'reaction'; });
        SPELLS.concat(FIELDS, REACTS).forEach(function (c) { ALL_MAP[c.id] = c; });
        SETS = data.sets; SETS.forEach(function (st) { SET_MAP[st.id] = st; st.cards.forEach(function (c) { ALL_MAP[c.id] = c; BASE_MAP[c.id] = c; }); });
        load();
        state.found = state.found.filter(function (id) { return !!getCard(id); });
        buildGroups();
        bind();
        renderFilters();
        renderStats();
        renderLab();
        $('#whatsnew-ok').onclick = closeWhatsNew;
        $('#btn-whatsnew').onclick = showWhatsNew;
        initCloud();
        $('#btn-acct').onclick = function () {
          if (cloud.user) showView('battle'); else if (window.Online) openAuthModal('login'); else toast('ออนไลน์ใช้ไม่ได้ตอนนี้ (กำลังเชื่อมต่อ หรือไม่มีอินเทอร์เน็ต)');
        };
        $('#btn-tour').onclick = function () { startTour(); };
        $('#wl-guest').onclick = closeWelcome;
        $('#wl-login').onclick = function () { openAuthModal('login'); };
        setTimeout(startup, 2500);
        window.EFL = { noTear: false, roll: function (k, e) { return rollPack(k, e); }, state: function () { return state; }, battle: function () { return bs; }, render: function () { renderBattle(); }, act: function (a) { act(a); } };
      })
      .catch(function (e) {
        if (window.console) console.error(e);
        fail('โหลดข้อมูลการ์ดไม่ได้<br>ถ้าเปิดไฟล์ตรงๆ ในเครื่อง ให้เปิดผ่านเซิร์ฟเวอร์<br>หรือลง GitHub Pages');
      });
  }

  init();
})();
