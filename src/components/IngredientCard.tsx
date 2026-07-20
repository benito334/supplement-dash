import type { Line } from "../compute";

interface Props {
  line: Line;
  onToggle: () => void;
  onServings: (servings: number) => void;
  onEdit: () => void;
}

function fmtGrams(g: number): string {
  if (g < 1) return g.toFixed(2);
  if (g < 10) return g.toFixed(1);
  return String(Math.round(g));
}

function fmtPercent(p: number): string {
  const r = p >= 1 ? Math.round(p * 10) / 10 : Math.round(p * 100) / 100;
  return r + "%";
}

export function IngredientCard({ line, onToggle, onServings, onEdit }: Props) {
  const { ingredient, servings, enabled, perDayGrams, scoop, costPerDay, effectivePercent } = line;
  const isPercent = effectivePercent != null;

  return (
    <div className={"card" + (enabled ? "" : " off")}>
      <div className="card-head">
        <div className="card-name">
          <button
            className={"tg" + (enabled ? " on" : "")}
            role="switch"
            aria-checked={enabled}
            aria-label={"Include " + ingredient.name}
            onClick={onToggle}
          >
            <span className="knob" />
          </button>
          <span className="name">{ingredient.name}</span>
        </div>
        <div className="batch">
          {enabled ? (
            <>
              <b>
                {scoop.value}
                <span className="u">{scoop.unit}</span>
              </b>
              {costPerDay > 0 && <div className="cost">${costPerDay.toFixed(2)}/day</div>}
            </>
          ) : (
            <span className="excluded">excluded</span>
          )}
        </div>
      </div>

      <div className="serv">
        <input
          type="range"
          min={0}
          max={3}
          step={0.25}
          value={servings}
          disabled={!enabled}
          onChange={(e) => onServings(parseFloat(e.target.value))}
        />
        <span className="read">
          {isPercent ? (
            <>
              <b>{fmtPercent(effectivePercent!)}</b> of mix · {fmtGrams(perDayGrams)} g/day
            </>
          ) : (
            <>
              <b>{servings}×</b> · {fmtGrams(perDayGrams)} g/day
            </>
          )}
        </span>
        <button className="edit" aria-label={"Edit " + ingredient.name} onClick={onEdit}>
          <i className="ti ti-adjustments-horizontal" />
        </button>
      </div>
    </div>
  );
}
