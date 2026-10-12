"""Emoji Fusion TCG - card generator + balance report (v0.2)."""
import json, math, itertools, statistics

ELEMENTS = ["fire", "water", "plant", "electric", "earth", "wind"]
# เรียงวงจร: แต่ละธาตุชนะธาตุถัดไป
CYCLE = ["fire", "plant", "earth", "wind", "electric", "water"]
EL_EMOJI = {"fire": "🔥", "water": "💧", "plant": "🌿", "electric": "⚡", "earth": "🪨", "wind": "💨"}
FUSE_FACTOR = 0.8  # v0.2: ปรับจาก 0.7 หลังตรวจสมดุล
KEYWORD = {"plant": "regen", "electric": "haste", "wind": "evade"}  # คีย์เวิร์ดประจำธาตุ

# (emoji, ชื่อ, ธาตุ, cost, atk, hp)
BASE = [
    ("🕯️", "เทียน", "fire", 1, 2, 1), ("🔥", "เปลวไฟ", "fire", 2, 4, 1),
    ("🌋", "ภูเขาไฟ", "fire", 3, 5, 2), ("☀️", "ดวงอาทิตย์", "fire", 4, 7, 2),
    ("💧", "หยดน้ำ", "water", 1, 1, 2), ("🐟", "ปลา", "water", 2, 2, 3),
    ("❄️", "น้ำแข็ง", "water", 3, 3, 4), ("🌊", "คลื่น", "water", 4, 4, 5),
    ("🌱", "ต้นอ่อน", "plant", 1, 1, 1), ("🍄", "เห็ด", "plant", 2, 2, 2),
    ("🌸", "ดอกไม้", "plant", 3, 2, 4), ("🌳", "ต้นไม้", "plant", 4, 3, 5),
    ("💡", "หลอดไฟ", "electric", 1, 2, 1), ("🔋", "แบตเตอรี่", "electric", 2, 3, 1),
    ("🧲", "แม่เหล็ก", "electric", 3, 4, 2), ("⚡", "สายฟ้า", "electric", 4, 5, 3),
    ("🪨", "หิน", "earth", 1, 1, 2), ("🕳️", "หลุม", "earth", 2, 1, 4),
    ("💎", "เพชร", "earth", 3, 2, 5), ("⛰️", "ภูเขา", "earth", 4, 3, 6),
    ("🪶", "ขนนก", "wind", 1, 1, 1), ("☁️", "เมฆ", "wind", 2, 2, 2),
    ("💨", "ลม", "wind", 3, 3, 3), ("🌪️", "ทอร์นาโด", "wind", 4, 4, 4),
]

