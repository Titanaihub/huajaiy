import AccountProfileForm from "../../../../components/AccountProfileForm";
import AccountProfileOverview from "../../../../components/AccountProfileOverview";
import Link from "next/link";

export const metadata = {
  title: "แก้ไขข้อมูลสมาชิก (เวอร์ชันเดิม) | HUAJAIY",
  description:
    "แก้ชื่อ ที่อยู่ ยูสเซอร์ อีเมล และรหัสผ่าน — หน้าเดิมก่อนเทมเพลต TailAdmin"
};

export default function AccountProfileLegacyPage() {
  return (
    <>
      <p className="mb-6 text-sm text-hui-muted">
        หน้าโปรไฟล์หลักใช้เทมเพลต TailAdmin ที่{" "}
        <Link href="/account/profile" className="font-medium text-hui-section underline">
          /account/profile
        </Link>
        {" · "}
        แก้ข้อมูลในระบบ (API เดิม) ใช้ฟอร์มด้านล่าง
      </p>
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
