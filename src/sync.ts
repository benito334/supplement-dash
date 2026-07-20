import type { Backup } from "./store";

export interface RemotePayload {
  updatedAt: number;
  data: Backup;
}

/**
 * Talks to a Google Apps Script Web App (see google-apps-script/Code.gs).
 * GET returns the stored payload string (or empty); POST overwrites it.
 * POST uses text/plain so the browser sends a simple (no-preflight) request,
 * which Apps Script accepts cross-origin.
 */

export async function loadRemote(url: string): Promise<RemotePayload | null> {
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  if (!res.ok) throw new Error("Sheet read failed (HTTP " + res.status + ")");
  const text = (await res.text()).trim();
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Sheet returned unexpected data — check the Web App URL");
  }
  const p = parsed as Partial<RemotePayload>;
  if (!p || typeof p.updatedAt !== "number" || !p.data) return null;
  return p as RemotePayload;
}

export async function saveRemote(url: string, payload: RemotePayload): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });
  if (!res.ok) throw new Error("Sheet write failed (HTTP " + res.status + ")");
}
