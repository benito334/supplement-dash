import type { Totals } from "../compute";

interface Props {
  totals: Totals;
  onMake: () => void;
}

export function TotalsBar({ totals, onMake }: Props) {
  return (
    <div className="totals">
      <div className="totals-grid">
        <div className="stat">
          <div className="l">Volume</div>
          <div className="v">
            {totals.volume.value}
            <span className="u"> {totals.volume.unit}</span>
          </div>
        </div>
        <div className="stat">
          <div className="l">Serving</div>
          <div className="v">
            {Math.round(totals.dailyCc)}
            <span className="u"> cc</span>
          </div>
        </div>
        <div className="stat">
          <div className="l">Cost/day</div>
          <div className="v">${totals.costPerDay.toFixed(2)}</div>
        </div>
        <div className="stat">
          <div className="l">Cost/batch</div>
          <div className="v">${totals.costPerBatch.toFixed(2)}</div>
        </div>
      </div>
      <button className="make-btn" onClick={onMake} disabled={totals.activeCount === 0}>
        <i className="ti ti-checklist" /> Make it — {totals.activeCount} item
        {totals.activeCount === 1 ? "" : "s"}
      </button>
    </div>
  );
}