# ความสามารถตามคู่ธาตุ (key = frozenset)
PAIR = {
    ("fire", "water"): ("ไอน้ำ", "💨", "steam", "ตอนลงสนาม ศัตรูทุกตัว ATK -1 ถึงจบเทิร์น"),
    ("fire", "plant"): ("ไฟป่า", "🔥", "burn", "โจมตีแล้วเป้าหมายโดนเผา 1 ดาเมจ/เทิร์น (2 เทิร์น)"),
    ("electric", "fire"): ("พลาสมา", "☄️", "plasma", "ดาเมจที่ทำใส่ผู้เล่นศัตรู +1"),
    ("earth", "fire"): ("ลาวา", "🌋", "lava", "HP +2"),
    ("fire", "wind"): ("พายุไฟ", "🔥", "firestorm", "ตอนลงสนาม ศัตรูทุกตัวโดน 1 ดาเมจ"),
    ("plant", "water"): ("ป่าฝน", "🌧️", "rainforest", "จบเทิร์น ฟื้น HP ผู้เล่น 1"),
    ("electric", "water"): ("ช็อต", "⚡", "shock", "เป้าหมายที่ถูกโจมตีข้ามการโจมตีเทิร์นถัดไป"),
    ("earth", "water"): ("โคลน", "🟤", "mud", "ศัตรูที่ถูกโจมตี ATK -1 ถาวร (ต่ำสุด 0)"),
    ("water", "wind"): ("หมอก", "🌫️", "fog", "หลบการโจมตีครั้งแรกของทุกเทิร์น"),
    ("electric", "plant"): ("เมล็ดพลัง", "🌰", "seedpower", "ตอนลงสนาม Mana +1 (เทิร์นนี้)"),
    ("earth", "plant"): ("ป่าทึบ", "🌲", "taunt", "ศัตรูต้องโจมตีตัวนี้ก่อน (Taunt)"),
    ("plant", "wind"): ("สปอร์", "🍃", "spore", "ตอนลงสนาม จั่วการ์ด 1 ใบ"),
    ("earth", "electric"): ("โลหะ", "⚙️", "metal", "ลดดาเมจที่โดนทุกครั้ง 1"),
    ("electric", "wind"): ("พายุฟ้า", "⛈️", "stormbolt", "ลงแล้วโจมตีได้เลย และถ้า ATK <= 3 โจมตีได้ 2 ครั้ง/เทิร์น"),
    ("earth", "wind"): ("พายุทราย", "🏜️", "sandstorm", "ตอนลงสนาม เป้าหมาย 1 ตัว ATK -1 ถาวร"),
}
# ความสามารถเฉพาะตัวของการ์ดพื้นฐาน 24 ใบ (id, ชื่อ, คำอธิบาย) เรียงตาม BASE
BASE_ABILITY = [
    ("lastflame", "ไฟสุดท้าย", "ตอนถูกกำจัด ผู้เล่นศัตรูโดน 1 ดาเมจ"),
    ("spark", "ประกายไฟ", "ตอนลงสนาม ศัตรูตัวที่ HP ต่ำสุดโดน 1 ดาเมจ"),
    ("eruption", "ภูเขาไฟระเบิด", "ตอนถูกกำจัด ศัตรูทุกตัวโดน 1 ดาเมจ"),
    ("radiance", "รังสี", "จบเทิร์น ศัตรูตัวที่ HP ต่ำสุดโดน 1 ดาเมจ"),
    ("dew", "น้ำค้าง", "ตอนลงสนาม ฟื้น HP ผู้เล่น 2"),
    ("tide", "น้ำขึ้น", "ตอนลงสนาม พวกเดียวกัน 1 ตัว (HP ต่ำสุด) HP +1 ถาวร"),
    ("freeze", "แช่แข็ง", "ตอนลงสนาม ศัตรูตัวที่ ATK สูงสุดโจมตีไม่ได้ 1 เทิร์น"),
    ("lifesteal", "ดูดชีวิต", "ทุกครั้งที่โจมตี ฟื้น HP ผู้เล่น 1"),
    ("sprout", "งอกงาม", "จบเทิร์น ATK +1 ถาวร (สูงสุด +3)"),
    ("poison", "พิษ", "โจมตีแล้วเป้าหมายโดนพิษ 1 ดาเมจ/เทิร์น (2 เทิร์น)"),
    ("bloom", "ออกดอก", "ตอนลงสนาม พวกเดียวกันทุกตัวฟื้น HP 2"),
    ("thorns", "หนาม", "ตอนถูกโจมตี ผู้โจมตีโดน 1 ดาเมจเพิ่ม"),
    ("charge", "ชาร์จ", "ตอนลงสนาม Mana +1 (เทิร์นนี้)"),
    ("jolt", "ช็อตไฟ", "ตอนลงสนาม ผู้เล่นศัตรูโดน 1 ดาเมจ"),
    ("attract", "ดูดพลัง", "ตอนลงสนาม ศัตรูตัวที่ ATK สูงสุด ATK -2 เทิร์นนี้"),
    ("chain", "ฟ้าแลบต่อ", "โจมตีการ์ดศัตรู แล้วศัตรูอีก 1 ตัว (HP ต่ำสุด) โดน 1 ดาเมจ"),
    ("fall", "หินร่วง", "ตอนถูกกำจัด ศัตรูตัวที่ HP ต่ำสุดโดน 2 ดาเมจ"),
    ("trap", "กับดัก", "ตอนถูกโจมตี ผู้โจมตีเสีย ATK 1 ถาวร"),
    ("fortify", "เสริมเกราะ", "ตอนลงสนาม พวกเดียวกันทุกตัว HP +1 ถาวร"),
    ("guard", "ปราการ", "ศัตรูต้องโจมตีตัวนี้ก่อน (Taunt)"),
    ("gust", "ลมหมุน", "ตอนลงสนาม จั่วการ์ด 1 ใบ"),
    ("wisp", "วิญญาณลม", "ตอนถูกกำจัด จั่วการ์ด 1 ใบ"),
    ("gale", "ลมหอบ", "ตอนลงสนาม ศัตรูตัวที่ Cost สูงสุดถูกตีกลับเข้ามือ"),
    ("rampage", "คลั่ง", "ถ้าโจมตีแล้วกำจัดการ์ดศัตรูได้ โจมตีได้อีก 1 ครั้ง"),
]
SAME = ("เสริมพลัง", "✨", "empower", "ไม่มีความสามารถใหม่ แต่ได้ +1/+1")

