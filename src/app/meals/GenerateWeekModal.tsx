'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, ChefHat, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/lib/hooks/useRecipes';
import type { Meal } from '@/types';
import type { DayOfWeek } from '@/lib/constants/days';
import {
  MEAL_PREFERENCE_OPTIONS,
  generateEasyWeekPlan,
  type MealPreferenceId,
  type PlannedDinner,
} from '@/lib/meals/easyWeekPlanner';

interface GenerateWeekModalProps {
  weekOf: string;
  orderedDays: readonly DayOfWeek[];
  recipes: Recipe[];
  existingMeals: Meal[];
  onClose: () => void;
  onApply: (meals: Array<Record<string, unknown>>, replaceDinnerIds: string[]) => Promise<void>;
}

export function GenerateWeekModal({
  weekOf,
  orderedDays,
  recipes,
  existingMeals,
  onClose,
  onApply,
}: GenerateWeekModalProps) {
  const [selected, setSelected] = useState<Set<MealPreferenceId>>(new Set(['easy']));
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [preview, setPreview] = useState<PlannedDinner[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dinnerIdsToReplace = useMemo(() => {
    if (!replaceExisting || !preview) return [] as string[];
    const days = new Set(preview.map((p) => p.dayOfWeek));
    return existingMeals
      .filter((meal) => meal.mealType === 'dinner' && days.has(meal.dayOfWeek as PlannedDinner['dayOfWeek']))
      .map((meal) => meal.id);
  }, [replaceExisting, preview, existingMeals]);

  const togglePreference = (id: MealPreferenceId) => {
    setPreview(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = () => {
    setError(null);
    const plan = generateEasyWeekPlan({
      preferences: [...selected],
      recipes,
      orderedDays,
      existingMeals: existingMeals.map((meal) => ({
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.mealType,
        id: meal.id,
      })),
      replaceExistingDinners: replaceExisting,
    });
    if (plan.length === 0) {
      setError(
        replaceExisting
          ? 'Could not build a plan. Try different preferences.'
          : 'All weeknights already have dinners. Enable “Replace existing dinners” or clear a few days first.'
      );
      setPreview(null);
      return;
    }
    setPreview(plan);
  };

  const handleApply = async () => {
    if (!preview?.length) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(
        preview.map((meal) => ({
          name: meal.name,
          description: meal.description,
          weekOf,
          dayOfWeek: meal.dayOfWeek,
          mealType: 'dinner' as const,
          prepTime: meal.prepTime,
          cookTime: meal.cookTime,
          servings: meal.servings,
          recipeUrl: meal.recipeUrl,
          recipeId: meal.recipeId,
        })),
        dinnerIdsToReplace
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meal plan');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pb-20 md:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg p-6 max-w-lg w-full mx-4 shadow-lg border border-border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Plan easy weeknights</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Pick a few preferences and we’ll fill <strong>Monday–Friday dinners</strong> for this week.
          Your recipes come first; simple suggestions fill any gaps. Weekends stay empty.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">What sounds good?</label>
            <div className="flex flex-wrap gap-2">
              {MEAL_PREFERENCE_OPTIONS.map((option) => {
                const active = selected.has(option.id);
                return (
                  <Button
                    key={option.id}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    className="text-xs h-8"
                    onClick={() => togglePreference(option.id)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Leave several selected for variety, or none for a random easy mix from your library.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={replaceExisting}
              onChange={(e) => {
                setReplaceExisting(e.target.checked);
                setPreview(null);
              }}
            />
            <span>
              Replace existing weeknight dinners
              <span className="block text-xs text-muted-foreground">
                Off by default — days that already have dinner are skipped.
              </span>
            </span>
          </label>

          <Button type="button" onClick={handleGenerate} className="w-full">
            <CalendarRange className="h-4 w-4 mr-2" />
            Generate Mon–Fri plan
          </Button>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {preview && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/50 text-xs font-medium flex items-center justify-between">
                <span>Preview · {preview.length} dinners</span>
                <span className="text-muted-foreground">
                  {preview.filter((p) => p.source === 'recipe').length} from recipes ·{' '}
                  {preview.filter((p) => p.source === 'suggestion').length} suggestions
                </span>
              </div>
              <ul className="divide-y divide-border">
                {preview.map((meal) => (
                  <li key={meal.dayOfWeek} className="px-3 py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {meal.dayOfWeek}
                      </div>
                      <div className="text-sm font-medium truncate">{meal.name}</div>
                      {meal.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {meal.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'shrink-0 text-[10px]',
                        meal.source === 'recipe' && 'bg-primary/10 text-primary'
                      )}
                    >
                      {meal.source === 'recipe' ? (
                        <span className="inline-flex items-center gap-1">
                          <ChefHat className="h-3 w-3" /> Recipe
                        </span>
                      ) : (
                        'Suggestion'
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleGenerate}>
                Shuffle again
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={applying}
                onClick={handleApply}
              >
                {applying ? 'Saving…' : 'Add to planner'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
