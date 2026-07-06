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

  const setPhoto = useCallback(async (input: Photo) => {
    // expo-camera on web returns base64 as a full "data:image/...;base64,XXX" URL,
    // while native returns raw base64. Gemini's inline_data wants raw base64 only.
    const rawBase64 = input.base64.startsWith('data:')
      ? input.base64.slice(input.base64.indexOf(',') + 1)
      : input.base64;
    const next: Photo = { ...input, base64: rawBase64 };
    setPhotoState(next);
    setIngredients([]);
    setRecipes([]);
    setRecipeError(null);
    seenNames.current = new Set();
    setDetectError(null);
    setDetecting(true);
    try {
      const found = await detectIngredients(next.base64, next.mimeType);
      if (found.length === 0) {
        setDetectError('No ingredients spotted. Try a clearer, closer photo.');
      }
      setIngredients(found);
    } catch (e: any) {
      setDetectError(e?.message ?? 'Could not read that photo.');
    } finally {
      setDetecting(false);
    }
  }, []);

  const retake = useCallback(() => {
    setPhotoState(null);
    setIngredients([]);
    setRecipes([]);
    setDetectError(null);
    setRecipeError(null);
    seenNames.current = new Set();
  }, []);

  const fetchBatch = useCallback(
    async (isRefresh: boolean) => {
      if (ingredients.length === 0) return;
      isRefresh ? setRefreshing(true) : setLoadingRecipes(true);
      setRecipeError(null);
      try {
        const exclude = Array.from(seenNames.current);
        const batch = await generateRecipes(ingredients, exclude);
        if (batch.length === 0) {
          setRecipeError('Gemini didn’t return any recipes. Try again.');
          return;
        }
        batch.forEach((r) => seenNames.current.add(r.name));
        setRecipes(batch);
      } catch (e: any) {
        setRecipeError(e?.message ?? 'Could not generate recipes.');
      } finally {
        isRefresh ? setRefreshing(false) : setLoadingRecipes(false);
      }
    },
    [ingredients]
  );

  const loadRecipes = useCallback(async () => {
    // Only fetch the first batch once; navigating back to the list keeps it.
    if (recipes.length > 0 || loadingRecipes) return;
    await fetchBatch(false);
  }, [recipes.length, loadingRecipes, fetchBatch]);

  const refresh = useCallback(async () => {
    if (refreshing || loadingRecipes) return;
    await fetchBatch(true);
  }, [refreshing, loadingRecipes, fetchBatch]);

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
