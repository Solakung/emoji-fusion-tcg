"""สร้าง sets.json — ชุดการ์ดเสริม (ซองตามชุด)
เพิ่มชุดใหม่: เติมใน SETS ด้านล่างแล้วรัน  python3 tools/gen_sets.py
การ์ดในชุดใช้ความสามารถ/คีย์เวิร์ดที่มีอยู่แล้วเท่านั้น (ดูรายชื่อจาก cards.json)"""
import json
d = json.load(open("cards.json"))
AB = {}
for c in d["base"] + d["tier2"]:
    for a in c.get("abilities", []):
        if a.get("name") and a["id"] not in AB:
            AB[a["id"]] = {"id": a["id"], "name": a["name"], "text": a["text"]}
AB.setdefault("burn", {"id": "burn", "name": "เผาไหม้", "text": "โจมตีแล้วเป้าหมายโดนเผา 1 ดาเมจ/เทิร์น (2 เทิร์น)"})
AB.setdefault("firestorm", {"id": "firestorm", "name": "พายุเพลิง", "text": "ตอนลงสนาม ศัตรูทุกตัวโดน 1 ดาเมจ"})
for k, t in {"lava": "HP +2", "fog": "หลบการโจมตีครั้งแรกของทุกเทิร์น", "metal": "ลดดาเมจที่โดนทุกครั้ง 1"}.items():
    AB.setdefault(k, {"id": k, "name": {"lava": "เกล็ดลาวา", "fog": "หมอกพราง", "metal": "เกล็ดเหล็ก"}[k], "text": t})

for k, (nm, tx) in {
    "tinker": ("ช่างประกอบ", "ตอนลงสนาม ผสมเพิ่มได้อีก 1 ครั้งเทิร์นนี้"),
    "seeker": ("นักค้นหา", "ตอนลงสนาม ค้นตัวละคร Cost ต่ำสุดจากเด็คขึ้นมือ"),
    "recall": ("เรียกคืน", "ตอนลงสนาม เก็บตัวละคร Cost สูงสุดจากสุสานคืนมือ"),
    "combo": ("คอมโบ", "ตอนลงสนาม ถ้าเทิร์นนี้ลงการ์ด/ใช้เวทย์/ผสมมาก่อนแล้ว ATK +2 ถาวร"),
    "surge": ("พลังสะสม", "ตอนลงสนาม ATK +1 ถาวรต่อการผสมที่ทำในเทิร์นนี้ (สูงสุด +3)"),
    "catalyst": ("ตัวเร่งปฏิกิริยา", "ตอนถูกใช้เป็นวัตถุดิบผสม การ์ดที่ได้ +1/+1"),
    "salvage": ("เก็บกู้", "ตอนถูกใช้เป็นวัตถุดิบผสม จั่วการ์ด 1 ใบ"),
}.items():
    AB.setdefault(k, {"id": k, "name": nm, "text": tx})

