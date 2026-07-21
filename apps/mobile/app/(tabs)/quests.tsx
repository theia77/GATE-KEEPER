import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { Card, ProgressBar } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

type Subject = { id: string; name: string };

function masteryColor(pct: number) {
  if (pct >= 70) return colors.success;
  if (pct >= 45) return colors.accentGold;
  return colors.danger;
}

export default function QuestsScreen() {
  const { session } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mastery, setMastery] = useState<Record<string, { correct: number; total: number }>>({});

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from("subjects")
        .select("id, name")
        .order("sort_order")
        .then(({ data }) => setSubjects(data ?? []));

      supabase
        .from("attempt_answers")
        .select("is_correct, questions(subject_id), attempts!inner(user_id)")
        .eq("attempts.user_id", session.user.id)
        .not("is_correct", "is", null)
        .then(({ data }) => {
          const by: Record<string, { correct: number; total: number }> = {};
          for (const row of data ?? []) {
            const subjectId = (row.questions as unknown as { subject_id: string } | null)?.subject_id;
            if (!subjectId) continue;
            const entry = by[subjectId] ?? { correct: 0, total: 0 };
            entry.total += 1;
            if (row.is_correct) entry.correct += 1;
            by[subjectId] = entry;
          }
          setMastery(by);
        });
    }, [session])
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>QUESTS</Text>
      <Text style={styles.subtitle}>7 Subjects + Aptitude Arena</Text>

      {subjects.map((subject) => {
        const stats = mastery[subject.id];
        const pct = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        const color = masteryColor(pct);
        return (
          <Card key={subject.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <Text style={[styles.masteryPct, { color }]}>{pct}%</Text>
            </View>
            <ProgressBar percent={pct} color={color} />
            <Text style={styles.mutedSmall}>{stats?.total ?? 0} questions attempted</Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: colors.textPrimary },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginBottom: 6 },
  subjectName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary, flex: 1, marginRight: 8 },
  masteryPct: { fontFamily: fonts.display, fontSize: 14 },
  mutedSmall: { fontSize: 11.5, color: colors.textMuted },
});
