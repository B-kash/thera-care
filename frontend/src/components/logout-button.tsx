"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      className="mt-auto w-full justify-start"
      onClick={() => {
        void (async () => {
          await logout();
          router.replace("/login");
        })();
      }}
    >
      Log out
    </Button>
  );
}
