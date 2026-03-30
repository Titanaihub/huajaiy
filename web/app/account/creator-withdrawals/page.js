import AccountBackOfficeShell from "../../../components/AccountBackOfficeShell";
import CreatorWithdrawalsSection from "../../../components/CreatorWithdrawalsSection";

export const metadata = {
  title: "คำขอถอนรางวัลถึงฉัน | HUAJAIY",
  description: "จัดการคำขอถอนเงินรางวัลจากสมาชิก"
};

export default function CreatorWithdrawalsPage() {
  return (
    <AccountBackOfficeShell>
      <CreatorWithdrawalsSection />
    </AccountBackOfficeShell>
  );
}
