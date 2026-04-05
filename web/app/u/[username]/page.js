import { notFound, permanentRedirect } from "next/navigation";

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

/** ลิงก์เก่า /u/{username} → /{username} */
export default function LegacyPublicMemberRedirect({ params }) {
  const raw = params?.username;
  const un = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!USERNAME_RE.test(un)) {
    notFound();
  }
  permanentRedirect(`/${un}`);
}
