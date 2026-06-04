import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { MiniPlayer } from '@/components/MiniPlayer';

const TAB_BAR_HEIGHT = Platform.select({ ios: 49, default: 56 });

export default function TabsLayout() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, size }) => <Ionicons name="albums" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="collections"
          options={{
            title: 'Crates',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="file-tray-stacked" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: 'Downloads',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cloud-download" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
          }}
        />
      </Tabs>
      <View
        style={[styles.miniWrap, { bottom: TAB_BAR_HEIGHT + insets.bottom + 6 }]}
        pointerEvents="box-none"
      >
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  container: { flex: 1 },
  miniWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
}));
