import { redirect } from "next/navigation";

/** เดิม /hui/login — ใช้หน้าใหม่ที่ไม่ผูก SiteHeader เก่า */
export default function HuiLoginRedirectPage() {
  redirect("/login?expand=1");
}
