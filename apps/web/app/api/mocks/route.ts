import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/server";

/** GET /api/mocks?type=standard|sectional|custom — list published mocks (RLS-scoped). */
export async function GET(request: Request) {
  const supabase = createApiClient(request);
  const { searchParams } = new URL(request.url);
  const mockType = searchParams.get("type");

  let query = supabase
    .from("mocks")
    .select("id, title, description, mock_type, source, marks_total, duration_minutes, created_at, user_uploaded_mocks(uploader_id, upvotes_count, profiles(username))")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (mockType) {
    query = query.eq("mock_type", mockType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mocks: data });
}
