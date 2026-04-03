import { Suspense } from "react";
import MemberTailadminWorkspace from "../../../components/MemberTailadminWorkspace";

export const metadata = {
  title: "ระบบสมาชิก | HUAJAIY",
  description: "พื้นที่สมาชิก HUAJAIY"
};

export default function MemberWorkspacePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
          กำลังโหลด…
        </main>
      }
    >
      <MemberTailadminWorkspace />
    </Suspense>
  );
}
