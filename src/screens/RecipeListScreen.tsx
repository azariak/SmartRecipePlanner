import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from '../types';
import { useRecipes } from '../state/RecipeStore';
import { useSaved } from '../state/SavedRecipesStore';
import { MonoLink, OutlineButton } from '../components/ui';
import RecipeRow from '../components/RecipeRow';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeList'>;

export default function RecipeListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { ingredients, recipes, loadingRecipes, refreshing, recipeError, loadRecipes, refresh } =
    useRecipes();
  const { isSaved, toggleSave } = useSaved();

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
              <RecipeRow
                key={r.id}
                recipe={r}
                index={i + 1}
                saved={isSaved(r.name)}
                onToggleSave={() => toggleSave(r)}
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
  hair: { borderTopWidth: 1, borderTopColor: colors.border },

  centerState: { alignItems: 'center', gap: 14, paddingTop: 60 },
  stateMono: { color: colors.muted2, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6 },
  errorText: { color: '#E8886B', fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textAlign: 'center', lineHeight: 18, paddingVertical: 12 },

  refreshWrap: { paddingHorizontal: 20, paddingTop: 12 },
});
