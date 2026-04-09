import { Suspense } from "react";
import SiteSearchPage from "../../components/SiteSearchPage";

export const metadata = {
  title: "ค้นหา | HUAJAIY",
  description: "ค้นหาเกม เพจสมาชิก โพสต์ และสินค้า — HUAJAIY"
};

function SearchFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center bg-[#f4f4f6] px-4 text-sm text-neutral-500">
      กำลังโหลด…
    </div>
  );
}

export default function SearchRoutePage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SiteSearchPage />
    </Suspense>
  );
}
