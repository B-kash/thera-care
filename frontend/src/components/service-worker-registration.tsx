"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` in production, or when `NEXT_PUBLIC_ENABLE_SW=true`
 * (e.g. `next start` locally). Skipped in `next dev` unless that env is set, to
 * avoid confusing stale workers during development.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    const enableDev =
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_ENABLE_SW === "true";
    const enableProd = process.env.NODE_ENV === "production";
    if (!enableDev && !enableProd) return;
    if (!("serviceWorker" in navigator)) return;

    const { protocol, hostname } = window.location;
    const local =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    if (protocol !== "https:" && !local) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
