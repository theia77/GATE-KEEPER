import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteClient, createServiceClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 600;

const requestSchema = z.object({
  bucket: z.enum(["note-files", "mock-uploads"]),
  path: z.string().min(1),
});

/**
 * POST /api/uploads/signed-url
 * Both Storage buckets are private (see supabase/migrations/*_storage.sql) — there is
 * no public bucket. This route is the only way to turn a stored path into a usable URL,
 * and it does the visibility check the storage-object RLS policy alone can't express
 * (a public note's file must be downloadable by everyone, not just its owner's folder).
 * Uses the service-role client deliberately, after checking ownership/visibility itself.
 */
export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { bucket, path } = parsed.data;

  const service = createServiceClient();

  if (bucket === "note-files") {
    const { data: note } = await service
      .from("notes")
      .select("id, user_id, visibility, downloads_count")
      .eq("file_url", path)
      .single();

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (note.visibility !== "public" && note.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (note.user_id !== user.id) {
      await service.from("notes").update({ downloads_count: note.downloads_count + 1 }).eq("id", note.id);
    }
  } else {
    // mock-uploads: original source files for community mocks, which are readable by
    // anyone per the `user_uploaded_mocks_select_all` RLS policy — just confirm it exists.
    const { data: upload } = await service
      .from("user_uploaded_mocks")
      .select("id")
      .eq("storage_path", path)
      .single();
    if (!upload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const { data: signed, error } = await service.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    return NextResponse.json({ error: error?.message ?? "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
}
