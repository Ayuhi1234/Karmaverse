import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from './tokenStore';
import { getStableUserSuffix } from './userId';

// The chosen preset-avatar id ('a1'..'a10'). Source of truth is the backend
// profile field `avatarId`; this AsyncStorage cache keeps it snappy + works even
// before the backend stores it. Keyed per user so accounts on one device don't
// share an avatar. Registration writes a 'pending' value that's claimed on first
// login (no user token exists yet at pick time).

const PENDING_KEY = 'avatarId_pending';

async function userKey(): Promise<string> {
  const token = await getToken();
  return token ? `avatarId_${getStableUserSuffix(token)}` : PENDING_KEY;
}

export async function getStoredAvatarId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(await userKey());
  } catch {
    return null;
  }
}

// In-memory subscribers so every avatar surface (profile, dashboard, top nav)
// updates the instant a new avatar is picked — no refetch needed.
type AvatarListener = (id: string | null) => void;
const listeners = new Set<AvatarListener>();
export function subscribeAvatar(fn: AvatarListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// null removes the pick, so the default image shows again.
export async function setStoredAvatarId(id: string | null): Promise<void> {
  try {
    const key = await userKey();
    if (id) await AsyncStorage.setItem(key, id);
    else await AsyncStorage.removeItem(key);
  } catch {}
  listeners.forEach((fn) => fn(id));
}

// The avatar to show for a freshly loaded profile. Once the backend stores
// avatarId (the key is present, even as null) it is the source of truth, so every
// device shows the same picture. A pick made before that, which only lives on this
// phone, is sent up once instead of being wiped by the backend's null.
export async function resolveAvatar(profile: any, save: (id: string) => Promise<unknown>): Promise<string | null> {
  const local = await getStoredAvatarId();
  if (!profile || !Object.prototype.hasOwnProperty.call(profile, 'avatarId')) return local;
  const remote: string | null = profile.avatarId || null;
  if (remote) {
    if (remote !== local) await setStoredAvatarId(remote);
    return remote;
  }
  if (local) {
    const syncedKey = `${await userKey()}_synced`;
    let synced = false;
    try { synced = !!(await AsyncStorage.getItem(syncedKey)); } catch {}
    if (!synced) {
      try {
        await save(local);
        await AsyncStorage.setItem(syncedKey, '1');
      } catch {}
      return local;
    }
    await setStoredAvatarId(null);
  }
  return null;
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
