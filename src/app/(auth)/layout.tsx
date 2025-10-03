import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session.token && session.tenantId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
