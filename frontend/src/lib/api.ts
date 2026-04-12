export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
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

/** Authenticated JSON request to the Nest API. */
export async function apiFetchJson<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
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
