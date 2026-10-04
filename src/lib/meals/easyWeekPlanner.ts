/**
 * No-AI Mon–Fri dinner planner.
 *
 * Prefers recipes already in the family library that match the selected
 * preference chips; fills remaining weeknights from a built-in easy-meal bank.
 * Weekends are never planned.
 */

import type { DayOfWeek } from '@/lib/constants/days';

export const WEEKDAY_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const satisfies readonly DayOfWeek[];

export type Weekday = (typeof WEEKDAY_DAYS)[number];

export const MEAL_PREFERENCE_OPTIONS = [
  { id: 'chicken', label: 'Chicken', keywords: ['chicken', 'poultry'] },
  { id: 'beef', label: 'Beef', keywords: ['beef', 'steak', 'burger', 'ground beef'] },
  { id: 'pasta', label: 'Pasta', keywords: ['pasta', 'spaghetti', 'noodle', 'lasagna', 'mac'] },
  { id: 'tacos', label: 'Tacos / Mexican', keywords: ['taco', 'mexican', 'burrito', 'enchilada', 'quesadilla', 'fajita'] },
  { id: 'soup', label: 'Soup', keywords: ['soup', 'chili', 'stew', 'chowder'] },
  { id: 'vegetarian', label: 'Vegetarian', keywords: ['vegetarian', 'veggie', 'meatless', 'tofu', 'bean'] },
  { id: 'seafood', label: 'Seafood', keywords: ['fish', 'salmon', 'shrimp', 'seafood', 'tuna', 'cod'] },
  { id: 'leftovers', label: 'Leftover night', keywords: ['leftover', 'leftovers', 'reheat'] },
  { id: 'easy', label: 'Easy / quick', keywords: ['easy', 'quick', 'weeknight', 'sheet-pan', 'sheet pan', 'one-pan', 'one pot', '30-minute', '30 minute'] },
] as const;

export type MealPreferenceId = (typeof MEAL_PREFERENCE_OPTIONS)[number]['id'];

export interface PlannerRecipe {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  tags?: string[] | null;
  cuisine?: string | null;
  category?: string | null;
  isFavorite?: boolean;
  lastMadeAt?: string | null;
  timesMade?: number;
}

export interface PlannedDinner {
  dayOfWeek: Weekday;
  name: string;
  description?: string;
  recipeId?: string;
  recipeUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  source: 'recipe' | 'suggestion';
  matchedPreferences: MealPreferenceId[];
}

export interface ExistingMealSlot {
  dayOfWeek: DayOfWeek;
  mealType: string;
  id?: string;
}

export interface GenerateEasyWeekInput {
  preferences: MealPreferenceId[];
  recipes: PlannerRecipe[];
  /** Days already shown in the planner week (used only to order weekdays). */
  orderedDays: readonly DayOfWeek[];
  existingMeals?: ExistingMealSlot[];
  /** When true, plan over days that already have a dinner. */
  replaceExistingDinners?: boolean;
  /** Injected for tests; defaults to Math.random. */
  random?: () => number;
}

