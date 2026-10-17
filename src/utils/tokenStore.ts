import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Single source of truth for the auth JWT.
//
// On native (Android/iOS) the token lives in the OS-encrypted keychain via
// expo-secure-store (Android Keystore / iOS Keychain), so it isn't sitting in
// plain app storage. On web SecureStore doesn't exist, so we fall back to
// AsyncStorage (localStorage) exactly as before.
//
// Every read migrates a legacy plain-AsyncStorage token into SecureStore once,
// then clears the plaintext copy — so existing logged-in users are upgraded
// transparently without being signed out. Every path is wrapped so a SecureStore
// failure degrades to AsyncStorage instead of losing the session.

const KEY = 'userToken';

let SecureStore: any = null;
if (Platform.OS !== 'web') {
  try {
    SecureStore = require('expo-secure-store');
  } catch {
    SecureStore = null;
  }
}

export async function getToken(): Promise<string | null> {
  if (!SecureStore) {
    try { return await AsyncStorage.getItem(KEY); } catch { return null; }
  }
  try {
    const secure = await SecureStore.getItemAsync(KEY);
    if (secure) return secure;
    // One-time migration: move a token written by an older build into the keychain.
    const legacy = await AsyncStorage.getItem(KEY);
    if (legacy) {
      try {
        await SecureStore.setItemAsync(KEY, legacy);
        await AsyncStorage.removeItem(KEY);
      } catch {
        // Keep the legacy copy if the secure write failed — better than a logout.
      }
      return legacy;
    }
    return null;
  } catch {
    // SecureStore unavailable at runtime — fall back to plain storage.
    try { return await AsyncStorage.getItem(KEY); } catch { return null; }
  }
}

export async function setToken(token: string): Promise<void> {
  if (!SecureStore) {
    try { await AsyncStorage.setItem(KEY, token); } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(KEY, token);
    await AsyncStorage.removeItem(KEY); // ensure no plaintext copy lingers
  } catch {
    try { await AsyncStorage.setItem(KEY, token); } catch {}
  }
}

export async function removeToken(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
  if (SecureStore) {
    try { await SecureStore.deleteItemAsync(KEY); } catch {}
  }
}
