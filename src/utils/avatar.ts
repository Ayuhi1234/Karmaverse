import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStableUserSuffix } from './userId';

// The chosen preset-avatar id ('a1'..'a10'). Source of truth is the backend
// profile field `avatarId`; this AsyncStorage cache keeps it snappy + works even
// before the backend stores it. Keyed per user so accounts on one device don't
// share an avatar. Registration writes a 'pending' value that's claimed on first
// login (no user token exists yet at pick time).

const PENDING_KEY = 'avatarId_pending';

async function userKey(): Promise<string> {
  const token = await AsyncStorage.getItem('userToken');
  return token ? `avatarId_${getStableUserSuffix(token)}` : PENDING_KEY;
}

export async function getStoredAvatarId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(await userKey());
  } catch {
    return null;
  }
}

export async function setStoredAvatarId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(await userKey(), id);
  } catch {}
}

// Registration flow: no token yet, so stash the pick and claim it after login.
export async function setPendingAvatarId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, id);
  } catch {}
}

// Called once after login/registration: move any pending pick onto the real user.
export async function claimPendingAvatarId(): Promise<string | null> {
  try {
    const pending = await AsyncStorage.getItem(PENDING_KEY);
    if (!pending) return null;
    await AsyncStorage.setItem(await userKey(), pending);
    await AsyncStorage.removeItem(PENDING_KEY);
    return pending;
  } catch {
    return null;
  }
}
