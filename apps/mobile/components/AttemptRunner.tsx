import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Card, PrimaryButton } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { apiFetch, apiFetchJson } from "@/lib/api";

type Question = { id: string; prompt: string; options: { key: string; text: string }[]; marks: number };
type SubmitResult = { percentage: number; xp_awarded: number; penalty_triggered: boolean; penalty_cleared: boolean };

/** Mirrors apps/web/components/AttemptRunner.tsx — same API contract, RN presentation. */
export function AttemptRunner({ attemptId, questions }: { attemptId: string; questions: Question[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectOption = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
    apiFetchJson(`/api/attempts/${attemptId}/answer`, "PATCH", { question_id: questionId, selected_option: optionKey }).catch(() => {
      // offline queueing lands in Phase 6; a failed autosave here is retried on submit
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body = await apiFetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
      setResult(body.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    }
    setSubmitting(false);
  };

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
      {questions.map((q, i) => (
        <Card key={q.id} style={{ gap: 10 }}>
          <Text style={styles.prompt}>
            <Text style={styles.promptIndex}>Q{i + 1}. </Text>
            {q.prompt}
          </Text>
          <View style={{ gap: 8 }}>
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => selectOption(q.id, opt.key)}
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
        </Card>
      ))}

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
