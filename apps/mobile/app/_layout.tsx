import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, AppState } from "react-native";
import {
  useFonts as useBarlowFonts,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from "@expo-google-fonts/barlow-condensed";
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "@/lib/AuthProvider";
import { registerForPushNotificationsAsync, scheduleStreakReminder } from "@/lib/notifications";
import { initDb } from "@/lib/db";
import { flushQueue } from "@/lib/offlineQueue";
import { colors } from "@/lib/theme";

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "login";
    if (!session && !inAuthGroup) {
      router.replace("/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [session, loading, segments]);

  useEffect(() => {
    if (!session) return;
    registerForPushNotificationsAsync(session.user.id);
    scheduleStreakReminder();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    // Flush on mount, on every foreground, and on a 30s heartbeat while active — so a
    // drill completed offline syncs as soon as connectivity comes back, without the
    // user having to reopen the app or manually retry.
    flushQueue().catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") flushQueue().catch(() => {});
    });
    const interval = setInterval(() => flushQueue().catch(() => {}), 30_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [session]);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}

export default function RootLayout() {
  const [barlowLoaded] = useBarlowFonts({ BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold });
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  useEffect(() => {
    initDb();
  }, []);

  if (!barlowLoaded || !interLoaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigation />
    </AuthProvider>
  );
}
