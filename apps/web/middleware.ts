import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth cookie on every request so server components (which
// can't write cookies themselves) always see a valid session.
//
// Fails open, deliberately: middleware runs on every single request with no error
// boundary of its own, so an unhandled throw here (e.g. missing/invalid
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY in this environment) takes down the entire app
// with a 500 (MIDDLEWARE_INVOCATION_FAILED), not just auth. If session refresh fails
// for any reason, skip it and pass the request through — page-level auth checks
// (createServerComponentClient in each layout) still redirect unauthenticated users;
// the only cost of failing open here is a session that isn't proactively refreshed.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("middleware: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY not set, skipping session refresh");
    return response;
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    await supabase.auth.getUser();
  } catch (error) {
    console.error("middleware: Supabase session refresh failed", error);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
