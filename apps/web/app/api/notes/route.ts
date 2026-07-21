import { NextResponse } from "next/server";
import { noteUploadSchema } from "@gate-force/shared";
import { createApiClient } from "@/lib/supabase/server";

/** GET /api/notes?visibility=public|private — RLS already scopes private notes to the owner. */
export async function GET(request: Request) {
  const supabase = createApiClient(request);
  const { searchParams } = new URL(request.url);
  const visibility = searchParams.get("visibility") ?? "public";

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, file_url, file_type, visibility, upvotes_count, downloads_count, created_at, subjects(name), profiles(username)")
    .eq("visibility", visibility)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notes: data });
}

/**
 * POST /api/notes
 * multipart/form-data: title, subject_code?, visibility, content? (self-note text), file? (PDF/scan).
 * A note is either a text self-note (`content`) or a file note (uploaded to the
 * `note-files` bucket) — at least one must be present. Mirrors the "Write Self-Note /
 * Upload PDF / Scan with Camera" options in the Upload Panel design.
 */
export async function POST(request: Request) {
  const supabase = createApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const parsed = noteUploadSchema.safeParse({
    title: form.get("title"),
    subject_code: form.get("subject_code") || undefined,
    visibility: form.get("visibility") || "private",
    content: form.get("content") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const file = form.get("file");
  if (!parsed.data.content && !(file instanceof File)) {
    return NextResponse.json({ error: "Provide either `content` or a `file`" }, { status: 400 });
  }

  let subjectId: string | null = null;
  if (parsed.data.subject_code) {
    const { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("code", parsed.data.subject_code)
      .single();
    subjectId = subject?.id ?? null;
  }

  let fileUrl: string | null = null;
  let fileType: "pdf" | "image" | null = null;
  if (file instanceof File) {
    fileType = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
    const path = `${user.id}/${crypto.randomUUID()}/${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("note-files")
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }
    fileUrl = path; // storage path; resolved to a signed URL on read via /api/uploads/signed-url
  }

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      file_url: fileUrl,
      file_type: fileType,
      visibility: parsed.data.visibility,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note }, { status: 201 });
}
