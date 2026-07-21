import { LoginForm } from "./LoginForm";

// Force dynamic rendering (only valid in a Server Component page — a "use client"
// page silently ignores this export). LoginForm instantiates the Supabase browser
// client at render time, which throws if NEXT_PUBLIC_SUPABASE_URL/ANON_KEY aren't
// set; without opting out of static generation, a missing/misconfigured env var
// fails the entire deployment build instead of just this one route.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
