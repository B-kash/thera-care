import Link from "next/link";

/** Shown when the service worker cannot reach the network (HTML navigations only). */
export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-zinc-200 px-6 py-12 text-center text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="max-w-md rounded-xl border border-zinc-300 bg-white/95 p-8 shadow-lg dark:border-zinc-600 dark:bg-zinc-900/95">
        <h1 className="text-lg font-semibold tracking-tight">You are offline</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Thera Care needs a connection for clinical data. Check your network,
          then try again.
        </p>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Cached shell only — no patient or appointment changes are saved while
          offline.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
