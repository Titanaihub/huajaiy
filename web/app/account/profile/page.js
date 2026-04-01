import AccountProfileForm from "../../../components/AccountProfileForm";

export const metadata = {
  title: "ข้อมูลส่วนตัว | HUAJAIY",
  description: "แก้ที่อยู่จัดส่ง คำขอเปลี่ยนชื่อ–นามสกุล"
};

export default function AccountProfilePage() {
  return (
    <>
      <h2 className="hui-h2">ข้อมูลส่วนตัว</h2>
      <p className="mt-1 text-sm text-hui-muted">
        ชื่อ–นามสกุลในระบบแก้เองไม่ได้ — ต้องขอแอดมินในฟอร์มด้านล่าง
      </p>
      <div className="mt-6">
        <AccountProfileForm />
      </div>
    </>
  );
}
