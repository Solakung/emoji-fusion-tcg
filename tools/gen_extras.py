"""เพิ่มการ์ดสามัญชุดที่ 2 ลง cards.json (extras): เวทย์ S13-S18, สนาม F07-F12, ปฏิกิริยา R09-R16
รันซ้ำได้ (ลบ id เดิมก่อนใส่ใหม่) — เอฟเฟกต์จริงอยู่ใน battle.js"""
import json
d = json.load(open("cards.json"))
NEW = [
 # เวทย์
 dict(id="S13", type="spell", emoji="💪", name="พลังฮึด", cost=2, rarity="uncommon", text="การ์ดฝั่งเรา 1 ใบ ATK +2 ถาวร"),
 dict(id="S14", type="spell", emoji="🧊", name="แช่แข็งหมู่", cost=3, rarity="uncommon", text="การ์ดศัตรูทุกใบโจมตีไม่ได้ 1 เทิร์น"),
 dict(id="S15", type="spell", emoji="🩸", name="สังเวย", cost=1, rarity="uncommon", text="กำจัดการ์ดฝั่งเรา 1 ใบ แล้วจั่วการ์ด 2 ใบ"),
 dict(id="S16", type="spell", emoji="🔋", name="แบตสำรอง", cost=0, rarity="uncommon", text="Mana +2 (เทิร์นนี้)"),
 dict(id="S17", type="spell", emoji="💫", name="ปลุกพลัง", cost=2, rarity="uncommon", text="การ์ดฝั่งเรา 1 ใบ โจมตีได้อีก 1 ครั้งเทิร์นนี้ (ใช้กับใบที่เพิ่งลงหรือโจมตีไปแล้วก็ได้)"),
 dict(id="S18", type="spell", emoji="☠️", name="ภัยพิบัติ", cost=4, rarity="rare", text="การ์ดทุกใบบนสนามทั้งสองฝั่งโดน 3 ดาเมจ"),
 # สนาม (ไม่ผูกธาตุ)
 dict(id="F07", type="field", emoji="⚔️", name="ลานประลอง", cost=3, rarity="uncommon", fx="arena", text="การ์ดฝั่งเราทุกใบ ATK +1 ตราบที่สนามนี้อยู่"),
 dict(id="F08", type="field", emoji="🏰", name="กำแพงเมือง", cost=2, rarity="uncommon", fx="wall", text="การ์ดฝั่งเราทุกใบ HP +1 ตราบที่สนามนี้อยู่"),
 dict(id="F09", type="field", emoji="⛲", name="น้ำพุฟื้นฟู", cost=2, rarity="uncommon", fx="spring", text="จบเทิร์นของเรา การ์ดฝั่งเราทุกใบและผู้เล่นฟื้น HP 1"),
 dict(id="F10", type="field", emoji="📚", name="หอสมุดโบราณ", cost=2, rarity="uncommon", fx="library", text="การ์ดทุกธาตุ: ผสมในสนามลด Cost 1 (ต่ำสุด 1)"),
 dict(id="F11", type="field", emoji="🌫️", name="หมอกหนา", cost=3, rarity="rare", fx="haze", text="การ์ดศัตรูทุกใบ ATK -1 ตราบที่สนามนี้อยู่"),
 dict(id="F12", type="field", emoji="🎪", name="ลานเชียร์", cost=4, rarity="rare", fx="rally", text="การ์ดฝั่งเราที่ลงใหม่โจมตีได้ทันที"),
 # ปฏิกิริยา
 dict(id="R09", type="reaction", speed=2, emoji="🛡️", name="เกราะฉับพลัน", cost=1, rarity="uncommon", text="ตอบโต้การโจมตีของศัตรู: เป้าหมายที่ถูกโจมตี HP +3 จนจบเทิร์น (ถ้าเป็นผู้เล่น ฟื้น 3)"),
 dict(id="R10", type="reaction", speed=3, emoji="☠️", name="ล่าสังหาร", cost=4, rarity="rare", text="ตอบโต้การโจมตีของศัตรู: กำจัดผู้โจมตี"),
 dict(id="R11", type="reaction", speed=2, emoji="🔮", name="ทำลายเวทย์", cost=2, rarity="uncommon", text="ตอบโต้เวทย์หรือการ์ดสนามของศัตรู: ยกเลิกมัน"),
 dict(id="R12", type="reaction", speed=2, emoji="🚫", name="ขัดจังหวะผสม", cost=2, rarity="uncommon", text="ตอบโต้การผสมของศัตรู: ยกเลิกการผสม (การ์ดแม่ยังอยู่)"),
 dict(id="R13", type="reaction", speed=2, emoji="↩️", name="ผลักกลับ", cost=2, rarity="uncommon", text="ตอบโต้การลงการ์ดตัวละครของศัตรู: การ์ดนั้นกลับเข้ามือเจ้าของ"),
 dict(id="R14", type="reaction", speed=3, emoji="💥", name="ระเบิดตอบโต้", cost=3, rarity="rare", text="ตอบโต้การกระทำใดๆ ของศัตรู: ผู้เล่นศัตรูโดน 4 ดาเมจ"),
 dict(id="R15", type="reaction", speed=2, emoji="⏳", name="ซื้อเวลา", cost=2, rarity="uncommon", text="จั่วการ์ด 2 ใบ (เปิดตอนไหนก็ได้ที่ใช้ Instant ได้)"),
 dict(id="R16", type="reaction", speed=2, emoji="🔥", name="เผาผลาญ", cost=3, rarity="uncommon", text="กำจัดการ์ดศัตรูที่ HP ต่ำสุด"),
]
ids = {c["id"] for c in NEW}
d["extras"] = [c for c in d["extras"] if c["id"] not in ids] + NEW
json.dump(d, open("cards.json", "w"), ensure_ascii=False, indent=1)
print("extras:", len(d["extras"]))
