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
for k, t in {"lava": "HP +2", "fog": "หลบการโจมตีครั้งแรกของทุกเทิร์น", "metal": "ลดดาเมจที่โดนทุกครั้ง 1"}.items():
    AB.setdefault(k, {"id": k, "name": {"lava": "เกล็ดลาวา", "fog": "หมอกพราง", "metal": "เกล็ดเหล็ก"}[k], "text": t})

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
    ]}]

out = []
for s in SETS:
    cards = []
    for i, (em, nm, el, co, at, hp, ra, abs_, kws) in enumerate(s["cards"], 1):
        cards.append({"id": "%s%02d" % (s["id"][:2].upper(), i), "type": "creature", "tier": 1, "emoji": em, "name": nm,
                      "element": el, "cost": co, "atk": at, "hp": hp, "keywords": kws,
                      "abilities": [AB[a] for a in abs_], "rarity": ra, "set": s["id"]})
    out.append({k: v for k, v in s.items() if k != "cards"} | {"cards": cards})
json.dump({"sets": out}, open("sets.json", "w"), ensure_ascii=False, indent=1)
print("sets:", [(s["id"], len(s["cards"])) for s in out])
