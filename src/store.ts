import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppState, Ingredient, Recipe } from "./types";
import { seedState, NEW_PRODUCTS, FLAVOR_ADDITIONS } from "./seed";

function uid(prefix: string): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

interface Store extends AppState {
  activeRecipe: () => Recipe;
  ingredient: (id: string) => Ingredient | undefined;

  setActiveRecipe: (id: string) => void;
  setDays: (days: number) => void;

  toggleItem: (ingredientId: string) => void;
  setServings: (ingredientId: string, servings: number) => void;
  removeItem: (ingredientId: string) => void;

  addIngredient: (data: Omit<Ingredient, "id">, addToActive: boolean) => void;
  updateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  addExistingToRecipe: (ingredientId: string) => void;

  addRecipe: (name: string) => void;
  renameRecipe: (id: string, name: string) => void;

  exportData: () => Backup;
  importData: (data: Backup) => void;
  save: () => void;
}

export interface Backup {
  app: "supplement-dash";
  version: 1;
  exportedAt: string;
  ingredients: Ingredient[];
  recipes: Recipe[];
  activeRecipeId: string;
}

function patchActive(state: Store, fn: (r: Recipe) => Recipe): Partial<Store> {
  return {
    recipes: state.recipes.map((r) => (r.id === state.activeRecipeId ? fn(r) : r)),
  };
}

// Add ingredients to the pantry and Daily mix if not already present. Used by
// versioned migrations to deliver new seed content once.
function addToDaily(s: AppState, items: Ingredient[]): AppState {
  const ingIds = new Set(s.ingredients.map((i) => i.id));
  const ingredients = [...s.ingredients, ...items.filter((p) => !ingIds.has(p.id))];
  const recipes = s.recipes.map((r) => {
    if (r.id !== "daily") return r;
    const have = new Set(r.items.map((it) => it.ingredientId));
    const additions = items
      .filter((p) => !have.has(p.id))
      .map((p) => ({ ingredientId: p.id, servings: 1, enabled: true }));
    return additions.length ? { ...r, items: [...r.items, ...additions] } : r;
  });
  return { ...s, ingredients, recipes };
}

// Set percentOfMix on existing pantry ingredients by id.
function setPercentMode(s: AppState, byId: Record<string, number>): AppState {
  return {
    ...s,
    ingredients: s.ingredients.map((i) =>
      byId[i.id] != null ? { ...i, percentOfMix: byId[i.id] } : i
    ),
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seedState(),

      activeRecipe: () => {
        const s = get();
        return s.recipes.find((r) => r.id === s.activeRecipeId) ?? s.recipes[0];
      },
      ingredient: (id) => get().ingredients.find((i) => i.id === id),

      setActiveRecipe: (id) => set({ activeRecipeId: id }),

      setDays: (days) =>
        set((s) => patchActive(s, (r) => ({ ...r, days: Math.max(1, Math.round(days)) }))),

      toggleItem: (ingredientId) =>
        set((s) =>
          patchActive(s, (r) => ({
            ...r,
            items: r.items.map((it) =>
              it.ingredientId === ingredientId ? { ...it, enabled: !it.enabled } : it
            ),
          }))
        ),

      setServings: (ingredientId, servings) =>
        set((s) =>
          patchActive(s, (r) => ({
            ...r,
            items: r.items.map((it) =>
              it.ingredientId === ingredientId ? { ...it, servings } : it
            ),
          }))
        ),

      removeItem: (ingredientId) =>
        set((s) =>
          patchActive(s, (r) => ({
            ...r,
            items: r.items.filter((it) => it.ingredientId !== ingredientId),
          }))
        ),

      addIngredient: (data, addToActive) => {
        const id = uid("ing");
        set((s) => {
          const ingredients = [...s.ingredients, { ...data, id }];
          if (!addToActive) return { ingredients };
          return {
            ingredients,
            recipes: s.recipes.map((r) =>
              r.id === s.activeRecipeId
                ? { ...r, items: [...r.items, { ingredientId: id, servings: 1, enabled: true }] }
                : r
            ),
          };
        });
      },

      updateIngredient: (id, patch) =>
        set((s) => ({
          ingredients: s.ingredients.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      addExistingToRecipe: (ingredientId) =>
        set((s) =>
          patchActive(s, (r) =>
            r.items.some((it) => it.ingredientId === ingredientId)
              ? r
              : { ...r, items: [...r.items, { ingredientId, servings: 1, enabled: true }] }
          )
        ),

      addRecipe: (name) => {
        const id = uid("rec");
        set((s) => ({
          recipes: [...s.recipes, { id, name, days: 30, items: [] }],
          activeRecipeId: id,
        }));
      },

      renameRecipe: (id, name) =>
        set((s) => ({ recipes: s.recipes.map((r) => (r.id === id ? { ...r, name } : r)) })),

      exportData: () => {
        const s = get();
        return {
          app: "supplement-dash",
          version: 1,
          exportedAt: new Date().toISOString(),
          ingredients: s.ingredients,
          recipes: s.recipes,
          activeRecipeId: s.activeRecipeId,
        };
      },

      importData: (data) =>
        set(() => ({
          ingredients: data.ingredients,
          recipes: data.recipes,
          activeRecipeId:
            data.recipes.find((r) => r.id === data.activeRecipeId)?.id ??
            data.recipes[0]?.id ??
            "daily",
        })),

      // Every change already auto-persists to localStorage; this forces an
      // immediate write so the Save button can confirm it explicitly.
      save: () => set((s) => ({ recipes: s.recipes.slice() })),
    }),
    {
      // Your saved state is authoritative: the seed only applies on a first-ever
      // load (no saved data). After that, adds/removes/toggles/servings persist
      // as-is — nothing is re-seeded, so deletions stay deleted across reboots.
      name: "supplement-dash-v1",
      // One-time migrations. Unlike `merge` (which re-runs every load and fights
      // deletions), a migration runs ONCE when the stored version is older, and
      // its result is written to storage — so it can't resurrect later deletes.
      version: 4,
      // Version-gated so each step runs only for stores older than it — this
      // avoids re-adding items a user deleted in a later version.
      migrate: (persisted, version) => {
        let s = persisted as AppState;
        if (!s || !Array.isArray(s.ingredients) || !Array.isArray(s.recipes)) return s;
        if (version < 2) s = addToDaily(s, NEW_PRODUCTS); // the 9 Amazon products
        if (version < 3) s = addToDaily(s, FLAVOR_ADDITIONS); // cocoa + monk fruit
        if (version < 4) s = setPercentMode(s, { cocoa: 5, "monk-fruit": 0.15 }); // % of mix
        return s;
      },
    }
  )
);
