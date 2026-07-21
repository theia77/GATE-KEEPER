import { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Card, PrimaryButton } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { apiFetchForm } from "@/lib/api";
import { SUBJECT_CODES, SUBJECT_NAMES } from "@gate-force/shared";

type PickedFile = { uri: string; name: string; mimeType: string };

/** Upload Panel: Upload PDF (expo-document-picker) / Scan with Camera (expo-image-picker) / Write Self-Note. */
export default function VaultUploadScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState<string>("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "application/pdf" });
    setContent("");
  };

  const scanWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission denied");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.fileName ?? `scan-${Date.now()}.jpg`, mimeType: "image/jpeg" });
    setContent("");
  };

  const submit = async () => {
    if (!title.trim() || (!content.trim() && !file)) {
      setError("Add a title and either a note or a file");
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.append("title", title);
    if (subjectCode) form.append("subject_code", subjectCode);
    form.append("visibility", visibility);
    if (content.trim()) form.append("content", content);
    if (file) {
      form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    }
    try {
      await apiFetchForm("/api/notes", "POST", form);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setSubmitting(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>UPLOAD TO THE VAULT</Text>

      <Card style={{ gap: 8 }}>
        <Pressable onPress={pickPdf} style={styles.optionRow}>
          <View style={[styles.optionIcon, { borderColor: colors.accentOrange }]} />
          <View>
            <Text style={styles.optionTitle}>Upload PDF</Text>
            <Text style={styles.optionSubtitle}>From device files</Text>
          </View>
        </Pressable>
        <Pressable onPress={scanWithCamera} style={styles.optionRow}>
          <View style={[styles.optionIcon, { borderColor: colors.accentGold, borderRadius: 15 }]} />
          <View>
            <Text style={styles.optionTitle}>Scan with Camera</Text>
            <Text style={styles.optionSubtitle}>Handwritten notes → image</Text>
          </View>
        </Pressable>
        {file && <Text style={styles.filePicked}>Selected: {file.name}</Text>}
      </Card>

      <Card style={{ gap: 10 }}>
        <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.textFaint} value={title} onChangeText={setTitle} />
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: "top" }]}
          placeholder="Or write a self-note…"
          placeholderTextColor={colors.textFaint}
          value={content}
          onChangeText={(t) => {
            setContent(t);
            if (t) setFile(null);
          }}
          multiline
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SUBJECT_CODES.slice(0, 4).map((code) => (
            <Pressable key={code} onPress={() => setSubjectCode(code)} style={[styles.chip, subjectCode === code && styles.chipActive]}>
              <Text style={{ fontSize: 10, color: subjectCode === code ? colors.accentInk : colors.textMuted }}>{SUBJECT_NAMES[code].split(" ")[0]}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["private", "public"] as const).map((v) => (
            <Pressable key={v} onPress={() => setVisibility(v)} style={[styles.chip, visibility === v && styles.chipActive]}>
              <Text style={{ fontSize: 11, color: visibility === v ? colors.accentInk : colors.textMuted }}>{v.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

      <PrimaryButton onPress={submit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? "SAVING…" : "SAVE TO VAULT"}</Text>
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, gap: 16, paddingBottom: 60 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: colors.textPrimary },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.cardAlt, borderRadius: 12, padding: 14 },
  optionIcon: { width: 28, height: 28, borderRadius: 8, borderWidth: 2 },
  optionTitle: { fontSize: 14, color: colors.textPrimary },
  optionSubtitle: { fontSize: 11, color: colors.textMuted },
  filePicked: { fontSize: 12, color: colors.accentGold },
  input: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.cardAlt },
  chipActive: { backgroundColor: colors.accentOrange },
  submitText: { fontFamily: fonts.displayExtraBold, fontSize: 14, color: colors.accentInk, textAlign: "center" },
});
