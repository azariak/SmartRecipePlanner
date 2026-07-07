import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Recipe } from '../types';

const STORAGE_KEY = 'forage.saved.v1';

type SavedState = {
  saved: Recipe[];
  /** whether we've finished reading from local storage */
  hydrated: boolean;
  isSaved: (name: string) => boolean;
  toggleSave: (recipe: Recipe) => void;
  removeSaved: (name: string) => void;
};

const Ctx = createContext<SavedState | null>(null);

export function SavedRecipesProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<Recipe[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Don't write back to storage until after the initial read has completed.
  const canPersist = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSaved(parsed as Recipe[]);
        }
      } catch {
        // ignore corrupt/missing storage — start empty
      } finally {
        if (active) {
          canPersist.current = true;
          setHydrated(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: Recipe[]) => {
    if (!canPersist.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const isSaved = useCallback((name: string) => saved.some((r) => r.name === name), [saved]);

  const toggleSave = useCallback(
    (recipe: Recipe) => {
      setSaved((prev) => {
        const exists = prev.some((r) => r.name === recipe.name);
        const next = exists ? prev.filter((r) => r.name !== recipe.name) : [recipe, ...prev];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeSaved = useCallback(
    (name: string) => {
      setSaved((prev) => {
        const next = prev.filter((r) => r.name !== name);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const value = useMemo<SavedState>(
    () => ({ saved, hydrated, isSaved, toggleSave, removeSaved }),
    [saved, hydrated, isSaved, toggleSave, removeSaved]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSaved(): SavedState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSaved must be used within a SavedRecipesProvider');
  return ctx;
}
