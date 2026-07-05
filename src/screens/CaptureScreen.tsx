import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from '../types';
import { useRecipes } from '../state/RecipeStore';
import { Logo, MonoLabel, MonoLink, PrimaryButton } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

function guessMime(uri: string, provided?: string | null): string {
  if (provided) return provided;
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export default function CaptureScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { photo, detecting, detectError, ingredients, setPhoto, retake } = useRecipes();
  const [busy, setBusy] = useState(false);

  const scanned = !!photo && !detecting && ingredients.length > 0;
  const notScanned = !photo && !detecting;

  async function handlePick(source: 'camera' | 'library') {
    try {
      setBusy(true);
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera access needed', 'Enable camera access to photograph your ingredients.');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        base64: true,
        quality: 0.5,
        allowsEditing: false,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        Alert.alert('Could not read that image', 'Please try a different photo.');
        return;
      }
      await setPhoto({
        uri: asset.uri,
        base64: asset.base64,
        mimeType: guessMime(asset.uri, asset.mimeType),
      });
    } catch (e: any) {
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* header */}
      <View style={styles.header}>
        <Logo />
      </View>

      {/* headline */}
      <View style={styles.headline}>
        <Text style={styles.h1}>Cook what</Text>
        <Text style={styles.h1Serif}>you already have.</Text>
      </View>

      {/* viewfinder */}
      <View style={styles.viewfinder}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />

        {photo ? (
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}

        {notScanned ? (
          <Text style={styles.feedText}>[ CAMERA FEED ]{'\n'}POINT AT YOUR INGREDIENTS</Text>
        ) : null}

        {detecting ? (
          <View style={styles.scanOverlay}>
            <ActivityIndicator color={colors.yellow} />
            <Text style={styles.scanMono}>● SCANNING…</Text>
          </View>
        ) : null}

        {scanned ? (
          <View style={styles.scanOverlay}>
            <Text style={styles.scanMono}>● SCAN COMPLETE</Text>
            <Text style={styles.scanCount}>
              {ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'} found
            </Text>
          </View>
        ) : null}
      </View>

      {/* detected chips */}
      {scanned ? (
        <View style={styles.chips}>
          {ingredients.map((ing) => (
            <View key={ing} style={styles.chip}>
              <Text style={styles.chipText}>{ing}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* detect error */}
      {detectError && !detecting ? (
        <Text style={styles.errorText}>{detectError}</Text>
      ) : null}

      {/* actions */}
      {!scanned ? (
        <View style={styles.actionsCol}>
          <View style={styles.captureRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              disabled={busy || detecting}
              onPress={() => handlePick('camera')}
              style={({ pressed }) => [
                styles.captureBtn,
                pressed && { transform: [{ scale: 0.94 }], borderColor: colors.ink },
                (busy || detecting) && { opacity: 0.5 },
              ]}
            >
              <View style={styles.captureInner} />
            </Pressable>
          </View>
          <PrimaryButton
            label="Upload a photo"
            glyph="↑"
            loading={busy || detecting}
            onPress={() => handlePick('library')}
          />
        </View>
      ) : (
        <View style={styles.actionsCol}>
          <PrimaryButton
            label="Get 5 recipes"
            glyph="↗"
            onPress={() => navigation.navigate('RecipeList')}
          />
          <MonoLink label="RETAKE PHOTO" onPress={retake} style={{ alignItems: 'center' }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, minHeight: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },

  headline: { paddingTop: 6, paddingBottom: 16 },
  h1: { color: colors.ink, fontFamily: fonts.sans, fontSize: 32, fontWeight: '700', letterSpacing: -1, lineHeight: 34 },
  h1Serif: { color: colors.yellow, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 34, lineHeight: 38 },

  viewfinder: {
    height: 260,
    backgroundColor: colors.viewfinderA,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.yellow },
  tl: { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 },

  feedText: {
    color: colors.muted2,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 30,
  },
  scanOverlay: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(10,10,8,0.72)',
    paddingVertical: 18,
    paddingHorizontal: 26,
  },
  scanMono: { color: colors.yellow, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.7 },
  scanCount: { color: colors.ink, fontFamily: fonts.sans, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 16, paddingBottom: 4 },
  chip: { borderWidth: 1, borderColor: colors.border2, paddingVertical: 9, paddingHorizontal: 14 },
  chipText: { color: colors.inkDim, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.1 },

  errorText: { color: '#E8886B', fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, paddingTop: 16, lineHeight: 18 },

  actionsCol: { gap: 14, paddingTop: 20 },
  captureRow: { alignItems: 'center' },
  captureBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink },
});
