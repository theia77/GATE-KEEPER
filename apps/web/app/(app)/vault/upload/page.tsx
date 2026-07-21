"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { Card, PrimaryButton } from "@/components/ui";
import { SUBJECT_CODES, SUBJECT_NAMES } from "@gate-force/shared";

/**
 * Upload Panel: covers all three options from the design (Upload PDF / Scan with
 * Camera / Write Self-Note) as one form — `file` accepts a PDF or a camera-captured
 * image (mobile's expo-image-picker produces the same file shape), `content` covers
 * the self-note text path.
 */
export default function UploadNotePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "text">("text");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/notes", { method: "POST", body: form });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(typeof body.error === "string" ? body.error : JSON.stringify(body.error));
      return;
    }
    router.push(`/vault?tab=${form.get("visibility")}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-lg">
      <div className="font-display font-extrabold text-2xl text-ink">UPLOAD TO THE VAULT</div>

      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-inkMuted">
          Title
          <input name="title" required className="bg-cardAlt border border-hairline rounded-lg px-3 py-2 text-ink" />
        </label>

        <label className="flex flex-col gap-1 text-sm text-inkMuted">
          Subject
          <select name="subject_code" className="bg-cardAlt border border-hairline rounded-lg px-3 py-2 text-ink">
            <option value="">General</option>
            {SUBJECT_CODES.map((code) => (
              <option key={code} value={code}>
                {SUBJECT_NAMES[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-inkMuted">
          Visibility
          <select name="visibility" defaultValue="private" className="bg-cardAlt border border-hairline rounded-lg px-3 py-2 text-ink">
            <option value="private">Private (My Notes)</option>
            <option value="public">Public (upvoted, downloadable)</option>
          </select>
        </label>

        <div className="flex gap-2 bg-cardAlt rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 text-xs font-display font-bold py-2 rounded-md ${mode === "text" ? "bg-accent text-accentInk" : "text-inkMuted"}`}
          >
            WRITE SELF-NOTE
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`flex-1 text-xs font-display font-bold py-2 rounded-md ${mode === "file" ? "bg-accent text-accentInk" : "text-inkMuted"}`}
          >
            UPLOAD PDF / SCAN
          </button>
        </div>

        {mode === "text" ? (
          <textarea name="content" rows={8} placeholder="Write your notes…" className="bg-cardAlt border border-hairline rounded-lg px-3 py-2 text-ink" />
        ) : (
          <label className="flex flex-col gap-1 text-sm text-inkMuted">
            PDF or image (camera scan)
            <input name="file" type="file" accept=".pdf,image/*" capture="environment" className="text-ink" />
          </label>
        )}
      </Card>

      {error && <div className="text-sm text-danger">{error}</div>}

      <PrimaryButton type="submit" className="justify-center text-center">
        {submitting ? "SAVING…" : "SAVE TO VAULT"}
      </PrimaryButton>
    </form>
  );
}
