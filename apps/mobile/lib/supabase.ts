import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createGateForceClient } from "@gate-force/shared";

/**
 * Same Supabase project as web (packages/shared/src/constants.ts + database.types.ts
 * are shared too) — one identity, one session model, just a different storage adapter.
 * AsyncStorage persists the session across app restarts; Supabase's client handles
 * token refresh automatically as long as `autoRefreshToken` stays on.
 */
export const supabase = createGateForceClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
