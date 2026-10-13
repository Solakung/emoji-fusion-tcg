"""สร้าง ph.json — ชุดทดลอง "ฟินิกส์ 12 สี" (ใช้ได้เฉพาะบัญชีที่กำหนด ดู script.js: PH_HASH)
รัน: python3 tools/gen_phoenix.py   (ความสามารถใหม่: embers pyre kindle rainbow — ดู battle.js)"""
import json
d = json.load(open("cards.json"))
AB = {}
for c in d["base"] + d["tier2"]:
    for a in c.get("abilities", []):
        if a.get("name") and a["id"] not in AB:
            AB[a["id"]] = {"id": a["id"], "name": a["name"], "text": a["text"]}
for k, (nm, tx) in {
    "seeker": ("นักค้นหา", "ตอนลงสนาม ค้นตัวละคร Cost ต่ำสุดจากเด็คขึ้นมือ"),
    "recall": ("เรียกคืน", "ตอนลงสนาม เก็บตัวละคร Cost สูงสุดจากสุสานคืนมือ"),
    "vanish": ("หายตัว", "ตอนถูกกำจัด กลับเข้ามือเจ้าของ (ถ้ามือไม่เต็ม)"),
}.items():
    AB.setdefault(k, {"id": k, "name": nm, "text": tx})
AB["embers"] = {"id": "embers", "name": "ถ่านคุ", "text": "ตอนลงสนาม ATK +1 ถาวรต่อตัวละครในสุสาน 2 ใบ (สูงสุด +3)"}
AB["pyre"] = {"id": "pyre", "name": "เผาสุสาน", "text": "ตอนลงสนาม เนรเทศตัวละครในสุสาน 2 ใบ (Cost ต่ำสุด) แล้วจั่ว 1 ใบ ฟื้น HP ผู้เล่น 2"}
AB["kindle"] = {"id": "kindle", "name": "ก่อไฟ", "text": "ตอนลงสนาม ถ้าเทิร์นนี้ทำคอมโบ 2 ขึ้นไป: สั่งการ 1 ครั้ง"}
AB["rainbow"] = {"id": "rainbow", "name": "รุ้งฟื้นชีพ", "text": "ตอนลงสนาม เก็บตัวละครจากสุสานคืนมือ ถ้าคอมโบ 3 ขึ้นไปสั่งการ 1 ครั้งด้วย"}

# (emoji, ชื่อ, ธาตุ, cost, atk, hp, ความหายาก, [ability ids])
CARDS = [
    ("🥚", "ไข่ฟินิกส์แดง", "fire", 1, 1, 2, "common", ["vanish"]),
    ("🐣", "ฟินิกส์ส้ม", "fire", 1, 1, 2, "common", ["embers"]),
    ("🐥", "ฟินิกส์เหลือง", "electric", 2, 2, 3, "common", ["seeker"]),
    ("🐤", "ฟินิกส์เขียว", "plant", 2, 1, 4, "common", ["recall"]),
    ("🦜", "ฟินิกส์ฟ้า", "water", 2, 2, 3, "common", ["dew"]),
    ("🦢", "ฟินิกส์คราม", "water", 3, 2, 4, "uncommon", ["pyre"]),
    ("🦚", "ฟินิกส์ม่วง", "wind", 3, 3, 3, "uncommon", ["kindle"]),
    ("🦩", "ฟินิกส์ชมพู", "plant", 3, 2, 5, "uncommon", ["bloom"]),
    ("🕊️", "ฟินิกส์ขาว", "wind", 3, 2, 4, "uncommon", ["embers", "gust"]),
    ("🦅", "ฟินิกส์ดำ", "earth", 3, 3, 4, "uncommon", ["wisp", "vanish"]),
    ("🔥", "ฟินิกส์ทอง", "fire", 4, 3, 6, "rare", ["recall", "kindle"]),
    ("🌈", "ฟินิกส์รุ้ง", "wind", 4, 4, 6, "rare", ["rainbow"]),
]
BA, BH = 1, 1  # โบนัสสมดุล ATK/HP (ปรับจากการจำลอง)
cards = [{"id": "PH%02d" % i, "type": "creature", "tier": 1, "emoji": e, "name": n, "element": el, "cost": co, "atk": at + BA, "hp": hp + BH,
          "keywords": [], "abilities": [AB[a] for a in abs_], "rarity": ra, "set": "phoenix"}
         for i, (e, n, el, co, at, hp, ra, abs_) in enumerate(CARDS, 1)]
extras = [
    {"id": "PHS1", "type": "spell", "emoji": "🪶", "name": "ขนฟินิกส์คืนชีพ", "cost": 1, "rarity": "uncommon", "set": "phoenix",
     "text": "เก็บตัวละคร Cost สูงสุดจากสุสานคืนมือ ถ้านี่เป็นการกระทำที่ 3 ขึ้นไปของเทิร์น (คอมโบ 3) เก็บเพิ่มอีก 1 ใบ"},
    {"id": "PHS2", "type": "spell", "emoji": "🕯️", "name": "บูชาเปลวไฟ", "cost": 1, "rarity": "common", "set": "phoenix",
     "text": "สังเวยการ์ดฝั่งเรา 1 ใบ แล้วจั่ว 1 ใบ (ใบที่มี หายตัว จะกลับมือ)"},
    {"id": "PHS3", "type": "spell", "emoji": "📯", "name": "เปลวสั่งการ", "cost": 3, "rarity": "rare", "set": "phoenix",
     "text": "เลือกตัวละครศัตรู 1 ใบ สั่งให้โจมตีผู้เล่นฝั่งมันเอง ดาเมจเท่า ATK (สูงสุด 4) — สั่งการได้ 2 ครั้งต่อเทิร์น ใบเดิมซ้ำไม่ได้"},
    {"id": "PHS4", "type": "spell", "emoji": "🪽", "name": "ปีกคุ้มกัน", "cost": 2, "rarity": "uncommon", "set": "phoenix",
     "text": "ฟื้น HP ผู้เล่น 4 และ HP การ์ดฝั่งเราทุกใบ 2"},
    {"id": "PHS5", "type": "spell", "emoji": "☄️", "name": "รวมเปลวเพลิง", "cost": 3, "rarity": "rare", "set": "phoenix",
     "text": "ศัตรูโดนดาเมจ = จำนวนตัวละครในสุสานฝั่งเรา ÷ 2 (ปัดลง สูงสุด 5)"},
    {"id": "PHF1", "type": "field", "emoji": "🏜️", "name": "ทุ่งเถ้าถ่าน", "cost": 2, "rarity": "uncommon", "fx": "ashfield", "element": "fire", "set": "phoenix",
     "text": "เมื่อการ์ดฝั่งเราถูกกำจัด ฟื้น HP ผู้เล่น 1 · การ์ดธาตุไฟฝั่งเรา HP +1"},
    {"id": "PHR1", "type": "reaction", "speed": 2, "emoji": "🪞", "name": "ผงเถ้าสะท้อน", "cost": 2, "rarity": "rare", "set": "phoenix",
     "text": "ตอบโต้การโจมตีของศัตรู: ยกเลิกการโจมตีนั้น แล้วผู้โจมตีตีผู้เล่นฝั่งมันเอง ดาเมจเท่า ATK (สูงสุด 4)"},
]
json.dump({"name": "ฟินิกส์ 12 สี", "emoji": "🌈", "cards": cards, "extras": extras}, open("ph.json", "w"), ensure_ascii=False, indent=1)
print("ph:", len(cards), "creatures,", len(extras), "extras")
