import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Both apps call this with their own env-sourced url/anonKey (web: NEXT_PUBLIC_*,
 * mobile: EXPO_PUBLIC_*) and their own storage adapter (browser vs AsyncStorage).
 */
export function createGateForceClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2]
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, options);
}
