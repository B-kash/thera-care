import type { ReactNode } from "react";

type AlertProps = {
  variant?: "error" | "info";
  children: ReactNode;
  className?: string;
};

export function Alert({
  variant = "error",
  children,
  className = "",
}: AlertProps) {
  const styles =
    variant === "error"
      ? "border-red-200 bg-app-danger-soft text-app-danger dark:border-red-900/60 dark:text-red-300"
      : "border-app-border bg-app-muted text-foreground";

  return (
    <div
      role="alert"
      className={`rounded-md border px-3 py-2 text-sm ${styles} ${className}`}
    >
      {children}
    </div>
  );
}
