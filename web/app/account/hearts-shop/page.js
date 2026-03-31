import HeartShopClient from "../../../components/HeartShopClient";

export const metadata = {
  title: "ซื้อหัวใจแดง | HUAJAIY",
  description: "แพ็กหัวใจแดงแจก แนบสลิปรอแอดมินอนุมัติ — ยอดไปที่เมนูแจกหัวใจ"
};

export default function HeartsShopPage() {
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-900">ซื้อหัวใจแดง</h2>
      <div className="mt-6">
        <HeartShopClient />
      </div>
    </>
  );
}
