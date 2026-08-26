import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;
} catch (_) {}

// expo-notifications imports fine on web, but its native methods
// (getLastNotificationResponseAsync, addNotificationResponseReceivedListener, …)
// throw "not available on web". Null it out so every `if (!Notifications)` guard
// below short-circuits and we never call an unsupported API in the browser.
if (Platform.OS === 'web') {
  Notifications = null;
}

// Push tokens from Expo Go are sandbox tokens the backend rejects — skip entirely
const isExpoGo = Constants?.appOwnership === 'expo';

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) return null;
  if (Platform.OS === 'web') return null;
  if (isExpoGo) return null; // Expo Go tokens are rejected by backend — needs APK build

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getDevicePushTokenAsync();
  return tokenData.data;
}

// Whether OS push notifications are usable at all on this build (native, not web,
// not Expo Go where tokens are rejected). The re-enable UI only makes sense here.
export function isPushSupported(): boolean {
  return !!Notifications && !!Device?.isDevice && Platform.OS !== 'web' && !isExpoGo;
}

export interface PushPermissionState {
  granted: boolean;
  canAskAgain: boolean; // false → OS won't prompt again; must deep-link to Settings
  undetermined: boolean; // never asked yet
}

// Read the current OS permission without prompting. Safe on web/Expo Go (returns not-granted).
export async function getPushPermission(): Promise<PushPermissionState> {
  if (!Notifications || Platform.OS === 'web') {
    return { granted: false, canAskAgain: false, undetermined: false };
  }
  try {
    const res = await Notifications.getPermissionsAsync();
    const granted = res.status === 'granted' || res.granted === true;
    return {
      granted,
      canAskAgain: res.canAskAgain !== false,
      undetermined: res.status === 'undetermined',
    };
  } catch {
    return { granted: false, canAskAgain: false, undetermined: false };
  }
}

// Fire the OS permission prompt (only meaningful when canAskAgain). Returns granted.
export async function requestPushPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// Deep-link to this app's OS settings so the user can flip notifications back on
// after a permanent denial (the OS dialog can't be shown again at that point).
export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // openSettings is unavailable on some platforms — nothing else we can do.
  }
}

export async function sendTokenToBackend(fcmToken: string): Promise<void> {
  try {
    await api.post('/api/v1/notifications/device-token', {
      token: fcmToken,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  } catch (e) {
    console.warn('Failed to register push token with backend:', e);
  }
}

export async function removeTokenFromBackend(): Promise<void> {
  if (!Notifications) return;
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    if (tokenData?.data) {
      await api.delete('/api/v1/notifications/device-token', {
        data: { token: tokenData.data },
      });
    }
  } catch (e) {
    console.warn('Failed to remove push token:', e);
  }
}

// Report that the user tapped/opened a push. Fire-and-forget — the backend only
// knows a push was "sent" until the app reports "opened" on tap. A failed call
// (offline, timeout) only affects an analytics number, never the user's flow, so
// swallow errors and never block navigation on it. Idempotent server-side.
export async function markNotificationOpened(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await api.patch(`/api/v1/notifications/${notificationId}/opened`);
  } catch (_) {
    // intentionally ignored — see above
  }
}

export function addPushTokenRefreshListener(callback: (token: string) => void) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addPushTokenListener(({ data }: { data: string }) => {
    callback(data);
  });
}

export function addNotificationResponseListener(callback: (data: any) => void) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener((response: any) => {
    callback(response.notification.request.content.data);
  });
}

export async function getLastNotificationResponse(): Promise<any | null> {
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification?.request?.content?.data || null;
}
