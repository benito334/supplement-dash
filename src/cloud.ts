import { create } from "zustand";
import { useStore, type Backup } from "./store";
import { loadRemote, saveRemote } from "./sync";

const URL_KEY = "supplement-dash-sync-url";
const AT_KEY = "supplement-dash-sync-updatedAt";
const PUSH_DEBOUNCE_MS = 1500;

type Status = "off" | "idle" | "syncing" | "ok" | "error";

interface SyncStore {
  url: string;
  status: Status;
  message: string;
  lastSyncedAt: number | null;
  setUrl: (url: string) => void;
  disconnect: () => void;
  syncNow: () => Promise<void>;
  init: () => void;
}

// Device-local sync state (kept OUT of the synced payload).
let localUpdatedAt = Number(localStorage.getItem(AT_KEY) || 0);
let suppress = false; // true while applying a remote pull, so it doesn't echo back
let timer: number | undefined;
let started = false;

function markLocalChange() {
  localUpdatedAt = Date.now();
  localStorage.setItem(AT_KEY, String(localUpdatedAt));
}

export const useSync = create<SyncStore>((set, get) => ({
  url: localStorage.getItem(URL_KEY) || "",
  status: localStorage.getItem(URL_KEY) ? "idle" : "off",
  message: "",
  lastSyncedAt: null,

  setUrl: (raw) => {
    const url = raw.trim();
    localStorage.setItem(URL_KEY, url);
    set({ url, status: url ? "idle" : "off", message: "" });
    if (url) void get().syncNow();
  },

  disconnect: () => {
    localStorage.removeItem(URL_KEY);
    set({ url: "", status: "off", message: "", lastSyncedAt: null });
  },

  syncNow: async () => {
    const url = get().url;
    if (!url) return;
    set({ status: "syncing", message: "" });
    try {
      const remote = await loadRemote(url);
      if (remote && remote.updatedAt > localUpdatedAt) {
        // Sheet is newer — adopt it.
        suppress = true;
        useStore.getState().importData(remote.data);
        suppress = false;
        localUpdatedAt = remote.updatedAt;
        localStorage.setItem(AT_KEY, String(localUpdatedAt));
        set({ status: "ok", message: "Pulled from sheet", lastSyncedAt: Date.now() });
      } else {
        // Local is newer, or the sheet is empty — push local up.
        await pushNow(url);
      }
    } catch (e) {
      set({ status: "error", message: errMsg(e) });
    }
  },

  init: () => {
    if (started) return;
    started = true;
    // Push local edits (debounced) whenever the mix changes.
    useStore.subscribe(() => {
      if (suppress || !get().url) return;
      markLocalChange();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void pushNow(get().url), PUSH_DEBOUNCE_MS);
    });
    if (get().url) void get().syncNow();
  },
}));

async function pushNow(url: string) {
  if (!url) return;
  useSync.setState({ status: "syncing", message: "" });
  try {
    const now = Date.now();
    localUpdatedAt = now;
    localStorage.setItem(AT_KEY, String(now));
    const data = useStore.getState().exportData() as Backup;
    await saveRemote(url, { updatedAt: now, data });
    useSync.setState({ status: "ok", message: "Saved to sheet", lastSyncedAt: Date.now() });
  } catch (e) {
    useSync.setState({ status: "error", message: errMsg(e) });
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
