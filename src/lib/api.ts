import type { ValidationErrors } from "../types/api";

/*
 * Thin fetch wrapper around the Laravel API.
 *
 * Auth is Sanctum in bearer-token mode, so the token lives in localStorage and
 * is attached to every request. There are no cookies and no CSRF dance.
 */

const TOKEN_KEY = "rc-token";

// Dev goes through Vite's proxy (see vite.config.ts); production points at the
// deployed API via VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing with storage blocked: the session just won't persist.
  }
}

/** Thrown for any non-2xx response. `errors` carries Laravel's validation bag. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: ValidationErrors;
  /** Seconds until a throttled request may be retried. Only set on a 429. */
  readonly retryAfter: number | null;

  constructor(
    message: string,
    options: { status: number; errors?: ValidationErrors; retryAfter?: number | null },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.errors = options.errors ?? {};
    this.retryAfter = options.retryAfter ?? null;
  }
}

/** True for the AbortError a cancelled request rejects with. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Narrows an unknown catch binding to something with a readable message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    // Let the browser set the multipart boundary itself.
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}/api${path}`, { method, headers, body: payload, signal });

  if (response.status === 204) return null as T;

  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;
  const data: unknown = isJson ? await response.json() : null;

  if (!response.ok) {
    const problem = data as
      | { message?: string; errors?: ValidationErrors; retry_after?: number }
      | null;

    // The API says how long in the body; the header is the fallback for
    // anything throttled before it reaches the handler.
    const header = Number(response.headers.get("retry-after"));
    const retryAfter =
      response.status === 429
        ? (problem?.retry_after ?? (Number.isFinite(header) && header > 0 ? header : null))
        : null;

    throw new ApiError(problem?.message ?? `Request failed (${response.status})`, {
      status: response.status,
      errors: problem?.errors,
      retryAfter,
    });
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