# ค่าโดดเด่นของความสามารถ (ใช้ปรับสมดุลในตัวเลข: สำหรับหักลบสถิติ)
ABILITY_VALUE = {  # แต้มสถิติที่ความสามารถ "มีค่า" ประมาณการ
    "steam": 1.5, "burn": 1.5, "plasma": 1.0, "lava": 0, "firestorm": 2.0,
    "rainforest": 1.5, "shock": 1.5, "mud": 1.5, "fog": 1.5, "seedpower": 1.0,
    "taunt": 1.0, "spore": 1.5, "metal": 1.5, "stormbolt": 2.0, "sandstorm": 1.5,
    "empower": 0, "inherited": 0,
}

def dedupe(lst):
    seen, out = set(), []
    for x in lst:
        if x["id"] not in seen:
            seen.add(x["id"]); out.append(x)
    return out

def pair_key(a, b):
    return tuple(sorted((a, b)))

def dominant(a, b):
    """ธาตุหลัก = ธาตุของแม่ cost สูงกว่า; เท่ากันใช้ลำดับวงจร"""
    if a["cost"] != b["cost"]:
        return (a if a["cost"] > b["cost"] else b)["element"]
    return min(a["element"], b["element"], key=CYCLE.index)

def dominant_card(a, b):
    if a["cost"] != b["cost"]:
        return a if a["cost"] > b["cost"] else b
    return a if CYCLE.index(a["element"]) <= CYCLE.index(b["element"]) else b

def fuse(a, b, bonus_stat=0):
    """ผสมการ์ดสองใบ คืน dict การ์ดใหม่"""
    ea, eb = a["element"], b["element"]
    el = dominant(a, b)
    atk = math.ceil((a["atk"] + b["atk"]) * FUSE_FACTOR)
    hp = math.ceil((a["hp"] + b["hp"]) * FUSE_FACTOR)
    abilities = []
    keywords = sorted(set(a["keywords"]) | set(b["keywords"]))
    tier = max(a["tier"], b["tier"]) + 1
    # ถ้าแม่ใบใดเป็นการ์ดผสม (tier>=2) -> สืบทอดความสามารถ
    inherited = []
    for p in (a, b):
        inherited += [x for x in p["abilities"] if x["id"] != "empower"]
    if tier == 2:
        key = pair_key(ea, eb)
        if ea == eb:
            name, em, aid, desc = SAME
            atk += 1; hp += 1
        else:
            name, em, aid, desc = PAIR[key]
            if aid == "lava":
                hp += 2
        abilities = [{"id": aid, "text": desc}]
        # สืบทอดความสามารถเฉพาะตัวของแม่ที่ Cost สูงกว่า
        abilities += [dict(x) for x in dominant_card(a, b)["abilities"] if x["id"] != "empower"]
        title = f"{name}"
    else:
        # ขั้น 3
        if a["tier"] == 2 and b["tier"] == 2:
            abilities = dedupe(inherited)[:3]  # ได้ความสามารถของแม่ทั้งสอง (สูงสุด 3)
        else:
            parent_t2 = a if a["tier"] == 2 else b
            other = b if parent_t2 is a else a
            new = None
            k = pair_key(parent_t2["element"], other["element"])
            if parent_t2["element"] != other["element"]:
                name, em, aid, desc = PAIR[k]
                new = {"id": aid, "text": desc}
                if aid == "lava":
                    hp += 2
            abilities = [x for x in parent_t2["abilities"] if x["id"] != "empower"]
            if new and all(new["id"] != x["id"] for x in abilities):
                abilities.append(new)
            abilities = abilities[:3]
        title = "ผสม3"
    cost = min(math.ceil((a["cost"] + b["cost"]) / 2) + 1, 6)
    emoji = a["emoji"] + b["emoji"]
    return {
        "type": "creature", "tier": tier, "emoji": emoji,
        "name": title, "element": el, "cost": cost, "atk": atk, "hp": hp,
        "keywords": keywords, "abilities": abilities,
        "parents": [a["id"], b["id"]],
    }

