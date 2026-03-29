import AccountBackOfficeShell from "../../../components/AccountBackOfficeShell";
import AccountHeartHistorySection from "../../../components/AccountHeartHistorySection";

export const metadata = {
  title: "ประวัติหัวใจ | HUAJAIY"
};

export default function AccountHeartHistoryPage() {
  return (
    <AccountBackOfficeShell>
      <AccountHeartHistorySection />
    </AccountBackOfficeShell>
  );
}
