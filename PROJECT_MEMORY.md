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

## เกม — หัวใจ

- สมาชิกล็อกอิน: `POST /api/game/start` ส่ง `Authorization: Bearer …` — เซิร์ฟเวอร์หักหัวใจชมพู/แดงใน DB ตามค่าเกม (เกมส่วนกลางหรือ legacy `GAME_HEART_COST`) ก่อนสร้าง session
- ผู้เล่นทั่วไป: ยังหักจาก localStorage ฝั่งเบราว์เซอร์ตามเดิม

## หลังเพิ่มคอลัมน์/ตารางใน `db/init.js`

- รัน migration / init กับ **PostgreSQL บน Render** ให้ตรงกับโค้ดก่อนใช้ฟีเจอร์ใหม่

## ธีมงานล่าสุด (เกมส่วนกลาง)

- กติกาต่อชุด, หักหัวใจชมพู/แดงแยกสี, จบรอบแพ้ (none), overlay ผลลัพธ์, รายละเอียดเกม, รูปหน้าปก (`game_cover_url`), ค่าเริ่มต้นหน้าปก = SVG หัวใจชมพูใน `web/public/`

## เชลล์หลัก production — หน้าแรก / ล็อกอิน / สมาชิก / แอดมิน

ชุดนี้เป็น **UI หลักที่ใช้งานจริงบน production** (ไม่ใช่เพจทดลอง) — พัฒนาฟีเจอร์ต่อบนฐานนี้

| เส้นทาง | โค้ดหลัก | หมายเหตุ |
|--------|-----------|----------|
| **`/`** | `web/components/HomeOrganicChrome.jsx` | `HomeStylePublicHeader` + iframe `organic-template/index.html?huajaiy_chrome=1` (ซ่อนแถบซ้ำใน iframe; สถานะล็อกอินตรงกับ `/member`) |
| **`/login`** | `web/app/login/page.js` | iframe `organic-template/huajaiy-login.html` (LINE + ยูสเซอร์/รหัส) |
| **`/login/line`** | `web/app/login/line/page.js` | LINE OAuth → แลกโทเค็นสมาชิก |
| **`/member`** | `web/components/MemberTailadminWorkspace.jsx` | หัวเว็บ + TailAdmin iframe + `postMessage` ข้อมูลสมาชิก |
| **`/admin`** | `web/components/AdminTailadminWorkspace.jsx` | หัวเว็บ + TailAdmin iframe เหมือนสมาชิก; แผง React เก่า **`/admin/panel`** (`AdminDashboard`) ฝังใน iframe ได้เมื่อตั้ง **`SHOW_LEGACY_ADMIN_PANEL_EMBED = true`** ในไฟล์นี้ (ใช้เฉพาะเมื่อต้องการแผงเดิม) |

**สถานะล็อกอิน:** `MemberAuthProvider` + `localStorage` (`huajaiy_member_token`) · เมนูสาธารณะ: `HomeStylePublicHeader` หรือ `SiteHeader` / `GlobalPrimaryNav`

**ไอคอนหัวใจใน `HomeStylePublicHeader`:** รูปต้นฉบับจากโฟลเดอร์ราก `หัวใจ` (`Pink Heart.png`, `Red Heart.png`) — สำเนาที่เว็บเสิร์ฟคือ `web/public/hearts/pink-heart.png` และ `red-heart.png` (อัปเดตรูปได้โดยแทนที่ไฟล์ใน `public/hearts/`)

---

*อัปเดตล่าสุด: เมษายน 2026 — เพิ่มเชลล์ production หลัก; GitHub + Render + Cloudinary เป็นชุดใช้งานจริง*
