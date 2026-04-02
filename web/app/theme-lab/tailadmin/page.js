import { redirect } from "next/navigation";

/** เดิมใช้ path นี้ — ย้ายไป /member */
export default function ThemeLabTailadminRedirectPage() {
  redirect("/member");
}
