import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

/**
 * Calls the same apps/web `/api/*` route handlers web uses, authenticated with the
 * current Supabase session's access token instead of a cookie — see
 * apps/web/lib/supabase/server.ts `createApiClient`, which accepts either. This is
 * what keeps drill generation, mock grading (submit_attempt), and file upload parsing
 * identical across web and mobile instead of being reimplemented twice.
 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  return body;
}

export async function apiFetchJson(path: string, method: string, json: unknown) {
  return apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
}

export async function apiFetchForm(path: string, method: string, form: FormData) {
  return apiFetch(path, { method, body: form });
}
