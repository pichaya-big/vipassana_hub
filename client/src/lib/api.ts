// Small wrapper for calls to the Node.js API through the same origin (/api/*).
// Errors from the server come back as { message, fields } so forms can show them next to each field.

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
}

const REQUEST_TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 15 * 60 * 1000;

export async function apiRequest<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T & ApiErrorBody>> {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      // File uploads send FormData; the browser sets its multipart header itself
      headers: body === undefined || body instanceof FormData ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      credentials: "same-origin",
      // Never wait forever on a request. A stuck spinner is worse than an error message.
      // Uploads can take minutes for a large video, so they get a much longer limit.
      signal: AbortSignal.timeout(body instanceof FormData ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS),
    });
    const data = (res.status === 204 ? {} : await res.json().catch(() => ({}))) as T & ApiErrorBody;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง" } as T & ApiErrorBody,
    };
  }
}

export const apiGet = <T = unknown>(path: string) => apiRequest<T>("GET", path);
export const apiPost = <T = unknown>(path: string, body?: unknown) => apiRequest<T>("POST", path, body);
export const apiPatch = <T = unknown>(path: string, body?: unknown) => apiRequest<T>("PATCH", path, body);
