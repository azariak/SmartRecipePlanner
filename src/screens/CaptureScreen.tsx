import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from '../types';
import { useRecipes } from '../state/RecipeStore';
import { Logo, MonoLink, PrimaryButton } from '../components/ui';

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
  const isFocused = useIsFocused();
  const { width: winW, height: winH } = useWindowDimensions();
  // On wide (desktop/tablet) screens the viewfinder grows to fill the vertical
  // space instead of sitting as a short strip. Mobile keeps the fixed 300px box.
  const isWide = winW >= 700;
  const viewfinderHeight = isWide ? Math.max(320, winH - 300) : 300;
  const { photo, detecting, detectError, ingredients, setPhoto, retake } = useRecipes();
  const [busy, setBusy] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const scanned = !!photo && !detecting && ingredients.length > 0;
  const cameraGranted = !!permission?.granted;
  // Show the live feed only when there's no captured photo and the screen is active.
  const showLiveCamera = !photo && !detecting && isFocused && cameraGranted;

  // Ask for camera access once so the viewfinder can go live.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function commitPhoto(uri: string, base64: string, mimeType: string) {
    await setPhoto({ uri, base64, mimeType });
  }

  async function capturePhoto() {
    try {
      setBusy(true);
      if (!cameraGranted) {
        const res = await requestPermission();
        if (!res.granted) {
          Alert.alert('Camera access needed', 'Enable camera access, or use “Upload a photo”.');
        }
        return;
      }
      const pic = await cameraRef.current?.takePictureAsync({ quality: 0.5, base64: true });
      if (!pic?.base64) {
        Alert.alert('Could not capture', 'Please try again or upload a photo.');
        return;
      }
      await commitPhoto(pic.uri, pic.base64, 'image/jpeg');
    } catch (e: any) {
      Alert.alert('Camera error', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto() {
    try {
      setBusy(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.5,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        Alert.alert('Could not read that image', 'Please try a different photo.');
        return;
      }
      await commitPhoto(asset.uri, asset.base64, guessMime(asset.uri, asset.mimeType));
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
      <View style={[styles.viewfinder, { height: viewfinderHeight }]}>
        {showLiveCamera ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
        ) : null}

        {photo ? (
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}

        {/* corner brackets sit above the feed */}
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />

        {!photo && !showLiveCamera && !detecting ? (
          <Text style={styles.feedText}>
            [ CAMERA FEED ]{'\n'}
            {permission && !permission.granted
              ? 'ALLOW CAMERA OR UPLOAD A PHOTO'
              : 'POINT AT YOUR INGREDIENTS'}
          </Text>
        ) : null}

        {/* flip control while the live feed is up */}
        {showLiveCamera ? (
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            hitSlop={10}
            style={styles.flip}
          >
            <Text style={styles.flipText}>⟲ FLIP</Text>
          </Pressable>
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

      {detectError && !detecting ? <Text style={styles.errorText}>{detectError}</Text> : null}

      {/* actions */}
      {!scanned ? (
        <View style={styles.actionsCol}>
          <View style={styles.captureRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              disabled={busy || detecting}
              onPress={capturePhoto}
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
            onPress={uploadPhoto}
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

  flip: {
    position: 'absolute',
    top: 12,
    right: 40,
    backgroundColor: 'rgba(10,10,8,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  flipText: { color: colors.ink, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4 },

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
