import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AttemptRunner } from "@/components/AttemptRunner";
import { apiFetch } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";

type DrillState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "already_done" }
  | { status: "ready"; attemptId: string; questions: any[] };

export default function DrillScreen() {
  const [state, setState] = useState<DrillState>({ status: "loading" });

  useEffect(() => {
    apiFetch("/api/drills/daily")
      .then((body) => {
        if (body.alreadyCompleted) {
          setState({ status: "already_done" });
          return;
        }
        const questions = body.attempt.questions ?? body.attempt.attempt_answers?.map((a: any) => a.questions);
        setState({ status: "ready", attemptId: body.attempt.id, questions });
      })
      .catch((e) => setState({ status: "error", message: e.message }));
  }, []);

  return (
    <View style={styles.screen}>
      {state.status === "loading" && <Text style={styles.muted}>Loading today's drill…</Text>}
      {state.status === "error" && <Text style={styles.error}>{state.message}</Text>}
      {state.status === "already_done" && <Text style={styles.muted}>Today's drill is already done. Streak Armor holds — come back tomorrow.</Text>}
      {state.status === "ready" && (
        <>
          <Text style={styles.title}>DAILY DRILL</Text>
          <AttemptRunner attemptId={state.attemptId} questions={state.questions} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 60, gap: 16 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 24, color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
});
