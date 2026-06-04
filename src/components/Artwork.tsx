import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const BLURHASH = 'L4A0o^00~q00_3M{ofof00xu_3of';

type Props = {
  url: string | null;
  size: number;
  radius?: number;
};

/** Album artwork via expo-image, with a themed music-note fallback. */
export function Artwork({ url, size, radius = 10 }: Props) {
  const { theme } = useUnistyles();
  if (!url) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
        <Ionicons name="musical-notes" size={Math.round(size * 0.4)} color={theme.colors.textTertiary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      placeholder={{ blurhash: BLURHASH }}
      style={{ width: size, height: size, borderRadius: radius }}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
}));
