import { Suspense } from "react";
import PrizeWithdrawForm from "../../../components/PrizeWithdrawForm";

export const metadata = {
  title: "ถอนเงินรางวัล | HUAJAIY",
  description: "ส่งคำขอถอนเงินรางวัลเงินสดถึงผู้สร้างเกม"
};

export default function PrizeWithdrawPage() {
  return (
    <Suspense fallback={<p className="text-sm text-hui-muted">กำลังโหลด…</p>}>
      <PrizeWithdrawForm />
    </Suspense>
  );
}
