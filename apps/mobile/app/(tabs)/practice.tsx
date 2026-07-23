import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Card, PrimaryButton } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { apiFetch, apiFetchJson } from "@/lib/api";

type Subject = { id: string; code: string; name: string };
type Topic = { sub_topic: string; question_count: number; accuracy_pct: number };

function topicLabel(slug: string) {
  return slug
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/** Practice Arena: pick a subject, any number of its chapters, and how many questions — shuffles
 * across the selection, preferring questions not yet completed, mirrors apps/web (app)/practice/page.tsx. */
export default function PracticeArenaScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectCode, setSubjectCode] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState("20");
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/subjects")
      .then((body) => setSubjects(body.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!subjectCode) {
      setTopics([]);
      setSelectedTopics(new Set());
      return;
    }
    setLoadingTopics(true);
    apiFetch(`/api/subjects/${subjectCode}/topics`)
      .then((body) => {
        setTopics(body.topics ?? []);
        setSelectedTopics(new Set());
      })
      .finally(() => setLoadingTopics(false));
  }, [subjectCode]);

  const toggleTopic = (slug: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const startPractice = async () => {
    if (!subjectCode) return;
    setStarting(true);
    setError(null);
    try {
      const body = await apiFetchJson("/api/practice", "POST", {
        subject_code: subjectCode,
        sub_topics: selectedTopics.size > 0 ? Array.from(selectedTopics) : undefined,
        limit: Math.max(1, Math.min(50, Number(questionCount) || 1)),
      });
      router.push({ pathname: "/practice/[attemptId]", params: { attemptId: body.attempt.id, questions: JSON.stringify(body.attempt.questions) } });
    } catch (e: any) {
      setError(e.message ?? "Failed to start practice");
    }
    setStarting(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>PRACTICE ARENA</Text>
      <Text style={styles.subtitle}>Pick a subject, any chapters, and how many questions — untimed, unfinished questions first.</Text>

      <Card style={{ gap: 16 }}>
        <View>
          <Text style={styles.sectionLabel}>Subject</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {subjects.map((s) => (
              <Pressable key={s.id} onPress={() => setSubjectCode(s.code)} style={[styles.chip, subjectCode === s.code && styles.chipActive]}>
                <Text style={[styles.chipText, subjectCode === s.code && styles.chipTextActive]}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {subjectCode && (
          <View>
            <Text style={styles.sectionLabel}>
              Chapters {selectedTopics.size > 0 ? `(${selectedTopics.size} selected)` : "(none = all chapters)"}
            </Text>
            {loadingTopics ? (
              <Text style={styles.muted}>Loading chapters…</Text>
            ) : (
              <View style={{ gap: 6, marginTop: 8 }}>
                {topics.map((t) => {
                  const checked = selectedTopics.has(t.sub_topic);
                  return (
                    <Pressable key={t.sub_topic} onPress={() => toggleTopic(t.sub_topic)} style={[styles.topicRow, checked && styles.topicRowActive]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={[styles.checkbox, checked && styles.checkboxActive]} />
                        <Text style={styles.topicText}>{topicLabel(t.sub_topic)}</Text>
                      </View>
                      <Text style={styles.mutedSmall}>
                        {t.question_count} Qs · {t.accuracy_pct}%
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {subjectCode && (
          <View>
            <Text style={styles.sectionLabel}>Number of questions</Text>
            <TextInput
              value={questionCount}
              onChangeText={setQuestionCount}
              keyboardType="number-pad"
              style={styles.countInput}
            />
          </View>
        )}

        {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

        {subjectCode && (
          <PrimaryButton onPress={startPractice} disabled={starting}>
            <Text style={styles.submitText}>{starting ? "STARTING…" : "START PRACTICE →"}</Text>
          </PrimaryButton>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 24, color: colors.textPrimary },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginBottom: 6 },
  sectionLabel: { fontFamily: fonts.display, fontWeight: "700", fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  mutedSmall: { fontSize: 11, color: colors.textMuted },
  chip: { borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { borderColor: colors.accentOrange, backgroundColor: "rgba(255,91,46,0.1)" },
  chipText: { fontFamily: fonts.display, fontWeight: "600", fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: colors.textPrimary },
  topicRow: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topicRowActive: { borderColor: colors.accentOrange, backgroundColor: "rgba(255,91,46,0.1)" },
  checkbox: { width: 14, height: 14, borderRadius: 3, borderWidth: 2, borderColor: colors.border },
  checkboxActive: { borderColor: colors.accentOrange, backgroundColor: colors.accentOrange },
  topicText: { fontSize: 13, color: colors.textPrimary },
  countInput: {
    marginTop: 8,
    width: 100,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 14,
  },
  submitText: { fontFamily: fonts.displayExtraBold, fontSize: 14, color: colors.accentInk, textAlign: "center" },
});