/** Built-in easy dinners used when the library has no match. */
export const EASY_MEAL_BANK: Array<{
  name: string;
  description: string;
  preferences: MealPreferenceId[];
  prepTime?: number;
  cookTime?: number;
}> = [
  { name: 'Sheet-pan chicken + veggies', description: 'Toss chicken and vegetables with oil and seasoning; roast until done.', preferences: ['chicken', 'easy'], prepTime: 10, cookTime: 30 },
  { name: 'Chicken tacos', description: 'Seasoned chicken, tortillas, and simple toppings.', preferences: ['chicken', 'tacos', 'easy'], prepTime: 10, cookTime: 15 },
  { name: 'Rotisserie chicken bowls', description: 'Store-bought chicken over rice with a veggie side.', preferences: ['chicken', 'easy'], prepTime: 10, cookTime: 10 },
  { name: 'Spaghetti with meat sauce', description: 'Pasta and jarred or quick stovetop sauce.', preferences: ['pasta', 'beef', 'easy'], prepTime: 5, cookTime: 20 },
  { name: 'Baked pasta casserole', description: 'Pasta, sauce, and cheese baked until bubbly.', preferences: ['pasta', 'easy'], prepTime: 15, cookTime: 25 },
  { name: 'Beef tacos', description: 'Ground beef tacos with pantry toppings.', preferences: ['beef', 'tacos', 'easy'], prepTime: 10, cookTime: 15 },
  { name: 'Burger night', description: 'Simple burgers with a bagged salad or fries.', preferences: ['beef', 'easy'], prepTime: 10, cookTime: 15 },
  { name: 'Taco salad bowls', description: 'Seasoned protein over greens with salsa and chips.', preferences: ['tacos', 'easy'], prepTime: 15, cookTime: 10 },
  { name: 'Quesadillas', description: 'Cheese (and optional protein) quesadillas with salsa.', preferences: ['tacos', 'easy', 'vegetarian'], prepTime: 5, cookTime: 10 },
  { name: 'Soup + grilled cheese', description: 'Canned or leftover soup with grilled cheese.', preferences: ['soup', 'easy', 'vegetarian'], prepTime: 5, cookTime: 15 },
  { name: 'Chili night', description: 'Stovetop or slow-cooker chili with toppings.', preferences: ['soup', 'beef', 'easy'], prepTime: 10, cookTime: 30 },
  { name: 'Veggie stir-fry + rice', description: 'Frozen veggies and rice; add tofu or eggs if you like.', preferences: ['vegetarian', 'easy'], prepTime: 10, cookTime: 15 },
  { name: 'Black bean enchiladas', description: 'Tortillas, beans, salsa, and cheese.', preferences: ['vegetarian', 'tacos', 'easy'], prepTime: 15, cookTime: 20 },
  { name: 'Salmon + rice + broccoli', description: 'Bake salmon and steam a veggie side.', preferences: ['seafood', 'easy'], prepTime: 5, cookTime: 20 },
  { name: 'Shrimp pasta', description: 'Quick garlic shrimp over pasta.', preferences: ['seafood', 'pasta', 'easy'], prepTime: 10, cookTime: 15 },
  { name: 'Leftover remix night', description: 'Reheat leftovers; add a fresh salad or bread.', preferences: ['leftovers', 'easy'], prepTime: 5, cookTime: 10 },
  { name: 'Breakfast-for-dinner', description: 'Eggs, toast, and fruit — fast weeknight reset.', preferences: ['easy', 'vegetarian'], prepTime: 5, cookTime: 15 },
  { name: 'Pizza night', description: 'Store-bought pizza or flatbreads with a salad.', preferences: ['easy'], prepTime: 5, cookTime: 15 },
];

function normalize(text: string): string {
  return text.toLowerCase();
}

function preferenceKeywords(id: MealPreferenceId): string[] {
  const option = MEAL_PREFERENCE_OPTIONS.find((o) => o.id === id);
  return option ? [...option.keywords] : [];
}

function recipeBlob(recipe: PlannerRecipe): string {
  return normalize(
    [
      recipe.name,
      recipe.description ?? '',
      recipe.cuisine ?? '',
      recipe.category ?? '',
      ...(recipe.tags ?? []),
    ].join(' ')
  );
}

function recipeMatchesPreference(recipe: PlannerRecipe, preference: MealPreferenceId): boolean {
  const blob = recipeBlob(recipe);
  if (preference === 'easy') {
    const total = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
    if (total > 0 && total <= 35) return true;
  }
  return preferenceKeywords(preference).some((keyword) => blob.includes(keyword));
}

function matchedPreferencesForRecipe(
  recipe: PlannerRecipe,
  preferences: MealPreferenceId[]
): MealPreferenceId[] {
  if (preferences.length === 0) return [];
  return preferences.filter((p) => recipeMatchesPreference(recipe, p));
}

