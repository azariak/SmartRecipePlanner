import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from '../types';
import { MonoLink } from '../components/ui';
import { exportRecipePdf } from '../services/recipePdf';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { recipe } = route.params;
  const [pdfBusy, setPdfBusy] = useState(false);

  async function downloadPdf() {
    if (pdfBusy) return;
    try {
      setPdfBusy(true);
      await exportRecipePdf(recipe);
    } catch (e: any) {
      Alert.alert('Could not create PDF', e?.message ?? 'Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* top bar: back link (left) + PDF icon (right, above the LEVEL box) */}
      <View style={styles.topRow}>
        <MonoLink label="← RECIPES" onPress={() => navigation.goBack()} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download recipe as PDF"
          onPress={downloadPdf}
          disabled={pdfBusy}
          hitSlop={8}
          style={({ pressed }) => [styles.pdfBtn, pressed && { backgroundColor: colors.surface }]}
        >
          {pdfBusy ? (
            <ActivityIndicator size="small" color={colors.yellow} />
          ) : (
            <Text style={styles.pdfBtnText}>↓ PDF</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.name}>{recipe.name}</Text>
      {recipe.tagline ? <Text style={styles.tagline}>{recipe.tagline}</Text> : null}

      {/* meta grid */}
      <View style={styles.metaGrid}>
        <View style={[styles.metaCell, styles.metaBorderR]}>
          <Text style={styles.metaLabel}>TIME</Text>
          <Text style={styles.metaVal}>{recipe.time}</Text>
        </View>
        <View style={[styles.metaCell, styles.metaBorderR]}>
          <Text style={styles.metaLabel}>SERVES</Text>
          <Text style={styles.metaVal}>{recipe.serves}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>LEVEL</Text>
          <Text style={styles.metaVal}>{recipe.difficulty}</Text>
        </View>
      </View>

      {/* pantry match */}
      <View style={styles.matchBar}>
        <Text style={styles.matchBarLabel}>PANTRY MATCH</Text>
        <Text style={styles.matchBarVal}>{recipe.match}%</Text>
      </View>

      {/* ingredients */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <Text style={styles.sectionCount}>/ {recipe.ingredients.length} ITEMS</Text>
      </View>
      <View>
        {recipe.ingredients.map((ing, i) => (
          <View key={`${ing.name}-${i}`} style={styles.ingRow}>
            <Text style={styles.ingName}>{ing.name}</Text>
            {ing.have ? (
              <Text style={styles.ingHave}>■ IN FRIDGE</Text>
            ) : (
              <Text style={styles.ingNeed}>□ PANTRY / BUY</Text>
            )}
          </View>
        ))}
        <View style={styles.hair} />
      </View>

      {/* method */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Method</Text>
      </View>
      <View>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
        <View style={styles.hair} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },

  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    borderWidth: 1,
    borderColor: colors.yellow,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  pdfBtnText: { color: colors.yellow, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2 },

  name: { color: colors.ink, fontFamily: fonts.sans, fontSize: 26, fontWeight: '700', letterSpacing: -0.8, lineHeight: 29 },
  tagline: { color: colors.yellow, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 16, paddingTop: 5, paddingBottom: 14 },

  metaGrid: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border },
  metaCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  metaBorderR: { borderRightWidth: 1, borderRightColor: colors.border },
  metaLabel: { color: colors.muted3, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.4, paddingBottom: 4 },
  metaVal: { color: colors.ink, fontFamily: fonts.sans, fontSize: 15, fontWeight: '700' },

  matchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.yellow,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  matchBarLabel: { color: colors.bg, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  matchBarVal: { color: colors.bg, fontFamily: fonts.mono, fontSize: 13, fontWeight: '700' },

  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 16, paddingBottom: 4 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.sans, fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  sectionCount: { color: colors.muted3, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },

  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
  },
  ingName: { color: colors.inkDim, fontFamily: fonts.sans, fontSize: 14, flex: 1, paddingRight: 12 },
  ingHave: { color: colors.yellow, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2 },
  ingNeed: { color: colors.muted3, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2 },

  stepRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 9 },
  stepNum: { width: 30, color: colors.yellow, fontFamily: fonts.mono, fontSize: 12, paddingTop: 2 },
  stepText: { flex: 1, color: colors.inkDim, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },

  hair: { borderTopWidth: 1, borderTopColor: colors.border },
});
