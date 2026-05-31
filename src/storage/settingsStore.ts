import { Appearance } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_AUDIUS_APP_NAME, DEFAULT_JAMENDO_CLIENT_ID } from '@/constants/sources';
import { setSourceConfig } from '@/sources/runtimeConfig';
import type { DownloadQuality, Settings, ThemePreference } from '@/types/models';
import type { AppThemeName } from '@/theme/unistyles';

type SettingsActions = {
  setTheme: (theme: ThemePreference) => void;
  setDownloadQuality: (quality: DownloadQuality) => void;
  setWifiOnlyDownloads: (enabled: boolean) => void;
  setAutoSyncEnabled: (enabled: boolean) => void;
  setAudiusStrictMode: (enabled: boolean) => void;
  setJamendoClientId: (clientId: string) => void;
  setAudiusAppName: (appName: string) => void;
  /** Push persisted settings into the source-config + theme runtimes. */
  hydrateRuntime: () => void;
};

export type SettingsStore = Settings & SettingsActions;

function resolveThemeName(preference: ThemePreference): AppThemeName {
  if (preference === 'system') {
    return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  }
  return preference;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      downloadQuality: 'best_lossy',
      wifiOnlyDownloads: false,
      autoSyncEnabled: true,
      audiusStrictMode: true,
      jamendoClientId: DEFAULT_JAMENDO_CLIENT_ID,
      audiusAppName: DEFAULT_AUDIUS_APP_NAME,

      setTheme: (theme) => {
        set({ theme });
        UnistylesRuntime.setTheme(resolveThemeName(theme));
      },
      setDownloadQuality: (downloadQuality) => set({ downloadQuality }),
      setWifiOnlyDownloads: (wifiOnlyDownloads) => set({ wifiOnlyDownloads }),
      setAutoSyncEnabled: (autoSyncEnabled) => set({ autoSyncEnabled }),
      setAudiusStrictMode: (audiusStrictMode) => {
        set({ audiusStrictMode });
        setSourceConfig({ audiusStrictMode });
      },
      setJamendoClientId: (jamendoClientId) => {
        set({ jamendoClientId });
        setSourceConfig({ jamendoClientId });
      },
      setAudiusAppName: (audiusAppName) => {
        set({ audiusAppName });
        setSourceConfig({ audiusAppName });
      },
      hydrateRuntime: () => {
        const s = get();
        setSourceConfig({
          jamendoClientId: s.jamendoClientId,
          audiusAppName: s.audiusAppName,
          audiusStrictMode: s.audiusStrictMode,
        });
        UnistylesRuntime.setTheme(resolveThemeName(s.theme));
      },
    }),
    {
      name: 'crate-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Settings => ({
        theme: s.theme,
        downloadQuality: s.downloadQuality,
        wifiOnlyDownloads: s.wifiOnlyDownloads,
        autoSyncEnabled: s.autoSyncEnabled,
        audiusStrictMode: s.audiusStrictMode,
        jamendoClientId: s.jamendoClientId,
        audiusAppName: s.audiusAppName,
      }),
      onRehydrateStorage: () => (state) => {
        state?.hydrateRuntime();
      },
    },
  ),
);
