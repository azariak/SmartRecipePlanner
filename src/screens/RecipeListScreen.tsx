import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import { recipeMeta, type RootStackParamList, type Recipe } from '../types';
import { useRecipes } from '../state/RecipeStore';
import { MonoLink, OutlineButton } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeList'>;

function Row({ recipe, index, onPress }: { recipe: Recipe; index: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      <Text style={styles.rowNum}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={styles.rowMid}>
        <Text style={styles.rowName}>{recipe.name}</Text>
        <Text style={styles.rowMeta}>{recipeMeta(recipe)}</Text>
      </View>
      <View style={styles.rowMatch}>
        <Text style={styles.matchVal}>{recipe.match}%</Text>
        <Text style={styles.matchLabel}>MATCH</Text>
      </View>
    </Pressable>
  );
}

export default function RecipeListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { ingredients, recipes, loadingRecipes, refreshing, recipeError, loadRecipes, refresh } =
    useRecipes();

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const fromLine = ingredients.length ? `FROM: ${ingredients.join(' · ')}` : '';
  const firstLoad = loadingRecipes && recipes.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* header block */}
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View style={styles.backRow}>
          <MonoLink label="← CAMERA" onPress={() => navigation.navigate('Capture')} />
        </View>
        <Text style={styles.h1}>Five things</Text>
        <Text style={styles.h1Serif}>you can make tonight.</Text>
        {fromLine ? (
          <Text style={styles.fromLine} numberOfLines={2}>
            {fromLine}
          </Text>
        ) : null}
      </View>

      {/* rows */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.rows}
        showsVerticalScrollIndicator={false}
      >
        {firstLoad ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.yellow} />
            <Text style={styles.stateMono}>COOKING UP 5 RECIPES…</Text>
          </View>
        ) : recipeError && recipes.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>{recipeError}</Text>
            <MonoLink label="↻ TRY AGAIN" onPress={loadRecipes} />
          </View>
        ) : (
          <View style={{ opacity: refreshing ? 0.4 : 1 }}>
            {recipes.map((r, i) => (
              <Row
                key={r.id}
                recipe={r}
                index={i}
                onPress={() => navigation.navigate('RecipeDetail', { recipe: r })}
              />
            ))}
            <View style={styles.hair} />
            {recipeError ? <Text style={styles.errorText}>{recipeError}</Text> : null}
          </View>
        )}
      </ScrollView>

      {/* refresh */}
      {!firstLoad ? (
        <View style={[styles.refreshWrap, { paddingBottom: insets.bottom + 20 }]}>
          <OutlineButton
            label="None of these? 5 new recipes"
            glyph="↻"
            loading={refreshing}
            disabled={ingredients.length === 0}
            onPress={refresh}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  h1: { color: colors.ink, fontFamily: fonts.sans, fontSize: 30, fontWeight: '700', letterSpacing: -0.9, lineHeight: 32 },
  h1Serif: { color: colors.yellow, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 32, lineHeight: 36, paddingBottom: 10 },
  fromLine: { color: colors.muted3, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, paddingBottom: 6, lineHeight: 16 },

  rows: { paddingHorizontal: 20, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 18,
  },
  rowNum: { width: 34, color: colors.yellow, fontFamily: fonts.mono, fontSize: 12, paddingTop: 4 },
  rowMid: { flex: 1, gap: 6 },
  rowName: { color: colors.ink, fontFamily: fonts.sans, fontSize: 19, fontWeight: '700', letterSpacing: -0.4, lineHeight: 22 },
  rowMeta: { color: colors.muted2, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  rowMatch: { alignItems: 'flex-end', gap: 4, paddingTop: 3 },
  matchVal: { color: colors.yellow, fontFamily: fonts.mono, fontSize: 13 },
  matchLabel: { color: colors.muted4, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2 },
  hair: { borderTopWidth: 1, borderTopColor: colors.border },

  centerState: { alignItems: 'center', gap: 14, paddingTop: 60 },
  stateMono: { color: colors.muted2, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6 },
  errorText: { color: '#E8886B', fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textAlign: 'center', lineHeight: 18, paddingVertical: 12 },

  refreshWrap: { paddingHorizontal: 20, paddingTop: 12 },
});
