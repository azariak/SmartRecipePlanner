import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from '../types';
import { MonoLink, PrimaryButton } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { recipe } = route.params;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.backRow}>
        <MonoLink label="← RECIPES" onPress={() => navigation.goBack()} />
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
      <Text style={[styles.sectionTitle, { paddingTop: 28, paddingBottom: 8 }]}>Method</Text>
      <View>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
        <View style={styles.hair} />
      </View>

      <View style={{ marginTop: 24 }}>
        <PrimaryButton label="Back to the list" glyph="←" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12 },

  name: { color: colors.ink, fontFamily: fonts.sans, fontSize: 32, fontWeight: '700', letterSpacing: -1, lineHeight: 35 },
  tagline: { color: colors.yellow, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 22, paddingTop: 8, paddingBottom: 20 },

  metaGrid: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border },
  metaCell: { flex: 1, padding: 14 },
  metaBorderR: { borderRightWidth: 1, borderRightColor: colors.border },
  metaLabel: { color: colors.muted3, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.4, paddingBottom: 6 },
  metaVal: { color: colors.ink, fontFamily: fonts.sans, fontSize: 16, fontWeight: '700' },

  matchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  matchBarLabel: { color: colors.bg, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  matchBarVal: { color: colors.bg, fontFamily: fonts.mono, fontSize: 14, fontWeight: '700' },

  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 28, paddingBottom: 8 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.sans, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  sectionCount: { color: colors.muted3, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },

  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
  },
  ingName: { color: colors.inkDim, fontFamily: fonts.sans, fontSize: 14, flex: 1, paddingRight: 12 },
  ingHave: { color: colors.yellow, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2 },
  ingNeed: { color: colors.muted3, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2 },

  stepRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 14 },
  stepNum: { width: 34, color: colors.yellow, fontFamily: fonts.mono, fontSize: 12, paddingTop: 2 },
  stepText: { flex: 1, color: colors.inkDim, fontFamily: fonts.sans, fontSize: 14, lineHeight: 22 },

  hair: { borderTopWidth: 1, borderTopColor: colors.border },
});
