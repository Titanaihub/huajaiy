import HeartShopClient from "../../../components/HeartShopClient";

export const metadata = {
  title: "ซื้อหัวใจ | HUAJAIY",
  description: "แพ็กเกจหัวใจชมพูและแดง แนบสลิปรอแอดมินอนุมัติ"
};

export default function HeartsShopPage() {
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-900">ซื้อหัวใจ</h2>
      <p className="mt-1 text-sm text-slate-600">
        หัวใจสองประเภท: ชมพู และ แดง — โอนแล้วแนบสลิปด้านล่าง
      </p>
      <div className="mt-6">
        <HeartShopClient />
      </div>
    </>
  );
}
