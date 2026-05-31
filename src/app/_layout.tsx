import '@/theme/unistyles'; // configure Unistyles before any component creates styles

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';

import { initDatabase } from '@/db/client';
import { reconcileDownloads } from '@/download/downloadManager';
import { configureAudio } from '@/player/setupPlayer';
import { asyncStoragePersister, queryClient } from '@/storage/queryClient';
import { foregroundSync } from '@/sync/syncEngine';
import { registerPlaylistSync } from '@/tasks/playlistSync'; // imports register the bg task (defineTask at module scope)

export default function RootLayout() {
  const { theme, rt } = useUnistyles();

  useEffect(() => {
    initDatabase();
    reconcileDownloads();
    void configureAudio();
    void registerPlaylistSync();
    void foregroundSync();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void foregroundSync();
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <StatusBar style={rt.themeName === 'light' ? 'dark' : 'light'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="import" options={{ presentation: 'modal' }} />
            <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="queue" options={{ presentation: 'modal' }} />
            <Stack.Screen name="collection/[id]" />
            <Stack.Screen name="track/[id]" options={{ presentation: 'modal' }} />
          </Stack>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