# (emoji, ชื่อ, ธาตุ, cost, atk, hp, ความหายาก, [ability ids], [keywords])
SETS = [{
    "id": "dragon", "name": "ตำนานมังกร", "emoji": "🐉", "color": ["#7a2cff", "#ff5ab0"],
    "desc": "สัตว์ในตำนานแห่งดินแดนมังกร 12 ใบ",
    "cards": [
        ("🥚", "ไข่มังกร", "fire", 1, 1, 2, "common", ["sprout"], []),
        ("🦎", "กิ้งก่าไฟ", "fire", 1, 2, 1, "common", ["lastflame"], []),
        ("🐍", "งูพิษ", "plant", 2, 2, 2, "common", ["poison"], []),
        ("🐢", "เต่าศิลา", "earth", 2, 1, 3, "common", ["guard"], []),
        ("🦅", "เหยี่ยวพายุ", "wind", 2, 2, 2, "common", [], ["haste"]),
        ("🐙", "หมึกยักษ์", "water", 3, 3, 4, "common", ["dew"], []),
        ("🐲", "มังกรน้อย", "fire", 3, 4, 3, "uncommon", ["spark"], []),
        ("🦂", "แมงป่องทราย", "earth", 3, 3, 3, "uncommon", ["trap"], []),
        ("🦈", "ฉลามสายฟ้า", "electric", 3, 4, 2, "uncommon", ["chain"], []),
        ("🦉", "นักปราชญ์ฮูก", "wind", 3, 2, 3, "uncommon", ["gust"], []),
        ("🔥", "มังกรอัคคี", "fire", 4, 5, 4, "rare", ["rampage"], []),
        ("👑", "ราชามังกรฟ้า", "electric", 4, 4, 5, "rare", ["fortify"], []),
    ]}, {
    "id": "space", "name": "จักรวาลลึกลับ", "emoji": "🚀", "color": ["#0b1d6e", "#00d4ff"],
    "desc": "ดวงดาวและสิ่งมีชีวิตนอกโลก 12 ใบ",
    "cards": [
        ("🛰️", "ดาวเทียม", "electric", 1, 1, 1, "common", ["jolt"], []),
        ("☄️", "ดาวหาง", "fire", 1, 2, 1, "common", ["lastflame"], []),
        ("🌙", "ดวงจันทร์", "earth", 2, 1, 3, "common", ["guard"], []),
        ("👽", "มนุษย์ต่างดาว", "wind", 2, 2, 2, "common", [], ["evade"]),
        ("🚀", "จรวด", "fire", 2, 3, 1, "common", [], ["haste"]),
        ("🌍", "โลก", "plant", 3, 2, 4, "common", ["bloom"], []),
        ("🌠", "ดาวตก", "fire", 3, 4, 2, "uncommon", ["burn"], []),
        ("🛸", "จานบิน", "electric", 3, 3, 3, "uncommon", ["attract"], []),
        ("🌌", "กาแล็กซี", "water", 3, 2, 4, "uncommon", ["freeze"], []),
        ("🔭", "กล้องดูดาว", "wind", 3, 2, 3, "uncommon", ["gust"], []),
        ("🕳️", "หลุมดำ", "earth", 4, 3, 5, "rare", ["guard", "trap"], []),
        ("🌟", "ซูเปอร์โนวา", "fire", 4, 5, 3, "rare", ["firestorm"], []),
    ]}, {
    "id": "ocean", "atkBonus": 1, "name": "ใต้สมุทรลึก", "emoji": "🌊", "color": ["#04476b", "#2de2c4"],
    "desc": "สัตว์ทะเลและขุมทรัพย์ใต้น้ำ 16 ใบ",
    "cards": [
        ("🦐", "กุ้งน้อย", "water", 1, 2, 1, "common", [], ["haste"]),
        ("🐚", "หอยสังข์", "earth", 1, 1, 1, "common", ["guard"], []),
        ("🌴", "ป่าชายเลน", "plant", 2, 1, 3, "common", ["bloom"], []),
        ("🦀", "ปูก้ามโต", "water", 2, 2, 2, "common", ["thorns"], []),
        ("🐠", "ปลาเขตร้อน", "wind", 2, 2, 2, "common", [], ["evade"]),
        ("🐡", "ปักเป้าพิษ", "water", 2, 2, 2, "common", ["poison"], []),
        ("🦭", "แมวน้ำ", "water", 2, 2, 2, "common", ["lifesteal"], []),
        ("⚓", "สมอเรือ", "earth", 2, 1, 3, "common", ["trap"], []),
        ("🐬", "โลมา", "water", 3, 3, 3, "common", ["dew"], []),
        ("🦑", "ปลาหมึกยักษ์", "water", 3, 3, 3, "uncommon", ["freeze"], []),
        ("🧜", "เงือกสาว", "water", 3, 2, 4, "uncommon", ["tide"], []),
        ("🏝️", "เกาะลอยฟ้า", "earth", 3, 2, 3, "uncommon", ["gust"], []),
        ("🚢", "เรือโจรสลัด", "wind", 3, 4, 2, "uncommon", ["chain"], []),
        ("🐋", "วาฬหลังค่อม", "water", 4, 3, 5, "rare", ["tide"], []),
        ("🔱", "ตรีศูลโพไซดอน", "electric", 4, 4, 3, "rare", ["attract"], []),
        ("🦞", "กุ้งมังกรเกราะหนา", "earth", 4, 3, 5, "rare", ["guard", "thorns"], []),
    ]}, {
    "id": "alchemy", "atkBonus": 1, "name": "แล็บเล่นแร่", "emoji": "🧪", "color": ["#5b2a86", "#9dff3a"],
    "desc": "ชุดคอมโบ: ผสมต่อเนื่อง ค้นการ์ด เก็บกู้ 16 ใบ",
    "cards": [
        ("🧪", "หลอดทดลอง", "water", 1, 1, 1, "common", ["salvage"], []),
        ("📜", "ม้วนตำรา", "wind", 1, 1, 1, "common", ["seeker"], []),
        ("🧫", "จานเพาะเชื้อ", "plant", 1, 1, 1, "common", ["catalyst"], []),
        ("🧰", "กล่องเครื่องมือ", "earth", 1, 1, 1, "common", ["tinker"], []),
        ("⚗️", "หม้อกลั่น", "fire", 2, 1, 2, "common", ["tinker"], []),
        ("🔬", "กล้องจุลทรรศน์", "electric", 2, 1, 2, "common", ["seeker"], []),
        ("🪄", "ไม้กายสิทธิ์", "electric", 2, 2, 1, "common", ["combo"], []),
        ("⚙️", "เฟืองกล", "earth", 2, 2, 2, "common", ["catalyst"], []),
        ("⏳", "นาฬิกาทราย", "wind", 2, 1, 2, "common", ["recall"], []),
        ("🧿", "ลูกแก้วทำนาย", "water", 2, 1, 3, "common", ["salvage"], []),
        ("🔗", "โซ่เชื่อมธาตุ", "earth", 3, 3, 3, "uncommon", ["tinker"], []),
        ("🪞", "กระจกสะท้อน", "wind", 3, 2, 3, "uncommon", ["recall"], []),
        ("🧬", "สายพันธุ์ใหม่", "plant", 3, 2, 3, "uncommon", ["surge"], []),
        ("🎇", "ประกายคอมโบ", "fire", 3, 3, 2, "uncommon", ["combo", "spark"], []),
        ("🏺", "หม้อกำเนิดใหม่", "earth", 4, 3, 4, "rare", ["recall", "seeker"], []),
        ("💠", "ผลึกพลังงาน", "electric", 4, 3, 4, "rare", ["tinker", "surge"], []),
    ]}]

out = []
for s in SETS:
    cards = []
    for i, (em, nm, el, co, at, hp, ra, abs_, kws) in enumerate(s["cards"], 1):
        cards.append({"id": "%s%02d" % (s["id"][:2].upper(), i), "type": "creature", "tier": 1, "emoji": em, "name": nm,
                      "element": el, "cost": co, "atk": at + s.get("atkBonus", 0), "hp": hp + 1,  # +1 HP: ปรับสมดุลจากการจำลอง (การ์ดชุดผสมไม่ได้)
                       "keywords": kws,
                      "abilities": [AB[a] for a in abs_], "rarity": ra, "set": s["id"]})
    out.append({k: v for k, v in s.items() if k not in ("cards", "atkBonus")} | {"cards": cards})
json.dump({"sets": out}, open("sets.json", "w"), ensure_ascii=False, indent=1)
print("sets:", [(s["id"], len(s["cards"])) for s in out])
