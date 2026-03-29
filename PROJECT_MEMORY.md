# จดจำโปรเจกต์ HUAJAIY

ไฟล์นี้ใช้เก็บบริบทการ deploy และงานสำคัญ เพื่อความต่อเนื่องของทีมและ AI — **แก้ได้ตามความเป็นจริงเมื่อสถานะเปลี่ยน**

Cursor โหลดกฎอัตโนมัติจาก `.cursor/rules/huajaiy-project-memory.mdc` ด้วย

---

## บริการที่ใช้งานจริง

| บริการ | ลิงก์ / รายละเอียด |
|--------|---------------------|
| **โค้ด** | [github.com/Titanaihub/huajaiy](https://github.com/Titanaihub/huajaiy) สาขา `main` |
| **โฮสต์ + DB** | [render.com](https://render.com) — Blueprint จาก `render.yaml` |
| **รูปภาพ** | [cloudinary.com](https://cloudinary.com) — ผูกกับ API (`huajaiy-api`) |

## Production บน Render

| ส่วน | รายละเอียด |
|------|------------|
| เว็บ | Service `huajaiy-web` → **www.huajaiy.com** |
| API | Service `huajaiy-api` → **https://huajaiy-api.onrender.com** |
| Database | **PostgreSQL บน Render** — `DATABASE_URL` ที่ API |

## Environment สำคัญ

- **เว็บ:** `NEXT_PUBLIC_API_BASE_URL` = URL ของ API (ดู `web/.env.example`)
- **API:** `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `JWT_SECRET` (รายละเอียดเพิ่มใน `README.md`)

## หลังเพิ่มคอลัมน์/ตารางใน `db/init.js`

- รัน migration / init กับ **PostgreSQL บน Render** ให้ตรงกับโค้ดก่อนใช้ฟีเจอร์ใหม่

## ธีมงานล่าสุด (เกมส่วนกลาง)

- กติกาต่อชุด, หักหัวใจชมพู/แดงแยกสี, จบรอบแพ้ (none), overlay ผลลัพธ์, รายละเอียดเกม, รูปหน้าปก (`game_cover_url`), ค่าเริ่มต้นหน้าปก = SVG หัวใจชมพูใน `web/public/`

---

*อัปเดตล่าสุด: มีนาคม 2026 — ระบุ GitHub + Render + Cloudinary เป็นชุดใช้งานจริง*
