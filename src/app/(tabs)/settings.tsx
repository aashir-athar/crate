import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { SOURCE_DESCRIPTIONS, SOURCE_LABELS } from '@/constants/sources';
import { useLibraryVersion } from '@/db/reactivity';
import { getStorageStats } from '@/db/repositories/tracksRepo';
import { formatBytes } from '@/lib/format';
import { useSettings } from '@/storage/settingsStore';
import { registerPlaylistSync, unregisterPlaylistSync } from '@/tasks/playlistSync';
import { hitSlop } from '@/theme/tokens';
import type { DownloadQuality, SourceKind, ThemePreference } from '@/types/models';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'oled', label: 'OLED' },
];

const QUALITY_OPTIONS: { value: DownloadQuality; label: string }[] = [
  { value: 'best_lossy', label: 'Best' },
  { value: 'lossless', label: 'Lossless' },
  { value: 'data_saver', label: 'Saver' },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={seg.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[seg.item, active && seg.itemActive]}
          >
            <Text variant="footnote" weight="medium" color={active ? 'onAccent' : 'secondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children?: ReactNode }) {
  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.text}>
        <Text variant="callout">{label}</Text>
        {hint ? (
          <Text variant="caption" color="secondary">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text variant="footnote" color="tertiary" style={sectionStyles.title}>
        {title.toUpperCase()}
      </Text>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const version = useLibraryVersion();

  const themePref = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const downloadQuality = useSettings((s) => s.downloadQuality);
  const setDownloadQuality = useSettings((s) => s.setDownloadQuality);
  const wifiOnly = useSettings((s) => s.wifiOnlyDownloads);
  const setWifiOnly = useSettings((s) => s.setWifiOnlyDownloads);
  const autoSync = useSettings((s) => s.autoSyncEnabled);
  const setAutoSync = useSettings((s) => s.setAutoSyncEnabled);
  const audiusStrict = useSettings((s) => s.audiusStrictMode);
  const setAudiusStrict = useSettings((s) => s.setAudiusStrictMode);
  const jamendoClientId = useSettings((s) => s.jamendoClientId);
  const setJamendoClientId = useSettings((s) => s.setJamendoClientId);

  const stats = getStorageStats();
  void version;

  const onToggleAutoSync = async (value: boolean) => {
    setAutoSync(value);
    if (value) {
      const ok = await registerPlaylistSync();
      if (!ok) {
        setAutoSync(false);
        Alert.alert(
          'Background sync unavailable',
          'Your device has background tasks restricted. Crate will still sync when you open the app.',
        );
      }
    } else {
      await unregisterPlaylistSync();
    }
  };

  const switchColors = { false: theme.colors.surfaceSunken, true: theme.colors.accent };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <Text variant="largeTitle" style={styles.heading}>
          Settings
        </Text>

        <Section title="Appearance">
          <Row label="Theme">
            <View />
          </Row>
          <Segmented options={THEME_OPTIONS} value={themePref} onChange={setTheme} />
        </Section>

        <Section title="Downloads">
          <Row label="Quality" hint="Best balances size and fidelity. Lossless when a source offers it.">
            <View />
          </Row>
          <Segmented
            options={QUALITY_OPTIONS}
            value={downloadQuality}
            onChange={setDownloadQuality}
          />
          <Row label="Wi-Fi only" hint="Pause downloads on cellular data.">
            <Switch value={wifiOnly} onValueChange={setWifiOnly} trackColor={switchColors} />
          </Row>
          <Row label="Storage" hint={`${stats.count} tracks · ${formatBytes(stats.bytes)} on device`}>
            <View />
          </Row>
        </Section>

        <Section title="Syncing">
          <Row label="Auto-sync crates" hint="Check for new tracks in the background and on launch.">
            <Switch value={autoSync} onValueChange={onToggleAutoSync} trackColor={switchColors} />
          </Row>
        </Section>

        <Section title="Sources">
          <Row
            label="Audius strict mode"
            hint="Only allow Audius tracks that are explicitly downloadable and permissively licensed."
          >
            <Switch value={audiusStrict} onValueChange={setAudiusStrict} trackColor={switchColors} />
          </Row>
          <Row label="Jamendo client ID" hint="Free key from devportal.jamendo.com. Required to use Jamendo.">
            <View />
          </Row>
          <TextInput
            value={jamendoClientId}
            onChangeText={setJamendoClientId}
            placeholder="Paste your Jamendo client_id"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </Section>

        <Section title="About & licensing">
          {(Object.keys(SOURCE_LABELS) as SourceKind[]).map((source) => (
            <View key={source} style={styles.aboutItem}>
              <Text variant="callout">{SOURCE_LABELS[source]}</Text>
              <Text variant="caption" color="secondary">
                {SOURCE_DESCRIPTIONS[source]}
              </Text>
            </View>
          ))}
          <Text variant="caption" color="tertiary" style={styles.legal}>
            Crate only streams and downloads audio that its sources permit. Please honor each
            track&apos;s Creative Commons or public-domain license, including attribution where
            required.
          </Text>
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { paddingHorizontal: theme.space.lg, paddingBottom: 160, gap: theme.space.xl },
  heading: { marginBottom: theme.space.xs },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    color: theme.colors.text,
    fontSize: theme.typography.size.body,
  },
  aboutItem: { gap: 2, paddingVertical: theme.space.xs },
  legal: { marginTop: theme.space.sm, lineHeight: theme.typography.size.caption * 1.5 },
}));

const sectionStyles = StyleSheet.create((theme) => ({
  container: { gap: theme.space.sm },
  title: { letterSpacing: 0.6 },
  body: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    gap: theme.space.md,
  },
}));

const rowStyles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  text: { flex: 1, gap: 2 },
}));

const seg = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius: theme.radius.md,
    padding: 3,
    gap: 3,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.sm,
  },
  itemActive: { backgroundColor: theme.colors.accent },
}));
