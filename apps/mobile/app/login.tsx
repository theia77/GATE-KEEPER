import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { PrimaryButton } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setNotice(null);

    if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (authError) setError(authError.message);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    // Supabase silently no-ops (no error, no session) when the email is already registered —
    // this is intentional anti-enumeration behavior, surfaced here via the empty identities array.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("That email is already registered — sign in instead.");
      setMode("signin");
      return;
    }
    if (!data.session) {
      setNotice("Check your email to confirm your account, then sign in.");
      setMode("signin");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GATE FORCE</Text>
      <Text style={styles.subtitle}>DA 2027 · DISCIPLINE REWARDED</Text>

      {mode === "signup" && (
        <TextInput style={styles.input} placeholder="Username" placeholderTextColor={colors.textFaint} value={username} onChangeText={setUsername} autoCapitalize="none" />
      )}
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textFaint} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textFaint} value={password} onChangeText={setPassword} secureTextEntry />

      {error && <Text style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <PrimaryButton onPress={submit} disabled={submitting} style={{ marginTop: 8 }}>
        <Text style={styles.buttonText}>{submitting ? "…" : mode === "signin" ? "ENTER THE FORCE" : "ENLIST"}</Text>
      </PrimaryButton>

      <Text style={styles.switchMode} onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "New recruit? Create an account" : "Already enlisted? Sign in"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 28, color: colors.textPrimary, textAlign: "center" },
  subtitle: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 2, color: colors.textFaint, textAlign: "center", marginBottom: 16 },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary },
  error: { color: colors.danger, fontSize: 13 },
  notice: { color: colors.success, fontSize: 13 },
  buttonText: { fontFamily: fonts.displayExtraBold, color: colors.accentInk, textAlign: "center", fontSize: 15 },
  switchMode: { color: colors.textFaint, fontSize: 12, textAlign: "center", marginTop: 8 },
});
