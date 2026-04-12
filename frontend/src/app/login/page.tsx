import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
