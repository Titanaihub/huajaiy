import AccountProfileForm from "../../../components/AccountProfileForm";

export const metadata = {
  title: "ข้อมูลส่วนตัว | HUAJAIY",
  description: "แก้ชื่อ–นามสกุล ยูสเซอร์ อีเมล ที่อยู่จัดส่ง และคำขอแอดมินเมื่อแก้ชื่อครบโควตา"
};

export default function AccountProfilePage() {
  return (
    <>
      <h2 className="hui-h2">ข้อมูลส่วนตัว</h2>
      <p className="mt-1 text-sm text-hui-muted">
        แก้ชื่อ–นามสกุลในระบบได้เอง 3 ครั้ง — ครบแล้วส่งคำขอแอดมินด้านล่าง · ตั้งยูสเซอร์ อีเมล และรหัสผ่านได้ที่นี่
      </p>
      <div className="mt-6">
        <AccountProfileForm />
      </div>
    </>
  );
}
