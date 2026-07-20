export interface Ingredient {
  id: string;
  name: string;
  /** grams in one full serving */
  servingGrams: number;
  /** grams per level teaspoon — used to convert weight <-> volume */
  density: number;
  /** dollars per gram of powder */
  costPerGram: number;
  /**
   * If set, this ingredient is dosed as a percentage of the rest of the mix
   * (all non-percent ingredients) rather than a fixed serving. The value is the
   * percent at 1× on the slider; e.g. 5 = 5% of the mix. Used for flavor /
   * sweetener (cocoa, monk fruit) so they auto-scale with the batch.
   */
  percentOfMix?: number;
  /** optional label data captured from a photo / link */
  servingsPerContainer?: number;
  containerCost?: number;
  note?: string;
}

export interface RecipeItem {
  ingredientId: string;
  /** multiplier of a full serving, e.g. 0.5 = half a serving per day */
  servings: number;
  enabled: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  days: number;
  items: RecipeItem[];
}

export interface AppState {
  ingredients: Ingredient[];
  recipes: Recipe[];
  activeRecipeId: string;
}
