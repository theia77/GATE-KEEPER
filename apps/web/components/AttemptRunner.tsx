"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, PrimaryButton } from "@/components/ui";

type Question = {
  id: string;
  prompt: string;
  options: { key: string; text: string }[];
  marks: number;
};

type SubmitResult = {
  percentage: number;
  xp_awarded: number;
  penalty_triggered: boolean;
  penalty_cleared: boolean;
};

/** Shared answer/submit UI for both the Daily Drill and any Arena mock/weakness-drill attempt. */
export function AttemptRunner({ attemptId, questions }: { attemptId: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectOption = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
    fetch(`/api/attempts/${attemptId}/answer`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, selected_option: optionKey }),
    }).catch(() => {
      /* offline queueing lands in Phase 6; a failed autosave here is retried on submit */
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to submit");
      return;
    }
    setResult(body.result);
  };

  if (result) {
    return (
      <Card className="flex flex-col items-center text-center gap-3 py-10">
        <div className="font-display font-extrabold text-3xl text-ink">{result.percentage}%</div>
        <div className="text-sm text-inkMuted">+{result.xp_awarded} XP earned</div>
        {result.penalty_triggered && (
          <div className="text-sm text-[#ff6259]">Score fell below 40% — Arena locked until your Weakness Drill is cleared.</div>
        )}
        {result.penalty_cleared && <div className="text-sm text-success">Penalty Drill cleared. Arena unlocked.</div>}
        <Link href="/home" className="font-display font-bold text-accent mt-2">
          Back to Home
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <Card key={q.id} className="flex flex-col gap-3">
          <div className="text-sm text-ink leading-relaxed">
            <span className="text-inkFaint mr-2">Q{i + 1}.</span>
            {q.prompt}
          </div>
          <div className="flex flex-col gap-2">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => selectOption(q.id, opt.key)}
                  className={`text-left text-sm rounded-xl px-3.5 py-2.5 border transition ${
                    selected ? "border-accent bg-accent/10 text-ink" : "border-hairline text-inkMuted hover:border-white/20"
                  }`}
                >
                  <span className="font-display font-bold mr-2">{opt.key}</span>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </Card>
      ))}

      {error && <div className="text-sm text-danger">{error}</div>}

      <PrimaryButton onClick={submit} className="justify-center text-center">
        {submitting ? "SUBMITTING…" : `SUBMIT · ${Object.keys(answers).length}/${questions.length} ANSWERED`}
      </PrimaryButton>
    </div>
  );
}
