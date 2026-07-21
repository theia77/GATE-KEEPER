import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Card } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Note = {
  id: string;
  title: string;
  upvotes_count: number;
  downloads_count: number;
  subjects: { name: string } | null;
  profiles: { username: string } | null;
};

export default function VaultScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"public" | "private">("public");
  const [notes, setNotes] = useState<Note[]>([]);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("notes")
        .select("id, title, upvotes_count, downloads_count, subjects(name), profiles(username)")
        .eq("visibility", tab)
        .order("created_at", { ascending: false })
        .then(({ data }) => setNotes((data as unknown as Note[]) ?? []));
    }, [tab])
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>THE VAULT</Text>

        <View style={styles.tabRow}>
          {(["public", "private"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabButton, tab === t && styles.tabButtonActive]}>
              <Text style={[styles.tabLabel, { color: tab === t ? colors.accentInk : colors.textSecondary }]}>
                {t === "public" ? "PUBLIC NOTES" : "MY NOTES"}
              </Text>
            </Pressable>
          ))}
        </View>

        {notes.map((note) => (
          <Card key={note.id} style={{ gap: 6 }}>
            <Text style={styles.noteTitle}>{note.title}</Text>
            <Text style={styles.mutedSmall}>{note.subjects?.name ?? "General"} · @{note.profiles?.username}</Text>
            {tab === "public" && (
              <View style={{ flexDirection: "row", gap: 14, paddingTop: 4 }}>
                <Text style={styles.upvotes}>▲ {note.upvotes_count}</Text>
                <Text style={styles.mutedSmall}>{note.downloads_count} downloads</Text>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      <Pressable onPress={() => router.push("/vault-upload")} style={styles.fab}>
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 10, paddingBottom: 100 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: colors.textPrimary, marginBottom: 4 },
  tabRow: { flexDirection: "row", gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 4, borderColor: colors.border, borderWidth: 1, marginBottom: 6 },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  tabButtonActive: { backgroundColor: colors.accentOrange },
  tabLabel: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.5 },
  noteTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  mutedSmall: { fontSize: 11.5, color: colors.textMuted },
  upvotes: { fontSize: 12, color: colors.accentGold, fontFamily: fonts.bodySemiBold },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPlus: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: colors.accentInk, lineHeight: 28 },
});
