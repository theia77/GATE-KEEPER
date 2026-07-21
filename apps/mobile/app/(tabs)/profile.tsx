import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { Card, StatTile } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

type Progress = { xp_total: number; rank_name: string; best_streak: number; accuracy_pct: number };

export default function ProfileScreen() {
  const { session } = useAuth();
  const [username, setUsername] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase.from("profiles").select("username").eq("id", session.user.id).single().then(({ data }) => setUsername(data?.username ?? ""));
      supabase
        .from("user_progress")
        .select("xp_total, rank_name, best_streak, accuracy_pct")
        .eq("user_id", session.user.id)
        .single()
        .then(({ data }) => setProgress(data));
    }, [session])
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>PROFILE</Text>

      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
        <View style={styles.avatar} />
        <Text style={styles.rankName}>{(progress?.rank_name ?? "Novice").toUpperCase()}</Text>
        <Text style={styles.mutedSmall}>@{username}</Text>
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile value={(progress?.xp_total ?? 0).toLocaleString()} label="Total XP" />
        <StatTile value={progress?.best_streak ?? 0} label="Best Streak" />
        <StatTile value={`${progress?.accuracy_pct ?? 0}%`} label="Accuracy" />
      </View>

      <Pressable onPress={() => supabase.auth.signOut()} style={styles.signOut}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: colors.textPrimary },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.cardAlt, borderColor: colors.accentGold, borderWidth: 2 },
  rankName: { fontFamily: fonts.displayExtraBold, fontSize: 18, letterSpacing: 0.5, color: colors.accentGold },
  mutedSmall: { fontSize: 12, color: colors.textMuted },
  signOut: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
  signOutText: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 1, color: colors.textFaint },
});
