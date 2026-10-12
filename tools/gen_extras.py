"""เพิ่มการ์ดสามัญชุดที่ 2-3 ลง cards.json (extras): เวทย์ S13-S24 (S19-S24 = ชุดคอมโบ), สนาม F07-F13, ปฏิกิริยา R09-R17
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
 # ชุดคอมโบ (ใช้ตัวนับ "การกระทำในเทิร์นนี้": ลงการ์ด/ใช้เวทย์/ผสม)
 dict(id="S19", type="spell", emoji="🔗", name="สายโซ่ผสม", cost=1, rarity="uncommon", text="ใช้ได้เมื่อเทิร์นนี้ผสมไปแล้วอย่างน้อย 1 ครั้ง: ผสมเพิ่มได้อีก 1 ครั้ง และจั่ว 1 ใบ"),
 dict(id="S20", type="spell", emoji="📖", name="ตำราต้องห้าม", cost=3, rarity="uncommon", text="ค้นตัวละคร Cost สูงสุดจากเด็คขึ้นมือ"),
 dict(id="S21", type="spell", emoji="🔎", name="ตามหาคู่ผสม", cost=1, rarity="uncommon", text="เลือกการ์ดฝั่งเรา 1 ใบ: ค้นตัวละครธาตุเดียวกัน (Cost ต่ำสุด) จากเด็คขึ้นมือ"),
 dict(id="S22", type="spell", emoji="💥", name="คอมโบระเบิด", cost=2, rarity="rare", text="ผู้เล่นศัตรูโดนดาเมจเท่าจำนวนการกระทำก่อนหน้าในเทิร์นนี้ (ลงการ์ด/เวทย์/ผสม) สูงสุด 5"),
 dict(id="S23", type="spell", emoji="♻️", name="รีไซเคิล", cost=2, rarity="uncommon", text="เก็บตัวละคร Cost สูงสุดจากสุสานคืนมือ"),
 dict(id="S24", type="spell", emoji="⚗️", name="สารเร่งปฏิกิริยา", cost=3, rarity="rare", text="การ์ดผสมฝั่งเราทุกใบ ATK +1 / HP +1 ถาวร"),
 # สนาม (ไม่ผูกธาตุ)
 dict(id="F07", type="field", emoji="⚔️", name="ลานประลอง", cost=3, rarity="uncommon", fx="arena", text="การ์ดฝั่งเราทุกใบ ATK +1 ตราบที่สนามนี้อยู่"),
 dict(id="F08", type="field", emoji="🏰", name="กำแพงเมือง", cost=2, rarity="uncommon", fx="wall", text="การ์ดฝั่งเราทุกใบ HP +1 ตราบที่สนามนี้อยู่"),
 dict(id="F09", type="field", emoji="⛲", name="น้ำพุฟื้นฟู", cost=2, rarity="uncommon", fx="spring", text="จบเทิร์นของเรา การ์ดฝั่งเราทุกใบและผู้เล่นฟื้น HP 1"),
 dict(id="F10", type="field", emoji="📚", name="หอสมุดโบราณ", cost=2, rarity="uncommon", fx="library", text="การ์ดทุกธาตุ: ผสมในสนามลด Cost 1 (ต่ำสุด 1)"),
 dict(id="F11", type="field", emoji="🌫️", name="หมอกหนา", cost=3, rarity="rare", fx="haze", text="การ์ดศัตรูทุกใบ ATK -1 ตราบที่สนามนี้อยู่"),
 dict(id="F12", type="field", emoji="🎪", name="ลานเชียร์", cost=4, rarity="rare", fx="rally", text="การ์ดฝั่งเราที่ลงใหม่โจมตีได้ทันที"),
 dict(id="F13", type="field", emoji="🏭", name="โรงงานผสม", cost=3, rarity="uncommon", fx="lab", text="การ์ดที่ได้จากการผสมของเรา ATK +1 ถาวร; ถ้าเป็นการผสมครั้งที่ 2 ขึ้นไปของเทิร์น HP +2 ด้วย"),
 # ปฏิกิริยา
 dict(id="R09", type="reaction", speed=2, emoji="🛡️", name="เกราะฉับพลัน", cost=1, rarity="uncommon", text="ตอบโต้การโจมตีของศัตรู: เป้าหมายที่ถูกโจมตี HP +3 จนจบเทิร์น (ถ้าเป็นผู้เล่น ฟื้น 3)"),
 dict(id="R10", type="reaction", speed=3, emoji="☠️", name="ล่าสังหาร", cost=4, rarity="rare", text="ตอบโต้การโจมตีของศัตรู: กำจัดผู้โจมตี"),
 dict(id="R11", type="reaction", speed=2, emoji="🔮", name="ทำลายเวทย์", cost=2, rarity="uncommon", text="ตอบโต้เวทย์หรือการ์ดสนามของศัตรู: ยกเลิกมัน"),
 dict(id="R12", type="reaction", speed=2, emoji="🚫", name="ขัดจังหวะผสม", cost=2, rarity="uncommon", text="ตอบโต้การผสมของศัตรู: ยกเลิกการผสม (การ์ดแม่ยังอยู่)"),
 dict(id="R13", type="reaction", speed=2, emoji="↩️", name="ผลักกลับ", cost=2, rarity="uncommon", text="ตอบโต้การลงการ์ดตัวละครของศัตรู: การ์ดนั้นกลับเข้ามือเจ้าของ"),
 dict(id="R14", type="reaction", speed=3, emoji="💥", name="ระเบิดตอบโต้", cost=3, rarity="rare", text="ตอบโต้การกระทำใดๆ ของศัตรู: ผู้เล่นศัตรูโดน 4 ดาเมจ"),
 dict(id="R15", type="reaction", speed=2, emoji="⏳", name="ซื้อเวลา", cost=2, rarity="uncommon", text="จั่วการ์ด 2 ใบ (เปิดตอนไหนก็ได้ที่ใช้ Instant ได้)"),
 dict(id="R17", type="reaction", speed=2, emoji="🛑", name="ตัดวงจร", cost=2, rarity="rare", text="ตอบโต้การลงการ์ด/เวทย์/ผสม/สนามของศัตรู เมื่อศัตรูทำการกระทำมาแล้วอย่างน้อย 3 ครั้งในเทิร์นนี้: ยกเลิกมัน"),
 dict(id="R16", type="reaction", speed=2, emoji="🔥", name="เผาผลาญ", cost=3, rarity="uncommon", text="กำจัดการ์ดศัตรูที่ HP ต่ำสุด"),
]
ids = {c["id"] for c in NEW}
d["extras"] = [c for c in d["extras"] if c["id"] not in ids] + NEW
json.dump(d, open("cards.json", "w"), ensure_ascii=False, indent=1)
print("extras:", len(d["extras"]))
