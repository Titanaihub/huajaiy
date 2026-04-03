import { redirect } from "next/navigation";

/** รวมเป็นหน้าเดียวที่ /login (เทมเพลต organic) — เปิดฟอร์มยูส/รหัสด้วย ?expand=1 */
export default function LoginPasswordRedirectPage() {
  redirect("/login?expand=1");
}
