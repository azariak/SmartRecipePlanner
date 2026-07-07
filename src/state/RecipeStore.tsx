import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { Recipe } from '../types';
import { detectIngredients, generateRecipes } from '../services/gemini';

type Photo = { uri: string; base64: string; mimeType: string };

type RecipeState = {
  photo: Photo | null;
  detecting: boolean;
  detectError: string | null;
  ingredients: string[];

  loadingRecipes: boolean;
  recipeError: string | null;
  recipes: Recipe[];

  /** true while a refresh is swapping the batch (keeps the old list visible) */
  refreshing: boolean;

  setPhoto: (photo: Photo) => Promise<void>;
  retake: () => void;
  loadRecipes: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<RecipeState | null>(null);

/**
 * One generation pass: excludes everything in `seen`, then reserves the new
 * names into `seen` so the *next* pass can't repeat them. `seen` is passed by
 * reference (captured at call time) so a retake swapping the set can't pollute it.
 */
async function reserveAndGenerate(ings: string[], seen: Set<string>): Promise<Recipe[]> {
  const exclude = Array.from(seen);
  const batch = await generateRecipes(ings, exclude);
  batch.forEach((r) => seen.add(r.name));
  return batch;
}

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  const [photo, setPhotoState] = useState<Photo | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);

  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Every recipe name we've shown (or reserved via prefetch), so nothing repeats.
  const seenNames = useRef<Set<string>>(new Set());
  // Bumped on every new photo / retake so stale in-flight work is discarded.
  const genId = useRef(0);
  // The preloaded "5 new recipes" batch: an in-flight-or-resolved promise plus a
  // ready flag so refresh can be instant (no loading flash) when it's already done.
  const nextRef = useRef<Promise<Recipe[]> | null>(null);
  const nextReadyRef = useRef(false);
  // Guards against refresh re-entrancy on fast double taps.
  const refreshBusyRef = useRef(false);

  /** Kick off (once) a background generation of the next batch. */
  const prefetchNext = useCallback((ings: string[]) => {
    if (ings.length === 0 || nextRef.current) return;
    const gen = genId.current;
    const seen = seenNames.current;
    const promise = reserveAndGenerate(ings, seen);
    nextRef.current = promise;
    nextReadyRef.current = false;
    promise
      .then(() => {
        if (gen === genId.current) nextReadyRef.current = true;
      })
      .catch(() => {
        // Let a later refresh retry on demand.
        if (gen === genId.current && nextRef.current === promise) {
          nextRef.current = null;
          nextReadyRef.current = false;
        }
      });
  }, []);

  /** Load the first batch (blocking the list), then preload the next one. */
  const loadFirstBatch = useCallback(
    async (ings: string[]) => {
      if (ings.length === 0) return;
      const gen = genId.current;
      setLoadingRecipes(true);
      setRecipeError(null);
      try {
        const batch = await reserveAndGenerate(ings, seenNames.current);
        if (gen !== genId.current) return;
        if (batch.length === 0) {
          setRecipeError('Gemini didn’t return any recipes. Try again.');
          return;
        }
        setRecipes(batch);
        prefetchNext(ings); // preload the "5 new recipes" batch in the background
      } catch (e: any) {
        if (gen !== genId.current) return;
        setRecipeError(e?.message ?? 'Could not generate recipes.');
      } finally {
        if (gen === genId.current) setLoadingRecipes(false);
      }
    },
    [prefetchNext]
  );

  const resetGeneration = useCallback(() => {
    genId.current += 1;
    nextRef.current = null;
    nextReadyRef.current = false;
    refreshBusyRef.current = false;
    setRecipes([]);
    setRecipeError(null);
    setLoadingRecipes(false);
    setRefreshing(false);
    seenNames.current = new Set();
  }, []);

  const setPhoto = useCallback(
    async (input: Photo) => {
      // expo-camera on web returns base64 as a full "data:image/...;base64,XXX" URL,
      // while native returns raw base64. Gemini's inline_data wants raw base64 only.
      const rawBase64 = input.base64.startsWith('data:')
        ? input.base64.slice(input.base64.indexOf(',') + 1)
        : input.base64;
      const next: Photo = { ...input, base64: rawBase64 };

      resetGeneration();
      setPhotoState(next);
      setIngredients([]);
      setDetectError(null);
      setDetecting(true);
      try {
        const found = await detectIngredients(next.base64, next.mimeType);
        if (found.length === 0) {
          setDetectError('No ingredients spotted. Try a clearer, closer photo.');
        }
        setIngredients(found);
        // Prefetch the first batch now so the list is (usually) ready on arrival.
        if (found.length > 0) void loadFirstBatch(found);
      } catch (e: any) {
        setDetectError(e?.message ?? 'Could not read that photo.');
      } finally {
        setDetecting(false);
      }
    },
    [resetGeneration, loadFirstBatch]
  );

  const retake = useCallback(() => {
    resetGeneration();
    setPhotoState(null);
    setIngredients([]);
    setDetectError(null);
  }, [resetGeneration]);

  const loadRecipes = useCallback(async () => {
    if (recipes.length > 0) {
      prefetchNext(ingredients); // ensure the next batch is warming up
      return;
    }
    if (loadingRecipes) return;
    await loadFirstBatch(ingredients);
  }, [recipes.length, loadingRecipes, ingredients, prefetchNext, loadFirstBatch]);

  const refresh = useCallback(async () => {
    if (refreshBusyRef.current || loadingRecipes || ingredients.length === 0) return;
    refreshBusyRef.current = true;
    const gen = genId.current;
    const cached = nextReadyRef.current; // resolved already? then no loading flash
    if (!cached) setRefreshing(true);
    setRecipeError(null);
    try {
      if (!nextRef.current) prefetchNext(ingredients); // no prefetch yet — start now
      const batch = await nextRef.current!;
      if (gen !== genId.current) return;
      nextRef.current = null;
      nextReadyRef.current = false;
      if (!batch || batch.length === 0) {
        setRecipeError('Gemini didn’t return any recipes. Try again.');
        return;
      }
      setRecipes(batch);
      prefetchNext(ingredients); // preload the batch after this one
    } catch (e: any) {
      if (gen !== genId.current) return;
      nextRef.current = null;
      nextReadyRef.current = false;
      setRecipeError(e?.message ?? 'Could not generate recipes.');
    } finally {
      if (gen === genId.current) setRefreshing(false);
      refreshBusyRef.current = false;
    }
  }, [loadingRecipes, ingredients, prefetchNext]);

  const value = useMemo<RecipeState>(
    () => ({
      photo,
      detecting,
      detectError,
      ingredients,
      loadingRecipes,
      refreshing,
      recipeError,
      recipes,
      setPhoto,
      retake,
      loadRecipes,
      refresh,
    }),
    [
      photo,
      detecting,
      detectError,
      ingredients,
      loadingRecipes,
      refreshing,
      recipeError,
      recipes,
      setPhoto,
      retake,
      loadRecipes,
      refresh,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecipes(): RecipeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRecipes must be used within a RecipeProvider');
  return ctx;
}
