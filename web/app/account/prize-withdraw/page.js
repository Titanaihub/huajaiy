import { Suspense } from "react";
import AccountBackOfficeShell from "../../../components/AccountBackOfficeShell";
import PrizeWithdrawForm from "../../../components/PrizeWithdrawForm";

export const metadata = {
  title: "ถอนเงินรางวัล | HUAJAIY",
  description: "ส่งคำขอถอนเงินรางวัลเงินสดถึงผู้สร้างเกม"
};

export default function PrizeWithdrawPage() {
  return (
    <AccountBackOfficeShell>
      <Suspense fallback={<p className="text-sm text-slate-500">กำลังโหลด…</p>}>
        <PrizeWithdrawForm />
      </Suspense>
    </AccountBackOfficeShell>
  );
}
