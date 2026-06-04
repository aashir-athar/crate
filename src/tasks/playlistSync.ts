import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { logger } from '@/lib/logger';
import { useSettings } from '@/storage/settingsStore';
import { syncAllAuto } from '@/sync/syncEngine';

export const PLAYLIST_SYNC_TASK = 'crate-playlist-sync';

// defineTask MUST run at module scope (imported from the root layout), never
// inside a component. Background runs are best-effort and opportunistically
// narrow the gap between app opens; the foreground sync is the reliable path.
TaskManager.defineTask(PLAYLIST_SYNC_TASK, async () => {
  try {
    // Headless launch: the UI never mounts, so load the persisted settings (and
    // the runtime source config they hydrate) before syncing, otherwise this can
    // run with defaults (auto-sync on, wrong Wi-Fi/Jamendo settings).
    await useSettings.persist.rehydrate();
    await syncAllAuto();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    logger.warn('Background playlist sync failed', { error: String(error) });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerPlaylistSync(): Promise<boolean> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return false;
    const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(PLAYLIST_SYNC_TASK);
    if (!alreadyRegistered) {
      await BackgroundTask.registerTaskAsync(PLAYLIST_SYNC_TASK, { minimumInterval: 15 });
    }
    return true;
  } catch (error) {
    logger.warn('registerPlaylistSync failed', { error: String(error) });
    return false;
  }
}

export async function unregisterPlaylistSync(): Promise<boolean> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(PLAYLIST_SYNC_TASK)) {
      await BackgroundTask.unregisterTaskAsync(PLAYLIST_SYNC_TASK);
    }
    return true;
  } catch (error) {
    logger.warn('unregisterPlaylistSync failed', { error: String(error) });
    return false;
  }
}
