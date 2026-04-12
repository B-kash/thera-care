"use client";

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function HomeRedirect() {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [ready, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
      Loading…
    </div>
  );
}
