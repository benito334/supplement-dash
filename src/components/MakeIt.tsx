import { useState } from "react";
import type { Line, Totals } from "../compute";

interface Props {
  lines: Line[];
  days: number;
  recipeName: string;
  totals: Totals;
  onClose: () => void;
}

export function MakeIt({ lines, days, recipeName, totals, onClose }: Props) {
  const active = lines.filter((l) => l.enabled);
  const [done, setDone] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>
            {recipeName} — {days}-day batch
          </h2>
          <button className="x" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="badge-soft">
          Weigh or scoop each into the bucket · {done.size}/{active.length} added
        </div>

        {active.map((l) => {
          const isDone = done.has(l.ingredient.id);
          return (
            <div
              key={l.ingredient.id}
              className={"check" + (isDone ? " done" : "")}
              onClick={() => toggle(l.ingredient.id)}
            >
              <div className="box">{isDone && <i className="ti ti-check" />}</div>
              <div className="n">
                <div className="nm">{l.ingredient.name}</div>
                <div className="sub">
                  {Math.round(l.batchGrams)} g · {l.servings}× serving
                </div>
              </div>
              <div className="amt">
                {l.scoop.value}
                <span className="u"> {l.scoop.unit}</span>
              </div>
            </div>
          );
        })}

        <div className="badge-soft" style={{ marginTop: 12 }}>
          Total: {Math.round(totals.weightGrams)} g · {totals.volume.value} {totals.volume.unit} ·{" "}
          ${totals.costPerBatch.toFixed(2)}
        </div>
        <div className="daily" style={{ marginTop: 8 }}>
          <div className="l">
            Daily serving
            <small>scoop this much per day, mixed</small>
          </div>
          <div className="v">
            {Math.round(totals.dailyCc)}
            <span className="u"> cc</span>
            <small>
              ≈ {totals.dailyVolume.value} {totals.dailyVolume.unit}
            </small>
          </div>
        </div>
        <button className="ghost" onClick={onClose} style={{ marginTop: 8 }}>
          Done
        </button>
      </div>
    </div>
  );
}
