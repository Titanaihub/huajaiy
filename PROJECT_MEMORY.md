# จดจำโปรเจกต์ HUAJAIY

ไฟล์นี้ใช้เก็บบริบทการ deploy และงานสำคัญ เพื่อความต่อเนื่องของทีมและ AI — **แก้ได้ตามความเป็นจริงเมื่อสถานะเปลี่ยน**

Cursor โหลดกฎอัตโนมัติจาก `.cursor/rules/huajaiy-project-memory.mdc` ด้วย

---

## Production (Render)

| ส่วน | รายละเอียด |
|------|------------|
| เว็บ | Service `huajaiy-web` → **www.huajaiy.com** |
| API | Service `huajaiy-api` → **https://huajaiy-api.onrender.com** |
| Database | **PostgreSQL บน Render** — เชื่อมผ่าน `DATABASE_URL` ที่ API |
| โค้ด | GitHub **Titanaihub/huajaiy** สาขา **main** (push แล้ว deploy) |

## หมายเหตุฝั่งเว็บ

- ตั้ง `NEXT_PUBLIC_API_BASE_URL` บน Render ให้ชี้ API จริง (ดู `web/.env.example`)

## หลังเพิ่มคอลัมน์/ตารางใน `db/init.js`

- รัน migration / init กับ **PostgreSQL บน Render** ให้ตรงกับโค้ดก่อนใช้ฟีเจอร์ใหม่

## ธีมงานล่าสุด (เกมส่วนกลาง)

- กติกาต่อชุด, หักหัวใจชมพู/แดงแยกสี, จบรอบแพ้ (none), overlay ผลลัพธ์, รายละเอียดเกม, รูปหน้าปก (`game_cover_url`), ค่าเริ่มต้นหน้าปก = SVG หัวใจชมพูใน `web/public/`

---

*อัปเดตล่าสุด: มีนาคม 2026*
