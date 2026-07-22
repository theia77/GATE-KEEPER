import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { apiFetch } from "@/lib/api";

type Topic = { sub_topic: string; question_count: number };
type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; subjectName: string; topics: Topic[] };

function topicLabel(slug: string) {
  return slug
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function LearnSubjectScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    apiFetch(`/api/subjects/${code}/topics`)
      .then((body) => setState({ status: "ready", subjectName: body.subject.name, topics: body.topics }))
      .catch((e) => setState({ status: "error", message: e.message }));
  }, [code]);

  if (state.status === "loading") return <Text style={styles.muted}>Loading chapters…</Text>;
  if (state.status === "error") return <Text style={styles.error}>{state.message}</Text>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{state.subjectName}</Text>
      <Text style={styles.subtitle}>Pick a chapter to read.</Text>

      {state.topics.map((t) => (
        <Pressable key={t.sub_topic} onPress={() => router.push({ pathname: "/learn/[code]/[subtopic]", params: { code, subtopic: t.sub_topic } })}>
          <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.subjectName}>{topicLabel(t.sub_topic)}</Text>
            <Text style={styles.mutedSmall}>Read →</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 10, paddingBottom: 40 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 24, color: colors.textPrimary },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginBottom: 6 },
  subjectName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary, flex: 1, marginRight: 8 },
  mutedSmall: { fontSize: 11.5, color: colors.textMuted },
  muted: { color: colors.textMuted, fontSize: 14, padding: 20, paddingTop: 60 },
  error: { color: colors.danger, fontSize: 14, padding: 20, paddingTop: 60 },
});
