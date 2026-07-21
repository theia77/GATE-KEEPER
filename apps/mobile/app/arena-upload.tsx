import { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Card, PrimaryButton } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { apiFetchForm } from "@/lib/api";

/** Custom mock upload via expo-document-picker — same /api/mocks/upload contract as web. */
export default function ArenaUploadScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [file, setFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "application/json"] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "text/csv" });
  };

  const submit = async () => {
    if (!title.trim() || !file) {
      setError("Add a title and pick a .csv or .json file");
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.append("title", title);
    form.append("duration_minutes", durationMinutes);
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    try {
      const body = await apiFetchForm("/api/mocks/upload", "POST", form);
      router.replace(`/arena/${body.mock_id}?type=custom_mock`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setSubmitting(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>UPLOAD CUSTOM MOCK</Text>
      <Text style={styles.hint}>
        CSV columns: subject_code,prompt,option_a,option_b,option_c,option_d,correct_option,marks,negative_marks,explanation
      </Text>

      <Card style={{ gap: 10 }}>
        <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.textFaint} value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Duration (minutes)" placeholderTextColor={colors.textFaint} value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="numeric" />
        <Pressable onPress={pickFile} style={styles.pickButton}>
          <Text style={styles.pickButtonText}>{file ? file.name : "Choose .csv or .json file"}</Text>
        </Pressable>
      </Card>

      {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

      <PrimaryButton onPress={submit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? "UPLOADING…" : "PUBLISH MOCK"}</Text>
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 16, paddingBottom: 60 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: colors.textPrimary },
  hint: { fontSize: 11, color: colors.textFaint, lineHeight: 16 },
  input: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary },
  pickButton: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  pickButtonText: { color: colors.textMuted, fontSize: 13 },
  submitText: { fontFamily: fonts.displayExtraBold, fontSize: 14, color: colors.accentInk, textAlign: "center" },
});
