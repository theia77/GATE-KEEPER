import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Card, ProgressBar, SectionLabel, StatTile, PrimaryButton } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useRealtimeProgress } from "@/lib/useRealtimeProgress";
import { countQueuedMutations } from "@/lib/db";
import { flushQueue } from "@/lib/offlineQueue";
import { RANK_THRESHOLDS, DAILY_DRILL_QUESTION_COUNT } from "@gate-force/shared";

type Progress = {
  xp_total: number;
  rank_name: string;
  current_streak: number;
  locked: boolean;
  questions_solved: number;
  accuracy_pct: number;
};

export default function HomeScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [pendingSync, setPendingSync] = useState(0);

  const refetchProgress = useCallback(() => {
    if (!session) return;
    supabase
      .from("user_progress")
      .select("xp_total, rank_name, current_streak, locked, questions_solved, accuracy_pct")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => setProgress(data));
  }, [session]);

  // Cross-device sync: if a drill/mock was submitted from the web app (or another
  // device), this fires and the Home screen updates without the user pulling to
  // refresh — same Realtime channel/table as apps/web/components/RealtimeProgressListener.
  useRealtimeProgress(session?.user.id, refetchProgress);

  useFocusEffect(
    useCallback(() => {
      refetchProgress();
      countQueuedMutations().then(setPendingSync);
    }, [refetchProgress])
  );

  const xp = progress?.xp_total ?? 0;
  const rankIndex = RANK_THRESHOLDS.findIndex((t) => t.rankName === (progress?.rank_name ?? "Novice"));
  const currentTier = RANK_THRESHOLDS[Math.max(rankIndex, 0)];
  const nextTier = RANK_THRESHOLDS[Math.min(rankIndex + 1, RANK_THRESHOLDS.length - 1)];
  const tierSpan = nextTier.minXp - currentTier.minXp || 1;
  const tierProgress = Math.min(100, Math.round(((xp - currentTier.minXp) / tierSpan) * 100));
  const streak = progress?.current_streak ?? 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>GATE FORCE · DA 2027</Text>
      <Text style={styles.headline}>DAY {streak}.{"\n"}STAY DISCIPLINED.</Text>

      {pendingSync > 0 && (
        <Pressable
          onPress={() =>
            flushQueue().then(({ remaining }) => {
              setPendingSync(remaining);
              refetchProgress();
            })
          }
          style={styles.syncBanner}
        >
          <Text style={styles.syncBannerText}>
            {pendingSync} {pendingSync === 1 ? "action" : "actions"} queued offline — tap to sync now
          </Text>
        </Pressable>
      )}

      {progress?.locked && (
        <Pressable onPress={() => router.push("/(tabs)/arena")} style={styles.penaltyBanner}>
          <Text style={styles.penaltyTitle}>⚠ PENALTY ACTIVE</Text>
          <Text style={styles.penaltyBody}>Mock score fell below 40%. Arena locked until Weakness Drill is cleared. Tap to go.</Text>
        </Pressable>
      )}

      <Card style={{ gap: 14 }}>
        <SectionLabel>Streak Armor</SectionLabel>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakDays}>DAYS</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <View key={i} style={[styles.streakBar, { backgroundColor: i < Math.min(streak, 5) ? colors.accentOrange : "rgba(255,255,255,0.1)" }]} />
          ))}
        </View>
        <Text style={styles.mutedSmall}>Miss a day. Lose it all.</Text>
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <SectionLabel>{`${currentTier.rankName} → ${nextTier.rankName}`}</SectionLabel>
          <Text style={styles.xpLabel}>{xp.toLocaleString()} / {nextTier.minXp.toLocaleString()}</Text>
        </View>
        <ProgressBar percent={tierProgress} color={colors.accentGold} />
      </Card>

      <PrimaryButton onPress={() => router.push("/drill")}>
        <Text style={styles.ctaTitle}>START DAILY DRILL · {DAILY_DRILL_QUESTION_COUNT}Q</Text>
        <Text style={styles.ctaSubtitle}>Mandatory. Locks at midnight.</Text>
      </PrimaryButton>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile value={`${progress?.accuracy_pct ?? 0}%`} label="Accuracy" />
        <StatTile value={progress?.questions_solved ?? 0} label="Solved" />
        <StatTile value={(progress?.rank_name ?? "Novice").toUpperCase()} label="Rank" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 18, paddingBottom: 40 },
  eyebrow: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 2, color: colors.textSecondary, textTransform: "uppercase" },
  headline: { fontFamily: fonts.displayExtraBold, fontSize: 30, lineHeight: 32, color: colors.textPrimary },
  syncBanner: { backgroundColor: "rgba(255,176,32,0.12)", borderColor: "rgba(255,176,32,0.4)", borderWidth: 1, borderRadius: 14, padding: 12 },
  syncBannerText: { fontSize: 12, color: colors.accentGold },
  penaltyBanner: { backgroundColor: "rgba(255,59,48,0.12)", borderColor: "rgba(255,59,48,0.4)", borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  penaltyTitle: { fontFamily: fonts.display, fontSize: 13, color: "#ff6259" },
  penaltyBody: { fontSize: 12.5, color: "#d8c9c4", lineHeight: 18 },
  streakNumber: { fontFamily: fonts.displayExtraBold, fontSize: 52, color: colors.accentOrange, lineHeight: 52 },
  streakDays: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 1, color: colors.textSecondary, paddingBottom: 6 },
  streakBar: { flex: 1, height: 6, borderRadius: 3 },
  mutedSmall: { fontSize: 12, color: colors.textMuted },
  xpLabel: { fontFamily: fonts.display, fontSize: 14, color: colors.accentGold },
  ctaTitle: { fontFamily: fonts.displayExtraBold, fontSize: 18, color: colors.accentInk },
  ctaSubtitle: { fontSize: 12.5, color: "rgba(26,14,8,0.75)", marginTop: 2 },
});
