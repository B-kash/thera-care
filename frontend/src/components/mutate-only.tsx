"use client";

import type { UserRole } from "@/providers/auth-provider";
import { useAuth } from "@/providers/auth-provider";

export function canMutateRole(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "THERAPIST";
}

/** Renders children only for roles allowed to POST/PATCH/DELETE (matches Nest RBAC). */
export function MutateOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!canMutateRole(user?.role)) return null;
  return <>{children}</>;
}
