import { useRef, useState } from "react";
import { useStore, type Backup as BackupData } from "../store";
import { useSync } from "../cloud";

interface Props {
  onClose: () => void;
}

const SETUP_URL = "https://github.com/benito334/supplement-dash/blob/main/sheet-sync/SETUP.md";

export function Backup({ onClose }: Props) {
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const recipeCount = useStore((s) => s.recipes.length);
  const ingredientCount = useStore((s) => s.ingredients.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sync = useSync();
  const [prefillInput, setPrefillInput] = useState(sync.config?.prefillLink ?? "");
  const [csvInput, setCsvInput] = useState(sync.config?.csvUrl ?? "");

  function doExport() {
    const data = exportData();
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplement-dash-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ ok: true, text: "Backup downloaded." });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as BackupData;
        if (!Array.isArray(data.ingredients) || !Array.isArray(data.recipes) || !data.recipes.length) {
          throw new Error("bad");
        }
        if (
          window.confirm(
            `Restore this backup? It replaces all current recipes and ingredients with ${data.recipes.length} recipe(s) and ${data.ingredients.length} ingredient(s).`
          )
        ) {
          importData(data);
          setMsg({ ok: true, text: "Restored from backup." });
        }
      } catch {
        setMsg({ ok: false, text: "That file isn't a valid Supplement Dash backup." });
      }
    };
    reader.readAsText(file);
  }

  const connected = !!sync.config;
  const statusText =
    sync.status === "syncing"
      ? "Syncing…"
      : sync.status === "error"
        ? "Sync error: " + sync.message
        : sync.status === "ok"
          ? (sync.message || "Synced") +
            (sync.lastSyncedAt ? " at " + new Date(sync.lastSyncedAt).toLocaleTimeString() : "")
          : "Connected — not synced yet";
  const statusOk = sync.status !== "error";

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Sync & backup</h2>
          <button className="x" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>
          <i className="ti ti-cloud" /> Google Sheet sync
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 12px" }}>
          Hitting <b>Save</b> adds your mix as a new row in a Google Sheet. Opening the app on any
          device pulls the most recent row. No script —{" "}
          <a
            href={SETUP_URL}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-accent, var(--accent-strong))" }}
          >
            5-minute setup guide
          </a>
          .
        </p>

        {!connected ? (
          <>
            <div className="field">
              <label>Pre-filled form link</label>
              <input
                type="url"
                placeholder="https://docs.google.com/forms/d/e/…/viewform?…entry.…"
                value={prefillInput}
                onChange={(e) => setPrefillInput(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Published CSV link</label>
              <input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?…output=csv"
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
              />
            </div>
            <button
              className="primary"
              onClick={() => void sync.connect(prefillInput, csvInput)}
              disabled={!prefillInput.trim() || !csvInput.trim() || sync.status === "syncing"}
            >
              <i className="ti ti-plug" /> Connect
            </button>
            {sync.status === "error" && (
              <div className="badge-soft" style={{ marginTop: 10, color: "var(--danger)", borderColor: "var(--danger)" }}>
                {sync.message}
              </div>
            )}
            {sync.status === "syncing" && (
              <div className="badge-soft" style={{ marginTop: 10 }}>
                <i className="ti ti-loader" /> Connecting…
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className="badge-soft"
              style={{
                marginBottom: 10,
                color: statusOk ? "var(--accent-strong)" : "var(--danger)",
                borderColor: statusOk ? "var(--border)" : "var(--danger)",
              }}
            >
              {sync.status === "syncing" && <i className="ti ti-loader" />} {statusText}
            </div>
            <div className="row2">
              <button className="ghost" onClick={() => void sync.pullLatest()}>
                <i className="ti ti-download" /> Pull latest
              </button>
              <button
                className="ghost"
                onClick={() => {
                  sync.disconnect();
                  setPrefillInput("");
                  setCsvInput("");
                }}
              >
                Disconnect
              </button>
            </div>
          </>
        )}

        <hr style={{ border: "none", borderTop: "0.5px solid var(--border)", margin: "18px 0" }} />

        <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>
          <i className="ti ti-file-download" /> Backup file
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 12px" }}>
          A one-off copy you keep. Works with or without sync.
        </p>

        <button className="primary" onClick={doExport}>
          <i className="ti ti-download" /> Download backup ({recipeCount} recipes, {ingredientCount}{" "}
          ingredients)
        </button>

        <button className="ghost" style={{ marginTop: 10 }} onClick={() => fileRef.current?.click()}>
          <i className="ti ti-upload" /> Restore from a backup file
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />

        {msg && (
          <div
            className="badge-soft"
            style={{
              marginTop: 14,
              color: msg.ok ? "var(--accent-strong)" : "var(--danger)",
              borderColor: msg.ok ? "var(--border)" : "var(--danger)",
            }}
          >
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
