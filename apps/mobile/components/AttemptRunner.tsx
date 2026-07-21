import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Card, PrimaryButton } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { enqueueMutation } from "@/lib/db";
import { flushQueue } from "@/lib/offlineQueue";

type Question = {
  id: string;
  prompt: string;
  options: { key: string; text: string }[];
  marks: number;
  question_type?: "mcq" | "msq" | "nat";
};
type SubmitResult = { percentage: number; xp_awarded: number; penalty_triggered: boolean; penalty_cleared: boolean };

const looksLikeCode = (text: string) => /\n|[{};]|def |class |=>|#include|print\(/.test(text);

/**
 * Mirrors apps/web/components/AttemptRunner.tsx — same API contract, RN presentation,
 * plus offline handling (Phase 6): a failed autosave or submit queues into SQLite
 * (lib/db.ts) instead of silently dropping, and replays in order once connectivity
 * returns (lib/offlineQueue.ts). See that file for the streak conflict-resolution rule.
 */
export function AttemptRunner({ attemptId, questions }: { attemptId: string; questions: Question[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    const payload = { question_id: questionId, selected_option: value };
    apiFetchJson(`/api/attempts/${attemptId}/answer`, "PATCH", payload).catch(() => {
      enqueueMutation("answer", attemptId, payload);
    });
  };

  const selectOption = (questionId: string, optionKey: string) => saveAnswer(questionId, optionKey);

  const toggleMsqOption = (questionId: string, optionKey: string) => {
    const current = new Set(answers[questionId] ? answers[questionId].split(",") : []);
    if (current.has(optionKey)) current.delete(optionKey);
    else current.add(optionKey);
    saveAnswer(questionId, Array.from(current).sort().join(","));
  };

  const setNatAnswer = (questionId: string, value: string) => saveAnswer(questionId, value);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body = await apiFetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
      setResult(body.result);
    } catch {
      // Offline (or the server is briefly unreachable): queue the submit itself so the
      // drill/mock still "completes" from the user's perspective. The real score/XP/
      // streak outcome only exists once submit_attempt actually runs server-side —
      // there is nothing to show here but "queued," by design.
      await enqueueMutation("submit", attemptId, {});
      setQueued(true);
      flushQueue().catch(() => {});
    }
    setSubmitting(false);
  };

  if (queued) {
    return (
      <Card style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
        <Text style={styles.resultXp}>Queued — no signal right now.</Text>
        <Text style={styles.resultDanger}>Your answers are saved locally and will sync (grading, XP, streak) the moment you're back online.</Text>
        <Pressable onPress={() => router.replace("/(tabs)/home")}>
          <Text style={styles.backLink}>Back to Home</Text>
        </Pressable>
      </Card>
    );
  }

  if (result) {
    return (
      <Card style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
        <Text style={styles.resultPct}>{result.percentage}%</Text>
        <Text style={styles.resultXp}>+{result.xp_awarded} XP earned</Text>
        {result.penalty_triggered && <Text style={styles.resultDanger}>Score fell below 40% — Arena locked until your Weakness Drill is cleared.</Text>}
        {result.penalty_cleared && <Text style={styles.resultSuccess}>Penalty Drill cleared. Arena unlocked.</Text>}
        <Pressable onPress={() => router.replace("/(tabs)/home")}>
          <Text style={styles.backLink}>Back to Home</Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      {questions.map((q, i) => {
        const questionType = q.question_type ?? "mcq";
        const isCode = looksLikeCode(q.prompt);
        const selectedKeys = new Set(questionType === "msq" && answers[q.id] ? answers[q.id].split(",") : []);
        return (
          <Card key={q.id} style={{ gap: 10 }}>
            <Text style={styles.prompt}>
              <Text style={styles.promptIndex}>
                Q{i + 1}.{questionType !== "mcq" && `  ${questionType.toUpperCase()}`}{"  "}
              </Text>
              {!isCode && q.prompt}
            </Text>
            {isCode && (
              <Text style={styles.code}>{q.prompt}</Text>
            )}

            {questionType === "nat" ? (
              <TextInput
                value={answers[q.id] ?? ""}
                onChangeText={(text) => setNatAnswer(q.id, text)}
                placeholder="Enter numeric answer"
                placeholderTextColor={colors.textFaint}
                keyboardType="numbers-and-punctuation"
                style={styles.natInput}
              />
            ) : (
              <View style={{ gap: 8 }}>
                {q.options.map((opt) => {
                  const selected = questionType === "msq" ? selectedKeys.has(opt.key) : answers[q.id] === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => (questionType === "msq" ? toggleMsqOption(q.id, opt.key) : selectOption(q.id, opt.key))}
                      style={[styles.option, selected && styles.optionSelected]}
                    >
                      <Text style={[styles.optionText, selected && { color: colors.textPrimary }]}>
                        <Text style={styles.optionKey}>{opt.key}  </Text>
                        {opt.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>
        );
      })}

      {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

      <PrimaryButton onPress={submit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? "SUBMITTING…" : `SUBMIT · ${Object.keys(answers).length}/${questions.length} ANSWERED`}</Text>
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  prompt: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  promptIndex: { color: colors.textFaint },
  code: {
    fontFamily: "monospace",
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textPrimary,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  natInput: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 14,
  },
  option: { borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  optionSelected: { borderColor: colors.accentOrange, backgroundColor: "rgba(255,91,46,0.1)" },
  optionText: { fontSize: 14, color: colors.textSecondary },
  optionKey: { fontFamily: fonts.display, fontWeight: "700" },
  submitText: { fontFamily: fonts.displayExtraBold, fontSize: 14, color: colors.accentInk, textAlign: "center" },
  resultPct: { fontFamily: fonts.displayExtraBold, fontSize: 32, color: colors.textPrimary },
  resultXp: { fontSize: 14, color: colors.textSecondary },
  resultDanger: { fontSize: 13, color: "#ff6259", textAlign: "center" },
  resultSuccess: { fontSize: 13, color: colors.success, textAlign: "center" },
  backLink: { fontFamily: fonts.display, fontWeight: "700", color: colors.accentOrange, marginTop: 8 },
});