def make_base():
    cards = []
    for i, (e, n, el, c, atk, hp) in enumerate(BASE):
        cards.append({
            "id": f"B{i+1:02d}", "type": "creature", "tier": 1, "emoji": e, "name": n,
            "element": el, "cost": c, "atk": atk, "hp": hp,
            "keywords": [KEYWORD[el]] if el in KEYWORD else [],
            "abilities": [{"id": BASE_ABILITY[i][0], "name": BASE_ABILITY[i][1], "text": BASE_ABILITY[i][2]}],
            "rarity": "common",
        })
    return cards

SPELLS = [
    ("🔥", "ลูกไฟ", 1, "สร้าง 3 ดาเมจให้เป้าหมาย 1 ตัว (การ์ดหรือผู้เล่น)"),
    ("🌧️", "ฝนตก", 2, "ฟื้น HP การ์ดฝั่งเราทุกใบ 2"),
    ("🌱", "ปลูกพืช", 1, "ฟื้น HP เป้าหมายฝั่งเรา 3"),
    ("⚡", "ฟ้าผ่า", 2, "สร้าง 4 ดาเมจให้การ์ดศัตรู 1 ใบ"),
    ("🪨", "หินถล่ม", 3, "สร้าง 2 ดาเมจให้การ์ดศัตรูทุกใบ"),
    ("🌬️", "ลมพัด", 1, "ส่งการ์ดบนสนาม 1 ใบกลับมือเจ้าของ"),
    ("🧫", "ตัวเร่งปฏิกิริยา", 1, "เทิร์นนี้ผสมได้อีก 1 ครั้ง"),
    ("📖", "ตำราสูตร", 1, "จั่วการ์ด 2 ใบ"),
    ("🧪", "หลอดทดลอง", 2, "เทิร์นนี้ การ์ดผสมที่หลอมได้ +1/+1"),
    ("🛡️", "โล่", 1, "การ์ดฝั่งเรา 1 ใบ HP +3 จนจบเทิร์น"),
    ("🌀", "แยกตัว", 3, "แยกการ์ดผสมฝั่งเรา 1 ใบ กลับเป็นการ์ดแม่ 2 ใบ (พลังเต็ม)"),
    ("☄️", "ดาวตก", 4, "สร้าง 5 ดาเมจให้เป้าหมาย 1 ตัว"),
]
FIELDS = [(el, e, n) for el, e, n in [
    ("fire", "🌋", "ทุ่งลาวา"), ("water", "🏝️", "ทะเลสาบ"), ("plant", "🌲", "ป่าลึก"),
    ("electric", "🌩️", "เมฆฟ้าคะนอง"), ("earth", "🏔️", "หุบเขา"), ("wind", "🌄", "ที่ราบสูง"),
]]

def make_spells_fields():
    out = []
    for i, (e, n, c, t) in enumerate(SPELLS):
        out.append({"id": f"S{i+1:02d}", "type": "spell", "emoji": e, "name": n,
                    "cost": c, "text": t, "rarity": "common"})
    for i, (el, e, n) in enumerate(FIELDS):
        out.append({"id": f"F{i+1:02d}", "type": "field", "emoji": e, "name": n, "element": el,
                    "cost": 2, "rarity": "uncommon",
                    "text": f"การ์ดธาตุ{EL_EMOJI[el]} ฝั่งเรา HP +1 และผสมการ์ดที่มีธาตุนี้ลด Cost 1 (ต่ำสุด 1) ลงสนามได้ทีละใบ ใบใหม่แทนที่ใบเก่า"})
    return out

def total_power(c):
    # ค่าพลังรวม + มูลค่าความสามารถ/คีย์เวิร์ด
    kw = len(c["keywords"]) * 0.5
    ab = sum(ABILITY_VALUE.get(a["id"], 1.0) for a in c["abilities"])
    return c["atk"] + c["hp"] + kw + ab

