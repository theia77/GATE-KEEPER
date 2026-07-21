import { NextResponse } from "next/server";
import { customMockUploadSchema, type UploadedQuestion } from "@gate-force/shared";
import { createRouteClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/parseCsv";

/**
 * POST /api/mocks/upload
 * multipart/form-data: file (csv|json), title, description?, duration_minutes.
 * Shared by the web <input type="file"> flow and the mobile expo-document-picker flow
 * (mobile posts the same multipart shape after picking a file). Parses + validates with
 * the shared Zod schema, inserts subject-resolved questions + a `custom` mock, then
 * archives the original file to the `mock-uploads` Storage bucket under the uploader's
 * own folder (see docs/api-routes.md for the bucket/path layout).
 */
export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const title = form.get("title");
  const description = form.get("description");
  const durationMinutes = form.get("duration_minutes");

  if (!(file instanceof File) || typeof title !== "string" || typeof durationMinutes !== "string") {
    return NextResponse.json({ error: "Missing file, title, or duration_minutes" }, { status: 400 });
  }

  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const isJson = file.name.toLowerCase().endsWith(".json");
  if (!isCsv && !isJson) {
    return NextResponse.json({ error: "Only .csv or .json files are accepted" }, { status: 400 });
  }

  const rawText = await file.text();
  let rawQuestions: unknown[];
  try {
    rawQuestions = isCsv ? parseCsv(rawText) : JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: `Could not parse ${isCsv ? "CSV" : "JSON"} file` }, { status: 400 });
  }

  const parsed = customMockUploadSchema.safeParse({
    title,
    description: typeof description === "string" ? description : undefined,
    duration_minutes: durationMinutes,
    questions: rawQuestions,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const subjectCodes = [...new Set(parsed.data.questions.map((q) => q.subject_code))];
  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, code")
    .in("code", subjectCodes);

  if (subjectsError) {
    return NextResponse.json({ error: subjectsError.message }, { status: 500 });
  }
  const subjectIdByCode = new Map(subjects?.map((s) => [s.code, s.id]));
  const unknownCodes = subjectCodes.filter((c) => !subjectIdByCode.has(c));
  if (unknownCodes.length > 0) {
    return NextResponse.json({ error: `Unknown subject_code(s): ${unknownCodes.join(", ")}` }, { status: 400 });
  }

  const marksTotal = parsed.data.questions.reduce((sum, q) => sum + q.marks, 0);

  const { data: mock, error: mockError } = await supabase
    .from("mocks")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      mock_type: "custom",
      source: "community",
      marks_total: marksTotal,
      duration_minutes: parsed.data.duration_minutes,
      created_by: user.id,
      status: "published",
    })
    .select("id")
    .single();

  if (mockError || !mock) {
    return NextResponse.json({ error: mockError?.message ?? "Failed to create mock" }, { status: 500 });
  }

  const toOptions = (q: UploadedQuestion) => [
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c },
    { key: "D", text: q.option_d },
  ];

  const { data: insertedQuestions, error: questionsError } = await supabase
    .from("questions")
    .insert(
      parsed.data.questions.map((q) => ({
        subject_id: subjectIdByCode.get(q.subject_code)!,
        prompt: q.prompt,
        options: toOptions(q),
        correct_option: q.correct_option,
        explanation: q.explanation ?? null,
        marks: q.marks,
        negative_marks: q.negative_marks,
        source: "community" as const,
        created_by: user.id,
      }))
    )
    .select("id");

  if (questionsError || !insertedQuestions) {
    return NextResponse.json({ error: questionsError?.message ?? "Failed to insert questions" }, { status: 500 });
  }

  const { error: mqError } = await supabase.from("mock_questions").insert(
    insertedQuestions.map((q, i) => ({ mock_id: mock.id, question_id: q.id, order_index: i }))
  );
  if (mqError) {
    return NextResponse.json({ error: mqError.message }, { status: 500 });
  }

  const storagePath = `${user.id}/${mock.id}/${file.name}`;
  const { error: storageError } = await supabase.storage
    .from("mock-uploads")
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: isCsv ? "text/csv" : "application/json",
      upsert: false,
    });
  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: uploadRecordError } = await supabase.from("user_uploaded_mocks").insert({
    mock_id: mock.id,
    uploader_id: user.id,
    original_filename: file.name,
    file_format: isCsv ? "csv" : "json",
    storage_path: storagePath,
    parsed_question_count: insertedQuestions.length,
  });
  if (uploadRecordError) {
    return NextResponse.json({ error: uploadRecordError.message }, { status: 500 });
  }

  return NextResponse.json({ mock_id: mock.id, question_count: insertedQuestions.length }, { status: 201 });
}
