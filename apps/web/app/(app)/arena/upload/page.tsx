"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { Card, PrimaryButton } from "@/components/ui";

export default function UploadMockPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/mocks/upload", { method: "POST", body: form });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(typeof body.error === "string" ? body.error : JSON.stringify(body.error));
      return;
    }
    router.push(`/arena/${body.mock_id}?type=custom_mock`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-lg">
      <div className="font-display font-extrabold text-2xl text-ink">UPLOAD CUSTOM MOCK</div>
      <div className="text-xs text-inkFaint">
        CSV columns: subject_code,prompt,option_a,option_b,option_c,option_d,correct_option,marks,negative_marks,explanation.
        JSON: an array of objects with the same keys. See docs/api-routes.md for the subject_code list.
      </div>

      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-inkMuted">
          Title
          <input name="title" required className="bg-cardAlt border border-hairline rounded-lg px-3 py-2 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-inkMuted">
          Description (optional)
          <input name="description" className="bg-cardAlt border border-hairline rounded-lg px-3 py-2 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-inkMuted">
          Duration (minutes)
          <input name="duration_minutes" type="number" defaultValue={60} required className="bg-cardAlt border border-hairline rounded-lg px-3 py-2 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-inkMuted">
          File (.csv or .json)
          <input name="file" type="file" accept=".csv,.json" required className="text-ink" />
        </label>
      </Card>

      {error && <div className="text-sm text-danger">{error}</div>}

      <PrimaryButton type="submit" className="justify-center text-center">
        {submitting ? "UPLOADING…" : "PUBLISH MOCK"}
      </PrimaryButton>
    </form>
  );
}
