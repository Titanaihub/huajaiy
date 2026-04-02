import Link from "next/link";
import { GLOBAL_PRIMARY_NAV } from "../lib/globalPrimaryNav";
import { siteNavLinkClass } from "../lib/siteNavLinkClass";

export default function GlobalPrimaryNav() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-x-8">
      {GLOBAL_PRIMARY_NAV.map((item) => (
        <Link key={item.href} href={item.href} className={siteNavLinkClass}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
