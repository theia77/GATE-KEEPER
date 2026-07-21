import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AttemptRunner } from "@/components/AttemptRunner";
import { colors } from "@/lib/theme";

/** Started already via POST /api/practice on the topics screen — questions are passed through as a route param. */
export default function PracticeAttemptScreen() {
  const { attemptId, questions } = useLocalSearchParams<{ attemptId: string; questions: string }>();

  let parsed: any[] = [];
  try {
    parsed = JSON.parse(questions ?? "[]");
  } catch {
    parsed = [];
  }

  if (parsed.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>Practice session not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AttemptRunner attemptId={attemptId} questions={parsed} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 60 },
  error: { color: colors.danger, fontSize: 14 },
});
