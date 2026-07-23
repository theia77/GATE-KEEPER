import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/server";

/** GET /api/subjects — list of subjects for client-side pickers (Practice Arena, Learning Arena). */
export async function GET(request: Request) {
  const supabase = createApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: subjects, error } = await supabase.from("subjects").select("id, code, name, category").order("sort_order");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subjects });
}
