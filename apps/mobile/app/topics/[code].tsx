import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, ProgressBar } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { apiFetch, apiFetchJson } from "@/lib/api";

type Topic = { sub_topic: string; question_count: number; accuracy_pct: number; attempted_count: number };
type TopicsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; subjectName: string; topics: Topic[] };

function masteryColor(pct: number) {
  if (pct >= 70) return colors.success;
  if (pct >= 45) return colors.accentGold;
  return colors.danger;
}

function topicLabel(slug: string) {
  return slug
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SubjectTopicsScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [state, setState] = useState<TopicsState>({ status: "loading" });
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/subjects/${code}/topics`)
      .then((body) => setState({ status: "ready", subjectName: body.subject.name, topics: body.topics }))
      .catch((e) => setState({ status: "error", message: e.message }));
  }, [code]);

  const startPractice = async (sub_topic?: string) => {
    setStarting(sub_topic ?? "__all__");
    try {
      const body = await apiFetchJson("/api/practice", "POST", { subject_code: code, sub_topic, limit: 20 });
      router.push({ pathname: "/practice/[attemptId]", params: { attemptId: body.attempt.id, questions: JSON.stringify(body.attempt.questions) } });
    } catch (e: any) {
      alert(e.message ?? "Failed to start practice");
    }
    setStarting(null);
  };

  if (state.status === "loading") return <Text style={styles.muted}>Loading chapters…</Text>;
  if (state.status === "error") return <Text style={styles.error}>{state.message}</Text>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{state.subjectName}</Text>
      <Text style={styles.subtitle}>Pick a chapter to practice, untimed — or drill the whole subject.</Text>

      <Pressable onPress={() => startPractice(undefined)} disabled={starting !== null} style={styles.allButton}>
        <Text style={styles.allButtonText}>{starting === "__all__" ? "STARTING…" : "PRACTICE ALL CHAPTERS →"}</Text>
      </Pressable>

      <Pressable onPress={() => router.push({ pathname: "/learn/[code]", params: { code } })}>
        <Text style={styles.learnLink}>📖 Read the lessons for this subject in the Learning Arena →</Text>
      </Pressable>

      {state.topics.map((t) => {
        const color = masteryColor(t.accuracy_pct);
        return (
          <Card key={t.sub_topic} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.subjectName}>{topicLabel(t.sub_topic)}</Text>
              <Text style={[styles.masteryPct, { color }]}>{t.accuracy_pct}%</Text>
            </View>
            <ProgressBar percent={t.accuracy_pct} color={color} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.mutedSmall}>
                {t.question_count} questions · {t.attempted_count} attempted
              </Text>
              <View style={{ flexDirection: "row", gap: 14 }}>
                <Pressable onPress={() => router.push({ pathname: "/learn/[code]/[subtopic]", params: { code, subtopic: t.sub_topic } })}>
                  <Text style={styles.learnLinkSmall}>LEARN</Text>
                </Pressable>
                <Pressable onPress={() => startPractice(t.sub_topic)} disabled={starting !== null}>
                  <Text style={styles.practiceLink}>{starting === t.sub_topic ? "STARTING…" : "PRACTICE →"}</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 24, color: colors.textPrimary },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginBottom: 6 },
  subjectName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary, flex: 1, marginRight: 8 },
  masteryPct: { fontFamily: fonts.display, fontSize: 14 },
  mutedSmall: { fontSize: 11.5, color: colors.textMuted },
  muted: { color: colors.textMuted, fontSize: 14, padding: 20, paddingTop: 60 },
  error: { color: colors.danger, fontSize: 14, padding: 20, paddingTop: 60 },
  allButton: { borderColor: colors.accentOrange, borderWidth: 1, backgroundColor: "rgba(255,91,46,0.1)", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  allButtonText: { fontFamily: fonts.displayExtraBold, fontSize: 13, color: colors.textPrimary, textAlign: "center" },
  practiceLink: { fontFamily: fonts.display, fontWeight: "700", fontSize: 12, color: colors.accentOrange },
  learnLink: { fontSize: 12.5, color: colors.textMuted, textAlign: "center" },
  learnLinkSmall: { fontFamily: fonts.display, fontWeight: "700", fontSize: 11, color: colors.textMuted },
});