function scoreRecipe(
  recipe: PlannerRecipe,
  preferences: MealPreferenceId[],
  random: () => number
): number {
  const matches = matchedPreferencesForRecipe(recipe, preferences);
  let score = matches.length * 10;
  if (preferences.length === 0) score += 1;
  if (recipe.isFavorite) score += 3;
  if ((recipe.timesMade ?? 0) === 0) score += 1;
  // Light jitter so ties don't always pick the same recipe.
  score += random() * 0.5;
  // Prefer recipes not made recently when lastMadeAt exists.
  if (recipe.lastMadeAt) {
    const ageDays = (Date.now() - Date.parse(recipe.lastMadeAt)) / (1000 * 60 * 60 * 24);
    if (!Number.isNaN(ageDays)) score += Math.min(ageDays / 30, 2);
  } else {
    score += 1;
  }
  return score;
}

function bankMatchesPreferences(
  entry: (typeof EASY_MEAL_BANK)[number],
  preferences: MealPreferenceId[]
): MealPreferenceId[] {
  if (preferences.length === 0) return entry.preferences.slice(0, 1);
  return entry.preferences.filter((p) => preferences.includes(p));
}

function pickFromBank(
  preferences: MealPreferenceId[],
  usedNames: Set<string>,
  random: () => number
): (typeof EASY_MEAL_BANK)[number] | null {
  const scored = EASY_MEAL_BANK
    .filter((entry) => !usedNames.has(normalize(entry.name)))
    .map((entry) => {
      const matched = bankMatchesPreferences(entry, preferences);
      const preferenceScore =
        preferences.length === 0
          ? 1
          : matched.length > 0
            ? matched.length * 10
            : // Still allow generic easy meals when nothing matches.
              (preferences.includes('easy') && entry.preferences.includes('easy') ? 2 : 0);
      return { entry, matched, score: preferenceScore + random() };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.entry ?? null;
}

/**
 * Build Mon–Fri dinner suggestions for the visible week.
 * Skips weekend days even if they appear in orderedDays.
 */
export function generateEasyWeekPlan(input: GenerateEasyWeekInput): PlannedDinner[] {
  const {
    preferences,
    recipes,
    orderedDays,
    existingMeals = [],
    replaceExistingDinners = false,
    random = Math.random,
  } = input;

  const weekdays = orderedDays.filter((day): day is Weekday =>
    (WEEKDAY_DAYS as readonly string[]).includes(day)
  );

  const daysWithDinner = new Set(
    existingMeals
      .filter((meal) => meal.mealType === 'dinner')
      .map((meal) => meal.dayOfWeek)
  );

  const usedRecipeIds = new Set<string>();
  const usedNames = new Set<string>();
  const plan: PlannedDinner[] = [];

  for (const day of weekdays) {
    if (!replaceExistingDinners && daysWithDinner.has(day)) continue;

    const candidates = recipes
      .filter((recipe) => !usedRecipeIds.has(recipe.id))
      .map((recipe) => ({
        recipe,
        matched: matchedPreferencesForRecipe(recipe, preferences),
        score: scoreRecipe(recipe, preferences, random),
      }))
      .filter((row) => preferences.length === 0 || row.matched.length > 0)
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    if (best) {
      usedRecipeIds.add(best.recipe.id);
      usedNames.add(normalize(best.recipe.name));
      plan.push({
        dayOfWeek: day,
        name: best.recipe.name,
        description: best.recipe.description ?? undefined,
        recipeId: best.recipe.id,
        recipeUrl: best.recipe.url ?? undefined,
        prepTime: best.recipe.prepTime ?? undefined,
        cookTime: best.recipe.cookTime ?? undefined,
        servings: best.recipe.servings ?? undefined,
        source: 'recipe',
        matchedPreferences: best.matched,
      });
      continue;
    }

    const fallback = pickFromBank(preferences, usedNames, random);
    if (!fallback) continue;

    usedNames.add(normalize(fallback.name));
    plan.push({
      dayOfWeek: day,
      name: fallback.name,
      description: fallback.description,
      prepTime: fallback.prepTime,
      cookTime: fallback.cookTime,
      source: 'suggestion',
      matchedPreferences: bankMatchesPreferences(fallback, preferences),
    });
  }

  return plan;
}
