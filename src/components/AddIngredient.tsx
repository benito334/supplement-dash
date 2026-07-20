import { useRef, useState } from "react";
import type { Ingredient } from "../types";
import { scanFromImage, scanFromUrl, type ScanResult } from "../scan";

interface Props {
  onAdd: (data: Omit<Ingredient, "id">) => void;
  onClose: () => void;
}

type Mode = "manual" | "photo" | "link";

export function AddIngredient({ onAdd, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("photo");
  const [name, setName] = useState("");
  const [servingGrams, setServingGrams] = useState("");
  const [density, setDensity] = useState("2.5");
  const [costPerGram, setCostPerGram] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "manual-fallback">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  function applyScan(r: ScanResult) {
    if (!r.connected) {
      setScanState("manual-fallback");
      return;
    }
    if (r.name) setName(r.name);
    if (r.servingGrams != null) setServingGrams(String(r.servingGrams));
    if (r.density != null) setDensity(String(r.density));
    if (r.costPerGram != null) setCostPerGram(String(r.costPerGram));
    setScanState("idle");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImage(dataUrl);
      setScanState("scanning");
      applyScan(await scanFromImage(dataUrl));
    };
    reader.readAsDataURL(file);
  }

  async function scanUrl() {
    if (!url.trim()) return;
    setScanState("scanning");
    applyScan(await scanFromUrl(url.trim()));
  }

  const canSave = name.trim() && parseFloat(servingGrams) > 0 && parseFloat(density) > 0;

  function save() {
    onAdd({
      name: name.trim(),
      servingGrams: parseFloat(servingGrams),
      density: parseFloat(density),
      costPerGram: Math.max(0, parseFloat(costPerGram) || 0),
    });
    onClose();
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Add supplement</h2>
          <button className="x" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="seg">
          <button className={mode === "photo" ? "active" : ""} onClick={() => setMode("photo")}>
            <i className="ti ti-camera" /> Photo
          </button>
          <button className={mode === "link" ? "active" : ""} onClick={() => setMode("link")}>
            <i className="ti ti-link" /> Link
          </button>
          <button className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>
            <i className="ti ti-pencil" /> Manual
          </button>
        </div>

        {mode === "photo" && (
          <>
            {image ? (
              <img className="scan-preview" src={image} alt="Label" />
            ) : (
              <div className="scan-drop" onClick={() => fileRef.current?.click()}>
                <i className="ti ti-camera" />
                Tap to photograph the Supplement Facts label
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onFile}
            />
            {image && (
              <button className="ghost" onClick={() => fileRef.current?.click()}>
                Retake photo
              </button>
            )}
          </>
        )}

        {mode === "link" && (
          <div className="field">
            <label>Amazon (or product) link</label>
            <input
              placeholder="https://www.amazon.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="ghost" style={{ marginTop: 10 }} onClick={scanUrl}>
              <i className="ti ti-scan" /> Fetch product info
            </button>
          </div>
        )}

        {scanState === "scanning" && (
          <div className="badge-soft">
            <i className="ti ti-loader" /> Reading label…
          </div>
        )}
        {scanState === "manual-fallback" && (
          <div className="badge-soft">
            Auto-scan isn't connected yet — enter the details below and save.
          </div>
        )}

        <div className="field">
          <label>Name</label>
          <input placeholder="Creatine monohydrate" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="row2">
          <div className="field">
            <label>Serving (grams)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="5"
              value={servingGrams}
              onChange={(e) => setServingGrams(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Cost per gram ($)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.05"
              value={costPerGram}
              onChange={(e) => setCostPerGram(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Density — grams per level teaspoon</label>
          <input type="number" inputMode="decimal" value={density} onChange={(e) => setDensity(e.target.value)} />
          <div className="hint">Weigh one level tsp to calibrate. Defaults to 2.5 g/tsp.</div>
        </div>

        <button className="primary" disabled={!canSave} onClick={save}>
          Add to recipe
        </button>
      </div>
    </div>
  );
}
