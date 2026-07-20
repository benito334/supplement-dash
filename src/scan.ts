import type { Ingredient } from "./types";

export type ScanResult = Partial<Omit<Ingredient, "id">> & {
  /** true when a vision/scan backend actually returned data */
  connected: boolean;
};

/**
 * Extraction hooks for the "add by photo / Amazon link" flow.
 *
 * These are intentionally pluggable. Wire them to a small serverless endpoint
 * that calls a vision model (the API key must live server-side, never in the
 * client bundle). The endpoint should return { name, servingGrams,
 * servingsPerContainer, containerCost } parsed from the Supplement Facts panel.
 *
 * Until that endpoint is connected they resolve to { connected: false } so the
 * UI falls back to manual review with whatever we already know.
 */

const ENDPOINT = (import.meta.env.VITE_SCAN_ENDPOINT as string | undefined) || "/api/scan";

async function post(payload: Record<string, unknown>): Promise<ScanResult> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { connected: false };
    const data = await res.json();
    if (data && typeof data.name === "string") return { connected: true, ...data };
    return { connected: false };
  } catch {
    return { connected: false };
  }
}

export function scanFromImage(dataUrl: string): Promise<ScanResult> {
  return post({ kind: "image", image: dataUrl });
}

export function scanFromUrl(url: string): Promise<ScanResult> {
  return post({ kind: "url", url });
}
