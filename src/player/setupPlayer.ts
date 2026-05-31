import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

import { logger } from '@/lib/logger';

let configured = false;

/**
 * Configure the audio session for background music playback. Idempotent; call
 * once at app startup before the first play.
 */
export async function configureAudio(): Promise<void> {
  if (configured) return;
  try {
    await setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
    });
    await setIsAudioActiveAsync(true);
    configured = true;
  } catch (error) {
    logger.warn('configureAudio failed', { error: String(error) });
  }
}
