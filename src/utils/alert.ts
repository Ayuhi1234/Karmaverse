import { Alert, Platform } from 'react-native';

export type AlertButton = { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };
export type AlertPayload = { title: string; message?: string; buttons?: AlertButton[] };

// On web we render our own in-app modal (AlertHost) instead of the browser's
// ugly window.alert. AlertHost registers this handler; if it isn't mounted yet
// we fall back to window.alert/confirm so no alert is ever silently dropped.
let webHandler: ((p: AlertPayload) => void) | null = null;
export function registerAlertHandler(fn: ((p: AlertPayload) => void) | null) {
  webHandler = fn;
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  // Prefer the in-app AlertHost on BOTH platforms — it's a branded modal with a
  // close (X) button, unlike the OS Alert.alert which can't show one.
  if (webHandler) {
    webHandler({ title, message, buttons });
    return;
  }

  // Fallback if the host isn't mounted yet: native OS alert.
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Fallback: browser dialogs (only if AlertHost isn't mounted).
  const text = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtn = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];
  if (window.confirm(text)) {
    actionBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
