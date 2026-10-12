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

  var BASE = [], BASE_MAP = {}, SPELLS = [], FIELDS = [], ALL_MAP = {};
  var state = {};
  var slots = [null, null], result = null, pool = 'base', filter = 'all';
  var openGroups = {}, bookTab = 'recipes';
  var CARD_CACHE = {}, SPRITES = {};
  var bs = null; // เซสชันต่อสู้

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
    return {
      found: [], points: 0, coins: 120, owned: owned, deck: DEFAULT_DECK.slice(),
      stats: { easy: { w: 0, l: 0, d: 0 }, medium: { w: 0, l: 0, d: 0 }, hard: { w: 0, l: 0, d: 0 } }
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
        if (o && o.stats) { ['easy', 'medium', 'hard'].forEach(function (k) { if (o.stats[k]) s.stats[k] = o.stats[k]; }); }
      }
    } catch (e) { /* ใช้ค่าเริ่มต้น */ }
    state = s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ไม่เป็นไร */ }
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
    if (card.type === 'field') cls += ' field';
    var d = make('div', cls);
    d.appendChild(make('span', 'cost', String(card.cost)));
    var tag = '';
    if (card.type === 'creature' || card.type === 'field') tag += F.ELEMENTS[card.element].emoji;
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
      d.appendChild(make('div', 'stats-row', '<span class="kw-dots">' + (card.type === 'spell' ? 'เวทย์' : 'สนาม') + '</span>'));
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
      : 'การ์ดสนาม · ธาตุ' + F.ELEMENTS[card.element].name;
    det.appendChild(make('h3', null, card.emoji + ' ' + card.name));
    det.appendChild(make('div', 'subline', typeLabel + ' · Cost ' + card.cost));
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
    $('#modal').hidden = true;
    if (modalKind === 'end') { modalKind = ''; closeBattle(); showView('battle'); }
    modalKind = '';
    tourSync();
  }

  /* ---------- สถิติหัวเว็บ ---------- */
  function foundByTier(t) {
    return state.found.map(getCard).filter(function (c) { return c && c.tier === t; });
  }
  function renderStats() {
    $('#stat-coins').textContent = '🪙 ' + state.coins;
    $('#stat-points').textContent = '⭐ ' + state.points;
    $('#stat-recipes').textContent = '📖 ' + foundByTier(2).length + '/' + T2_TOTAL;
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
    var list = pool === 'base' ? BASE.slice() : state.found.map(getCard).filter(Boolean);
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

  function renderRecipes() {
    var t2 = foundByTier(2), t3 = foundByTier(3);
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
      list.forEach(function (c) {
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
    return Object.keys(c).every(function (id) { return c[id] <= MAX_COPIES && c[id] <= (state.owned[id] || 0) && !!ALL_MAP[id]; });
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

  function typeOrder(c) { return c.type === 'creature' ? 0 : c.type === 'spell' ? 1 : 2; }
  function sortCards(a, b) {
    return typeOrder(a) - typeOrder(b) || a.cost - b.cost || (a.id < b.id ? -1 : 1);
  }

  function renderDeck() {
    var counts = deckCounts(), n = state.deck.length;
    var cr = 0, sp = 0, fl = 0;
    state.deck.forEach(function (id) {
      var c = ALL_MAP[id];
      if (!c) return;
      if (c.type === 'creature') cr++; else if (c.type === 'spell') sp++; else fl++;
    });
    var ok = validDeck();
    $('#deck-summary').innerHTML =
      '<div class="sum-box ' + (ok ? 'ok' : 'warn') + '"><b>' + n + '/' + DECK_SIZE + '</b><span>' + (ok ? 'เด็คพร้อมสู้' : 'ต้องมี ' + DECK_SIZE + ' ใบ') + '</span></div>' +
      '<div class="sum-box"><b>' + cr + '·' + sp + '·' + fl + '</b><span>ตัว·เวทย์·สนาม</span></div>' +
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
        if (inDeck >= Math.min(MAX_COPIES, owned)) e.classList.add('dim');
        e.onclick = function () {
          if (state.deck.length >= DECK_SIZE) { toast('เด็คเต็ม ' + DECK_SIZE + ' ใบแล้ว'); return; }
          if ((counts[c.id] || 0) >= MAX_COPIES) { toast('ใส่ซ้ำได้ไม่เกิน ' + MAX_COPIES + ' ใบ'); return; }
          if ((counts[c.id] || 0) >= (state.owned[c.id] || 0)) { toast('การ์ดไม่พอ'); return; }
          state.deck.push(c.id); save(); renderDeck();
        };
        poolBox.appendChild(e);
      });
  }

  function autoDeck() {
    var deck = state.deck.filter(function (id) { return !!ALL_MAP[id]; });
    var counts = {};
    deck.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    var owned = Object.keys(state.owned).filter(function (id) { return state.owned[id] > 0 && ALL_MAP[id]; });
    function addFrom(type, limit) {
      var have = deck.filter(function (id) { return ALL_MAP[id].type === type; }).length;
      pickRandom(owned.filter(function (id) { return ALL_MAP[id].type === type; }), 99).forEach(function (id) {
        while (have < limit && deck.length < DECK_SIZE && (counts[id] || 0) < Math.min(MAX_COPIES, state.owned[id])) {
          deck.push(id); counts[id] = (counts[id] || 0) + 1; have++;
          if (type !== 'creature') break;
        }
      });
    }
    addFrom('creature', 14);
    addFrom('spell', 5);
    addFrom('field', 1);
    addFrom('creature', DECK_SIZE);
    addFrom('spell', DECK_SIZE);
    state.deck = deck.slice(0, DECK_SIZE);
    save(); renderDeck();
    toast(validDeck() ? 'จัดเด็คแล้ว' : 'การ์ดในคลังยังไม่พอสำหรับ ' + DECK_SIZE + ' ใบ');
  }

  /* =====================================================
     ซอง
     ===================================================== */
  function openPack() {
    if (state.coins < PACK_PRICE) { toast('เหรียญไม่พอ (ต้องใช้ ' + PACK_PRICE + ')'); return; }
    state.coins -= PACK_PRICE;
    var cards = [];
    for (var i = 0; i < 3; i++) cards.push(BASE[Math.floor(Math.random() * BASE.length)]);
    cards.push(SPELLS[Math.floor(Math.random() * SPELLS.length)]);
    cards.push(Math.random() < 0.25 ? FIELDS[Math.floor(Math.random() * FIELDS.length)] : BASE[Math.floor(Math.random() * BASE.length)]);
    var box = $('#pack-result');
    box.innerHTML = '';
    var seenNew = {};
    cards.forEach(function (c, idx) {
      var isNew = !(state.owned[c.id] > 0) && !seenNew[c.id];
      seenNew[c.id] = 1;
      state.owned[c.id] = (state.owned[c.id] || 0) + 1;
      var e = cardEl(c, 'mini', isNew ? 'ใหม่!' : null);
      e.classList.add('pop');
      e.style.animationDelay = (idx * 0.18) + 's';
      e.style.opacity = '0';
      e.style.animationFillMode = 'forwards';
      e.onclick = function () { showDetail(c); };
      box.appendChild(e);
    });
    save();
    renderStats();
  }

  /* =====================================================
     ต่อสู้ — เมนู
     ===================================================== */
  function renderBattleMenu() {
    var ok = validDeck();
    var n = $('#battle-deck-status');
    n.className = 'notice ' + (ok ? 'ok' : 'warn');
    n.innerHTML = ok ? '✅ เด็คพร้อมแล้ว (' + DECK_SIZE + ' ใบ)'
      : '⚠️ เด็คยังไม่ครบ ' + DECK_SIZE + ' ใบ <button class="btn small" id="goto-deck">ไปจัดเด็ค</button>';
    var g = $('#goto-deck');
    if (g) g.onclick = function () { showView('deck'); };
    var st = state.stats;
    $('#battle-stats').innerHTML = ['easy', 'medium', 'hard'].map(function (k) {
      return '<div class="sum-box"><b>' + st[k].w + '–' + st[k].l + '</b><span>' + AVATAR[k] + ' ชนะ–แพ้</span></div>';
    }).join('');
  }

  function makeBotDeck(level) {
    if (level === 'easy') return pickRandom(BASE.concat(BASE), 40).reduce(function (acc, c) {
      var n = acc.filter(function (x) { return x.id === c.id; }).length;
      if (acc.length < DECK_SIZE && n < MAX_COPIES) acc.push(c);
      return acc;
    }, []);
    var spellPool = SPELLS.filter(function (c) { return c.id !== 'S07' && c.id !== 'S09'; });
    return pickRandom(BASE, 14).concat(pickRandom(spellPool, 5), pickRandom(FIELDS, 1));
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
    var myTurn = G.active === 0 && !G.over && !bs.busy;
    var cls = 'unit el-' + u.element + (u.tier >= 2 ? ' tier' + u.tier : '');
    if (bs.sel && bs.sel.k === 'unit' && bs.sel.uid === u.uid) cls += ' sel';
    if (targets.indexOf(u.uid) >= 0) cls += ' tgt';
    if (side === 0 && myTurn && u.attacksLeft > 0 && B.curAtk(u) > 0) cls += ' ready';
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
    if (!sel || G.active !== 0 || bs.busy) return [];
    if (sel.k === 'spell') return B.targetsFor(G, 0, sel.i);
    if (sel.k === 'unit' && sel.mode === 'attack') return B.attackTargets(G, 0, sel.uid);
    if (sel.k === 'unit' && sel.mode === 'fuse') {
      var me = G.players[0], out = [];
      me.board.forEach(function (u) {
        if (u.uid === sel.uid) return;
        var a = me.board.filter(function (x) { return x.uid === sel.uid; })[0];
        if (a && F.canFuse(a.card, u.card) && !a.attacked && !u.attacked) out.push(u.uid);
      });
      return out;
    }
    return [];
  }

  function renderBattle() {
    if (!bs) return;
    var G = bs.G, me = G.players[0], op = G.players[1];
    var myTurn = G.active === 0 && !G.over && !bs.busy;
    var targets = currentTargets();

    // แถบฮีโร่
    var hOpp = $('#hero-opp'), hMe = $('#hero-me');
    $('#opp-avatar').textContent = AVATAR[bs.level];
    $('#opp-name').textContent = op.name;
    $('#opp-sub').innerHTML = manaText(op) + ' · 🂠' + op.deck.length + ' · ✋' + op.hand.length + (op.field ? ' · ' + op.field.emoji : '');
    $('#me-sub').innerHTML = manaText(me) + ' · 🂠' + me.deck.length + (me.field ? ' · ' + me.field.emoji : '');
    $('#opp-hp').textContent = '❤ ' + Math.max(0, op.hp);
    $('#me-hp').textContent = '❤ ' + Math.max(0, me.hp);
    hOpp.classList.toggle('tgt', targets.indexOf('opp') >= 0);
    hMe.classList.toggle('tgt', targets.indexOf('me') >= 0);
    [['#opp-hp', 1], ['#me-hp', 0]].forEach(function (p) {
      var el = $(p[0]), hp = G.players[p[1]].hp, prev = bs.prevHp[p[1]];
      el.classList.remove('hit', 'heal');
      if (hp < prev) { void el.offsetWidth; el.classList.add('hit'); } else if (hp > prev) el.classList.add('heal');
      bs.prevHp[p[1]] = hp;
    });

    // สนาม
    [['#board-opp', op, 1], ['#board-me', me, 0]].forEach(function (cfg) {
      var box = $(cfg[0]);
      box.innerHTML = '';
      cfg[1].board.forEach(function (u) { box.appendChild(unitEl(u, cfg[2], targets)); });
      for (var i = cfg[1].board.length; i < B.MAX_BOARD; i++) box.appendChild(make('div', 'unit empty-slot'));
    });

    // บรรทัดกลาง
    var last = G.log.length ? G.log[G.log.length - 1].text : '—';
    $('#b-log').textContent = last;
    $('#b-turn').textContent = G.over ? 'จบเกม' : (G.active === 0 ? (bs.busy ? '…' : '🟢 ตาคุณ') : '🔴 ตาบอท');
    $('#btn-endturn').disabled = !myTurn;

    // มือ
    var hand = $('#b-hand');
    hand.innerHTML = '';
    me.hand.forEach(function (c, i) {
      var e = cardEl(c, 'mini');
      e.setAttribute('data-id', c.id);
      var playable = myTurn && c.cost <= me.mana && !(c.type === 'creature' && me.board.length >= B.MAX_BOARD);
      if (!playable) e.classList.add('dim');
      if (bs.sel && (bs.sel.k === 'hand' || bs.sel.k === 'spell') && bs.sel.i === i) e.classList.add('sel');
      e.onclick = function () { onHandClick(i); };
      hand.appendChild(e);
    });
    if (!me.hand.length) hand.appendChild(make('div', 'empty', 'ไม่มีการ์ดในมือ'));

    renderAction();
    tourSync();
  }

  function renderAction() {
    var G = bs.G, me = G.players[0], sel = bs.sel, bar = $('#b-action');
    bar.innerHTML = '';
    var myTurn = G.active === 0 && !G.over && !bs.busy;
    function btn(label, fn, cls, disabled) {
      var b = make('button', 'btn small ' + (cls || ''), label);
      b.disabled = !!disabled;
      b.onclick = fn;
      bar.appendChild(b);
      return b;
    }
    function info(html) { bar.insertBefore(make('div', 'a-info', html), bar.firstChild); }

    if (!myTurn) { info(G.over ? 'เกมจบแล้ว' : '⏳ ตาบอท กำลังเล่น…'); return; }
    if (!sel) { info('แตะการ์ดในมือเพื่อลง · แตะการ์ดบนสนามเพื่อโจมตี/ผสม'); return; }

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
      var cant = c.cost > me.mana ? 'Mana ไม่พอ' : (c.type === 'creature' && me.board.length >= B.MAX_BOARD ? 'สนามเต็ม' : '');
      if (c.type === 'spell' && B.needsTarget(c)) {
        btn('🎯 เลือกเป้าหมาย', function () {
          if (!B.targetsFor(G, 0, sel.i).length) { toast('ไม่มีเป้าหมาย'); return; }
          bs.sel = { k: 'spell', i: sel.i }; renderBattle();
        }, 'primary', !!cant);
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
        var pv = B.fusePreview(G, 0, sel.uid, sel.other);
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

  function act(a) {
    if (!bs || bs.busy) return;
    var r = B.apply(bs.G, 0, a);
    if (!r.ok) { toast(r.error); return; }
    bs.sel = null;
    renderBattle();
    checkEnd();
  }

  function onHandClick(i) {
    var G = bs.G, c = G.players[0].hand[i];
    if (!c) return;
    if (G.active !== 0 || bs.busy || G.over) { showDetail(c); return; }
    bs.sel = { k: 'hand', i: i };
    renderBattle();
  }

  function onUnitClick(side, uid) {
    var G = bs.G, sel = bs.sel;
    var found = null;
    G.players[side].board.forEach(function (u) { if (u.uid === uid) found = u; });
    if (!found) return;
    if (G.active !== 0 || bs.busy || G.over) { showDetail(found.card); return; }

    if (sel && sel.k === 'spell') {
      if (B.targetsFor(G, 0, sel.i).indexOf(uid) >= 0) act({ t: 'play', hand: sel.i, target: uid });
      else toast('เป้าหมายไม่ถูกต้อง');
      return;
    }
    if (side === 1) {
      if (sel && sel.k === 'unit' && sel.mode === 'attack') {
        if (B.attackTargets(G, 0, sel.uid).indexOf(uid) >= 0) act({ t: 'attack', unit: sel.uid, target: uid });
        else {
          var hasTaunt = G.players[1].board.some(function (x) { return x.abil.indexOf('taunt') >= 0 || x.abil.indexOf('guard') >= 0; });
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
    if (G.active !== 0 || bs.busy || G.over || !sel) return;
    if (sel.k === 'spell') {
      if (B.targetsFor(G, 0, sel.i).indexOf(who) >= 0) act({ t: 'play', hand: sel.i, target: who });
      else toast('เป้าหมายไม่ถูกต้อง');
    } else if (sel.k === 'unit' && sel.mode === 'attack' && who === 'opp') {
      if (B.attackTargets(G, 0, sel.uid).indexOf('opp') >= 0) act({ t: 'attack', unit: sel.uid, target: 'opp' });
      else toast('ต้องโจมตีตัวล่อก่อน');
    }
  }

  function endMyTurn() {
    if (!bs || bs.busy || bs.G.active !== 0 || bs.G.over) return;
    bs.sel = null;
    var r = B.apply(bs.G, 0, { t: 'end' });
    if (!r.ok) { toast(r.error); return; }
    renderBattle();
    if (!checkEnd() && bs.G.active === 1) runBot();
  }

  function runBot() {
    var session = bs;
    if (!session || session.busy) return;
    session.busy = true;
    renderBattle();
    var G = session.G, guard = 0;
    function step() {
      if (bs !== session) return;
      if (G.over || G.active !== 1 || guard++ > 60) { session.busy = false; renderBattle(); checkEnd(); return; }
      var a = B.botAction(G, 1, session.level);
      var r = B.apply(G, 1, a);
      renderBattle();
      if (!r.ok) { B.apply(G, 1, { t: 'end' }); }
      if (!r.ok || a.t === 'end') { setTimeout(function () { if (bs !== session) return; session.busy = false; renderBattle(); checkEnd(); }, 350); return; }
      setTimeout(step, 650);
    }
    setTimeout(step, 600);
  }

  function checkEnd() {
    if (!bs || bs.over || !bs.G.over) return false;
    bs.over = true;
    var w = bs.G.over.winner, lvl = bs.level, st = state.stats[lvl];
    var title, reward;
    var tut = !!bs.tutorial;
    if (w === 0) { if (!tut) st.w++; reward = REWARD[lvl]; title = '🏆 คุณชนะ!'; }
    else if (w === 1) { if (!tut) st.l++; reward = REWARD.lose; title = '💥 คุณแพ้'; }
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
    if (bs.over || confirm('ยอมแพ้และออกจากการต่อสู้?')) {
      if (!bs.over && !bs.G.over && !bs.tutorial) { state.stats[bs.level].l++; save(); }
      closeBattle();
      showView('battle');
    }
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
    $all('.level').forEach(function (b) { b.onclick = function () { startBattle(b.getAttribute('data-level')); }; });
    $('#btn-autodeck').onclick = autoDeck;
    $('#btn-cleardeck').onclick = function () { state.deck = []; save(); renderDeck(); };
    $('#btn-pack').onclick = openPack;
    $('#btn-endturn').onclick = endMyTurn;
    $('#b-log').onclick = showBattleLog;
    $('#btn-quit').onclick = quitBattle;
    $('#hero-opp').onclick = function () { onHeroClick('opp'); };
    $('#hero-me').onclick = function () { onHeroClick('me'); };
  }

  /* ---------- มีอะไรใหม่ ---------- */
  var VERSION = '0.4', SEEN_KEY = 'emoji-fusion-lab-seen';
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

  function fail(msg) {
    $('#view-lab').innerHTML = '<div class="empty">' + msg + '</div>';
  }

  function init() {
    fetch('cards.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        BASE = data.base;
        BASE.forEach(function (c) { BASE_MAP[c.id] = c; ALL_MAP[c.id] = c; });
        SPELLS = data.extras.filter(function (c) { return c.type === 'spell'; });
        FIELDS = data.extras.filter(function (c) { return c.type === 'field'; });
        SPELLS.concat(FIELDS).forEach(function (c) { ALL_MAP[c.id] = c; });
        load();
        state.found = state.found.filter(function (id) { return !!getCard(id); });
        buildGroups();
        bind();
        renderFilters();
        renderStats();
        renderLab();
        $('#whatsnew-ok').onclick = closeWhatsNew;
        $('#btn-whatsnew').onclick = showWhatsNew;
        $('#btn-tour').onclick = function () { startTour(); };
        if (!checkWhatsNew()) maybeStartTour();
        window.EFL = { state: function () { return state; }, battle: function () { return bs; } };
      })
      .catch(function (e) {
        if (window.console) console.error(e);
        fail('โหลดข้อมูลการ์ดไม่ได้<br>ถ้าเปิดไฟล์ตรงๆ ในเครื่อง ให้เปิดผ่านเซิร์ฟเวอร์<br>หรือลง GitHub Pages');
      });
  }

  init();
})();
