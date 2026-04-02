"use client";

import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountBackOfficeShell({ children }) {
  useMemberAuth();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="min-w-0">{children}</div>
    </main>
  );
}
