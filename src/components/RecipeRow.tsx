import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { recipeMeta, type Recipe } from '../types';

type Props = {
  recipe: Recipe;
  /** 1-based position; when set, a "0N" index is shown on the left */
  index?: number;
  onPress: () => void;
  saved: boolean;
  onToggleSave: () => void;
};

export default function RecipeRow({ recipe, index, onPress, saved, onToggleSave }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      {typeof index === 'number' ? (
        <Text style={styles.num}>{String(index).padStart(2, '0')}</Text>
      ) : null}
      <View style={styles.mid}>
        <Text style={styles.name}>{recipe.name}</Text>
        <Text style={styles.meta}>{recipeMeta(recipe)}</Text>
      </View>
      <View style={styles.match}>
        <Text style={styles.matchVal}>{recipe.match}%</Text>
        <Text style={styles.matchLabel}>MATCH</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved' : 'Save recipe'}
        onPress={onToggleSave}
        hitSlop={12}
        style={styles.saveBtn}
      >
        <Text style={[styles.star, saved && styles.starOn]}>{saved ? '★' : '☆'}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 18,
  },
  num: { width: 34, color: colors.yellow, fontFamily: fonts.mono, fontSize: 12, paddingTop: 4 },
  mid: { flex: 1, gap: 6 },
  name: { color: colors.ink, fontFamily: fonts.sans, fontSize: 19, fontWeight: '700', letterSpacing: -0.4, lineHeight: 22 },
  meta: { color: colors.muted2, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  match: { alignItems: 'flex-end', gap: 4, paddingTop: 3 },
  matchVal: { color: colors.yellow, fontFamily: fonts.mono, fontSize: 13 },
  matchLabel: { color: colors.muted4, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2 },
  saveBtn: { paddingTop: 2, paddingLeft: 2, alignSelf: 'center' },
  star: { color: colors.muted3, fontSize: 20, lineHeight: 22 },
  starOn: { color: colors.yellow },
});
