"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { MarkdownLite } from "@/components/MarkdownLite";

type Note = { id: string; title: string; content: string; order_index: number };
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; subjectName: string; notes: Note[] };

function topicLabel(slug: string) {
  return slug
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function LearnChapterPage() {
  const { code, subtopic } = useParams<{ code: string; subtopic: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(`/api/subjects/${code}/topics/${subtopic}/notes`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: body.error ?? "Failed to load lesson" });
          return;
        }
        setState({ status: "ready", subjectName: body.subject.name, notes: body.notes });
      })
      .catch(() => setState({ status: "error", message: "Network error" }));
  }, [code, subtopic]);

  const startPractice = async () => {
    setStarting(true);
    const res = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject_code: code, sub_topics: [subtopic], limit: 20 }),
    });
    const body = await res.json();
    setStarting(false);
    if (!res.ok) {
      alert(body.error ?? "Failed to start practice");
      return;
    }
    router.push(`/practice/${body.attempt.id}`);
  };

  if (state.status === "loading") return <div className="text-inkMuted text-sm">Loading lesson…</div>;
  if (state.status === "error") return <div className="text-danger text-sm">{state.message}</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={`/learn/${code}`} className="text-xs text-inkFaint hover:text-ink">
          ← {state.subjectName}
        </Link>
        <div className="font-display font-extrabold text-2xl text-ink mt-1">{topicLabel(subtopic)}</div>
      </div>

      {state.notes.length === 0 ? (
        <Card>
          <div className="text-sm text-inkMuted">No lesson written for this chapter yet — practice questions are still available.</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {state.notes.map((n) => (
            <Card key={n.id} className="flex flex-col gap-3">
              <div className="font-display font-bold text-base text-ink">{n.title}</div>
              <MarkdownLite content={n.content} />
            </Card>
          ))}
        </div>
      )}

      <PrimaryButton onClick={startPractice} className="justify-center text-center">
        {starting ? "STARTING…" : "PRACTICE THIS CHAPTER →"}
      </PrimaryButton>
    </div>
  );
}
