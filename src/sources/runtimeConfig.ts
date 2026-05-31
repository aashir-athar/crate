import { DEFAULT_AUDIUS_APP_NAME, DEFAULT_JAMENDO_CLIENT_ID } from '@/constants/sources';

/**
 * Lightweight runtime holder for source credentials/flags, populated from the
 * settings store at startup and on change. Adapters read from here so the
 * `src/sources` layer never imports the Zustand store (keeps it dependency-free
 * and avoids an import cycle).
 */
type RuntimeSourceConfig = {
  jamendoClientId: string;
  audiusAppName: string;
  audiusStrictMode: boolean;
};

const config: RuntimeSourceConfig = {
  jamendoClientId: DEFAULT_JAMENDO_CLIENT_ID,
  audiusAppName: DEFAULT_AUDIUS_APP_NAME,
  audiusStrictMode: true,
};

export function setSourceConfig(next: Partial<RuntimeSourceConfig>): void {
  if (next.jamendoClientId !== undefined) config.jamendoClientId = next.jamendoClientId.trim();
  if (next.audiusAppName !== undefined && next.audiusAppName.trim()) {
    config.audiusAppName = next.audiusAppName.trim();
  }
  if (next.audiusStrictMode !== undefined) config.audiusStrictMode = next.audiusStrictMode;
}

export function getJamendoClientId(): string {
  return config.jamendoClientId;
}

export function getAudiusAppName(): string {
  return config.audiusAppName;
}

export function getAudiusStrictMode(): boolean {
  return config.audiusStrictMode;
}
