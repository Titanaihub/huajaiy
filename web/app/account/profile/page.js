import AccountProfileForm from "../../../components/AccountProfileForm";
import AccountProfileOverview from "../../../components/AccountProfileOverview";

export const metadata = {
  title: "โปรไฟล์สมาชิก | HUAJAIY",
  description:
    "ภาพรวมโปรไฟล์หลังล็อกอิน LINE — แก้ข้อมูลส่วนตัว ที่อยู่ และเตรียมพื้นที่โปรโมทกิจกรรม"
};

export default function AccountProfilePage() {
  return (
    <>
      <AccountProfileOverview />
      <div className="border-t border-hui-border pt-8">
        <h2 className="hui-h2">แก้ไขข้อมูลในระบบ</h2>
        <p className="mt-1 text-sm text-hui-muted">
          แก้ชื่อ–นามสกุลในระบบได้เอง 3 ครั้ง — ครบแล้วส่งคำขอแอดมินด้านล่าง · ตั้งยูสเซอร์ อีเมล
          และรหัสผ่านได้ที่นี่
        </p>
        <div className="mt-6">
          <AccountProfileForm />
        </div>
      </div>
    </>
  );
}