def main():
    base = make_base()
    extras = make_spells_fields()
    # ขั้น 2: ทุกคู่ (รวมคู่ซ้ำธาตุ) ของการ์ดพื้นฐาน (ไม่รวมใบเดียวกันผสมกันเอง)
    t2 = []
    n = 0
    for a, b in itertools.combinations(base, 2):
        c = fuse(a, b)
        n += 1
        c["id"] = f"T2-{a['id']}-{b['id']}"
        c["rarity"] = "uncommon"
        t2.append(c)
    # ขั้น 3 สุ่มตัวอย่างเพื่อตรวจสมดุล (ไม่สร้างทั้งหมด)
    import random
    random.seed(1)
    t3 = []
    for _ in range(400):
        a = random.choice(t2)
        b = random.choice(base + t2)
        if a is b:
            continue
        c = fuse(a, b)
        c["id"] = "T3-sample"
        c["rarity"] = "legendary"
        t3.append(c)

    json.dump({"base": base, "extras": extras, "tier2": t2}, open("cards.json", "w"), ensure_ascii=False, indent=1)

    # ---------- รายงานสมดุล ----------
    lines = []
    lines.append(f"base={len(base)} spells={len(SPELLS)} fields={len(FIELDS)} tier2={len(t2)} (คู่ที่ผสมได้ C(24,2)=276 ✓)")
    # เทียบ power/cost
    def eff(c):
        return total_power(c) / c["cost"]
    for label, group in (("base", base), ("tier2", t2), ("tier3(sample)", t3)):
        e = [eff(c) for c in group]
        lines.append(f"{label}: power/cost mean={statistics.mean(e):.2f} min={min(e):.2f} max={max(e):.2f}")
    # สถิติตาม cost ของ tier 2
    lines.append("\nTier2 ตาม cost: จำนวน / ATK เฉลี่ย / HP เฉลี่ย / power เฉลี่ย")
    for cst in range(2, 7):
        g = [c for c in t2 if c["cost"] == cst]
        if g:
            lines.append(f"  cost {cst}: n={len(g)} atk={statistics.mean(c['atk'] for c in g):.1f} "
                         f"hp={statistics.mean(c['hp'] for c in g):.1f} power={statistics.mean(total_power(c) for c in g):.1f}")
    lines.append("\nbase ตาม cost: power เฉลี่ย")
    for cst in range(1, 5):
        g = [c for c in base if c["cost"] == cst]
        lines.append(f"  cost {cst}: power={statistics.mean(total_power(c) for c in g):.1f}")
    # outliers
    outs = sorted(t2, key=eff)
    lines.append("\nT2 อ่อนสุด 5 ใบ (power/cost ต่ำ):")
    for c in outs[:5]:
        lines.append(f"  {c['emoji']} cost{c['cost']} {c['atk']}/{c['hp']} {c['abilities'][0]['id']} eff={eff(c):.2f}")
    lines.append("T2 แรงสุด 5 ใบ:")
    for c in outs[-5:]:
        lines.append(f"  {c['emoji']} cost{c['cost']} {c['atk']}/{c['hp']} {c['abilities'][0]['id']} eff={eff(c):.2f}")
    # เทียบกับพื้นฐาน cost เท่ากัน: ผสมต้องไม่เก่งกว่าการ์ดพื้นฐาน cost เท่ากันเกินไป
    lines.append("\nอัตราส่วน power(T2)/power(base) ที่ cost เท่ากัน:")
    for cst in range(2, 5):
        gb = statistics.mean(total_power(c) for c in base if c["cost"] == cst)
        gt = statistics.mean(total_power(c) for c in t2 if c["cost"] == cst)
        lines.append(f"  cost {cst}: {gt/gb:.2f}")
    # วงจรธาตุ
    lines.append("\nT2 จำนวนต่อธาตุหลัก: " + ", ".join(f"{k}={sum(1 for c in t2 if c['element']==k)}" for k in ELEMENTS))
    # ความสามารถที่ T3 ได้เกิน 2 ?
    bad = [c for c in t3 if len(c["abilities"]) > 3]
    lines.append(f"T3 sample abilities>2: {len(bad)}")
    open("balance_report.txt", "w").write("\n".join(lines))
    print("\n".join(lines))

if __name__ == "__main__":
    main()
