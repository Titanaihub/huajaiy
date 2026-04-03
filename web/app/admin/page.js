import { Suspense } from "react";
import AdminTailadminWorkspace from "../../components/AdminTailadminWorkspace";

export const metadata = {
  title: "แอดมิน | HUAJAIY",
  description: "พื้นที่จัดการระบบสำหรับผู้ดูแล"
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
          กำลังโหลด…
        </main>
      }
    >
      <AdminTailadminWorkspace />
    </Suspense>
  );
}
