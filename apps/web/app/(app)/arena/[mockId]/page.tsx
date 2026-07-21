"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AttemptRunner } from "@/components/AttemptRunner";

type StartState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; attemptId: string; questions: any[] };

export default function MockAttemptPage() {
  const { mockId } = useParams<{ mockId: string }>();
  const searchParams = useSearchParams();
  const attemptType = searchParams.get("type") ?? "standard_mock";
  const [state, setState] = useState<StartState>({ status: "loading" });

  useEffect(() => {
    fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mock_id: mockId, attempt_type: attemptType }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: body.error ?? "Failed to start attempt" });
          return;
        }
        setState({ status: "ready", attemptId: body.attempt.id, questions: body.attempt.questions });
      })
      .catch(() => setState({ status: "error", message: "Network error" }));
  }, [mockId, attemptType]);

  if (state.status === "loading") return <div className="text-inkMuted text-sm">Starting attempt…</div>;
  if (state.status === "error") return <div className="text-danger text-sm">{state.message}</div>;

  return <AttemptRunner attemptId={state.attemptId} questions={state.questions} />;
}
