"use client";

import { resolveApiUrl } from "@/lib/api";
import { defaultTenantSlugBody } from "@/lib/default-tenant-slug";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type UserRole = "ADMIN" | "THERAPIST" | "STAFF";

export type AuthTenant = {
  id: string;
  name: string;
  slug: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  active: boolean;
  tenantId: string;
  tenant: AuthTenant;
  createdAt: string;
  updatedAt: string;
};

type AuthContextValue = {
  ready: boolean;
  /** @deprecated Prefer `user`; kept for gradual refactors. Always null in cookie mode. */
  token: null;
  user: AuthUser | null;
  login: (
    email: string,
    password: string,
    tenantSlug?: string,
  ) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
    tenantSlug?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseErrorResponse(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const err = JSON.parse(text) as { message?: string | string[] };
    if (typeof err.message === "string") return err.message;
    if (Array.isArray(err.message)) return err.message.join(", ");
  } catch {
    /* ignore */
  }
  return text || `Request failed (${res.status})`;
}

async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(resolveApiUrl("/auth/me"), {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("me_failed");
  }
  return res.json() as Promise<AuthUser>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, tenantSlug?: string) => {
      const res = await fetch(resolveApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          ...defaultTenantSlugBody(),
          ...(tenantSlug?.trim() ? { tenantSlug: tenantSlug.trim() } : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(await parseErrorResponse(res));
      }
      const u = await fetchMe();
      setUser(u);
    },
    [],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string,
      tenantSlug?: string,
    ) => {
      const res = await fetch(resolveApiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          displayName,
          ...defaultTenantSlugBody(),
          ...(tenantSlug?.trim() ? { tenantSlug: tenantSlug.trim() } : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(await parseErrorResponse(res));
      }
      const u = await fetchMe();
      setUser(u);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch(resolveApiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      token: null,
      user,
      login,
      register,
      logout,
    }),
    [ready, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
