import { useRef, useState } from "react";
import { useStore, type Backup as BackupData } from "../store";

interface Props {
  onClose: () => void;
}

export function Backup({ onClose }: Props) {
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const recipeCount = useStore((s) => s.recipes.length);
  const ingredientCount = useStore((s) => s.ingredients.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Backup & restore</h2>
          <button className="x" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 16px" }}>
          Your mixes are saved in this browser automatically, but that's lost if you clear browser
          data or switch devices. Download a backup file to keep them safe and move them anywhere.
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
