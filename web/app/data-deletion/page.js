import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "การลบข้อมูลผู้ใช้ | HUAJAIY",
  description: "คำแนะนำการขอลบหรือถอนความยินยอมเกี่ยวกับข้อมูลส่วนบุคคล"
};

export default function DataDeletionPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 text-slate-800">
      <h1 className="text-xl font-semibold text-slate-900">
        คำแนะนำการลบข้อมูลผู้ใช้ (User Data Deletion)
      </h1>
      <p className="mt-2 text-sm text-slate-500">อัปเดตล่าสุด: 28 มีนาคม 2026</p>

      <section className="mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          หากคุณต้องการขอให้ลบข้อมูลส่วนบุคคลที่เกี่ยวข้องกับการใช้บริการ HUAJAIY
          หรือถอนความยินยอมในการประมวลผล คุณสามารถดำเนินการได้ดังนี้
        </p>

        <h2 className="pt-2 text-base font-semibold text-slate-900">
          1. การออกจากระบบและยกเลิกการเชื่อมบัญชี
        </h2>
        <p>
          หากคุณเข้าสู่ระบบผ่าน Facebook หรือ LINE คุณสามารถออกจากระบบในเว็บไซต์ของเราได้
          และยกเลิกการเชื่อมต่อบัญชีผ่านการตั้งค่าของ Facebook หรือ LINE ตามที่ผู้ให้บริการนั้นกำหนด
        </p>

        <h2 className="pt-2 text-base font-semibold text-slate-900">
          2. การขอลบข้อมูลโดยตรง
        </h2>
        <p>
          หากต้องการให้เราช่วยตรวจสอบหรือลบข้อมูลที่เกี่ยวข้องกับบัญชีของคุณในระบบของเรา
          โปรดติดต่อผ่านช่องทางที่ประกาศในระบบ พร้อมระบุข้อมูลเพื่อยืนยันตัวตน
          (เช่น ชื่อผู้ใช้ หรือรหัสอ้างอิงที่เกี่ยวข้อง)
        </p>
        <p className="text-slate-600">
          เราจะดำเนินการตามคำขอภายในระยะเวลาที่สมเหตุสมผลและตามที่กฎหมายคุ้มครองข้อมูลส่วนบุคคลกำหนด
        </p>

        <h2 className="pt-2 text-base font-semibold text-slate-900">
          3. ข้อมูลที่จัดเก็บโดยบุคคลที่สาม
        </h2>
        <p>
          ข้อมูลบางส่วนอาจอยู่ภายใต้การจัดการของผู้ให้บริการโฮสติ้ง ระบบเข้าสู่ระบบ หรือผู้ให้บริการจัดเก็บไฟล์
          การลบข้อมูลบางประเภทอาจต้องดำเนินการผ่านผู้ให้บริการนั้นตามนโยบายของผู้ให้บริการ
        </p>

        <h2 className="pt-2 text-base font-semibold text-slate-900">
          4. การร้องเรียน
        </h2>
        <p>
          หากคุณไม่พอใจกับการตอบสนองของเรา คุณมีสิทธิ์ร้องเรียนต่อหน่วยงานที่เกี่ยวข้องตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล
        </p>
      </section>

      <p className="mt-8 text-xs text-slate-500">
        หน้านี้เป็นข้อความตัวอย่างเพื่อใช้งานเบื้องต้น ควรให้ที่ปรึกษากฎหมายตรวจทานก่อนใช้งานเชิงพาณิชย์
      </p>
    </main>
      <SiteFooter />
    </>
  );
}
