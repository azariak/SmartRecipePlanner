import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from '../types';
import { useSaved } from '../state/SavedRecipesStore';
import { MonoLink } from '../components/ui';
import RecipeRow from '../components/RecipeRow';

type Props = NativeStackScreenProps<RootStackParamList, 'Saved'>;

export default function SavedRecipesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { saved, isSaved, toggleSave } = useSaved();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View style={styles.backRow}>
          <MonoLink label="← CAMERA" onPress={() => navigation.navigate('Capture')} />
        </View>
        <Text style={styles.h1}>Saved</Text>
        <Text style={styles.h1Serif}>the ones you kept.</Text>
        <Text style={styles.count}>
          {saved.length} RECIPE{saved.length === 1 ? '' : 'S'}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.rows}
        showsVerticalScrollIndicator={false}
      >
        {saved.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyStar}>☆</Text>
            <Text style={styles.emptyText}>Nothing saved yet.</Text>
            <Text style={styles.emptySub}>Tap the star on any recipe to keep it here.</Text>
          </View>
        ) : (
          <>
            {saved.map((r) => (
              <RecipeRow
                key={r.id}
                recipe={r}
                saved={isSaved(r.name)}
                onToggleSave={() => toggleSave(r)}
                onPress={() => navigation.navigate('RecipeDetail', { recipe: r })}
              />
            ))}
            <View style={styles.hair} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  h1: { color: colors.ink, fontFamily: fonts.sans, fontSize: 30, fontWeight: '700', letterSpacing: -0.9, lineHeight: 32 },
  h1Serif: { color: colors.yellow, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 32, lineHeight: 36, paddingBottom: 8 },
  count: { color: colors.muted3, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, paddingBottom: 6 },

  rows: { paddingHorizontal: 20, paddingBottom: 28 },
  hair: { borderTopWidth: 1, borderTopColor: colors.border },

  empty: { alignItems: 'center', gap: 10, paddingTop: 70 },
  emptyStar: { color: colors.muted4, fontSize: 40, lineHeight: 44 },
  emptyText: { color: colors.ink, fontFamily: fonts.sans, fontSize: 18, fontWeight: '700' },
  emptySub: { color: colors.muted2, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textAlign: 'center' },
});
