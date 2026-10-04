import {
  generateEasyWeekPlan,
  EASY_MEAL_BANK,
  WEEKDAY_DAYS,
  type PlannerRecipe,
} from '../easyWeekPlanner';

describe('generateEasyWeekPlan', () => {
  const orderedDays = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;

  const recipes: PlannerRecipe[] = [
    {
      id: 'r1',
      name: 'Lemon Garlic Chicken',
      tags: ['chicken', 'weeknight'],
      prepTime: 10,
      cookTime: 20,
      isFavorite: true,
    },
    {
      id: 'r2',
      name: 'Beef Tacos',
      cuisine: 'Mexican',
      tags: ['tacos'],
      prepTime: 10,
      cookTime: 15,
    },
    {
      id: 'r3',
      name: 'Tomato Basil Pasta',
      tags: ['pasta', 'vegetarian'],
      cuisine: 'Italian',
      prepTime: 5,
      cookTime: 15,
    },
    {
      id: 'r4',
      name: 'Weekend Brisket',
      tags: ['beef'],
      prepTime: 30,
      cookTime: 240,
    },
  ];

  it('plans only Monday–Friday dinners', () => {
    const plan = generateEasyWeekPlan({
      preferences: [],
      recipes,
      orderedDays,
      random: () => 0.1,
    });

    expect(plan.map((p) => p.dayOfWeek)).toEqual([...WEEKDAY_DAYS]);
    expect(plan.every((p) => !['saturday', 'sunday'].includes(p.dayOfWeek))).toBe(true);
  });

  it('prefers matching library recipes for selected preferences', () => {
    const plan = generateEasyWeekPlan({
      preferences: ['chicken', 'pasta'],
      recipes,
      orderedDays,
      random: () => 0.1,
    });

    const names = plan.map((p) => p.name);
    expect(names).toContain('Lemon Garlic Chicken');
    expect(names).toContain('Tomato Basil Pasta');
    expect(plan.filter((p) => p.source === 'recipe').length).toBeGreaterThanOrEqual(2);
  });

  it('skips weekdays that already have dinner unless replace is set', () => {
    const skipped = generateEasyWeekPlan({
      preferences: ['chicken'],
      recipes,
      orderedDays,
      existingMeals: [{ dayOfWeek: 'monday', mealType: 'dinner' }],
      replaceExistingDinners: false,
      random: () => 0.1,
    });
    expect(skipped.find((p) => p.dayOfWeek === 'monday')).toBeUndefined();

    const replaced = generateEasyWeekPlan({
      preferences: ['chicken'],
      recipes,
      orderedDays,
      existingMeals: [{ dayOfWeek: 'monday', mealType: 'dinner' }],
      replaceExistingDinners: true,
      random: () => 0.1,
    });
    expect(replaced.find((p) => p.dayOfWeek === 'monday')).toBeTruthy();
  });

  it('falls back to the easy meal bank when the library has no matches', () => {
    const plan = generateEasyWeekPlan({
      preferences: ['seafood'],
      recipes: [{ id: 'x', name: 'Plain Toast', tags: [] }],
      orderedDays,
      random: () => 0.1,
    });

    expect(plan.length).toBe(5);
    expect(plan.every((p) => p.source === 'suggestion')).toBe(true);
    expect(EASY_MEAL_BANK.some((b) => b.name === plan[0]?.name)).toBe(true);
  });

  it('does not reuse the same recipe twice in one week', () => {
    const plan = generateEasyWeekPlan({
      preferences: ['chicken'],
      recipes: [
        { id: 'only', name: 'Chicken Soup', tags: ['chicken', 'soup'] },
      ],
      orderedDays,
      random: () => 0.1,
    });

    const recipeUses = plan.filter((p) => p.recipeId === 'only');
    expect(recipeUses).toHaveLength(1);
    expect(plan.length).toBe(5);
  });
});
