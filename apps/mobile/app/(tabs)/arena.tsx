import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Card, PrimaryButton } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

type Mock = { id: string; title: string; marks_total: number; duration_minutes: number; mock_type: string };

export default function ArenaScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const [drillMockId, setDrillMockId] = useState<string | null>(null);
  const [officialMocks, setOfficialMocks] = useState<Mock[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from("user_progress")
        .select("locked, active_penalty_drill_id")
        .eq("user_id", session.user.id)
        .single()
        .then(async ({ data }) => {
          setLocked(!!data?.locked);
          if (data?.locked && data.active_penalty_drill_id) {
            const { data: penalty } = await supabase
              .from("penalty_drills")
              .select("drill_mock_id")
              .eq("id", data.active_penalty_drill_id)
              .single();
            setDrillMockId(penalty?.drill_mock_id ?? null);
          }
        });

      supabase
        .from("mocks")
        .select("id, title, marks_total, duration_minutes, mock_type")
        .eq("status", "published")
        .eq("source", "official")
        .order("created_at", { ascending: false })
        .then(({ data }) => setOfficialMocks(data ?? []));
    }, [session])
  );

  if (locked) {
    return (
      <View style={[styles.screen, styles.lockedContainer]}>
        <View style={styles.lockedIcon} />
        <Text style={styles.lockedTitle}>ARENA LOCKED</Text>
        <Text style={styles.lockedBody}>Your last mock scored below 40%. Standard mocks are locked until you clear the targeted Weakness Drill.</Text>
        {drillMockId && (
          <PrimaryButton onPress={() => router.push(`/arena/${drillMockId}?type=weakness_drill`)} style={{ marginTop: 8 }}>
            <Text style={styles.ctaText}>START WEAKNESS DRILL</Text>
          </PrimaryButton>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>MOCK ARENA</Text>
      <Text style={styles.subtitle}>Timed. Ranked. No mercy.</Text>

      {officialMocks.map((mock) => (
        <Pressable key={mock.id} onPress={() => router.push(`/arena/${mock.id}`)}>
          <Card style={{ gap: 6 }}>
            <Text style={styles.mockTitle}>{mock.title}</Text>
            <Text style={styles.mutedSmall}>{mock.marks_total} marks · {mock.duration_minutes} min</Text>
          </Card>
        </Pressable>
      ))}

      <Pressable onPress={() => router.push("/arena-upload")} style={styles.uploadCta}>
        <Text style={styles.uploadCtaText}>+ UPLOAD CUSTOM MOCK (CSV/JSON)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 10, paddingBottom: 40 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: colors.textPrimary },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginBottom: 6 },
  mockTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15.5, color: colors.textPrimary },
  mutedSmall: { fontSize: 12, color: colors.textMuted },
  lockedContainer: { alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  lockedIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: "rgba(255,59,48,0.14)", borderColor: "rgba(255,59,48,0.4)", borderWidth: 1 },
  lockedTitle: { fontFamily: fonts.displayExtraBold, fontSize: 20, color: "#ff6259" },
  lockedBody: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19, maxWidth: 280 },
  ctaText: { fontFamily: fonts.displayExtraBold, fontSize: 15, color: colors.accentInk, textAlign: "center" },
  uploadCta: { borderColor: "rgba(255,255,255,0.18)", borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  uploadCtaText: { fontFamily: fonts.display, fontWeight: "700", fontSize: 13, color: colors.textMuted },
});
