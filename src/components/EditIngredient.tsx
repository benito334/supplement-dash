import { useState } from "react";
import type { Ingredient } from "../types";

interface Props {
  ingredient: Ingredient;
  onSave: (patch: Partial<Ingredient>) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function EditIngredient({ ingredient, onSave, onRemove, onClose }: Props) {
  const isPercent = ingredient.percentOfMix != null;
  const [name, setName] = useState(ingredient.name);
  const [servingGrams, setServingGrams] = useState(String(ingredient.servingGrams));
  const [density, setDensity] = useState(String(ingredient.density));
  const [costPerGram, setCostPerGram] = useState(String(ingredient.costPerGram));
  const [percentOfMix, setPercentOfMix] = useState(String(ingredient.percentOfMix ?? ""));

  function save() {
    onSave({
      name: name.trim() || ingredient.name,
      servingGrams: Math.max(0, parseFloat(servingGrams) || 0),
      density: Math.max(0.01, parseFloat(density) || ingredient.density),
      costPerGram: Math.max(0, parseFloat(costPerGram) || 0),
      ...(isPercent ? { percentOfMix: Math.max(0, parseFloat(percentOfMix) || 0) } : {}),
    });
    onClose();
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Edit {ingredient.name}</h2>
          <button className="x" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {isPercent && (
          <div className="field">
            <label>Percent of mix (at 1×)</label>
            <input
              type="number"
              inputMode="decimal"
              value={percentOfMix}
              onChange={(e) => setPercentOfMix(e.target.value)}
            />
            <div className="hint">
              This ingredient auto-scales to this % of the rest of the mix. The card slider
              multiplies it (1× = this %, 2× = double).
            </div>
          </div>
        )}

        <div className="row2">
          <div className="field">
            <label>Serving (grams)</label>
            <input
              type="number"
              inputMode="decimal"
              value={servingGrams}
              onChange={(e) => setServingGrams(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Cost per gram ($)</label>
            <input
              type="number"
              inputMode="decimal"
              value={costPerGram}
              onChange={(e) => setCostPerGram(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Density — grams per level teaspoon</label>
          <input
            type="number"
            inputMode="decimal"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
          />
          <div className="hint">
            Calibrate once: weigh a level teaspoon of this powder and enter the grams. This drives
            the tsp / tbsp / cup scoop amounts.
          </div>
        </div>

        <button className="primary" onClick={save}>
          Save
        </button>
        <button className="link-danger" onClick={onRemove}>
          Remove from this recipe
        </button>
      </div>
    </div>
  );
}
