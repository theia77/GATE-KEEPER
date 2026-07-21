import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AttemptRunner } from "@/components/AttemptRunner";
import { apiFetchJson } from "@/lib/api";
import { colors } from "@/lib/theme";

type StartState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; attemptId: string; questions: any[] };

export default function MockAttemptScreen() {
  const { mockId, type } = useLocalSearchParams<{ mockId: string; type?: string }>();
  const [state, setState] = useState<StartState>({ status: "loading" });

  useEffect(() => {
    apiFetchJson("/api/attempts", "POST", { mock_id: mockId, attempt_type: type ?? "standard_mock" })
      .then((body) => setState({ status: "ready", attemptId: body.attempt.id, questions: body.attempt.questions }))
      .catch((e) => setState({ status: "error", message: e.message }));
  }, [mockId, type]);

  return (
    <View style={styles.screen}>
      {state.status === "loading" && <Text style={styles.muted}>Starting attempt…</Text>}
      {state.status === "error" && <Text style={styles.error}>{state.message}</Text>}
      {state.status === "ready" && <AttemptRunner attemptId={state.attemptId} questions={state.questions} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 60 },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
});
