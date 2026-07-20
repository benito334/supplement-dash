import type { Ingredient, Recipe } from "./types";
import { toScoop, volumeScoop, CC_PER_TSP, type Scoop } from "./units";

export interface Line {
  ingredient: Ingredient;
  servings: number;
  enabled: boolean;
  perDayGrams: number;
  batchGrams: number;
  batchTsp: number;
  scoop: Scoop;
  costPerDay: number;
  costPerBatch: number;
  /** effective percent of the mix (percentOfMix × servings), for % ingredients */
  effectivePercent?: number;
}

export interface Totals {
  weightGrams: number;
  volume: Scoop;
  costPerDay: number;
  costPerBatch: number;
  activeCount: number;
  /** volume of one day's serving to scoop from the finished mix */
  dailyCc: number;
  dailyVolume: Scoop;
}

export function buildLines(recipe: Recipe, lookup: (id: string) => Ingredient | undefined): Line[] {
  const resolved = recipe.items
    .map((it) => ({ it, ing: lookup(it.ingredientId) }))
    .filter((x): x is { it: (typeof recipe.items)[number]; ing: Ingredient } => !!x.ing);

  // Pass 1: total per-day grams of the enabled "base" — everything dosed by a
  // fixed serving. Percent-of-mix ingredients scale off this and never count
  // toward it (so the calculation can't feed back on itself).
  const baseGrams = resolved.reduce(
    (sum, { it, ing }) =>
      it.enabled && ing.percentOfMix == null ? sum + ing.servingGrams * it.servings : sum,
    0
  );

  // Pass 2: build each line, computing percent ingredients from baseGrams.
  return resolved.map(({ it, ing }) => {
    const isPercent = ing.percentOfMix != null;
    const effectivePercent = isPercent ? ing.percentOfMix! * it.servings : undefined;
    const perDayGrams = isPercent
      ? (effectivePercent! / 100) * baseGrams
      : ing.servingGrams * it.servings;
    const batchGrams = perDayGrams * recipe.days;
    const batchTsp = ing.density ? batchGrams / ing.density : 0;
    return {
      ingredient: ing,
      servings: it.servings,
      enabled: it.enabled,
      perDayGrams,
      batchGrams,
      batchTsp,
      scoop: toScoop(batchGrams, ing.density),
      costPerDay: perDayGrams * ing.costPerGram,
      costPerBatch: batchGrams * ing.costPerGram,
      effectivePercent,
    } as Line;
  });
}

export function totals(lines: Line[]): Totals {
  const active = lines.filter((l) => l.enabled);
  const weightGrams = active.reduce((a, l) => a + l.batchGrams, 0);
  const totalTsp = active.reduce((a, l) => a + l.batchTsp, 0);
  const costPerBatch = active.reduce((a, l) => a + l.costPerBatch, 0);
  const costPerDay = active.reduce((a, l) => a + l.costPerDay, 0);
  // Per-day serving volume — independent of batch length.
  const dailyTsp = active.reduce(
    (a, l) => a + (l.ingredient.density ? l.perDayGrams / l.ingredient.density : 0),
    0
  );
  return {
    weightGrams,
    volume: volumeScoop(totalTsp),
    costPerDay,
    costPerBatch,
    activeCount: active.length,
    dailyCc: dailyTsp * CC_PER_TSP,
    dailyVolume: volumeScoop(dailyTsp),
  };
}
