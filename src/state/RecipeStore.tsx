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

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  const [photo, setPhotoState] = useState<Photo | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);

  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Every recipe name we've shown, so refresh never repeats one.
  const seenNames = useRef<Set<string>>(new Set());
  // Bumped on every new photo / retake so a stale in-flight generation
  // (e.g. a prefetch left over from a discarded photo) can't overwrite state.
  const genId = useRef(0);

  /**
   * Core generator. Takes an explicit ingredient list so it can be kicked off
   * from setPhoto (as a prefetch) before the `ingredients` state has committed.
   */
  const runGeneration = useCallback(async (ings: string[], isRefresh: boolean) => {
    if (ings.length === 0) return;
    const myGen = genId.current;
    isRefresh ? setRefreshing(true) : setLoadingRecipes(true);
    setRecipeError(null);
    try {
      const exclude = Array.from(seenNames.current);
      const batch = await generateRecipes(ings, exclude);
      if (myGen !== genId.current) return; // photo changed underneath us — discard
      if (batch.length === 0) {
        setRecipeError('Gemini didn’t return any recipes. Try again.');
        return;
      }
      batch.forEach((r) => seenNames.current.add(r.name));
      setRecipes(batch);
    } catch (e: any) {
      if (myGen !== genId.current) return;
      setRecipeError(e?.message ?? 'Could not generate recipes.');
    } finally {
      if (myGen === genId.current) {
        isRefresh ? setRefreshing(false) : setLoadingRecipes(false);
      }
    }
  }, []);

  const setPhoto = useCallback(
    async (input: Photo) => {
      // expo-camera on web returns base64 as a full "data:image/...;base64,XXX" URL,
      // while native returns raw base64. Gemini's inline_data wants raw base64 only.
      const rawBase64 = input.base64.startsWith('data:')
        ? input.base64.slice(input.base64.indexOf(',') + 1)
        : input.base64;
      const next: Photo = { ...input, base64: rawBase64 };

      genId.current += 1; // invalidate any prior in-flight generation
      setPhotoState(next);
      setIngredients([]);
      setRecipes([]);
      setRecipeError(null);
      setLoadingRecipes(false);
      setRefreshing(false);
      seenNames.current = new Set();
      setDetectError(null);
      setDetecting(true);
      try {
        const found = await detectIngredients(next.base64, next.mimeType);
        if (found.length === 0) {
          setDetectError('No ingredients spotted. Try a clearer, closer photo.');
        }
        setIngredients(found);
        // Prefetch the first batch of recipes now, in the background, so the
        // list is (usually) ready by the time the user taps "Get 5 recipes".
        if (found.length > 0) {
          void runGeneration(found, false);
        }
      } catch (e: any) {
        setDetectError(e?.message ?? 'Could not read that photo.');
      } finally {
        setDetecting(false);
      }
    },
    [runGeneration]
  );

  const retake = useCallback(() => {
    genId.current += 1; // cancel any in-flight prefetch
    setPhotoState(null);
    setIngredients([]);
    setRecipes([]);
    setDetectError(null);
    setRecipeError(null);
    setLoadingRecipes(false);
    setRefreshing(false);
    seenNames.current = new Set();
  }, []);

  const loadRecipes = useCallback(async () => {
    // Already have a batch, or one is already in flight (the prefetch) — no-op.
    if (recipes.length > 0 || loadingRecipes) return;
    await runGeneration(ingredients, false);
  }, [recipes.length, loadingRecipes, ingredients, runGeneration]);

  const refresh = useCallback(async () => {
    if (refreshing || loadingRecipes) return;
    await runGeneration(ingredients, true);
  }, [refreshing, loadingRecipes, ingredients, runGeneration]);

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
