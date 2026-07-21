import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@gate-force/shared";

/** Request-scoped client that carries the caller's session — RLS applies as that user. */
export function createRouteClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

/**
 * Request-scoped client for API routes that must work from BOTH web (cookie session,
 * via @supabase/ssr) and mobile (no cookies — Expo sends `Authorization: Bearer
 * <access_token>` instead). This is what makes cross-platform auth actually work: one
 * Supabase project, one JWT, read either way. Falls back to the cookie-based client
 * when there's no bearer token, so existing web route handlers behave identically.
 */
export function createApiClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (bearerToken) {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  }

  return createRouteClient();
}

/**
 * Read-only variant for Server Components (layouts/pages). Next.js forbids writing
 * cookies outside Server Actions/Route Handlers, so `setAll` here is a no-op — session
 * refresh still happens in middleware and in the route handlers that do allow writes.
 */
export function createServerComponentClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

/**
 * Service-role client that bypasses RLS entirely. Only for route handlers that need to
 * act deliberately outside the caller's RLS scope (issuing signed URLs after a manual
 * ownership/visibility check, parsing+inserting a validated custom-mock upload). Never
 * import this into client components — it must stay server-only.
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
