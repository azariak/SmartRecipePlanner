import type { Recipe } from '../types';

/** Pure helpers behind the saved-recipes store — trivially unit-testable. */

export function isRecipeSaved(list: Recipe[], name: string): boolean {
  return list.some((r) => r.name === name);
}

/** Add the recipe if absent, remove it (by name) if already present. */
export function toggleSaved(list: Recipe[], recipe: Recipe): Recipe[] {
  return isRecipeSaved(list, recipe.name)
    ? list.filter((r) => r.name !== recipe.name)
    : [recipe, ...list];
}

export function removeFromSaved(list: Recipe[], name: string): Recipe[] {
  return list.filter((r) => r.name !== name);
}

/** Tolerantly parse the persisted JSON blob back into a recipe list. */
export function parseSaved(raw: string | null): Recipe[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Recipe[]) : [];
  } catch {
    return [];
  }
}
