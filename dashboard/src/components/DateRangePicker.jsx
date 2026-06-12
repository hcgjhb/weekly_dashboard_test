/**
 * DateRangePicker.jsx
 * ────────────────────
 * Start / end date inputs that update the global date filter.
 * Replaces kpi_engine.py's global date_range / start_date / end_date vars.
 */

import React from "react";

const s = {
  wrapper: {
    display:     "flex",
    alignItems:  "center",
    gap:         "10px",
    flexWrap:    "wrap",
  },
  label: {
    fontSize:      "11px",
    fontWeight:    600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color:         "var(--text-muted)",
  },
  input: {
    background:   "var(--bg-card)",
    border:       "1px solid var(--bg-border)",
    borderRadius: "var(--radius-sm)",
    color:        "var(--text-primary)",
    fontSize:     "12px",
    padding:      "5px 10px",
    fontFamily:   "var(--font-mono)",
    outline:      "none",
    colorScheme:  "dark",
    cursor:       "pointer",
  },
  sep: {
    color:    "var(--text-muted)",
    fontSize: "12px",
  },
  clearBtn: {
    background:   "transparent",
    border:       "1px solid var(--bg-border)",
    borderRadius: "var(--radius-sm)",
    color:        "var(--text-secondary)",
    fontSize:     "11px",
    padding:      "5px 10px",
    cursor:       "pointer",
    fontFamily:   "var(--font-body)",
    transition:   "border-color 0.15s, color 0.15s",
  },
};

export default function DateRangePicker({ dateRange, setDateRange, dateBounds }) {
  const { start, end } = dateRange;

  const handleStart = (e) =>
    setDateRange((prev) => ({ ...prev, start: e.target.value || null }));

  const handleEnd = (e) =>
    setDateRange((prev) => ({ ...prev, end: e.target.value || null }));

  const handleClear = () =>
    setDateRange({ start: null, end: null });

  const hasFilter = !!(start || end);

  return (
    <div style={s.wrapper}>
      <span style={s.label}>Range</span>
      <input
        type="date"
        style={s.input}
        value={start ?? ""}
        min={dateBounds?.min ?? ""}
        max={end ?? dateBounds?.max ?? ""}
        onChange={handleStart}
      />
      <span style={s.sep}>→</span>
      <input
        type="date"
        style={s.input}
        value={end ?? ""}
        min={start ?? dateBounds?.min ?? ""}
        max={dateBounds?.max ?? ""}
        onChange={handleEnd}
      />
      {hasFilter && (
        <button style={s.clearBtn} onClick={handleClear}>
          Clear
        </button>
      )}
    </div>
  );
}