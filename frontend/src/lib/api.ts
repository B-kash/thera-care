/** API path: absolute URL from env, or same-origin `/api/...` (Next rewrite → Nest). */
export function resolveApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (base) return `${base}${p}`;
  return `/api${p}`;
}

async function readApiError(res: Response): Promise<string> {
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

/** JSON request to Nest API with `credentials: 'include'` (httpOnly cookie session). */
export async function apiFetchJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(resolveApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 204) {
    return undefined as T;
  }
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
