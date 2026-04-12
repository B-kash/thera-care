"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getApiBaseUrl } from "@/lib/api";

const STORAGE_KEY = "thera_care_access_token";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseErrorResponse(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const err = JSON.parse(text) as { message?: string | string[] };
    if (typeof err.message === 'string') return err.message;
    if (Array.isArray(err.message)) return err.message.join(', ');
  } catch {
    /* ignore */
  }
  return text || `Request failed (${res.status})`;
}

async function fetchMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error("me_failed");
  }
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setToken(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setUser(null);
      return;
    }
    let cancelled = false;
    void fetchMe(token)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) {
          window.localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, token]);

  const setSession = useCallback((accessToken: string) => {
    window.localStorage.setItem(STORAGE_KEY, accessToken);
    setToken(accessToken);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        throw new Error(await parseErrorResponse(res));
      }
      const data = (await res.json()) as { accessToken: string };
      setSession(data.accessToken);
    },
    [setSession],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) {
        throw new Error(await parseErrorResponse(res));
      }
      const data = (await res.json()) as { accessToken: string };
      setSession(data.accessToken);
    },
    [setSession],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      token,
      user,
      login,
      register,
      logout,
    }),
    [ready, token, user, login, register, logout],
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
