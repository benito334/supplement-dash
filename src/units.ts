const TSP_PER_TBSP = 3;
const TSP_PER_CUP = 48;

/** millilitres (cc) in one level US teaspoon */
export const CC_PER_TSP = 4.92892;

const EIGHTHS: Record<number, string> = {
  1: "⅛", // 1/8
  2: "¼", // 1/4
  3: "⅜", // 3/8
  4: "½", // 1/2
  5: "⅝", // 5/8
  6: "¾", // 3/4
  7: "⅞", // 7/8
};

/** Format a decimal quantity as a whole number + eighths fraction (e.g. 2.24 -> "2 ¼"). */
export function fraction(value: number): string {
  let whole = Math.floor(value);
  let e = Math.round((value - whole) * 8);
  if (e === 8) {
    whole += 1;
    e = 0;
  }
  const f = e ? EIGHTHS[e] : "";
  if (whole === 0 && f) return f;
  return whole + (f ? " " + f : "");
}

export interface Scoop {
  value: string;
  unit: string;
}

/**
 * Pick the friendliest "scoopable" unit for a batch quantity in grams.
 * Small amounts stay in grams; bulkier amounts become tsp -> tbsp -> cups.
 */
export function toScoop(grams: number, density: number): Scoop {
  if (grams < 25 || !density) {
    return { value: grams < 10 ? grams.toFixed(1) : String(Math.round(grams)), unit: "g" };
  }
  const tsp = grams / density;
  const cups = tsp / TSP_PER_CUP;
  const tbsp = tsp / TSP_PER_TBSP;
  if (cups >= 0.5) return { value: fraction(cups), unit: cups < 2 ? "cup" : "cups" };
  if (tbsp >= 2) return { value: fraction(tbsp), unit: "tbsp" };
  return { value: fraction(tsp), unit: "tsp" };
}

/** Total batch volume expressed in cups (or tsp when small). */
export function volumeScoop(totalTsp: number): Scoop {
  const cups = totalTsp / TSP_PER_CUP;
  if (cups >= 0.5) return { value: fraction(cups), unit: cups < 2 ? "cup" : "cups" };
  return { value: fraction(totalTsp), unit: "tsp" };
}

export function money(n: number): string {
  return "$" + n.toFixed(2);
}
