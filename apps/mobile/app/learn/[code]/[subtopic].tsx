import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, PrimaryButton } from "@/components/ui";
import { MarkdownLite } from "@/components/MarkdownLite";
import { colors, fonts } from "@/lib/theme";
import { apiFetch, apiFetchJson } from "@/lib/api";

type Note = { id: string; title: string; content: string };
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

export default function LearnChapterScreen() {
  const { code, subtopic } = useLocalSearchParams<{ code: string; subtopic: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiFetch(`/api/subjects/${code}/topics/${subtopic}/notes`)
      .then((body) => setState({ status: "ready", subjectName: body.subject.name, notes: body.notes }))
      .catch((e) => setState({ status: "error", message: e.message }));
  }, [code, subtopic]);

  const startPractice = async () => {
    setStarting(true);
    try {
      const body = await apiFetchJson("/api/practice", "POST", { subject_code: code, sub_topics: [subtopic], limit: 20 });
      router.push({ pathname: "/practice/[attemptId]", params: { attemptId: body.attempt.id, questions: JSON.stringify(body.attempt.questions) } });
    } catch (e: any) {
      alert(e.message ?? "Failed to start practice");
    }
    setStarting(false);
  };

  if (state.status === "loading") return <Text style={styles.muted}>Loading lesson…</Text>;
  if (state.status === "error") return <Text style={styles.error}>{state.message}</Text>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.push({ pathname: "/learn/[code]", params: { code } })}>
        <Text style={styles.backLink}>← {state.subjectName}</Text>
      </Pressable>
      <Text style={styles.title}>{topicLabel(subtopic)}</Text>

      {state.notes.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No lesson written for this chapter yet — practice questions are still available.</Text>
        </Card>
      ) : (
        state.notes.map((n) => (
          <Card key={n.id} style={{ gap: 10 }}>
            <Text style={styles.noteTitle}>{n.title}</Text>
            <MarkdownLite content={n.content} />
          </Card>
        ))
      )}

      <PrimaryButton onPress={startPractice} disabled={starting}>
        <Text style={styles.submitText}>{starting ? "STARTING…" : "PRACTICE THIS CHAPTER →"}</Text>
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: colors.textPrimary, marginTop: 2 },
  backLink: { fontSize: 12, color: colors.textMuted },
  noteTitle: { fontFamily: fonts.display, fontWeight: "700", fontSize: 15, color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14, padding: 20, paddingTop: 60 },
  submitText: { fontFamily: fonts.displayExtraBold, fontSize: 14, color: colors.accentInk, textAlign: "center" },
});
