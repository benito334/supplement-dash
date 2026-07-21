import { create } from "zustand";
import { useStore } from "./store";
import { parseFormLink, pushRow, fetchLatestRow, type SheetConfig } from "./sync";
import { DEFAULT_PREFILL_LINK, DEFAULT_CSV_URL } from "./syncDefaults";

const CONFIG_KEY = "supplement-dash-sheet-config";
const DISCONNECTED_KEY = "supplement-dash-sheet-disconnected";

type Status = "off" | "idle" | "syncing" | "ok" | "error";

interface StoredConfig extends SheetConfig {
  prefillLink: string;
  csvUrl: string;
}

interface SyncStore {
  config: StoredConfig | null;
  status: Status;
  message: string;
  lastSyncedAt: number | null;
  connect: (prefillLink: string, csvUrl: string) => Promise<void>;
  disconnect: () => void;
  pullLatest: () => Promise<void>;
  pushCurrent: () => Promise<void>;
  init: () => void;
}

function loadConfig(): StoredConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as StoredConfig) : null;
  } catch {
    return null;
  }
}

function buildConfig(prefillLink: string, csvUrl: string): StoredConfig {
  return { ...parseFormLink(prefillLink), csvUrl, prefillLink };
}

/**
 * Resolve the config to use on a fresh load: whatever's saved, or — on a
 * brand-new device that hasn't explicitly disconnected — the baked-in
 * defaults (auto-saved so it behaves identically to a manual connect from
 * here on, including a real Disconnect sticking across reloads).
 */
function resolveInitialConfig(): StoredConfig | null {
  const saved = loadConfig();
  if (saved) return saved;
  if (localStorage.getItem(DISCONNECTED_KEY)) return null;
  if (!DEFAULT_PREFILL_LINK || !DEFAULT_CSV_URL) return null;
  try {
    const config = buildConfig(DEFAULT_PREFILL_LINK, DEFAULT_CSV_URL);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return config;
  } catch {
    return null;
  }
}

let started = false;
const initialConfig = resolveInitialConfig();

export const useSync = create<SyncStore>((set, get) => ({
  config: initialConfig,
  status: initialConfig ? "idle" : "off",
  message: "",
  lastSyncedAt: null,

  connect: async (prefillLink, csvUrl) => {
    prefillLink = prefillLink.trim();
    csvUrl = csvUrl.trim();
    if (!prefillLink || !csvUrl) {
      set({ status: "error", message: "Both links are required." });
      return;
    }
    let config: StoredConfig;
    try {
      config = buildConfig(prefillLink, csvUrl);
    } catch (e) {
      set({ status: "error", message: errMsg(e) });
      return;
    }
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    localStorage.removeItem(DISCONNECTED_KEY);
    set({ config, status: "syncing", message: "" });
    try {
      const latest = await fetchLatestRow(csvUrl);
      if (latest) {
        useStore.getState().importData(latest.data);
        set({ status: "ok", message: "Pulled latest mix from the sheet", lastSyncedAt: Date.now() });
      } else {
        // Empty sheet — seed it with what's here now.
        await pushRow(config, useStore.getState().exportData());
        set({ status: "ok", message: "Sheet was empty — saved current mix", lastSyncedAt: Date.now() });
      }
    } catch (e) {
      set({ status: "error", message: errMsg(e) });
    }
  },

  disconnect: () => {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.setItem(DISCONNECTED_KEY, "1");
    set({ config: null, status: "off", message: "", lastSyncedAt: null });
  },

  pullLatest: async () => {
    const config = get().config;
    if (!config) return;
    set({ status: "syncing", message: "" });
    try {
      const latest = await fetchLatestRow(config.csvUrl);
      if (latest) {
        useStore.getState().importData(latest.data);
        set({ status: "ok", message: "Pulled latest mix from the sheet", lastSyncedAt: Date.now() });
      } else {
        set({ status: "ok", message: "No entries in the sheet yet", lastSyncedAt: Date.now() });
      }
    } catch (e) {
      set({ status: "error", message: errMsg(e) });
    }
  },

  pushCurrent: async () => {
    const config = get().config;
    if (!config) return;
    set({ status: "syncing", message: "" });
    try {
      await pushRow(config, useStore.getState().exportData());
      // Fire-and-forget (no-cors) — we can't confirm the sheet received it,
      // only that the request went out without a network error.
      set({ status: "ok", message: "Saved to sheet", lastSyncedAt: Date.now() });
    } catch (e) {
      set({ status: "error", message: errMsg(e) });
    }
  },

  init: () => {
    if (started) return;
    started = true;
    // On load, adopt whatever is most recent in the sheet.
    if (get().config) void get().pullLatest();
  },
}));

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
