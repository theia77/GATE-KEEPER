import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const STREAK_REMINDER_ID_KEY = "streak-reminder-notification-id";

/**
 * Registers this device for push (backend-triggered path: a token lands in
 * push_tokens, and supabase/functions/send-streak-reminders can target it directly
 * via the Expo push API) AND schedules the local fallback (works even if the device
 * never gets a server-sent push, e.g. offline at the time it would have fired).
 */
export async function registerForPushNotificationsAsync(userId: string) {
  if (!Device.isDevice) return null; // simulators/emulators can't receive push

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();

  await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform: Platform.OS === "ios" ? "ios" : "android",
    },
    { onConflict: "expo_push_token" }
  );

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("streak-armor", {
      name: "Streak Armor",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#ff5b2e",
    });
  }

  return expoPushToken;
}

/**
 * Local scheduling fallback for the Streak Alert: fires daily at 21:00 device-local
 * time (a 3-hour grace window before midnight) regardless of connectivity. Re-run on
 * every app foreground so a stale schedule never silently lapses.
 */
export async function scheduleStreakReminder() {
  const existingId = await AsyncStorage.getItem(STREAK_REMINDER_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠ Streak Armor at risk",
      body: "Your Daily Drill isn't done yet. Midnight resets everything.",
    },
    trigger: { hour: 21, minute: 0, repeats: true },
  });

  await AsyncStorage.setItem(STREAK_REMINDER_ID_KEY, id);
}
