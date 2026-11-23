import "react-native-url-polyfill/auto";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { createHaagvClient, type Bootstrap } from "@haagv/client";
import { createSecureSessionStorage } from "@haagv/client/secure-storage";
const config = Constants.expoConfig?.extra?.platform as
  | {
      origin: string;
      dataMode: string;
      supabaseUrl: string;
      publishableKey: string;
    }
  | undefined;
if (!config?.origin) throw Error("De platformconfiguratie ontbreekt.");
let auth: SupabaseClient | null = null,
  membershipId: string | null = null,
  authUserId: string | null = null,
  lastAccessToken: string | null = null,
  rejectedAccessToken: string | null = null;
export const sessionStorage = createSecureSessionStorage({
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: (key, value) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  deleteItemAsync: SecureStore.deleteItemAsync,
  createRevision: () => Crypto.randomUUID(),
});
export const client = createHaagvClient({
  origin: config.origin,
  createRequestId: () => Crypto.randomUUID(),
  getMembership: () => membershipId,
  getAccessToken: async () => {
    if (!auth) return null;
    const { data, error } = await auth.auth.getSession();
    if (error)
      throw Error("Log opnieuw in. De sessie kan niet worden gelezen.");
    lastAccessToken = data.session?.access_token ?? null;
    return lastAccessToken === rejectedAccessToken ? null : lastAccessToken;
  },
});
export function selectMembership(id: string | null) {
  membershipId = id;
}
export function rejectCurrentSession() {
  rejectedAccessToken = lastAccessToken;
  membershipId = null;
}
export function updateAuthUser(id: string | null) {
  const changed = id !== authUserId;
  if (changed) membershipId = null;
  authUserId = id;
  return changed;
}
export async function loadBootstrap() {
  try {
    return await client.bootstrap();
  } catch (error) {
    if (membershipId && (error as { code?: string }).code === "FORBIDDEN") {
      membershipId = null;
      return client.bootstrap();
    }
    throw error;
  }
}
export function configureAuth(bootstrap: Bootstrap) {
  const { supabaseUrl, publishableKey } = bootstrap.config.auth;
  if (bootstrap.mode !== "supabase") return null;
  if (
    config?.dataMode !== "supabase" ||
    config.supabaseUrl !== supabaseUrl ||
    config.publishableKey !== publishableKey
  )
    throw Error(
      "App en server gebruiken verschillende Supabase-instellingen. Bouw de app met de vier juiste publieke waarden.",
    );
  if (!auth)
    auth = createClient(supabaseUrl, publishableKey, {
      auth: {
        storage: sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });
  return auth;
}
export const getAuth = () => auth;
