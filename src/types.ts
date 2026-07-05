export type RecipeIngredient = {
  /** Human-readable ingredient line, e.g. "Eggs (2)" */
  name: string;
  /** true = detected in the photo / a staple you likely have; false = pantry or buy */
  have: boolean;
};

export type Recipe = {
  /** Stable local id (name-based slug + batch) used for navigation/keys */
  id: string;
  name: string;
  /** Short lowercase evocative line under the title, e.g. "eggs, drowning in tomato." */
  tagline: string;
  /** e.g. "25 min" */
  time: string;
  /** e.g. "2" */
  serves: string;
  /** "Easy" | "Medium" | "Hard" */
  difficulty: string;
  /** 0–100 pantry match */
  match: number;
  ingredients: RecipeIngredient[];
  steps: string[];
};

/** The compact mono line shown on list rows: "25 MIN · EASY · USES 5/6" */
export function recipeMeta(r: Recipe): string {
  const have = r.ingredients.filter((i) => i.have).length;
  const total = r.ingredients.length;
  return `${r.time.toUpperCase()} · ${r.difficulty.toUpperCase()} · USES ${have}/${total}`;
}

export type RootStackParamList = {
  Capture: undefined;
  RecipeList: undefined;
  RecipeDetail: { recipe: Recipe };
};
