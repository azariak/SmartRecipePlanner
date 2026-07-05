import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts } from '../theme';

/** The 2×2 pixel mark + wordmark from the design header. */
export function Logo() {
  const dot = { width: 7, height: 7, backgroundColor: colors.yellow } as const;
  return (
    <View style={styles.logoRow}>
      <View style={styles.logoGrid}>
        <View style={dot} />
        <View style={[dot, { opacity: 0.35 }]} />
        <View style={[dot, { opacity: 0.35 }]} />
        <View style={dot} />
      </View>
      <Text style={styles.logoText}>Forage</Text>
    </View>
  );
}

/** Solid yellow CTA with a trailing glyph, e.g. "Get 5 recipes ↗". */
export function PrimaryButton({
  label,
  glyph,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  glyph?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        pressed && !disabled && { backgroundColor: colors.yellowBright },
        disabled && { opacity: 0.45 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.bg} />
      ) : (
        <>
          <Text style={styles.primaryLabel}>{label}</Text>
          {glyph ? <Text style={styles.primaryLabel}>{glyph}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

/** Yellow outline CTA used for the "5 new recipes" refresh. */
export function OutlineButton({
  label,
  glyph,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  glyph?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.outline,
        pressed && !disabled && { backgroundColor: colors.yellow },
        disabled && { opacity: 0.45 },
      ]}
    >
      {({ pressed }) =>
        loading ? (
          <ActivityIndicator color={colors.yellow} />
        ) : (
          <>
            <Text style={[styles.outlineLabel, pressed && { color: colors.bg }]}>{label}</Text>
            {glyph ? (
              <Text style={[styles.outlineLabel, pressed && { color: colors.bg }]}>{glyph}</Text>
            ) : null}
          </>
        )
      }
    </Pressable>
  );
}

/** Muted monospace link, e.g. "← CAMERA", "RETAKE PHOTO". */
export function MonoLink({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={style}>
      {({ pressed }) => (
        <Text style={[styles.monoLink, pressed && { color: colors.ink }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function MonoLabel({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoGrid: { width: 16, height: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  logoText: { color: colors.ink, fontFamily: fonts.sans, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },

  primary: {
    height: 56,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  primaryLabel: { color: colors.bg, fontFamily: fonts.sans, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  outline: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  outlineLabel: { color: colors.yellow, fontFamily: fonts.sans, fontSize: 15, fontWeight: '700' },

  monoLink: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    paddingVertical: 12,
  },
  mono: { color: colors.muted2, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2 },
});
