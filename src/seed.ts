import type { AppState, Ingredient, Recipe } from "./types";

const DEFAULT_DENSITY = 2.5; // g per tsp, when unknown

interface Seed {
  id: string;
  name: string;
  servingGrams?: number;
  tsp?: number; // used to derive density / servingGrams when grams missing
  costPerGram?: number;
  recipe: "daily" | "addons";
  enabled?: boolean;
}

// Derived from the original spreadsheet. Densities are back-calculated from
// grams-per-serving vs teaspoons-per-serving where both were present.
const SEEDS: Seed[] = [
  { id: "resveratrol", name: "Resveratrol", servingGrams: 2, tsp: 0.774, costPerGram: 0.15, recipe: "daily", enabled: true },
  { id: "molk", name: "MOLK", servingGrams: 34, tsp: 16.231, costPerGram: 0.045, recipe: "daily", enabled: true },
  { id: "pea-protein", name: "Pea protein", servingGrams: 15, tsp: 6.492, costPerGram: 0.012, recipe: "daily", enabled: true },
  { id: "norcal-fiber", name: "NorCal fiber", tsp: 3, recipe: "daily", enabled: true },
  { id: "inulin", name: "Inulin", tsp: 0.5, recipe: "daily", enabled: true },
  { id: "guar-gum", name: "Guar gum", tsp: 0.5, recipe: "daily", enabled: false },
  { id: "ksm66", name: "KSM-66", servingGrams: 0.6, tsp: 0.33, costPerGram: 0.3, recipe: "daily", enabled: true },
  { id: "ig26", name: "IG 26 Plus DF", servingGrams: 6.1, tsp: 2.637, recipe: "daily", enabled: true },
  { id: "mag-chloride", name: "Magnesium chloride", servingGrams: 0.3, recipe: "daily", enabled: true },
  { id: "pot-chloride", name: "Potassium chloride", servingGrams: 0.3, recipe: "daily", enabled: true },
  { id: "buffered-c", name: "Buffered C", servingGrams: 2, tsp: 1, recipe: "daily", enabled: true },
  { id: "gelatin", name: "Gelatin", tsp: 3, recipe: "daily", enabled: false },
  { id: "lions-mane", name: "Lion's mane", servingGrams: 2, tsp: 1, costPerGram: 0.1, recipe: "daily", enabled: true },
  { id: "quercetin", name: "Quercetin", servingGrams: 2, tsp: 1.7, costPerGram: 0.08, recipe: "daily", enabled: true },

  { id: "joint", name: "Joint blend", servingGrams: 12.3, tsp: 2.982, costPerGram: 0.024, recipe: "addons", enabled: true },
  { id: "papaya-seed", name: "Papaya seed", tsp: 0.387, recipe: "addons", enabled: true },
  { id: "super-green", name: "Super green", servingGrams: 8, tsp: 2.232, costPerGram: 0.025, recipe: "addons", enabled: true },
  { id: "matcha", name: "Matcha", tsp: 0.5, recipe: "addons", enabled: false },
];

function toIngredient(s: Seed): Ingredient {
  const density = s.servingGrams && s.tsp ? s.servingGrams / s.tsp : DEFAULT_DENSITY;
  const servingGrams = s.servingGrams ?? (s.tsp ? s.tsp * density : density);
  return {
    id: s.id,
    name: s.name,
    servingGrams: Math.round(servingGrams * 100) / 100,
    density: Math.round(density * 100) / 100,
    costPerGram: s.costPerGram ?? 0,
  };
}

// Real products the user added from Amazon links (July 2026 prices).
// costPerGram = container price / total grams in container. density is a best
// estimate of g per level tsp; calibrate per-ingredient for exact scoop amounts.
export const NEW_PRODUCTS: Ingredient[] = [
  { id: "beef-protein-pp", name: "Beef protein (Peak)", servingGrams: 30, density: 2.0, costPerGram: 0.0555, servingsPerContainer: 30, containerCost: 49.95 },
  { id: "egg-white-now", name: "Egg white protein (NOW)", servingGrams: 20, density: 1.9, costPerGram: 0.0441, servingsPerContainer: 113, containerCost: 99.99 },
  { id: "l-leucine", name: "L-Leucine", servingGrams: 5, density: 2.8, costPerGram: 0.0439, servingsPerContainer: 100, containerCost: 21.95 },
  { id: "healthy-fiber-phgg", name: "Healthy Fiber (Sunfiber)", servingGrams: 6, density: 2.5, costPerGram: 0.0844, servingsPerContainer: 37, containerCost: 18.99 },
  { id: "triple-fiber", name: "Triple fiber (Micro Ingr.)", servingGrams: 8, density: 2.3, costPerGram: 0.0409, servingsPerContainer: 113, containerCost: 36.95 },
  { id: "naked-pea", name: "Naked Pea protein", servingGrams: 30, density: 2.31, costPerGram: 0.0254, servingsPerContainer: 76, containerCost: 57.99 },
  { id: "calcium-ascorbate", name: "Calcium ascorbate (Buffered C)", servingGrams: 1, density: 2.4, costPerGram: 0.0419, servingsPerContainer: 500, containerCost: 20.97 },
  { id: "quercetin-bulk", name: "Quercetin (Bulk)", servingGrams: 1, density: 1.18, costPerGram: 0.1639, servingsPerContainer: 250, containerCost: 40.97 },
  { id: "lions-mane-extract", name: "Lion's mane extract (Bulk)", servingGrams: 1, density: 2.0, costPerGram: 0.0559, servingsPerContainer: 500, containerCost: 27.97 },
];

// Flavor / sweetener additions. Doses are starting points — adjust with the
// servings slider. Monk fruit is pure extract (very potent), so its serving is
// tiny; cocoa is Dutch-process unsweetened.
export const FLAVOR_ADDITIONS: Ingredient[] = [
  { id: "cocoa", name: "Cocoa powder (Dutch)", servingGrams: 5, density: 1.8, costPerGram: 0.02, percentOfMix: 5 },
  { id: "monk-fruit", name: "Monk fruit extract", servingGrams: 0.15, density: 2.0, costPerGram: 0.3, percentOfMix: 0.15 },
];

export function seedState(): AppState {
  const ingredients = SEEDS.map(toIngredient).concat(NEW_PRODUCTS, FLAVOR_ADDITIONS);

  const recipeFor = (key: "daily" | "addons", name: string): Recipe => ({
    id: key,
    name,
    days: 30,
    items: SEEDS.filter((s) => s.recipe === key).map((s) => ({
      ingredientId: s.id,
      servings: 1,
      enabled: s.enabled ?? true,
    })),
  });

  // The Amazon products live in the Daily mix.
  const daily = recipeFor("daily", "Daily mix");
  daily.items = [
    ...daily.items,
    ...[...NEW_PRODUCTS, ...FLAVOR_ADDITIONS].map((p) => ({
      ingredientId: p.id,
      servings: 1,
      enabled: true,
    })),
  ];

  return {
    ingredients,
    recipes: [daily, recipeFor("addons", "Add-ons")],
    activeRecipeId: "daily",
  };
}
