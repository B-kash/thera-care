"use client";

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        logout();
        router.replace("/login");
      }}
      className="mt-auto w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-200/80 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
    >
      Log out
    </button>
  );
}
