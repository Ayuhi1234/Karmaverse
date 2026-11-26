import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AppState, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors } from './colors';
import { bfDarkColors, festivePhase, msToNextFestiveChange } from '../utils/blackFriday';

// Theme mode the user picked. 'system' follows the OS setting; 'light'/'dark' force it.
export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;      // the user's choice
  isDark: boolean;      // the resolved theme right now
  colors: ThemeColors;  // the active token set
  setMode: (m: ThemeMode) => void;
  festive?: 'off' | 'bf' | 'cm';
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
});

const STORAGE_KEY = 'themeMode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Restore the saved choice once on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const [festive, setFestive] = useState(festivePhase);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      setFestive(festivePhase());
      if (timer) clearTimeout(timer);
      const ms = msToNextFestiveChange();
      timer = ms === null ? undefined : setTimeout(sync, Math.min(ms + 1000, 2147483647));
    };
    sync();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') sync(); });
    return () => { if (timer) clearTimeout(timer); sub.remove(); };
  }, []);

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const colors = isDark ? (festive !== 'off' ? bfDarkColors : darkColors) : lightColors;

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode, festive }),
    [mode, isDark, colors, setMode, festive]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
