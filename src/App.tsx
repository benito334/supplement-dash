import { useMemo, useState } from "react";
import { useStore } from "./store";
import { buildLines, totals as computeTotals } from "./compute";
import { IngredientCard } from "./components/IngredientCard";
import { TotalsBar } from "./components/TotalsBar";
import { AddIngredient } from "./components/AddIngredient";
import { EditIngredient } from "./components/EditIngredient";
import { MakeIt } from "./components/MakeIt";
import { Backup } from "./components/Backup";

export default function App() {
  const store = useStore();
  const recipe = store.recipes.find((r) => r.id === store.activeRecipeId) ?? store.recipes[0];

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMake, setShowMake] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  function doSave() {
    store.save();
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1600);
  }

  const lines = useMemo(
    () => buildLines(recipe, (id) => store.ingredients.find((i) => i.id === id)),
    [recipe, store.ingredients]
  );
  const totals = useMemo(() => computeTotals(lines), [lines]);

  // Show active ingredients first; excluded ones sink to the bottom (stable).
  const displayLines = useMemo(
    () => lines.map((l, i) => [l, i] as const)
      .sort((a, b) => Number(b[0].enabled) - Number(a[0].enabled) || a[1] - b[1])
      .map(([l]) => l),
    [lines]
  );

  const editing = editingId ? store.ingredients.find((i) => i.id === editingId) : undefined;

  function addRecipe() {
    const name = window.prompt("Name this recipe", "New mix");
    if (name && name.trim()) store.addRecipe(name.trim());
  }

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Supplement Dash</h1>
          <div className="sub">{recipe.name}</div>
        </div>
        <div className="days">
          <button onClick={() => store.setDays(recipe.days - 1)} aria-label="Fewer days">
            −
          </button>
          <div className="val">
            <b>{recipe.days}</b>
            <span>days</span>
          </div>
          <button onClick={() => store.setDays(recipe.days + 1)} aria-label="More days">
            +
          </button>
        </div>
      </div>

      <div className="actions">
        <button className={"save-btn" + (justSaved ? " done" : "")} onClick={doSave}>
          <i className={"ti " + (justSaved ? "ti-check" : "ti-device-floppy")} />{" "}
          {justSaved ? "Saved" : "Save"}
        </button>
        <button className="backup-btn" onClick={() => setShowBackup(true)}>
          <i className="ti ti-archive" /> Backup
        </button>
      </div>

      <div className="recipe-bar">
        {store.recipes.map((r) => (
          <button
            key={r.id}
            className={"chip" + (r.id === recipe.id ? " active" : "")}
            onClick={() => store.setActiveRecipe(r.id)}
          >
            {r.name}
          </button>
        ))}
        <button className="chip add" onClick={addRecipe}>
          <i className="ti ti-plus" /> Recipe
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="empty">No ingredients yet. Add one to get started.</div>
      ) : (
        displayLines.map((line) => (
          <IngredientCard
            key={line.ingredient.id}
            line={line}
            onToggle={() => store.toggleItem(line.ingredient.id)}
            onServings={(s) => store.setServings(line.ingredient.id, s)}
            onEdit={() => setEditingId(line.ingredient.id)}
          />
        ))
      )}

      <button className="dashed-btn" onClick={() => setShowAdd(true)}>
        <i className="ti ti-camera" /> Add supplement — photo, link, or manual
      </button>

      <TotalsBar totals={totals} onMake={() => setShowMake(true)} />

      {showAdd && (
        <AddIngredient
          onAdd={(data) => store.addIngredient(data, true)}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <EditIngredient
          ingredient={editing}
          onSave={(patch) => store.updateIngredient(editing.id, patch)}
          onRemove={() => {
            store.removeItem(editing.id);
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      )}
      {showMake && (
        <MakeIt
          lines={lines}
          days={recipe.days}
          recipeName={recipe.name}
          totals={totals}
          onClose={() => setShowMake(false)}
        />
      )}
      {showBackup && <Backup onClose={() => setShowBackup(false)} />}
    </div>
  );
}
